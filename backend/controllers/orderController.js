import orderModel from "../models/orderModel.js";

import discountModel from "../models/discountModel.js";

import { reserveDiscount, releaseDiscount, redeemDiscount } from "../services/discountService.js";

import userModel from "../models/userModel.js";

import foodModel from "../models/foodmodel.js";

import mongoose from "mongoose";

import Stripe from "stripe";

import validator from "validator";

import { sendOrderConfirmation } from "../services/orderEmail.js";

import {
  validateManilaSolo,
  MANILA_SOLO_PRICE_ORE
} from "../utils/manilaSolo.js";



const MAX_ITEM_QUANTITY = 99;

const MAX_FIRST_NAME_LENGTH = 80;

const MAX_LAST_NAME_LENGTH = 80;

const MAX_EMAIL_LENGTH = 254;

const MAX_PHONE_LENGTH = 30;

const MAX_STREET_LENGTH = 150;

const MAX_CITY_LENGTH = 100;

const MAX_ZIPCODE_LENGTH = 20;



const VAT_RATE = 0.06;

const LARGE_ORDER_LIMIT = 10;




const FREE_DELIVERY_THRESHOLD = 600;

const MAX_ORDER_LINES = 200;
const MAX_CUSTOM_OPTIONS = 30;
const MAX_EXTRA_QUANTITY = 10;
const MAX_OPTION_PRICE = 100000;

// ======================================================
// FAS 2 - SERVER-VALIDERA PRODUKTANPASSNINGAR
// ======================================================

// Ordern får enbart innehålla IDs och antal från kunden.
// Namn och priser tas alltid från MongoDB, aldrig från req.body.
const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeOrderSelection = (raw) => {
  if (
    !isPlainObject(raw) ||
    !Array.isArray(raw.removedIngredientIds) ||
    !Array.isArray(raw.extras) ||
    raw.removedIngredientIds.length > MAX_CUSTOM_OPTIONS ||
    raw.extras.length > MAX_CUSTOM_OPTIONS
  ) {
    throw new Error("Ogiltiga produktanpassningar.");
  }

  const removedIngredientIds = [];
  const removedSeen = new Set();
  for (const id of raw.removedIngredientIds) {
    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      throw new Error("Ogiltigt ingrediens-ID.");
    }
    const cleanId = id.toLowerCase();
    if (removedSeen.has(cleanId)) {
      throw new Error("En ingrediens har valts flera gånger.");
    }
    removedSeen.add(cleanId);
    removedIngredientIds.push(cleanId);
  }
  removedIngredientIds.sort();

  const extras = [];
  const extraSeen = new Set();
  for (const extra of raw.extras) {
    if (
      !isPlainObject(extra) ||
      typeof extra.optionId !== "string" ||
      !mongoose.isValidObjectId(extra.optionId) ||
      !Number.isInteger(extra.quantity) ||
      extra.quantity < 1 ||
      extra.quantity > MAX_EXTRA_QUANTITY
    ) {
      throw new Error("Ogiltigt tillval eller antal.");
    }
    const optionId = extra.optionId.toLowerCase();
    if (extraSeen.has(optionId)) {
      throw new Error("Samma tillval har valts flera gånger.");
    }
    extraSeen.add(optionId);
    extras.push({ optionId, quantity: extra.quantity });
  }
  extras.sort((a, b) => a.optionId.localeCompare(b.optionId));

  if (!removedIngredientIds.length && !extras.length) {
    throw new Error("Välj minst en anpassning eller beställ standardprodukten.");
  }

  return { removedIngredientIds, extras };
};

const getOrderSelectionKey = (productId, selection) => {
  if (!selection) return `${productId}:standard`;
  return `${productId}:custom:${selection.removedIngredientIds.join(".")}:${selection.extras.map(e => `${e.optionId}x${e.quantity}`).join(".")
    }`;
};

// Schema-spärr: gamla orderModel.js skulle annars tyst kasta bort
// anpassningarna när ordern sparas. Det får aldrig leda till betalning.
const orderSchemaSupportsCustomizations = () => {
  const itemSchema = orderModel.schema.path("items")?.schema;
  return Boolean(
    itemSchema?.path("customizations.removedIngredients") &&
    itemSchema?.path("customizations.extras")
  );
};

const resolveProductSelection = (product, selection) => {
  const config = product.customizations;
  if (!config || config.enabled !== true) {
    throw new Error(`${product.name} kan inte anpassas just nu.`);
  }

  const removableMap = new Map(
    (Array.isArray(config.removableIngredients) ? config.removableIngredients : [])
      .filter(o => o?._id && o.available !== false)
      .map(o => [String(o._id).toLowerCase(), o])
  );
  const extrasMap = new Map(
    (Array.isArray(config.extras) ? config.extras : [])
      .filter(o => o?._id && o.available !== false)
      .map(o => [String(o._id).toLowerCase(), o])
  );

  const removedIngredients = selection.removedIngredientIds.map(optionId => {
    const option = removableMap.get(optionId);
    if (!option) throw new Error(`Ett bortval för ${product.name} är inte längre tillgängligt.`);
    return { optionId: option._id, name: String(option.name || "") };
  });

  let extraCents = 0;
  const extras = selection.extras.map(({ optionId, quantity }) => {
    const option = extrasMap.get(optionId);
    if (!option) throw new Error(`Ett tillval för ${product.name} är inte längre tillgängligt.`);
    const price = Number(option.price);
    const maxQuantity = Number(option.maxQuantity ?? 1);
    if (
      !Number.isFinite(price) || price < 0 || price > MAX_OPTION_PRICE ||
      !Number.isInteger(maxQuantity) || maxQuantity < 1 ||
      maxQuantity > MAX_EXTRA_QUANTITY || quantity > maxQuantity
    ) {
      throw new Error(`Ett tillval för ${product.name} har ändrats.`);
    }
    extraCents += Math.round(price * 100) * quantity;
    return {
      optionId: option._id, name: String(option.name || ""), quantity,
      price: Math.round(price * 100) / 100
    };
  });

  return { removedIngredients, extras, extraCents };
};

// Gruppvis lagerhantering behövs när samma produkt beställs både
// som standardprodukt och som flera anpassade varianter.
const groupStockByProduct = (items) => {
  const grouped = new Map();
  for (const item of items) {
    const id = String(item._id);
    const quantity = Number(item.quantity);
    if (!mongoose.isValidObjectId(id) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_STOCK_ITEM");
    }
    const existing = grouped.get(id);
    if (existing) existing.quantity += quantity;
    else grouped.set(id, { _id: item._id, name: item.name, quantity });
  }
  return [...grouped.values()];
};



// ======================================================
// DELIVERY ZONES
// ======================================================

const DELIVERY_ZONES = {

  frolunda: {
    id: "frolunda",
    label: "Frölunda",
    fee: 0
  },

  west: {
    id: "west",
    label: "Västra Göteborg",
    fee: 39
  },

  central: {
    id: "central",
    label: "Centrala Göteborg",
    fee: 59
  },

  hisingen: {
    id: "hisingen",
    label: "Hisingen / Norra Göteborg",
    fee: 59
  },

  south: {
    id: "south",
    label: "Södra Göteborg / Mölndal",
    fee: 49
  },

  east: {
    id: "east",
    label: "Östra Göteborg",
    fee: 69
  },

  northeast: {
    id: "northeast",
    label: "Nordvästra Göteborg / Angered",
    fee: 79
  },

  partilleLerum: {
    id: "partille-lerum",
    label: "Partille / Lerum",
    fee: 109
  },

  lindome: {
    id: "lindome",
    label: "Lindome",
    fee: 109
  },

  kungsbacka: {
    id: "kungsbacka",
    label: "Kungsbacka / Hede",
    fee: 130
  },

  grabo: {
    id: "grabo",
    label: "Gråbo",
    fee: 150
  }

};


// ======================================================
// NORMALIZE LOCATION
// ======================================================

