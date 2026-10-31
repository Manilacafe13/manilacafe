import orderModel from "../models/orderModel.js";

import discountModel from "../models/discountModel.js";

import { reserveDiscount, releaseDiscount, redeemDiscount } from "../services/discountService.js";

import userModel from "../models/userModel.js";

import foodModel from "../models/foodmodel.js";

import mongoose from "mongoose";

import Stripe from "stripe";

import validator from "validator";

import { sendOrderConfirmation } from "../services/orderEmail.js";



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

// Ordern fÃ¥r enbart innehÃ¥lla IDs och antal frÃ¥n kunden.
// Namn och priser tas alltid frÃ¥n MongoDB, aldrig frÃ¥n req.body.
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
      throw new Error("En ingrediens har valts flera gÃ¥nger.");
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
      throw new Error("Samma tillval har valts flera gÃ¥nger.");
    }
    extraSeen.add(optionId);
    extras.push({ optionId, quantity: extra.quantity });
  }
  extras.sort((a, b) => a.optionId.localeCompare(b.optionId));

  if (!removedIngredientIds.length && !extras.length) {
    throw new Error("VÃ¤lj minst en anpassning eller bestÃ¤ll standardprodukten.");
  }

  return { removedIngredientIds, extras };
};

const getOrderSelectionKey = (productId, selection) => {
  if (!selection) return `${productId}:standard`;
  return `${productId}:custom:${selection.removedIngredientIds.join(".")}:${
    selection.extras.map(e => `${e.optionId}x${e.quantity}`).join(".")
  }`;
};

// Schema-spÃ¤rr: gamla orderModel.js skulle annars tyst kasta bort
// anpassningarna nÃ¤r ordern sparas. Det fÃ¥r aldrig leda till betalning.
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
    if (!option) throw new Error(`Ett bortval fÃ¶r ${product.name} Ã¤r inte lÃ¤ngre tillgÃ¤ngligt.`);
    return { optionId: option._id, name: String(option.name || "") };
  });

  let extraCents = 0;
  const extras = selection.extras.map(({ optionId, quantity }) => {
    const option = extrasMap.get(optionId);
    if (!option) throw new Error(`Ett tillval fÃ¶r ${product.name} Ã¤r inte lÃ¤ngre tillgÃ¤ngligt.`);
    const price = Number(option.price);
    const maxQuantity = Number(option.maxQuantity ?? 1);
    if (
      !Number.isFinite(price) || price < 0 || price > MAX_OPTION_PRICE ||
      !Number.isInteger(maxQuantity) || maxQuantity < 1 ||
      maxQuantity > MAX_EXTRA_QUANTITY || quantity > maxQuantity
    ) {
      throw new Error(`Ett tillval fÃ¶r ${product.name} har Ã¤ndrats.`);
    }
    extraCents += Math.round(price * 100) * quantity;
    return { optionId: option._id, name: String(option.name || ""), quantity,
      price: Math.round(price * 100) / 100 };
  });

  return { removedIngredients, extras, extraCents };
};

