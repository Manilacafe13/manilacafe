import orderModel from "../models/orderModel.js";

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
    label: "Nordöstra Göteborg / Angered",
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
  // 11. VÄSTRA GÖTEBORG
  //
  // Majorna
  // Högsbo
  // Näset
  // Önnered
  // Fiskebäck m.fl.
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
    normalizedCity.includes("grabo")
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



const getAllowedTimeSlotsForDate = (dateString) => {

  const date =

    new Date(`${dateString}T12:00:00.000Z`);



  const day =

    date.getUTCDay();



  // Monday + Tuesday - closed

  if (day === 1 || day === 2) {

    return [];

  }



  // Friday + Saturday: 16:00 - 23:00

  if (day === 5 || day === 6) {

    return [

      "16:00-17:00",

      "17:00-18:00",

      "18:00-19:00",

      "19:00-20:00",

      "20:00-21:00",

      "21:00-22:00",

      "22:00-23:00"

    ];

  }



  // Wednesday + Thursday + Sunday: 15:00 - 21:00

  return [

    "15:00-16:00",

    "16:00-17:00",

    "17:00-18:00",

    "18:00-19:00",

    "19:00-20:00",

    "20:00-21:00"

  ];

};

const ALLOWED_ORDER_STATUSES = [

  "BestÃ¤llning mottagen",

  "FÃ¶rbereds",

  "Redo fÃ¶r upphÃ¤mtning",

  "UpphÃ¤mtad",

  "PÃ¥ vÃ¤g",

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

        `${productName} har inte längre tillräkligt dagslager.`;



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

          for (const item of order.items) {

            const product = await foodModel

              .findById(item._id)

              .session(mongoSession);



            const quantity = Number(item.quantity);

            const sameDayStock = Number(

              product?.sameDayStock || 0

            );



            if (

              !product ||

              !Number.isInteger(quantity) ||

              quantity <= 0 ||

              !Number.isFinite(sameDayStock) ||

              sameDayStock < quantity

            ) {

              throw new Error(

                `SAME_DAY_STOCK:${item.name}`

              );

            }

          }



          for (const item of order.items) {

            const quantity = Number(item.quantity);



            const updateResult =

              await foodModel.updateOne(

                {

                  _id: item._id,

                  sameDayStock: {

                    $gte: quantity

                  }

                },

                {

                  $inc: {

                    sameDayStock: -quantity

                  }

                },

                {

                  session: mongoSession

                }

              );



            if (updateResult.modifiedCount !== 1) {

              throw new Error(

                `SAME_DAY_STOCK:${item.name}`

              );

            }

          }

        }



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

      requestedTime

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

          "Fullständig leveransadress måsste fyllas i."

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

            ? "Manila CafÃ© har stängt på det valda datumet."

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

          "Större beställningar måste göras minst 48 timmar i förväg."

      });

    }



    const stripe = getStripe();



    if (!stripe) {

      return res.status(500).json({

        success: false,

        message: "Stripe är inte konfigurerat."

      });

    }



    const normalizedItems = [];

    const productIds = [];



    for (const item of items) {

      const productId =

        item?._id || item?.id || item?.itemId;



      const quantity = Number(item?.quantity);



      if (

        !productId ||

        !mongoose.isValidObjectId(productId)

      ) {

        return res.status(400).json({

          success: false,

          message: "Ogiltigt produkt-ID."

        });

      }



      if (

        !Number.isInteger(quantity) ||

        quantity <= 0 ||

        quantity > MAX_ITEM_QUANTITY

      ) {

        return res.status(400).json({

          success: false,

          message:

            `Du kan beställa högst ${MAX_ITEM_QUANTITY} st av samma produkt.`

        });

      }



      const idString = productId.toString();



      normalizedItems.push({

        productId: idString,

        quantity

      });



      productIds.push(idString);

    }



    const uniqueProductIds = [

      ...new Set(productIds)

    ];



    if (

      uniqueProductIds.length !==

      productIds.length

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Samma produkt får inte förekomma flera gånger i beställningen."

      });

    }



    const products = await foodModel.find({

      _id: {

        $in: uniqueProductIds

      }

    });



    const productMap = new Map(

      products.map((product) => [

        product._id.toString(),

        product

      ])

    );



    const verifiedItems = [];

    let subtotal = 0;

    let totalQuantity = 0;



    for (const item of normalizedItems) {

      const product = productMap.get(

        item.productId

      );



      if (!product) {

        return res.status(404).json({

          success: false,

          message:

            "En eller flera produkter kunde inte hittas."

        });

      }



      const price = Number(product.price);



      if (

        !Number.isFinite(price) ||

        price < 0

      ) {

        return res.status(400).json({

          success: false,

          message: "Ogiltigt produktpris."

        });

      }



      if (fulfillmentType === "same-day") {

        const sameDayStock = Number(

          product.sameDayStock || 0

        );



        if (

          !Number.isFinite(sameDayStock) ||

          sameDayStock < item.quantity

        ) {

          return res.status(409).json({

            success: false,

            message:

              `${product.name} finns inte i tillräcklig antal för beställning idag.`

          });

        }

      }



      subtotal += price * item.quantity;

      totalQuantity += item.quantity;



      verifiedItems.push({

        _id: product._id,

        name: product.name,

        price,

        quantity: item.quantity,

        image: product.image

      });

    }



    if (

      totalQuantity >= LARGE_ORDER_LIMIT &&

      fulfillmentType !== "large-order"

    ) {

      return res.status(400).json({

        success: false,

        message:

          `Beställningar med ${LARGE_ORDER_LIMIT} produkter eller fler måste göras som en störrre beställning.`

      });

    }



    const roundedSubtotal = roundMoney(subtotal);

    const roundedVat = roundMoney(
      subtotal * VAT_RATE
    );

    const productTotal = roundMoney(
      roundedSubtotal + roundedVat
    );

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



    const newOrder = new orderModel({

      userId,

      items: verifiedItems,

      deliveryMethod,

      fulfillmentType,

      requestedDate:

        createStoredDate(requestedDate),

      requestedTime,

      address: {

        firstName,

        lastName,

        email,

        phone,

        street:

          deliveryMethod === "delivery"

            ? street

            : "",

        city:

          deliveryMethod === "delivery"

            ? city

            : "",

        zipcode:

          deliveryMethod === "delivery"

            ? zipcode

            : ""

      },

      subtotal: roundedSubtotal,

      vatRate: 6,

      vatAmount: roundedVat,

      amount: roundedTotal,

      payment: false,

      paymentMethod: "Stripe",

      status: "Inväntar betalning"

    });



    await newOrder.save();



    const lineItems = verifiedItems.map(

      (item) => ({

        price_data: {

          currency: "sek",

          product_data: {

            name: item.name

          },

          unit_amount: Math.round(

            item.price * 100

          )

        },

        quantity: item.quantity

      })

    );



    if (roundedVat > 0) {

      lineItems.push({

        price_data: {

          currency: "sek",

          product_data: {

            name: "Moms 6%"

          },

          unit_amount: Math.round(

            roundedVat * 100

          )

        },

        quantity: 1

      });

    }

    if (roundedDeliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "sek",
          product_data: {
            name: deliveryZone?.label
              ? `Leverans â€“ ${deliveryZone.label}`
              : "Leverans"
          },
          unit_amount: Math.round(
            roundedDeliveryFee * 100
          )
        },
        quantity: 1
      });
    }





   const frontendUrl = (
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .trim()
  .replace(/\/+$/, "");



    let stripeSession;



    try {

      stripeSession =

        await stripe.checkout.sessions.create({

          line_items: lineItems,

          mode: "payment",

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

              roundedSubtotal.toString(),

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

        });



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



      await orderModel.findByIdAndDelete(

        newOrder._id

      );



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

          "Beställningen kunde inte hittas."

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