const normalizeLocationText = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");


const normalizeZipcode = (value = "") =>
  String(value)
    .replace(/\D/g, "")
    .slice(0, 5);


// ======================================================
// GRÅBO POSTCODES
//
// Viktigt:
// 443 används även av Lerum och Stenkullen.
// Därför kontrollerar vi Gråbo EXAKT innan 443-zonen.
// ======================================================

const GRABO_ZIPCODES = [
  "44304",
  "44311",
  "44312",
  "44313",
  "44314",
  "44315",
  "44340",
  "44341",
  "44342",
  "44343",
  "44370",
  "44371",
  "44372",
  "44373"
];


// ======================================================
// GET DELIVERY ZONE
// ======================================================

const getDeliveryZone = ({
  city = "",
  zipcode = ""
}) => {

  const normalizedCity =
    normalizeLocationText(city);

  const normalizedZip =
    normalizeZipcode(zipcode);


  // Vi behöver ett riktigt postnummer för säker zonberäkning
  if (normalizedZip.length !== 5) {
    return null;
  }


  // ====================================================
  // 1. FRÖLUNDA
  // GRATIS
  // ====================================================

  if (
    normalizedZip.startsWith("421")
  ) {
    return DELIVERY_ZONES.frolunda;
  }


  // ====================================================
  // 2. GRÅBO
  // Kontrollera före Lerum eftersom båda använder 443
  // ====================================================

  if (
    GRABO_ZIPCODES.includes(normalizedZip)
  ) {
    return DELIVERY_ZONES.grabo;
  }


  // ====================================================
  // 3. KUNGSBACKA / HEDE
  //
  // Kungsbacka = 434-serien.
  // Hedeområdet i Kungsbacka fångas därför här också.
  // ====================================================

  if (
    normalizedZip.startsWith("434")
  ) {
    return DELIVERY_ZONES.kungsbacka;
  }


  // ====================================================
  // 4. LINDOME
  // ====================================================

  if (
    normalizedZip.startsWith("437")
  ) {
    return DELIVERY_ZONES.lindome;
  }


  // ====================================================
  // 5. PARTILLE / LERUM
  // ====================================================

  if (
    normalizedZip.startsWith("433")
  ) {
    return DELIVERY_ZONES.partilleLerum;
  }


  // 443 som INTE redan matchats som Gråbo
  if (
    normalizedZip.startsWith("443")
  ) {
    return DELIVERY_ZONES.partilleLerum;
  }


  // ====================================================
  // 6. HISINGEN / NORRA GÖTEBORG
  //
  // Lundby
  // Backa
  // Biskopsgården
  // Tuve
  // Kärra
  // Torslanda
  // Säve m.fl.
  // ====================================================

  const hisingenPrefixes = [
    "417",
    "418",
    "422",
    "423",
    "425"
  ];

  if (
    hisingenPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.hisingen;
  }


  // ====================================================
  // 7. NORDÖSTRA GÖTEBORG
  //
  // Angered
  // Gunnilse
  // Olofstorp
  // ====================================================

  if (
    normalizedZip.startsWith("424")
  ) {
    return DELIVERY_ZONES.northeast;
  }


  // ====================================================
  // 8. SÖDRA GÖTEBORG / MÖLNDAL
  //
  // Askim
  // Hovås
  // Billdal
  // Mölndal
  // Kållered
  //
  // Lindome ligger separat ovan.
  // ====================================================

  const southPrefixes = [
    "427",
    "428",
    "431",
    "436"
  ];

  if (
    southPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.south;
  }


  // ====================================================
  // 9. ÖSTRA GÖTEBORG
  //
  // Kortedala
  // Bergsjön
  // Gamlestaden
  // delar av Örgryte / Härlanda
  // ====================================================

  const eastPrefixes = [
    "415",
    "416",
    "424",

  ];

  if (
    eastPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.east;
  }


  // ====================================================
  // 10. CENTRALA GÖTEBORG
  //
  // Centrum
  // Linné
  // Vasastaden
  // Johanneberg
  // Guldheden m.fl.
  // ====================================================

  const centralPrefixes = [
    "411",
    "412",
    "413"
  ];

  if (
    centralPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.central;
  }


  // ====================================================
  // 11. VäsTRA GöTEBORG
  //
  // Majorna
  // Högsbo
  // Näset
  // Angered
  // Fiskebäckk m.fl.
  //
  // 421 Frölunda har redan fångats ovan.
  // ====================================================

  const westPrefixes = [
    "414",
    "426"
  ];

  if (
    westPrefixes.some(
      (prefix) =>
        normalizedZip.startsWith(prefix)
    )
  ) {
    return DELIVERY_ZONES.west;
  }


  // ====================================================
  // CITY FALLBACK
  //
  // Används endast när postnumret inte fångats ovan.
  // Vi använder INTE bara "Göteborg", eftersom det
  // inte säger vilken del av Göteborg kunden bor i.
  // ====================================================

  if (
    normalizedCity.includes("gråbo")
  ) {
    return DELIVERY_ZONES.grabo;
  }


  if (
    normalizedCity.includes("kungsbacka")
  ) {
    return DELIVERY_ZONES.kungsbacka;
  }


  if (
    normalizedCity.includes("lindome")
  ) {
    return DELIVERY_ZONES.lindome;
  }


  if (
    normalizedCity.includes("partille") ||
    normalizedCity.includes("savedalen") ||
    normalizedCity.includes("lerum") ||
    normalizedCity.includes("jonsered") ||
    normalizedCity.includes("stenkullen")
  ) {
    return DELIVERY_ZONES.partilleLerum;
  }


  // ====================================================
  // OUTSIDE DELIVERY AREA
  // ====================================================

  return false;
};
const ALLOWED_FULFILLMENT_TYPES = [

  "same-day",

  "next-day",

  "large-order"

];



const ALLOWED_DELIVERY_METHODS = [

  "pickup",

  "delivery"

];



// ======================================================
// OPENING HOURS / ALLOWED TIME SLOTS
// MONDAY - SUNDAY: 10:00 - 23:00
// ======================================================

const getAllowedTimeSlotsForDate = (dateString) => {

  return [
    "10:00-11:00",
    "11:00-12:00",
    "12:00-13:00",
    "13:00-14:00",
    "14:00-15:00",
    "15:00-16:00",
    "16:00-17:00",
    "17:00-18:00",
    "18:00-19:00",
    "19:00-20:00",
    "20:00-21:00",
    "21:00-22:00",
    "22:00-23:00"
  ];

};

const ALLOWED_ORDER_STATUSES = [

  "Beställning mottagen",

  "Förbereds",

  "Redo för upphämtning",

  "Upphämtad",

  "På väg",

  "Levererad",

  "Avbruten"
];



const getStripe = () => {

  if (!process.env.STRIPE_SECRET_KEY) {

    return null;

  }



  return new Stripe(process.env.STRIPE_SECRET_KEY);

};



const roundMoney = (value) => {

  const number = Number(value);



  if (!Number.isFinite(number)) {

    return 0;

  }



  return Number(number.toFixed(2));

};



const calculateProductDiscount = (
  productTotal,
  discount
) => {
  if (!discount) return 0;

  let amount = 0;

  if (discount.type === "percentage") {
    amount = productTotal * (discount.value / 100);
  }

  if (discount.type === "fixed") {
    amount = discount.value;
  }

  return roundMoney(
    Math.min(productTotal, Math.max(0, amount))
  );
};


const getSwedenDateString = (daysToAdd = 0) => {

  const formatter = new Intl.DateTimeFormat("en-CA", {

    timeZone: "Europe/Stockholm",

    year: "numeric",

    month: "2-digit",

    day: "2-digit"

  });



  const parts = formatter.formatToParts(new Date());



  const year = Number(

    parts.find((part) => part.type === "year")?.value

  );



  const month = Number(

    parts.find((part) => part.type === "month")?.value

  );



  const day = Number(

    parts.find((part) => part.type === "day")?.value

  );



  const date = new Date(

    Date.UTC(year, month - 1, day)

  );



  date.setUTCDate(date.getUTCDate() + daysToAdd);



  return date.toISOString().slice(0, 10);

};