// Gruppvis lagerhantering behÃ¶vs nÃ¤r samma produkt bestÃ¤lls bÃ¥de
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
    label: "FrÃ¶lunda",
    fee: 0
  },

  west: {
    id: "west",
    label: "VÃ¤stra GÃ¶teborg",
    fee: 39
  },

  central: {
    id: "central",
    label: "Centrala GÃ¶teborg",
    fee: 59
  },

  hisingen: {
    id: "hisingen",
    label: "Hisingen / Norra GÃ¶teborg",
    fee: 59
  },

  south: {
    id: "south",
    label: "SÃ¶dra GÃ¶teborg / MÃ¶lndal",
    fee: 49
  },

  east: {
    id: "east",
    label: "vÃ¤stra GÃ¶tteborg",
    fee: 69
  },

  northeast: {
    id: "northeast",
    label: "NordvÃ¤stra GÃ¶teborg / Angered",
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
    label: "GrÃ¥bo",
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
// GRÃƒâ€¦BO POSTCODES
//
// Viktigt:
// 443 anvÃƒÂ¤nds ÃƒÂ¤ven av Lerum och Stenkullen.
// DÃƒÂ¤rfÃƒÂ¶r kontrollerar vi GrÃƒÂ¥bo EXAKT innan 443-zonen.
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


  // Vi behÃƒÂ¶ver ett riktigt postnummer fÃƒÂ¶r sÃƒÂ¤ker zonberÃƒÂ¤kning
  if (normalizedZip.length !== 5) {
    return null;
  }


  // ====================================================
  // 1. FRÃƒâ€“LUNDA
  // GRATIS
  // ====================================================

  if (
    normalizedZip.startsWith("421")
  ) {
    return DELIVERY_ZONES.frolunda;
  }


  // ====================================================
  // 2. GRÃƒâ€¦BO
  // Kontrollera fÃƒÂ¶re Lerum eftersom bÃƒÂ¥da anvÃƒÂ¤nder 443
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
  // HedeomrÃƒÂ¥det i Kungsbacka fÃƒÂ¥ngas dÃƒÂ¤rfÃƒÂ¶r hÃƒÂ¤r ocksÃƒÂ¥.
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


  // 443 som INTE redan matchats som GrÃƒÂ¥bo
  if (
    normalizedZip.startsWith("443")
  ) {
    return DELIVERY_ZONES.partilleLerum;
  }


  // ====================================================
  // 6. HISINGEN / NORRA GÃƒâ€“TEBORG
  //
  // Lundby
  // Backa
  // BiskopsgÃƒÂ¥rden
  // Tuve
  // KÃƒÂ¤rra
  // Torslanda
  // SÃƒÂ¤ve m.fl.
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
  // 7. NORDÃƒâ€“STRA GÃƒâ€“TEBORG
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
  // 8. SÃƒâ€“DRA GÃƒâ€“TEBORG / MÃƒâ€“LNDAL
  //
  // Askim
  // HovÃƒÂ¥s
  // Billdal
  // MÃƒÂ¶lndal
  // KÃƒÂ¥llered
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
  // 9. Ãƒâ€“STRA GÃƒâ€“TEBORG
  //
  // Kortedala
  // BergsjÃƒÂ¶n
  // Gamlestaden
  // delar av Ãƒâ€“rgryte / HÃƒÂ¤rlanda
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
  // 10. CENTRALA GÃƒâ€“TEBORG
  //
  // Centrum
  // LinnÃƒÂ©
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
  // 11. VÃ¤sTRA GÃ¶TEBORG
  //
  // Majorna
  // HÃ¶gsbo
  // NÃ¤set
  // Angered
  // FiskebÃ¤ckk m.fl.
  //
  // 421 FrÃ¶lunda har redan fÃƒÂ¥ngats ovan.
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
  // AnvÃƒÂ¤nds endast nÃƒÂ¤r postnumret inte fÃƒÂ¥ngats ovan.
  // Vi anvÃƒÂ¤nder INTE bara "GÃƒÂ¶teborg", eftersom det
  // inte sÃƒÂ¤ger vilken del av GÃƒÂ¶teborg kunden bor i.
  // ====================================================

  if (
    normalizedCity.includes("grÃ¥bo")
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
  return "Stripe-betalningen matchar inte bestÃ¤llningen.";

case "STRIPE_SESSION_MISMATCH":
  return "Stripe-sessionen matchar inte bestÃ¤llningen.";

case "STRIPE_NOT_PAID":
  return "Betalningen Ã¤r inte genomfÃ¶rd.";

case "STRIPE_AMOUNT_MISMATCH":
  return "Betalningsbeloppet matchar inte bestÃ¤llningen.";



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

        `${productName} Har inte lÃ¤ngre tillrÃ¤cklig dagslager.`;



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
          // En produkt kan ligga pÃ¥ flera rader med olika kundval.
          // Dra av det SAMMANLAGDA antalet exakt en gÃ¥ng per produkt.
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

        message: "Din varukorg Ã¤r tom."

      });

    }



    if (

      !ALLOWED_DELIVERY_METHODS.includes(

        deliveryMethod

      )

    ) {

      return res.status(400).json({

        success: false,

        message: "VÃ¤lj avhÃ¤mtning eller leverans."

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

          "Namn, e-post och telefonnummer mÃ¥ste fyllas i."

      });

    }



    if (

      firstName.length > MAX_FIRST_NAME_LENGTH ||

      lastName.length > MAX_LAST_NAME_LENGTH

    ) {

      return res.status(400).json({

        success: false,

        message:

          "FÃ¶rnamn eller efternamn Ã¤r fÃ¶r lÃ¥ngt."

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

          "Leveransadressen innehÃ¥ller fÃ¶r lÃ¥nga uppgifter."

      });

    }



    if (

      deliveryMethod === "delivery" &&

      (!street || !city || !zipcode)

    ) {

      return res.status(400).json({

        success: false,

        message:

          "FullstÃ¤ndig leveransadress mÃ¥ste fyllas i."

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
            "Vi levererar tyvÃ¤rr inte till den hÃ¤r adressen."
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

        message: "Ogiltigt bestÃ¤llningsalternativ."

      });

    }



    if (!isValidDateString(requestedDate)) {

      return res.status(400).json({

        success: false,

        message: "Ogiltigt bestÃ¤llningsdatum."

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

            ? "ManilaCafe  har stÃ¤ngt pÃ¥ vald datumet."

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

          "BestÃ¤llning fÃ¶r idag mÃ¥ste ha dagens datum."

      });

    }



    if (

      fulfillmentType === "next-day" &&

      requestedDate !== tomorrow

    ) {

      return res.status(400).json({

        success: false,

        message:

          "BestÃ¤llning fÃ¶r imorgon mÃ¥ste ha morgondagens datum."

      });

    }



    if (

      fulfillmentType === "large-order" &&

      requestedDate < minimumLargeOrderDate

    ) {

      return res.status(400).json({

        success: false,

        message:

          "StÃ¶rre bestÃ¤llningar mÃ¥ste gÃ¶ras minst 48 timmar i fÃ¶rskott."

      });

    }



    const stripe = getStripe();



    if (!stripe) {

      return res.status(500).json({

        success: false,

        message: "Stripe Ã¤r inte konfigurerat."

      });

    }



    // ==================================================
    // ORDER ITEMS - VALIDERING OCH DEDUPLICERING
    // ==================================================
    if (items.length > MAX_ORDER_LINES) {
      return res.status(400).json({
        success: false,
        message: "FÃ¶r mÃ¥nga produktrader i bestÃ¤llningen."
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
          throw new Error(`Du kan bestÃ¤lla hÃ¶gst ${MAX_ITEM_QUANTITY} st av samma produkt.`);
        }

        const idString = productId.toLowerCase();
        const selection = Object.prototype.hasOwnProperty.call(item, "customizations")
          ? normalizeOrderSelection(item.customizations)
          : null;
        if (selection) hasCustomizations = true;

        const key = getOrderSelectionKey(idString, selection);
        if (uniqueLines.has(key)) {
          throw new Error("Samma produktvariant fÃ¥r inte fÃ¶rekomma flera gÃ¥nger.");
        }
        uniqueLines.add(key);

        const productQuantity = (quantitiesByProduct.get(idString) || 0) + quantity;
        if (productQuantity > MAX_ITEM_QUANTITY) {
          throw new Error(`Du kan bestÃ¤lla hÃ¶gst ${MAX_ITEM_QUANTITY} st av samma produkt, inklusive alla varianter.`);
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

    // SÃ¤kerhetsstopp: aktivera aldrig anpassade betalningar innan
    // orderModel har tvÃ¥ snapshot-arrayer fÃ¶r kundvalen.
    if (hasCustomizations && !orderSchemaSupportsCustomizations()) {
      return res.status(503).json({
        success: false,
        message: "Produktanpassningar Ã¤r Ã¤nnu inte aktiverade i ordersystemet."
      });
    }

    const products = await foodModel.find({ _id: { $in: [...productIds] } });
    const productMap = new Map(
      products.map(product => [String(product._id).toLowerCase(), product])
    );

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
          throw new Error(`Ogiltigt produktpris fÃ¶r ${product.name}.`);
        }

        const snapshot = item.selection
          ? resolveProductSelection(product, item.selection)
          : null;

        const unitCents = Math.round(basePrice * 100) + (snapshot?.extraCents || 0);
        if (!Number.isSafeInteger(unitCents) || unitCents > 10000000) {
          throw new Error(`Priset fÃ¶r ${product.name} Ã¤r fÃ¶r hÃ¶gt.`);
        }

        subtotalCents += unitCents * item.quantity;
        totalQuantity += item.quantity;

        verifiedItems.push({
          _id: product._id,
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

    // Lagerkrav kontrolleras pÃ¥ summerat antal, inte varje variant fÃ¶r sig.
    if (fulfillmentType === "same-day") {
      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productMap.get(productId);
        const stock = Number(product?.sameDayStock || 0);
        if (!Number.isInteger(stock) || stock < quantity) {
          return res.status(409).json({
            success: false,
            message: `${product.name} finns inte i tillrÃ¤ckligt antal fÃ¶r bestÃ¤llning idag.`
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

          `BestÃ¤llningar med ${LARGE_ORDER_LIMIT} produkter eller fler mÃ¥ste gÃ¶ras som en stÃ¶rrre bestÃ¤llning.`

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
          message: "Rabattkoden Ã¤r ogiltig."
        });
      }

      if (
        discount.expiresAt &&
        discount.expiresAt <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Rabattkoden har gÃ¥tt ut."
        });
      }

      if (
        discount.usageLimit !== null &&
(discount.usedCount + (discount.reservedCount || 0)) >= discount.usageLimit

      ) {
        return res.status(400).json({
          success: false,
          message: "Rabattkoden har nÃ¥tt sin anvÃ¤ndningsgrÃ¤ns."
        });
      }

      // ProduktvÃƒÂ¤rde inklusive moms, fÃƒÂ¶re rabatt
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
            `Rabattkoden krÃ¤ver ett produktkÃ¶p pÃ¥ minst ${discount.minOrderAmount} kr.`
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

    // Produkter inklusive moms, fÃƒÂ¶re rabatt
    const productTotalBeforeDiscount = roundMoney(
      roundedSubtotal +
      roundMoney(roundedSubtotal * VAT_RATE)
    );

    // Rabatt gÃƒÂ¤ller endast produkter, inte leverans
    const discountAmount = appliedDiscount
      ? calculateProductDiscount(
          productTotalBeforeDiscount,
          appliedDiscount
        )
      : 0;

    // ProduktvÃƒÂ¤rde inklusive moms, efter rabatt
    const productTotal = roundMoney(
      productTotalBeforeDiscount - discountAmount
    );

    // RÃƒÂ¤kna om moms efter rabatt
    const roundedVat = roundMoney(
      productTotal * VAT_RATE / (1 + VAT_RATE)
    );

    const subtotalAfterDiscount = roundMoney(
      productTotal - roundedVat
    );

    // Fri leverans baseras pÃƒÂ¥ produktvÃƒÂ¤rdet efter rabatt
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

    // ProduktvÃ¤rrdet efter rabatt, exklusive moms
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

    // Leveransavgift pÃƒÂ¥verkas inte av rabatten
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

    // Kontrollera att Stripe fÃƒÂ¥r exakt samma belopp
    // som sparats pÃƒÂ¥ ordern.
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

    // Stripe Checkout krÃƒÂ¤ver ett positivt belopp
    // i detta betalningsflÃƒÂ¶de.
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
        return res.status(409).json({ success: false, message: "Rabattkoden Ã¤r inte lÃ¤ngre tillgÃ¤nglig." });
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
            deliveryZone?.label || "AvhÃ¤mtning",
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

      message: "BestÃ¤llningen har skapats.",

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

        "Ett fel uppstod nÃ¤ bestÃ¤llningen skulle skapas."

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

        message: "Betalningen avbrÃ¶ts."

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

        message: "Stripe Ã¤r inte konfigurerat."

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

          "Stripe-betalningen matchar inte bestÃ¤llningen."

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

        ? "Betalningen lyckades, men ordern behÃ¶ver lagerkontrolleras."

        : result.alreadyProcessed

          ? "BestÃ¤llningen Ã¤r redan betald."

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

          "BestÃ¤llningen kunde inte hittas."

      });

    }



    return res.status(500).json({

      success: false,

      message:

        "Ett fel uppstod nÃ¤r betalningen skulle verifieras."

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
          { _id: orderId, payment: false,
            $or: [{ stripeSessionId: { $exists: false } }, { stripeSessionId: null }] },
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

        message: "Du mÃ¥ste vara inloggad."

      });

    }



    if (!mongoose.isValidObjectId(userId)) {

      return res.status(400).json({

        success: false,

        message: "Ogiltigt anvÃ¤ndar-ID."

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

        "BestÃ¤llningarna kunde inte hÃ¤mtas."

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

        "BestÃ¤llningarna kunde inte hÃ¤mtas."

    });

  }

};