const isValidDateString = (dateString) => {

  if (

    typeof dateString !== "string" ||

    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)

  ) {

    return false;

  }



  const date = new Date(`${dateString}T12:00:00.000Z`);



  return (

    !Number.isNaN(date.getTime()) &&

    date.toISOString().slice(0, 10) === dateString

  );

};



const createStoredDate = (dateString) => {

  return new Date(`${dateString}T12:00:00.000Z`);

};



const getPaymentIntentId = (stripeSession) => {

  if (typeof stripeSession?.payment_intent === "string") {

    return stripeSession.payment_intent;

  }



  return stripeSession?.payment_intent?.id || undefined;

};



const validatePaidStripeSession = (order, stripeSession) => {

  if (!stripeSession?.id) {

    throw new Error("STRIPE_SESSION_MISSING");

  }



  if (

    !stripeSession.metadata ||

    stripeSession.metadata.orderId !== order._id.toString()

  ) {

    throw new Error("STRIPE_ORDER_MISMATCH");

  }



  if (

    order.stripeSessionId &&

    order.stripeSessionId !== stripeSession.id

  ) {

    throw new Error("STRIPE_SESSION_MISMATCH");

  }



  if (stripeSession.payment_status !== "paid") {

    throw new Error("STRIPE_NOT_PAID");

  }



  const expectedAmount = Math.round(

    Number(order.amount) * 100

  );



  if (stripeSession.amount_total !== expectedAmount) {

    throw new Error("STRIPE_AMOUNT_MISMATCH");

  }



  if (

    stripeSession.currency &&

    stripeSession.currency.toLowerCase() !== "sek"

  ) {

    throw new Error("STRIPE_CURRENCY_MISMATCH");

  }

};



const getStripeValidationMessage = (error) => {

  switch (error.message) {

    case "STRIPE_SESSION_MISSING":
      return "Stripe-sessionen saknas.";

    case "STRIPE_ORDER_MISMATCH":
      return "Stripe-betalningen matchar inte beställningen.";

    case "STRIPE_SESSION_MISMATCH":
      return "Stripe-sessionen matchar inte beställningen.";

    case "STRIPE_NOT_PAID":
      return "Betalningen är inte genomförd.";

    case "STRIPE_AMOUNT_MISMATCH":
      return "Betalningsbeloppet matchar inte beställningen.";



    case "STRIPE_CURRENCY_MISMATCH":

      return "Fel valuta i betalningen.";



    default:

      return null;

  }

};



const clearRegisteredUserCart = async (

  order,

  mongoSession

) => {

  if (!order.userId) {

    return;

  }



  await userModel.findByIdAndUpdate(

    order.userId,

    { cartData: {} },

    { session: mongoSession }

  );

};



// Update discount counter in the SAME transaction as marking the order paid.
const redeemOrderDiscount = async (order, session) => {
  if (!order.discountId) return;
  if (order.discountReservationStatus !== "reserved") {
    throw new Error("DISCOUNT_RESERVATION_MISSING");
  }
  const result = await redeemDiscount(order.discountId, session);
  if (!result) throw new Error("DISCOUNT_REDEEM_FAILED");
  order.discountReservationStatus = "redeemed";
};

// Only a reserved, unpaid order can release its own reservation.
const releaseOrderDiscount = async (orderId, expectedSessionId = null) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await orderModel.findById(orderId).session(session);
      if (!order || order.payment || order.discountReservationStatus !== "reserved") return;
      if (expectedSessionId && order.stripeSessionId !== expectedSessionId) return;
      const released = await releaseDiscount(order.discountId, session);
      if (!released) throw new Error("DISCOUNT_RELEASE_FAILED");
      order.discountReservationStatus = "released";
      order.status = "Avbruten";
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
};

const markPaidWithStockWarning = async (

  orderId,

  stripeSession,

  productName

) => {

  const mongoSession = await mongoose.startSession();



  try {

    let result = null;



    await mongoSession.withTransaction(async () => {

      const order = await orderModel

        .findById(orderId)

        .session(mongoSession);



      if (!order) {

        throw new Error("ORDER_NOT_FOUND");

      }



      validatePaidStripeSession(order, stripeSession);



      if (order.payment) {

        result = {

          alreadyProcessed: true,

          warning: null,

          order: order.toObject()

        };



        return;

      }



      const warning =

        `${productName} Har inte längre tillräckligt dagslager.`;



      await redeemOrderDiscount(order, mongoSession);



      order.payment = true;

      order.status =

        "Betalning mottagen - lagerkontroll krävs";

      order.stripeSessionId = stripeSession.id;

      order.stripePaymentIntentId =

        getPaymentIntentId(stripeSession);

      order.paymentProcessedAt = new Date();



      await order.save({ session: mongoSession });



      await clearRegisteredUserCart(

        order,

        mongoSession

      );



      result = {

        alreadyProcessed: false,

        warning,

        order: order.toObject()

      };

    });



    return result;

  } finally {

    await mongoSession.endSession();

  }

};



const processPaidCheckoutSession = async (

  stripeSession

) => {

  const orderId = stripeSession?.metadata?.orderId;



  if (

    !orderId ||

    !mongoose.isValidObjectId(orderId)

  ) {

    throw new Error("ORDER_NOT_FOUND");

  }



  const mongoSession = await mongoose.startSession();



  try {

    let result = null;



    try {

      await mongoSession.withTransaction(async () => {

        const order = await orderModel

          .findById(orderId)

          .session(mongoSession);



        if (!order) {

          throw new Error("ORDER_NOT_FOUND");

        }



        validatePaidStripeSession(order, stripeSession);



        if (order.payment) {

          result = {

            alreadyProcessed: true,

            warning: null,

            order: order.toObject()

          };



          return;

        }



        if (order.fulfillmentType === "same-day") {
          // En produkt kan ligga på flera rader med olika kundval.
          // Dra av det SAMMANLAGDA antalet exakt en gång per produkt.
          const stockLines = groupStockByProduct(order.items);

          for (const item of stockLines) {
            const product = await foodModel.findById(item._id).session(mongoSession);
            const sameDayStock = Number(product?.sameDayStock || 0);
            if (!product || !Number.isFinite(sameDayStock) ||
              sameDayStock < item.quantity) {
              throw new Error(`SAME_DAY_STOCK:${item.name}`);
            }
          }

          for (const item of stockLines) {
            const updateResult = await foodModel.updateOne(
              { _id: item._id, sameDayStock: { $gte: item.quantity } },
              { $inc: { sameDayStock: -item.quantity } },
              { session: mongoSession }
            );
            if (updateResult.modifiedCount !== 1) {
              throw new Error(`SAME_DAY_STOCK:${item.name}`);
            }
          }
        }

        await redeemOrderDiscount(order, mongoSession);



        order.payment = true;

        order.status = "Betalning mottagen";

        order.stripeSessionId = stripeSession.id;

        order.stripePaymentIntentId =

          getPaymentIntentId(stripeSession);

        order.paymentProcessedAt = new Date();



        await order.save({ session: mongoSession });



        await clearRegisteredUserCart(

          order,

          mongoSession

        );



        result = {

          alreadyProcessed: false,

          warning: null,

          order: order.toObject()

        };

      });



      return result;

    } catch (error) {

      if (

        String(error.message || "").startsWith(

          "SAME_DAY_STOCK:"

        )

      ) {

        const productName = String(error.message).replace(

          "SAME_DAY_STOCK:",

          ""

        );



        return await markPaidWithStockWarning(

          orderId,

          stripeSession,

          productName

        );

      }



      throw error;

    }

  } finally {

    await mongoSession.endSession();

  }

};



const sendOrderConfirmationSafely = async (

  orderId

) => {

  try {

    if (

      !orderId ||

      !mongoose.isValidObjectId(orderId)

    ) {

      return;

    }



    const order = await orderModel.findById(orderId);



    if (!order || !order.payment) {

      return;

    }



    if (order.orderConfirmationEmailSent) {

      return;

    }



    const emailResult = await sendOrderConfirmation(order);



    const updateData = {

      orderConfirmationEmailSent: true,

      orderConfirmationEmailSentAt: new Date()

    };



    if (emailResult?.id) {

      updateData.orderConfirmationEmailId =

        emailResult.id;

    }



    await orderModel.updateOne(

      {

        _id: order._id,

        orderConfirmationEmailSent: {

          $ne: true

        }

      },

      {

        $set: updateData

      }

    );

  } catch (error) {

    console.error(

      "Order confirmation email error:",

      error.message

    );

  }

};



const placeOrder = async (req, res) => {

  try {

    let userId = req.userId || null;



    const {
      items,
      bundles,
      address,
      deliveryMethod,
      fulfillmentType,
      requestedDate,
      requestedTime,
      discountCode
    } = req.body || {};



    if (

      userId &&

      !mongoose.isValidObjectId(userId)

    ) {

      userId = null;

    }



    if (userId) {

      const userExists = await userModel.exists({

        _id: userId

      });



      if (!userExists) {

        userId = null;

      }

    }



    if (

      !Array.isArray(items) ||

      items.length === 0

    ) {

      return res.status(400).json({

        success: false,

        message: "Din varukorg är tom."

      });

    }



    if (

      !ALLOWED_DELIVERY_METHODS.includes(

        deliveryMethod

      )

    ) {

      return res.status(400).json({

        success: false,

        message: "Välj avhämtning eller leverans."

      });

    }



    if (

      !address ||

      typeof address !== "object" ||

      Array.isArray(address)

    ) {

      return res.status(400).json({

        success: false,

        message: "Kunduppgifter saknas."

      });

    }



    const firstName = String(

      address.firstName || ""

    ).trim();



    const lastName = String(

      address.lastName || ""

    ).trim();



    const email = String(

      address.email || ""

    )

      .trim()

      .toLowerCase();



    const phone = String(

      address.phone || ""

    ).trim();



    if (

      !firstName ||

      !lastName ||

      !email ||

      !phone

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Namn, e-post och telefonnummer måste fyllas i."

      });

    }



    if (

      firstName.length > MAX_FIRST_NAME_LENGTH ||

      lastName.length > MAX_LAST_NAME_LENGTH

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Förnamn eller efternamn är för långt."

      });

    }



    if (

      email.length > MAX_EMAIL_LENGTH ||

      !validator.isEmail(email)

    ) {

      return res.status(400).json({

        success: false,

        message: "Ange en giltig e-postadress."

      });

    }



    const phoneDigits = phone.replace(/\D/g, "");



    if (

      phone.length > MAX_PHONE_LENGTH ||

      !/^[0-9+\s()\\-]+$/.test(phone) ||

      phoneDigits.length < 7 ||

      phoneDigits.length > 15

    ) {

      return res.status(400).json({

        success: false,

        message: "Ange ett giltigt telefonnummer."

      });

    }



    const street = String(

      address.street || ""

    ).trim();



    const city = String(

      address.city || ""

    ).trim();



    const zipcode = String(

      address.zipcode || ""

    ).trim();



    if (

      street.length > MAX_STREET_LENGTH ||

      city.length > MAX_CITY_LENGTH ||

      zipcode.length > MAX_ZIPCODE_LENGTH

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Leveransadressen innehåller för långa uppgifter."

      });

    }



    if (

      deliveryMethod === "delivery" &&

      (!street || !city || !zipcode)

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Fullständig leveransadress måste fyllas i."

      });

    }

    let deliveryZone = null;

    if (deliveryMethod === "delivery") {
      deliveryZone = getDeliveryZone({
        city,
        zipcode
      });

      if (!deliveryZone) {
        return res.status(400).json({
          success: false,
          message:
            "Vi levererar tyvärr inte till den här adressen."
        });
      }
    }





    if (

      !ALLOWED_FULFILLMENT_TYPES.includes(

        fulfillmentType

      )

    ) {

      return res.status(400).json({

        success: false,

        message: "Ogiltigt beställningsalternativ."

      });

    }



    if (!isValidDateString(requestedDate)) {

      return res.status(400).json({

        success: false,

        message: "Ogiltigt beställningsdatum."

      });

    }



    const allowedTimeSlots =

      getAllowedTimeSlotsForDate(requestedDate);



    if (

      !allowedTimeSlots.includes(

        requestedTime

      )

    ) {

      return res.status(400).json({

        success: false,

        message:

          allowedTimeSlots.length === 0

            ? "ManilaCafe  har stängt det valda datumet."

            : "Ogiltig vald tid."

      });

    }



    const today = getSwedenDateString(0);

    const tomorrow = getSwedenDateString(1);

    const minimumLargeOrderDate =

      getSwedenDateString(2);



    if (

      fulfillmentType === "same-day" &&

      requestedDate !== today

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Beställning för idag måste ha dagens datum."

      });

    }



    if (

      fulfillmentType === "next-day" &&

      requestedDate !== tomorrow

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Beställning för imorgon måste ha morgondagens datum."

      });

    }



    if (

      fulfillmentType === "large-order" &&

      requestedDate < minimumLargeOrderDate

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Större beställningar måste göras minst 48 timmar i förskott."

      });

    }



    const stripe = getStripe();



    if (!stripe) {

      return res.status(500).json({

        success: false,

        message: "Stripe är inte konfigurerat."

      });

    }

    const normalizedDiscountCodeForSolo = (value) =>
  typeof value === "string" && value.trim().length > 0;

    // ==================================================
    // ORDER ITEMS - VALIDERING OCH DEDUPLICERING
    // ==================================================
    if (items.length > MAX_ORDER_LINES) {
      return res.status(400).json({
        success: false,
        message: "För många produktrader i beställningen."
      });
    }

    const normalizedItems = [];
    const productIds = new Set();
    const uniqueLines = new Set();
    const quantitiesByProduct = new Map();
    let hasCustomizations = false;

    try {
      for (const item of items) {
        if (!isPlainObject(item)) throw new Error("Ogiltig produktrad.");
        const productId = item._id || item.id || item.itemId;
        const quantity = item.quantity;

        if (typeof productId !== "string" || !mongoose.isValidObjectId(productId)) {
          throw new Error("Ogiltigt produkt-ID.");
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
          throw new Error(`Du kan beställa högst ${MAX_ITEM_QUANTITY} st av samma produkt.`);
        }

        const idString = productId.toLowerCase();
        const selection = Object.prototype.hasOwnProperty.call(item, "customizations")
          ? normalizeOrderSelection(item.customizations)
          : null;
        if (selection) hasCustomizations = true;

        const key = getOrderSelectionKey(idString, selection);
        if (uniqueLines.has(key)) {
          throw new Error("Samma produktvariant får inte förekomma flera gånger.");
        }
        uniqueLines.add(key);

        const productQuantity = (quantitiesByProduct.get(idString) || 0) + quantity;
        if (productQuantity > MAX_ITEM_QUANTITY) {
          throw new Error(`Du kan beställa högst ${MAX_ITEM_QUANTITY} st av samma produkt, inklusive alla varianter.`);
        }
        quantitiesByProduct.set(idString, productQuantity);

        normalizedItems.push({ productId: idString, quantity, selection });
        productIds.add(idString);
      }
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    // Säkerhetsstopp: aktivera aldrig anpassade betalningar innan
    // orderModel har två snapshot-arrayer för kundvalen.
    if (hasCustomizations && !orderSchemaSupportsCustomizations()) {
      return res.status(503).json({
        success: false,
        message: "Produktanpassningar är ännu inte aktiverade i ordersystemet."
      });
    }

    const products = await foodModel.find({ _id: { $in: [...productIds] } });
    const productMap = new Map(
      products.map(product => [String(product._id).toLowerCase(), product])
    );


    // ==================================================
    // MANILA SOLO — SERVERVALIDERING
    // ==================================================

  
let soloBundle = null;

if (bundles !== undefined) {

  // Manila Solo är stängt tills alla tester är godkända.
  // Servern nekar även direkta API-anrop.
  if (
    process.env.MANILA_SOLO_CHECKOUT_ENABLED !== "true"
  ) {
    return res.status(503).json({
      success: false,
      message:
        "Manila Solo öppnar snart för beställning."
    });
  }


      if (
        !Array.isArray(bundles) ||
        bundles.length !== 1 ||
        !isPlainObject(bundles[0]) ||
        bundles[0].type !== "manila-solo"
      ) {
        return res.status(400).json({
          success: false,
          message: "Ogiltig Manila Solo-beställning."
        });
      }

      // Första versionen: exakt tre standardprodukter.
      if (
        normalizedItems.length !== 3 ||
        normalizedItems.some(
          item => item.quantity !== 1 || item.selection
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Manila Solo måste innehålla tre produkter utan extra tillval."
        });
      }

      if (normalizedDiscountCodeForSolo(discountCode)) {
        return res.status(400).json({
          success: false,
          message:
            "Rabattkoder kan ännu inte kombineras med Manila Solo."
        });
      }

      // FAST MANILA SOLO — servern bestämmer exakt vilka produkter som ingår.
      // Konfigurera dessa tre ID:n från den riktiga produktdatabasen på Render.
      // Ingen produkt eller något pris får bestämmas av klienten.
      const fixedSoloIds = {
        mealId: String(process.env.MANILA_SOLO_PANCIT_ID || "").trim().toLowerCase(),
        dessertId: String(process.env.MANILA_SOLO_GOLDEN_TURON_ID || "").trim().toLowerCase(),
        drinkId: String(process.env.MANILA_SOLO_UBE_CARAMEL_TWIRL_ID || "").trim().toLowerCase()
      };

      const eligibleProductIds = Object.values(fixedSoloIds);
      if (
        eligibleProductIds.some(id => !mongoose.isValidObjectId(id)) ||
        new Set(eligibleProductIds).size !== 3
      ) {
        return res.status(503).json({
          success: false,
          message: "Manila Solo saknar giltig produktkonfiguration."
        });
      }

      // Säkerställ även att serverns fasta ID:n pekar på rätt produkter.
      // Detta fångar förväxlade miljövariabler innan ett paket kan säljas.
      const fixedNames = [
        [fixedSoloIds.mealId, "pancit"],
        [fixedSoloIds.dessertId, "golden turon & ube ice cream"],
        [fixedSoloIds.drinkId, "ube caramel twirl"]
      ];
      const normalizeName = name => String(name || "")
        .trim().toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
      if (fixedNames.some(([id, name]) =>
        normalizeName(productMap.get(id)?.name) !== name
      )) {
        return res.status(503).json({
          success: false,
          message: "Manila Solo-produkterna kunde inte verifieras."
        });
      }

      
      // Pickup-begränsningar måste vara uttryckligen
      // konfigurerade innan Manila Solo kan beställas.
      if (
        process.env.MANILA_SOLO_PICKUP_ONLY_IDS === undefined
      ) {
        return res.status(503).json({
          success: false,
          message:
            "Leveransregler för Manila Solo är inte konfigurerade."
        });
      }

      const pickupOnlyIds = String(
        process.env.MANILA_SOLO_PICKUP_ONLY_IDS
      )
        .split(",")
        .map(id => id.trim())
        .filter(id => mongoose.isValidObjectId(id));


      try {

        const request = bundles[0];

        // Vägra andra kombinationer, även om någon anropar API:t direkt.
        if (
          String(request.mealId || "").toLowerCase() !== fixedSoloIds.mealId ||
          String(request.dessertId || "").toLowerCase() !== fixedSoloIds.dessertId ||
          String(request.drinkId || "").toLowerCase() !== fixedSoloIds.drinkId
        ) {
          return res.status(400).json({
            success: false,
            message: "Manila Solo har ett fast innehåll: Pancit, Golden Turon & Ube Ice Cream och Ube Caramel Twirl."
          });
        }

        soloBundle = validateManilaSolo({
          selection: {
            mealId: request.mealId,
            dessertId: request.dessertId,
            drinkId: request.drinkId
          },
          products,
          eligibleProductIds,
          pickupOnlyIds,
          deliveryMethod
        });

        const requestedIds = new Set(
          normalizedItems.map(item => item.productId)
        );

        const bundleIds = new Set(
          soloBundle.items.map(item => item.productId)
        );

        if (
          requestedIds.size !== 3 ||
          bundleIds.size !== 3 ||
          [...bundleIds].some(id => !requestedIds.has(id))
        ) {
          throw new Error(
            "Produkterna i varukorgen matchar inte Manila Solo."
          );
        }

        // Säkerställ att den nya ordermodellen är aktiv.
        const itemSchema =
          orderModel.schema.path("items")?.schema;

        if (
          !orderModel.schema.path("bundles") ||
          !itemSchema?.path("bundleKey")
        ) {
          return res.status(503).json({
            success: false,
            message:
              "Paketstöd saknas i den aktiva ordermodellen."
          });
        }

      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }


    const verifiedItems = [];
    let subtotalCents = 0;
    let totalQuantity = 0;

    try {
      for (const item of normalizedItems) {
        const product = productMap.get(item.productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "En eller flera produkter kunde inte hittas."
          });
        }

        const basePrice = Number(product.price);
        if (!Number.isFinite(basePrice) || basePrice < 0 || basePrice > 100000) {
          throw new Error(`Ogiltigt produktpris för ${product.name}.`);
        }

        const snapshot = item.selection
          ? resolveProductSelection(product, item.selection)
          : null;
          

        let unitCents =
          Math.round(basePrice * 100) +
          (snapshot?.extraCents || 0);

        if (soloBundle) {

          // Omvandlar 249 kr inklusive moms
          // till produktbelopp exklusive 6 % moms.
          const netBundleCents = Math.round(
            MANILA_SOLO_PRICE_ORE / (1 + VAT_RATE)
          );

          const baseShare = Math.floor(
            netBundleCents / 3
          );

          const remainder = netBundleCents - baseShare * 3;

          const bundleIndex = soloBundle.items.findIndex(
            entry => entry.productId === item.productId
          );

          if (bundleIndex < 0) {
            throw new Error(
              "Produkten tillhör inte Manila Solo."
            );
          }

          // Fördelningen gör att summan blir exakt
          // 234,91 kr före moms.
          unitCents =
            baseShare +
            (bundleIndex < remainder ? 1 : 0);
        }

        if (!Number.isSafeInteger(unitCents) || unitCents > 10000000) {
          throw new Error(`Priset för ${product.name} är för högt.`);
        }

        subtotalCents += unitCents * item.quantity;
        totalQuantity += item.quantity;

        verifiedItems.push({
          _id: product._id,
          bundleKey: soloBundle ? "solo-1" : undefined,
          name: product.name,
          price: unitCents / 100,
          quantity: item.quantity,
          image: product.image,
          ...(snapshot ? {
            customizations: {
              removedIngredients: snapshot.removedIngredients,
              extras: snapshot.extras
            }
          } : {})
        });
      }
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    // Lagerkrav kontrolleras på summerat antal, inte varje variant för sig.
    if (fulfillmentType === "same-day") {
      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productMap.get(productId);
        const stock = Number(product?.sameDayStock || 0);
        if (!Number.isInteger(stock) || stock < quantity) {
          return res.status(409).json({
            success: false,
            message: `${product.name} finns inte i tillräckligt antal för beställning idag.`
          });
        }
      }
    }

    const subtotal = subtotalCents / 100;

    if (

      totalQuantity >= LARGE_ORDER_LIMIT &&

      fulfillmentType !== "large-order"

    ) {

      return res.status(400).json({

        success: false,

        message:

          `Beställningar med ${LARGE_ORDER_LIMIT} produkter eller fler måste göras som en större beställning.`

      });

    }


    // ==================================================
    // VALIDATE DISCOUNT CODE
    // ==================================================

    let appliedDiscount = null;

    const normalizedDiscountCode =
      typeof discountCode === "string"
        ? discountCode.trim().toUpperCase()
        : "";

    if (normalizedDiscountCode) {

      if (
        normalizedDiscountCode.length > 50
      ) {
        return res.status(400).json({
          success: false,
          message: "Ogiltig rabattkod."
        });
      }

      const discount = await discountModel.findOne({
        code: normalizedDiscountCode,
        isActive: true
      });

      if (!discount) {
        return res.status(400).json({
          success: false,
          message: "Rabattkoden är ogiltig."
        });
      }

      if (
        discount.expiresAt &&
        discount.expiresAt <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Rabattkoden har gått ut."
        });
      }

      if (
        discount.usageLimit !== null &&
        (discount.usedCount + (discount.reservedCount || 0)) >= discount.usageLimit

      ) {
        return res.status(400).json({
          success: false,
          message: "Rabattkoden har nått sin användningsgräns."
        });
      }

      // Produktvärde inklusive moms, före rabatt
      const productTotalBeforeDiscount = roundMoney(
        subtotal + roundMoney(subtotal * VAT_RATE)
      );

      if (
        productTotalBeforeDiscount <
        discount.minOrderAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Rabattkoden kräver ett produktköp på minst ${discount.minOrderAmount} kr.`
        });
      }

      appliedDiscount = discount;
    }




    // ==================================================
    // PRICE CALCULATION WITH DISCOUNT
    // ==================================================


    // ==================================================
    // CALCULATE ORDER TOTAL
    // ==================================================

    const roundedSubtotal = roundMoney(subtotal);

    // Paketsumman ska alltid bli exakt 249,00 kr inklusive 6 % moms.
    // Stoppa hela beställningen vid oväntad avrundning eller felkonfiguration.
    if (soloBundle &&
        Math.round((roundedSubtotal + roundMoney(roundedSubtotal * VAT_RATE)) * 100) !== MANILA_SOLO_PRICE_ORE) {
      return res.status(503).json({
        success: false,
        message: "Manila Solo-priset kunde inte verifieras."
      });
    }

    // Produkter inklusive moms, före rabatt
    const productTotalBeforeDiscount = roundMoney(
      roundedSubtotal +
      roundMoney(roundedSubtotal * VAT_RATE)
    );

    // Rabatt gäller endast produkter, inte leverans
    const discountAmount = appliedDiscount
      ? calculateProductDiscount(
        productTotalBeforeDiscount,
        appliedDiscount
      )
      : 0;

    // Produktvärde inklusive moms, efter rabatt
    const productTotal = roundMoney(
      productTotalBeforeDiscount - discountAmount
    );

    // Räkna om moms efter rabatt
    const roundedVat = roundMoney(
      productTotal * VAT_RATE / (1 + VAT_RATE)
    );

    const subtotalAfterDiscount = roundMoney(
      productTotal - roundedVat
    );

    // Fri leverans baseras på produktvärdet efter rabatt
    const qualifiesForFreeDelivery =
      productTotal >= FREE_DELIVERY_THRESHOLD;

    const roundedDeliveryFee = roundMoney(
      deliveryMethod === "delivery" &&
        deliveryZone &&
        !qualifiesForFreeDelivery
        ? deliveryZone.fee
        : 0
    );

    const roundedTotal = roundMoney(
      productTotal + roundedDeliveryFee
    );

    // ==================================================
    // CREATE ORDER
    // ==================================================

    
    const newOrder = new orderModel({
      userId,

      items: verifiedItems,

      bundles: soloBundle
        ? [{
            bundleKey: "solo-1",
            type: "manila-solo",
            name: "Manila Solo",
            quantity: 1,
            products: soloBundle.items.map(item => ({
              productId: item.productId,
              name: item.name,
              group: item.group
            })),
            priceIncludingVat:
              MANILA_SOLO_PRICE_ORE / 100
          }]
        : [],

      fulfillmentType,
      deliveryMethod,

      requestedDate: createStoredDate(requestedDate),
      requestedTime,

      discountCode: appliedDiscount
        ? appliedDiscount.code
        : null,

      discountId: appliedDiscount?._id || null,
      discountAmount,

      discountType: appliedDiscount
        ? appliedDiscount.type
        : null,

      discountValue: appliedDiscount
        ? appliedDiscount.value
        : 0,

      discountReservationStatus: "none",
      discountReservedAt: null,

      subtotal: subtotalAfterDiscount,
      vatRate: 6,
      vatAmount: roundedVat,
      amount: roundedTotal,

      address: {
        firstName,
        lastName,
        email,
        phone,
        street,
        city,
        zipcode
      },

      status: "Inväntar betalning",
      payment: false,
      paymentMethod: "Stripe"
    });

    // Order will be saved atomically with the discount reservation
    // after validating the Stripe line items.

    // ==================================================
    // STRIPE CHECKOUT - PRODUCTS WITH DISCOUNT
    // ==================================================

    const lineItems = [];

    // Produktvärdet efter rabatt, exklusive moms
    const productNetCents = Math.round(
      subtotalAfterDiscount * 100
    );

    // One aggregated product line avoids per-item rounding differences.
    if (productNetCents > 0) {
      lineItems.push({
        price_data: {
          currency: "sek",
          product_data: {
            name: "Manilacafe - produkter",
            ...(appliedDiscount ? { description: `Rabattkod: ${appliedDiscount.code}` } : {})
          },
          unit_amount: productNetCents
        },
        quantity: 1
      });
    }

    // Moms efter rabatt
    if (roundedVat > 0) {
      lineItems.push({
        price_data: {
          currency: "sek",
          product_data: {
            name: "Moms 6%"
          },
          unit_amount: Math.round(roundedVat * 100)
        },
        quantity: 1
      });
    }

    // Leveransavgift påverkas inte av rabatten
    if (roundedDeliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "sek",
          product_data: {
            name: deliveryZone?.label
              ? `Leveransavgift ${deliveryZone.label}`
              : "Leverans"
          },
          unit_amount: Math.round(
            roundedDeliveryFee * 100
          )
        },
        quantity: 1
      });
    }

    // Kontrollera att Stripe får exakt samma belopp
    // som sparats på ordern.
    const stripeTotalCents = lineItems.reduce(
      (sum, item) =>
        sum +
        item.price_data.unit_amount * item.quantity,
      0
    );

    const expectedTotalCents = Math.round(
      roundedTotal * 100
    );

    if (stripeTotalCents !== expectedTotalCents) {
      throw new Error(
        `STRIPE_TOTAL_MISMATCH: ${stripeTotalCents} !== ${expectedTotalCents}`
      );
    }

    // Stripe Checkout kräver ett positivt belopp
    // i detta betalningsflöde.
    if (expectedTotalCents <= 0) {
      throw new Error("ORDER_TOTAL_MUST_BE_POSITIVE");
    }


    const frontendUrl = (
      process.env.FRONTEND_URL ||
      "http://localhost:5173"
    )
      .trim()
      .replace(/\/+$/, "");



    // Save order and reserve code in a single MongoDB transaction.
    const reservationSession = await mongoose.startSession();
    try {
      await reservationSession.withTransaction(async () => {
        if (appliedDiscount) {
          const reserved = await reserveDiscount(appliedDiscount._id, reservationSession);
          if (!reserved) throw new Error("DISCOUNT_UNAVAILABLE");
          newOrder.discountReservationStatus = "reserved";
          newOrder.discountReservedAt = new Date();
        }
        await newOrder.save({ session: reservationSession });
      });
    } catch (reservationError) {
      if (reservationError.message === "DISCOUNT_UNAVAILABLE") {
        return res.status(409).json({ success: false, message: "Rabattkoden är inte längre tillgänglig." });
      }
      throw reservationError;
    } finally {
      await reservationSession.endSession();
    }

    let stripeSession;

    try {

      stripeSession =

        await stripe.checkout.sessions.create({

          line_items: lineItems,

          mode: "payment",
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,

          success_url:

            `${frontendUrl}/verify?success=true&orderId=${newOrder._id}&session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:

            `${frontendUrl}/verify?success=false&orderId=${newOrder._id}`,

          client_reference_id:

            newOrder._id.toString(),

          metadata: {

            orderId: newOrder._id.toString(),

            userId: userId

              ? userId.toString()

              : "guest",

            deliveryMethod,

            fulfillmentType,

            requestedDate,

            requestedTime,

            vatRate: "6",

            subtotal:

              subtotalAfterDiscount.toString(),

            vatAmount:
              roundedVat.toString(),
            deliveryFee:
              roundedDeliveryFee.toString(),
            deliveryZone:
              deliveryZone?.id || "pickup",
            deliveryZoneLabel:
              deliveryZone?.label || "Avhämtning",
            freeDelivery:
              (
                deliveryMethod === "delivery" &&
                qualifiesForFreeDelivery
              ).toString(),
            total:
              roundedTotal.toString()

          },

          payment_intent_data: {

            metadata: {

              orderId:

                newOrder._id.toString(),

              userId: userId

                ? userId.toString()

                : "guest"

            }

          }

        }, { idempotencyKey: `Manila-checkout-${newOrder._id.toString()}` });



      newOrder.stripeSessionId = stripeSession.id;

      await newOrder.save();

    } catch (stripeError) {

      if (stripeSession?.id) {

        try {

          await stripe.checkout.sessions.expire(

            stripeSession.id

          );

        } catch (expireError) {

          console.error(

            "Could not expire Stripe session:",

            expireError.message

          );

        }

      }



      // IMPORTANT: A Stripe create request may have succeeded even when its
      // response was lost. Without a confirmed session status, NEVER release
      // the reservation or delete the order. Reconciliation is required.
      if (stripeSession?.id) {
        try {
          const latest = await stripe.checkout.sessions.retrieve(stripeSession.id);
          if (latest.status === "expired") {
            // If saving stripeSessionId failed, link the confirmed expired
            // session before releasing the order's reservation.
            await orderModel.updateOne(
              { _id: newOrder._id, payment: false, stripeSessionId: { $exists: false } },
              { $set: { stripeSessionId: stripeSession.id } }
            );
            await releaseOrderDiscount(newOrder._id, stripeSession.id);
          }
        } catch (reconciliationError) {
          console.error("Stripe status uncertain; reservation retained:", reconciliationError.message);
        }
      }
      // Without stripeSession.id the request outcome is ambiguous.
      // Leave the order/reservation for a separate reconciliation job.
      throw stripeError;

    }



    return res.status(201).json({

      success: true,

      message: "Beställningen har skapats.",

      subtotal: roundedSubtotal,

      vatRate: 6,

      vatAmount: roundedVat,
      deliveryFee: roundedDeliveryFee,
      deliveryZone:
        deliveryZone?.id || null,
      deliveryZoneLabel:
        deliveryZone?.label || null,
      freeDelivery:
        deliveryMethod === "delivery" &&
        qualifiesForFreeDelivery,
      amount: roundedTotal,
      deliveryMethod,

      fulfillmentType,

      requestedDate,

      requestedTime,

      session_url: stripeSession.url,

      orderId: newOrder._id

    });

  } catch (error) {
    console.error("Place order error:", error);
    console.error("Place order stack:", error.stack);


    return res.status(500).json({

      success: false,

      message:

        "Ett fel uppstod när beställningen skulle skapas."

    });

  }

};