const updateStatus = async (req, res) => {

  try {

    const {

      orderId,

      status

    } = req.body || {};



    if (!orderId || !status) {

      return res.status(400).json({

        success: false,

        message: "Order-ID och status krÃ¤vs."

      });

    }



    if (!mongoose.isValidObjectId(orderId)) {

      return res.status(400).json({

        success: false,

        message: "Ogiltigt order-ID."

      });

    }



    const normalizedStatus =

      String(status).trim();



    if (

      !ALLOWED_ORDER_STATUSES.includes(

        normalizedStatus

      )

    ) {

      return res.status(400).json({

        success: false,

        message: "Ogiltig orderstatus."

      });

    }



    const order =

      await orderModel.findByIdAndUpdate(

        orderId,

        {

          status: normalizedStatus

        },

        {

          new: true,

          runValidators: true

        }

      );



    if (!order) {

      return res.status(404).json({

        success: false,

        message:

          "BestÃ¤llningen kunde inte hittas."

      });

    }



    return res.status(200).json({

      success: true,

      message: "Orderstatus uppdaterad.",

      data: order

    });

  } catch (error) {

    console.error(

      "Update status error:",

      error.message

    );



    return res.status(500).json({

      success: false,

      message:

        "Orderstatus kunde inte uppdateras."

    });

  }

};



export {

  placeOrder,

  verifyOrder,

  stripeWebhook,

  userOrders,

  listOrders,

  updateStatus

};