const verifyOrder = async (req, res) => {

  try {

    const {

      orderId,

      sessionId,

      success

    } = req.body || {};



    if (

      !orderId ||

      !mongoose.isValidObjectId(orderId)

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Ogiltigt eller saknat order-ID."

      });

    }



    if (

      success === false ||

      success === "false"

    ) {

      return res.status(200).json({

        success: false,

        message: "Betalningen avbröts."

      });

    }



    if (

      success !== true &&

      success !== "true"

    ) {

      return res.status(400).json({

        success: false,

        message: "Ogiltig betalningsstatus."

      });

    }



    if (!sessionId) {

      return res.status(400).json({

        success: false,

        message: "Stripe session-ID saknas."

      });

    }



    const stripe = getStripe();



    if (!stripe) {

      return res.status(500).json({

        success: false,

        message: "Stripe är inte konfigurerat."

      });

    }



    const stripeSession =

      await stripe.checkout.sessions.retrieve(

        sessionId

      );



    if (

      stripeSession.metadata?.orderId !==

      orderId.toString()

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Stripe-betalningen matchar inte beställningen."

      });

    }



    const result =

      await processPaidCheckoutSession(

        stripeSession

      );



    await sendOrderConfirmationSafely(orderId);



    return res.status(200).json({

      success: true,

      message: result.warning

        ? "Betalningen lyckades, men ordern behöver lagerkontrolleras."

        : result.alreadyProcessed

          ? "Beställningen är redan betald."

          : "Betalningen lyckades.",

      warning: result.warning,

      data: result.order

    });

  } catch (error) {

    console.error(

      "Verify order error:",

      error.message

    );



    const validationMessage =

      getStripeValidationMessage(error);



    if (validationMessage) {

      return res.status(400).json({

        success: false,

        message: validationMessage

      });

    }



    if (error.message === "ORDER_NOT_FOUND") {

      return res.status(404).json({

        success: false,

        message:

          "Beställningen kunde inte hittas."

      });

    }



    return res.status(500).json({

      success: false,

      message:

        "Ett fel uppstod när betalningen skulle verifieras."

    });

  }

};



const stripeWebhook = async (req, res) => {

  const stripe = getStripe();



  if (!stripe) {

    return res.status(500).send(

      "Stripe is not configured"

    );

  }



  if (!process.env.STRIPE_WEBHOOK_SECRET) {

    console.error(

      "STRIPE_WEBHOOK_SECRET is missing."

    );



    return res.status(500).send(

      "Stripe webhook is not configured"

    );

  }



  const signature =

    req.headers["stripe-signature"];



  if (!signature) {

    return res.status(400).send(

      "Stripe signature is missing"

    );

  }



  let event;



  try {

    event = stripe.webhooks.constructEvent(

      req.body,

      signature,

      process.env.STRIPE_WEBHOOK_SECRET

    );

  } catch (error) {

    console.error(

      "Stripe webhook signature error:",

      error.message

    );



    return res.status(400).send(

      "Invalid Stripe webhook signature"

    );

  }



  try {

    if (

      event.type ===

      "checkout.session.completed" ||

      event.type ===

      "checkout.session.async_payment_succeeded"

    ) {

      const stripeSession = event.data.object;



      if (

        stripeSession.payment_status === "paid"

      ) {

        const result =

          await processPaidCheckoutSession(

            stripeSession

          );



        await sendOrderConfirmationSafely(

          stripeSession.metadata?.orderId

        );



        console.log(

          "Stripe payment processed:",

          {

            eventId: event.id,

            sessionId: stripeSession.id,

            orderId:

              stripeSession.metadata?.orderId,

            alreadyProcessed:

              result.alreadyProcessed,

            warning: result.warning

          }

        );

      }

    }



    if (

      event.type ===

      "checkout.session.expired"

    ) {

      const stripeSession = event.data.object;

      const orderId =

        stripeSession?.metadata?.orderId;



      if (

        orderId &&

        mongoose.isValidObjectId(orderId)

      ) {

        await orderModel.updateOne(

          {

            _id: orderId,

            payment: false,

            $or: [

              {

                stripeSessionId:

                  stripeSession.id

              },

              {

                stripeSessionId: {

                  $exists: false

                }

              },

              {

                stripeSessionId: null

              }

            ]

          },

          {

            $set: {

              status: "Avbruten"

            }

          }

        );
        // A webhook can arrive before the session ID was persisted.
        // Link the exact Stripe session (identified by signed metadata) first.
        await orderModel.updateOne(
          {
            _id: orderId, payment: false,
            $or: [{ stripeSessionId: { $exists: false } }, { stripeSessionId: null }]
          },
          { $set: { stripeSessionId: stripeSession.id } }
        );
        await releaseOrderDiscount(orderId, stripeSession.id);

      }

    }



    return res.status(200).json({

      received: true

    });

  } catch (error) {

    console.error(

      "Stripe webhook processing error:",

      error.message

    );



    return res.status(500).send(

      "Webhook processing failed"

    );

  }

};



const userOrders = async (req, res) => {

  try {

    const userId = req.userId;



    if (!userId) {

      return res.status(401).json({

        success: false,

        message: "Du måste vara inloggad."

      });

    }



    if (!mongoose.isValidObjectId(userId)) {

      return res.status(400).json({

        success: false,

        message: "Ogiltigt användar-ID."

      });

    }



    const orders = await orderModel

      .find({ userId })

      .sort({ createdAt: -1 });



    return res.status(200).json({

      success: true,

      count: orders.length,

      data: orders

    });

  } catch (error) {

    console.error(

      "User orders error:",

      error.message

    );



    return res.status(500).json({

      success: false,

      message:

        "Beställningarna kunde inte hämtas."

    });

  }

};



const listOrders = async (req, res) => {

  try {

    const orders = await orderModel

      .find({})

      .sort({ createdAt: -1 });



    return res.status(200).json({

      success: true,

      count: orders.length,

      data: orders

    });

  } catch (error) {

    console.error(

      "List orders error:",

      error.message

    );



    return res.status(500).json({

      success: false,

      message:

        "Beställningarna kunde inte hämtas."

    });

  }

};



// All kitchen writes are per order and concurrency-controlled using kitchenProgress.version.
// A stale device must reload rather than overwrite someone else's work.
const kitchenUnits = (order) => (Array.isArray(order.items) ? order.items : [])
  .flatMap((item, row) => Array.from({ length: Number(item.quantity || 0) }, (_, unit) => `${row}:${unit}`));

const updateKitchenProgress = async (req, res) => {
  const orderId = req.params.orderId;
  const { action, unitKey, expectedVersion } = req.body || {};
  if (!mongoose.isValidObjectId(orderId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 ||
      !["check", "uncheck", "pack", "unpack"].includes(action)) {
    return res.status(400).json({ success: false, message: "Ogiltig köksuppdatering." });
  }
  try {
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Ordern finns inte." });
    if (!order.payment || ["Avbruten", "Levererad", "Upphämtad"].includes(order.status) ||
        order.status === "Betalning mottagen - lagerkontroll krävs") {
      return res.status(409).json({ success: false, message: "Ordern kan inte ändras i köket just nu.", data: order });
    }
    const validKeys = kitchenUnits(order);
    if (!validKeys.length || validKeys.length > 1000) {
      return res.status(409).json({ success: false, message: "Orderns produktantal behöver kontrolleras." });
    }
    const checked = new Set(order.kitchenProgress?.checkedUnits || []);
    const currentVersion = Number(order.kitchenProgress?.version || 0);
    if (currentVersion !== expectedVersion) {
      return res.status(409).json({ success: false, message: "Ordern har ändrats på en annan enhet. Kontrollera senaste status.", data: order });
    }
    if (action === "check" || action === "uncheck") {
      if (typeof unitKey !== "string" || !validKeys.includes(unitKey)) {
        return res.status(400).json({ success: false, message: "Ogiltig produkt i checklistan." });
      }
      if (action === "check") checked.add(unitKey);
      else checked.delete(unitKey);
    }
    const allChecked = validKeys.every(key => checked.has(key)) && checked.size === validKeys.length;
    if (action === "pack" && !allChecked) {
      return res.status(409).json({ success: false, message: "Alla produkter måste vara klara före packning.", data: order });
    }
    const packed = action === "pack" ? true : action === "unpack" ? false : false;
    const filter = { _id: orderId, payment: true, status: order.status,
      $or: [{ "kitchenProgress.version": expectedVersion },
        ...(expectedVersion === 0 ? [{ "kitchenProgress.version": { $exists: false } }] : [])] };
    const updated = await orderModel.findOneAndUpdate(filter, {
      $set: { "kitchenProgress.checkedUnits": validKeys.filter(key => checked.has(key)),
        "kitchenProgress.packed": packed, "kitchenProgress.updatedAt": new Date() },
      $inc: { "kitchenProgress.version": 1 }
    }, { new: true, runValidators: true });
    if (!updated) {
      const latest = await orderModel.findById(orderId);
      return res.status(409).json({ success: false, message: "En annan ändring hann sparas. Kontrollera ordern igen.", data: latest });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Kitchen progress error:", error);
    return res.status(500).json({ success: false, message: "Köksuppdateringen kunde inte sparas." });
  }
};

const updateStatus = async (req, res) => {
  const { orderId, status } = req.body || {};
  if (!mongoose.isValidObjectId(orderId) || typeof status !== "string" ||
      !ALLOWED_ORDER_STATUSES.includes(status.trim())) {
    return res.status(400).json({ success: false, message: "Ogiltigt order-ID eller orderstatus." });
  }
  const normalizedStatus = status.trim();
  try {
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Ordern finns inte." });
    if (["Upphämtad", "Levererad", "Avbruten"].includes(order.status)) {
      return res.status(409).json({ success: false, message: "Avslutade beställningar kan inte ändras här." });
    }
    if (normalizedStatus !== "Avbruten" && !order.payment) {
      return res.status(409).json({ success: false, message: "Beställningen är inte betald." });
    }
    if (normalizedStatus !== "Avbruten" && order.status === "Betalning mottagen - lagerkontroll krävs") {
      return res.status(409).json({ success: false, message: "Lagerkontrollen måste lösas innan status ändras." });
    }
    const readyStatuses = ["Redo för upphämtning", "På väg", "Upphämtad", "Levererad"];
    const needsKitchen = readyStatuses.includes(normalizedStatus);
    if ((normalizedStatus === "Redo för upphämtning" || normalizedStatus === "Upphämtad") && order.deliveryMethod !== "pickup" ||
        (normalizedStatus === "På väg" || normalizedStatus === "Levererad") && order.deliveryMethod !== "delivery") {
      return res.status(409).json({ success: false, message: "Statusen matchar inte leveranssättet." });
    }
    const allKeys = kitchenUnits(order);
    const checked = order.kitchenProgress?.checkedUnits || [];
    const allReady = allKeys.length > 0 && checked.length === allKeys.length &&
      allKeys.every(key => checked.includes(key)) && order.kitchenProgress?.packed === true;
    if (needsKitchen && !allReady) {
      return res.status(409).json({ success: false, message: "Bocka av alla produkter och kontrollera packningen först." });
    }
    // Atomic filter re-checks packed and checklist version; no bypass via direct API calls.
    const filter = { _id: orderId, status: order.status, payment: order.payment };
    if (needsKitchen) {
      filter["kitchenProgress.packed"] = true;
      filter["kitchenProgress.version"] = Number(order.kitchenProgress?.version || 0);
    }
    const updated = await orderModel.findOneAndUpdate(filter, { $set: { status: normalizedStatus } },
      { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ success: false, message: "Ordern ändrades precis. Uppdatera och försök igen." });
    return res.json({ success: true, message: "Orderstatus uppdaterad.", data: updated });
  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({ success: false, message: "Orderstatus kunde inte uppdateras." });
  }
};


export {

  placeOrder,

  verifyOrder,

  stripeWebhook,

  userOrders,

  listOrders,

  updateStatus,
  updateKitchenProgress

};