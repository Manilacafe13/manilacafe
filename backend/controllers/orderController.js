import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import foodModel from "../models/foodmodel.js";
import mongoose from "mongoose";
import Stripe from "stripe";


// ======================================================
// SETTINGS
// ======================================================

const VAT_RATE = 0.06;
const LARGE_ORDER_LIMIT = 10;
const MAX_ITEM_QUANTITY = 99;

const ALLOWED_FULFILLMENT_TYPES = [
  "same-day",
  "next-day",
  "large-order"
];

const ALLOWED_DELIVERY_METHODS = [
  "pickup",
  "delivery"
];

const ALLOWED_TIME_SLOTS = [
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00"
];

const ALLOWED_ORDER_STATUSES = [
  "Beställning mottagen",
  "Förbereds",
  "Redo för upphämtning",
  "Upphämtad",
  "På väg",
  "Levererad",
  "Avbruten"
];


// ======================================================
// STRIPE
// ======================================================

const getStripe = () => {

  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(
    process.env.STRIPE_SECRET_KEY
  );

};


// ======================================================
// MONEY
// ======================================================

const roundMoney = (value) => {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Number(
    number.toFixed(2)
  );

};


// ======================================================
// DATE HELPERS
// ======================================================

const getSwedenDateString = (
  daysToAdd = 0
) => {

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    );

  const parts =
    formatter.formatToParts(
      new Date()
    );

  const year =
    Number(
      parts.find(
        (part) =>
          part.type === "year"
      )?.value
    );

  const month =
    Number(
      parts.find(
        (part) =>
          part.type === "month"
      )?.value
    );

  const day =
    Number(
      parts.find(
        (part) =>
          part.type === "day"
      )?.value
    );

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  date.setUTCDate(
    date.getUTCDate() +
    daysToAdd
  );

  return date
    .toISOString()
    .slice(0, 10);

};


const isValidDateString = (
  dateString
) => {

  if (
    typeof dateString !== "string"
  ) {
    return false;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateString
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${dateString}T12:00:00.000Z`
    );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date
      .toISOString()
      .slice(0, 10) ===
    dateString
  );

};


const createStoredDate = (
  dateString
) => {

  return new Date(
    `${dateString}T12:00:00.000Z`
  );

};


// ======================================================
// STRIPE HELPERS
// ======================================================

const getPaymentIntentId = (
  stripeSession
) => {

  if (
    typeof stripeSession?.payment_intent ===
    "string"
  ) {
    return stripeSession.payment_intent;
  }

  return (
    stripeSession?.payment_intent?.id ||
    undefined
  );

};


const validatePaidStripeSession = (
  order,
  stripeSession
) => {

  if (
    !stripeSession ||
    !stripeSession.id
  ) {
    throw new Error(
      "STRIPE_SESSION_MISSING"
    );
  }

  if (
    !stripeSession.metadata ||
    stripeSession.metadata.orderId !==
    order._id.toString()
  ) {
    throw new Error(
      "STRIPE_ORDER_MISMATCH"
    );
  }

  if (
    order.stripeSessionId &&
    order.stripeSessionId !==
    stripeSession.id
  ) {
    throw new Error(
      "STRIPE_SESSION_MISMATCH"
    );
  }

  if (
    stripeSession.payment_status !==
    "paid"
  ) {
    throw new Error(
      "STRIPE_NOT_PAID"
    );
  }

  const expectedAmount =
    Math.round(
      Number(
        order.amount
      ) *
      100
    );

  if (
    stripeSession.amount_total !==
    expectedAmount
  ) {
    throw new Error(
      "STRIPE_AMOUNT_MISMATCH"
    );
  }

  if (
    stripeSession.currency &&
    stripeSession.currency
      .toLowerCase() !==
    "sek"
  ) {
    throw new Error(
      "STRIPE_CURRENCY_MISMATCH"
    );
  }

};


const getStripeValidationMessage = (
  error
) => {

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


// ======================================================
// MARK PAID WITHOUT STOCK DECREASE
// Used if same-day stock changed before payment completed.
// ======================================================

const markPaidWithStockWarning =
  async (
    orderId,
    stripeSession,
    productName
  ) => {

    const mongoSession =
      await mongoose.startSession();

    try {

      let result = null;

      await mongoSession.withTransaction(
        async () => {

          const order =
            await orderModel
              .findById(orderId)
              .session(mongoSession);

          if (!order) {
            throw new Error(
              "ORDER_NOT_FOUND"
            );
          }

          validatePaidStripeSession(
            order,
            stripeSession
          );

          if (order.payment) {

            result = {
              alreadyProcessed: true,
              warning: null,
              order:
                order.toObject()
            };

            return;
          }

          const warning =
            `${productName} har inte lÃ¤ngre tillrÃ¤ckligt dagslager.`;

          order.payment =
            true;

          order.status =
            "Betalning mottagen - lagerkontroll krÃ¤vs";

          order.stripeSessionId =
            stripeSession.id;

          order.stripePaymentIntentId =
            getPaymentIntentId(
              stripeSession
            );

          order.paymentProcessedAt =
            new Date();

          await order.save({
            session:
              mongoSession
          });

          await userModel.findByIdAndUpdate(
            order.userId,
            {
              cartData: {}
            },
            {
              session:
                mongoSession
            }
          );

          result = {
            alreadyProcessed: false,
            warning,
            order:
              order.toObject()
          };

        }
      );

      return result;

    } finally {

      await mongoSession.endSession();

    }

  };


// ======================================================
// PROCESS PAID CHECKOUT SESSION
// Shared by webhook and /verify.
// MongoDB transaction makes processing idempotent.
// ======================================================

const processPaidCheckoutSession =
  async (
    stripeSession
  ) => {

    const orderId =
      stripeSession
        ?.metadata
        ?.orderId;

    if (
      !orderId ||
      !mongoose.isValidObjectId(
        orderId
      )
    ) {
      throw new Error(
        "ORDER_NOT_FOUND"
      );
    }

    const mongoSession =
      await mongoose.startSession();

    try {

      let result = null;

      try {

        await mongoSession.withTransaction(
          async () => {

            const order =
              await orderModel
                .findById(orderId)
                .session(mongoSession);

            if (!order) {
              throw new Error(
                "ORDER_NOT_FOUND"
              );
            }

            validatePaidStripeSession(
              order,
              stripeSession
            );

            // Already processed by webhook or /verify.
            if (order.payment) {

              result = {
                alreadyProcessed: true,
                warning: null,
                order:
                  order.toObject()
              };

              return;
            }

            // ==========================================
            // SAME-DAY STOCK
            // ==========================================

            if (
              order.fulfillmentType ===
              "same-day"
            ) {

              // First verify every product before
              // changing any stock.
              for (
                const item
                of order.items
              ) {

                const product =
                  await foodModel
                    .findById(
                      item._id
                    )
                    .session(
                      mongoSession
                    );

                const quantity =
                  Number(
                    item.quantity
                  );

                const sameDayStock =
                  Number(
                    product?.sameDayStock ||
                    0
                  );

                if (
                  !product ||
                  !Number.isInteger(
                    quantity
                  ) ||
                  quantity <= 0 ||
                  !Number.isFinite(
                    sameDayStock
                  ) ||
                  sameDayStock <
                  quantity
                ) {
                  throw new Error(
                    `SAME_DAY_STOCK:${item.name}`
                  );
                }

              }

              // Then decrease all stock inside
              // the same transaction.
              for (
                const item
                of order.items
              ) {

                const quantity =
                  Number(
                    item.quantity
                  );

                const updateResult =
                  await foodModel.updateOne(
                    {
                      _id:
                        item._id,

                      sameDayStock: {
                        $gte:
                          quantity
                      }
                    },
                    {
                      $inc: {
                        sameDayStock:
                          -quantity
                      }
                    },
                    {
                      session:
                        mongoSession
                    }
                  );

                if (
                  updateResult.modifiedCount !==
                  1
                ) {
                  throw new Error(
                    `SAME_DAY_STOCK:${item.name}`
                  );
                }

              }

            }

            // ==========================================
            // MARK PAID
            // ==========================================

            order.payment =
              true;

            order.status =
              "Betalning mottagen";

            order.stripeSessionId =
              stripeSession.id;

            order.stripePaymentIntentId =
              getPaymentIntentId(
                stripeSession
              );

            order.paymentProcessedAt =
              new Date();

            await order.save({
              session:
                mongoSession
            });

            // ==========================================
            // CLEAR CART
            // ==========================================

            await userModel.findByIdAndUpdate(
              order.userId,
              {
                cartData: {}
              },
              {
                session:
                  mongoSession
              }
            );

            result = {
              alreadyProcessed: false,
              warning: null,
              order:
                order.toObject()
            };

          }
        );

        return result;

      } catch (error) {

        if (
          String(
            error.message || ""
          ).startsWith(
            "SAME_DAY_STOCK:"
          )
        ) {

          const productName =
            String(
              error.message
            ).replace(
              "SAME_DAY_STOCK:",
              ""
            );

          /*
            The first transaction was aborted,
            so no partial stock decrease remains.
            Mark the paid order for manual stock review.
          */
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


// ======================================================
// PLACE ORDER
// ======================================================

const placeOrder = async (
  req,
  res
) => {

  try {

    const userId =
      req.userId;

    const {
      items,
      address,
      deliveryMethod,
      fulfillmentType,
      requestedDate,
      requestedTime
    } = req.body;

    // ==================================================
    // USER
    // ==================================================

    if (!userId) {

      return res.status(401).json({
        success: false,
        message:
          "Du mÃ¥ste vara inloggad."
      });

    }

    if (
      !mongoose.isValidObjectId(
        userId
      )
    ) {

      return res.status(401).json({
        success: false,
        message:
          "Ogiltig anvÃ¤ndarsession."
      });

    }

    // ==================================================
    // CART
    // ==================================================

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Din varukorg Ã¤r tom."
      });

    }

    // ==================================================
    // DELIVERY METHOD
    // ==================================================

    if (
      !ALLOWED_DELIVERY_METHODS.includes(
        deliveryMethod
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "VÃ¤lj avhÃ¤mtning eller leverans."
      });

    }

    // ==================================================
    // CUSTOMER INFORMATION
    // ==================================================

    if (
      !address ||
      typeof address !== "object"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Kunduppgifter saknas."
      });

    }

    const requiredCustomerFields = [
      "firstName",
      "lastName",
      "email",
      "phone"
    ];

    const missingCustomerField =
      requiredCustomerFields.find(
        (field) =>
          !String(
            address[field] || ""
          ).trim()
      );

    if (missingCustomerField) {

      return res.status(400).json({
        success: false,
        message:
          "Namn, e-post och telefonnummer mÃ¥ste fyllas i."
      });

    }

    // ==================================================
    // DELIVERY ADDRESS
    // ==================================================

    if (
      deliveryMethod === "delivery"
    ) {

      const requiredDeliveryFields = [
        "street",
        "city",
        "zipcode"
      ];

      const missingDeliveryField =
        requiredDeliveryFields.find(
          (field) =>
            !String(
              address[field] || ""
            ).trim()
        );

      if (missingDeliveryField) {

        return res.status(400).json({
          success: false,
          message:
            "FullstÃ¤ndig leveransadress mÃ¥ste fyllas i."
        });

      }

    }

    // ==================================================
    // FULFILLMENT TYPE
    // ==================================================

    if (
      !ALLOWED_FULFILLMENT_TYPES.includes(
        fulfillmentType
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ogiltigt bestÃ¤llningsalternativ."
      });

    }

    // ==================================================
    // REQUESTED DATE
    // ==================================================

    if (
      !isValidDateString(
        requestedDate
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ogiltigt bestÃ¤llningsdatum."
      });

    }

    // ==================================================
    // REQUESTED TIME
    // ==================================================

    if (
      !ALLOWED_TIME_SLOTS.includes(
        requestedTime
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ogiltig vald tid."
      });

    }

    // ==================================================
    // DATE RULES
    // ==================================================

    const today =
      getSwedenDateString(0);

    const tomorrow =
      getSwedenDateString(1);

    const minimumLargeOrderDate =
      getSwedenDateString(2);

    if (
      fulfillmentType ===
      "same-day" &&
      requestedDate !==
      today
    ) {

      return res.status(400).json({
        success: false,
        message:
          "BestÃ¤llning fÃ¶r idag mÃ¥ste ha dagens datum."
      });

    }

    if (
      fulfillmentType ===
      "next-day" &&
      requestedDate !==
      tomorrow
    ) {

      return res.status(400).json({
        success: false,
        message:
          "BestÃ¤llning fÃ¶r imorgon mÃ¥ste ha morgondagens datum."
      });

    }

    if (
      fulfillmentType ===
      "large-order" &&
      requestedDate <
      minimumLargeOrderDate
    ) {

      return res.status(400).json({
        success: false,
        message:
          "StÃ¶rre bestÃ¤llningar mÃ¥ste gÃ¶ras minst 48 timmar i fÃ¶rvÃ¤g."
      });

    }

    // ==================================================
    // STRIPE
    // ==================================================

    const stripe =
      getStripe();

    if (!stripe) {

      return res.status(500).json({
        success: false,
        message:
          "Stripe Ã¤r inte konfigurerat."
      });

    }

   // ======================================================
// PRODUCT IDS
// ======================================================

const productIds = [];

for (const item of items) {

  const productId =
    item._id ||
    item.id ||
    item.itemId;

  if (
    !productId ||
    !mongoose.isValidObjectId(
      productId
    )
  ) {

    return res.status(400).json({
      success: false,
      message:
        "Ogiltigt produkt-ID."
    });

  }

  productIds.push(
    productId
  );

}


// ======================================================
// PREVENT DUPLICATE PRODUCT IDS
// ======================================================

const uniqueProductIds =
  [
    ...new Set(
      productIds.map(
        (productId) =>
          productId.toString()
      )
    )
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

    // ==================================================
    // PRODUCTS FROM DATABASE
    // ==================================================

    const products =
  await foodModel.find({
    _id: {
      $in: uniqueProductIds
    }
  });

    const productMap =
      new Map();

    products.forEach(
      (product) => {

        productMap.set(
          product._id.toString(),
          product
        );

      }
    );

    // ==================================================
    // VERIFY PRODUCTS
    // ==================================================

    const verifiedItems = [];

    let subtotal = 0;
    let totalQuantity = 0;

    for (const item of items) {

      const productId =
        (
          item._id ||
          item.id ||
          item.itemId
        ).toString();

      const product =
        productMap.get(
          productId
        );

      if (!product) {

        return res.status(404).json({
          success: false,
          message:
            "En eller flera produkter kunde inte hittas."
        });

      }

      const quantity =
        Number(
          item.quantity
        );

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0 ||
        quantity > MAX_ITEM_QUANTITY
      ) {

        return res.status(400).json({
          success: false,
          message:
            `Du kan beställa högst ${MAX_ITEM_QUANTITY} st av samma produkt.`
        });

      }

      totalQuantity +=
        quantity;

      const price =
        Number(
          product.price
        );

      if (
        !Number.isFinite(
          price
        ) ||
        price < 0
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Ogiltigt produktpris."
        });

      }

      if (
        fulfillmentType ===
        "same-day"
      ) {

        const sameDayStock =
          Number(
            product.sameDayStock ||
            0
          );

        if (
          !Number.isFinite(
            sameDayStock
          ) ||
          sameDayStock <
          quantity
        ) {

          return res.status(409).json({
            success: false,
            message:
              `${product.name} finns inte i tillrÃ¤ckligt antal fÃ¶r bestÃ¤llning idag.`
          });

        }

      }

      subtotal +=
        price *
        quantity;

      verifiedItems.push({
        _id:
          product._id,
        name:
          product.name,
        price,
        quantity,
        image:
          product.image
      });

    }

    // ==================================================
    // LARGE ORDER RULE
    // ==================================================

    if (
      totalQuantity >=
      LARGE_ORDER_LIMIT &&
      fulfillmentType !==
      "large-order"
    ) {

      return res.status(400).json({
        success: false,
        message:
          `BestÃ¤llningar med ${LARGE_ORDER_LIMIT} produkter eller fler mÃ¥ste gÃ¶ras som en stÃ¶rre bestÃ¤llning.`
      });

    }

    // ==================================================
    // TOTALS
    // ==================================================

    const vatAmount =
      subtotal *
      VAT_RATE;

    const total =
      subtotal +
      vatAmount;

    const roundedSubtotal =
      roundMoney(
        subtotal
      );

    const roundedVat =
      roundMoney(
        vatAmount
      );

    const roundedTotal =
      roundMoney(
        total
      );

    // ==================================================
    // CREATE ORDER
    // ==================================================

    const newOrder =
      new orderModel({

        userId,

        items:
          verifiedItems,

        deliveryMethod,

        fulfillmentType,

        requestedDate:
          createStoredDate(
            requestedDate
          ),

        requestedTime,

        address: {

          firstName:
            String(
              address.firstName
            ).trim(),

          lastName:
            String(
              address.lastName
            ).trim(),

          email:
            String(
              address.email
            )
              .trim()
              .toLowerCase(),

          phone:
            String(
              address.phone
            ).trim(),

          street:
            deliveryMethod ===
              "delivery"
              ? String(
                address.street || ""
              ).trim()
              : "",

          city:
            deliveryMethod ===
              "delivery"
              ? String(
                address.city || ""
              ).trim()
              : "",

          zipcode:
            deliveryMethod ===
              "delivery"
              ? String(
                address.zipcode || ""
              ).trim()
              : ""

        },

        subtotal:
          roundedSubtotal,

        vatRate:
          6,

        vatAmount:
          roundedVat,

        amount:
          roundedTotal,

        payment:
          false,

        paymentMethod:
          "Stripe",

        status:
          "InvÃ¤ntar betalning"

      });

    await newOrder.save();

    // ==================================================
    // STRIPE LINE ITEMS
    // ==================================================

    const lineItems =
      verifiedItems.map(
        (item) => ({

          price_data: {

            currency:
              "sek",

            product_data: {
              name:
                item.name
            },

            unit_amount:
              Math.round(
                item.price *
                100
              )

          },

          quantity:
            item.quantity

        })
      );

    if (
      roundedVat > 0
    ) {

      lineItems.push({

        price_data: {

          currency:
            "sek",

          product_data: {
            name:
              "Moms 6%"
          },

          unit_amount:
            Math.round(
              roundedVat *
              100
            )

        },

        quantity:
          1

      });

    }

    // ==================================================
    // FRONTEND URL
    // ==================================================

    const frontendUrl =
      (
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
      )
        .trim()
        .replace(
          /\/+$/,
          ""
        );

    // ==================================================
    // STRIPE SESSION
    // ==================================================

    let stripeSession;

    try {

      stripeSession =
        await stripe.checkout
          .sessions
          .create({

            line_items:
              lineItems,

            mode:
              "payment",

            success_url:
              `${frontendUrl}/verify?success=true&orderId=${newOrder._id}&session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
              `${frontendUrl}/verify?success=false&orderId=${newOrder._id}`,

            client_reference_id:
              newOrder
                ._id
                .toString(),

            metadata: {

              orderId:
                newOrder
                  ._id
                  .toString(),

              userId:
                userId.toString(),

              deliveryMethod,

              fulfillmentType,

              requestedDate,

              requestedTime,

              vatRate:
                "6",

              subtotal:
                roundedSubtotal
                  .toString(),

              vatAmount:
                roundedVat
                  .toString(),

              total:
                roundedTotal
                  .toString()

            },

            payment_intent_data: {

              metadata: {

                orderId:
                  newOrder
                    ._id
                    .toString(),

                userId:
                  userId.toString()

              }

            }

          });

      // Save the exact Checkout Session used for this order.
      newOrder.stripeSessionId =
        stripeSession.id;

      await newOrder.save();

    } catch (stripeError) {

      if (
        stripeSession?.id
      ) {

        try {

          await stripe.checkout
            .sessions
            .expire(
              stripeSession.id
            );

        } catch (expireError) {

          console.log(
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

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(201).json({

      success: true,

      message:
        "BestÃ¤llningen har skapats.",

      subtotal:
        roundedSubtotal,

      vatRate:
        6,

      vatAmount:
        roundedVat,

      amount:
        roundedTotal,

      deliveryMethod,

      fulfillmentType,

      requestedDate,

      requestedTime,

      session_url:
        stripeSession.url,

      orderId:
        newOrder._id

    });

  } catch (error) {

    console.log(
      "Place order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ett fel uppstod nÃ¤r bestÃ¤llningen skulle skapas."
    });

  }

};


// ======================================================
// VERIFY PAYMENT
// Browser return / fallback.
// Webhook is the primary payment confirmation.
// ======================================================

const verifyOrder = async (
  req,
  res
) => {

  try {

    const {
      orderId,
      sessionId,
      success
    } = req.body;

    if (
      !orderId ||
      !mongoose.isValidObjectId(
        orderId
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ogiltigt eller saknat order-ID."
      });

    }

    // Browser cancellation is not trusted to mutate payment state.
    if (
      success === false ||
      success === "false"
    ) {

      return res.status(200).json({
        success: false,
        message:
          "Betalningen avbrÃ¶ts."
      });

    }

    if (
      success !== true &&
      success !== "true"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ogiltig betalningsstatus."
      });

    }

    if (!sessionId) {

      return res.status(400).json({
        success: false,
        message:
          "Stripe session-ID saknas."
      });

    }

    const stripe =
      getStripe();

    if (!stripe) {

      return res.status(500).json({
        success: false,
        message:
          "Stripe Ã¤r inte konfigurerat."
      });

    }

    const stripeSession =
      await stripe.checkout
        .sessions
        .retrieve(
          sessionId
        );

    if (
      stripeSession
        .metadata
        ?.orderId !==
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

    return res.status(200).json({

      success: true,

      message:
        result.warning
          ? "Betalningen lyckades, men ordern behÃ¶ver lagerkontrolleras."
          : result.alreadyProcessed
            ? "BestÃ¤llningen Ã¤r redan betald."
            : "Betalningen lyckades.",

      warning:
        result.warning,

      data:
        result.order

    });

  } catch (error) {

    console.log(
      "Verify order error:",
      error
    );

    const validationMessage =
      getStripeValidationMessage(
        error
      );

    if (validationMessage) {

      return res.status(400).json({
        success: false,
        message:
          validationMessage
      });

    }

    if (
      error.message ===
      "ORDER_NOT_FOUND"
    ) {

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


// ======================================================
// STRIPE WEBHOOK
// req.body MUST be a raw Buffer.
// ======================================================

const stripeWebhook = async (
  req,
  res
) => {

  const stripe =
    getStripe();

  if (!stripe) {

    return res.status(500).send(
      "Stripe is not configured"
    );

  }

  if (
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {

    console.log(
      "STRIPE_WEBHOOK_SECRET is missing."
    );

    return res.status(500).send(
      "Stripe webhook is not configured"
    );

  }

  const signature =
    req.headers[
    "stripe-signature"
    ];

  if (!signature) {

    return res.status(400).send(
      "Stripe signature is missing"
    );

  }

  let event;

  try {

    event =
      stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env
          .STRIPE_WEBHOOK_SECRET
      );

  } catch (error) {

    console.log(
      "Stripe webhook signature error:",
      error.message
    );

    return res.status(400).send(
      "Invalid Stripe webhook signature"
    );

  }

  try {

    // ==================================================
    // SUCCESSFUL PAYMENT
    // ==================================================

    if (
      event.type ===
      "checkout.session.completed" ||
      event.type ===
      "checkout.session.async_payment_succeeded"
    ) {

      const stripeSession =
        event.data.object;

      if (
        stripeSession.payment_status ===
        "paid"
      ) {

        const result =
          await processPaidCheckoutSession(
            stripeSession
          );

        console.log(
          "Stripe payment processed:",
          {
            eventId:
              event.id,
            sessionId:
              stripeSession.id,
            orderId:
              stripeSession
                .metadata
                ?.orderId,
            alreadyProcessed:
              result.alreadyProcessed,
            warning:
              result.warning
          }
        );

      }

    }

    // ==================================================
    // EXPIRED CHECKOUT
    // ==================================================

    if (
      event.type ===
      "checkout.session.expired"
    ) {

      const stripeSession =
        event.data.object;

      const orderId =
        stripeSession
          ?.metadata
          ?.orderId;

      if (
        orderId &&
        mongoose.isValidObjectId(
          orderId
        )
      ) {

        await orderModel.updateOne(
          {
            _id:
              orderId,

            payment:
              false,

            $or: [
              {
                stripeSessionId:
                  stripeSession.id
              },
              {
                stripeSessionId: {
                  $exists:
                    false
                }
              },
              {
                stripeSessionId:
                  null
              }
            ]
          },
          {
            $set: {
              status:
                "Avbruten"
            }
          }
        );

      }

    }

    return res.status(200).json({
      received: true
    });

  } catch (error) {

    console.log(
      "Stripe webhook processing error:",
      error
    );

    // 500 makes Stripe retry the webhook.
    return res.status(500).send(
      "Webhook processing failed"
    );

  }

};


// ======================================================
// USER ORDERS
// ======================================================

const userOrders = async (
  req,
  res
) => {

  try {

    const userId =
      req.userId;

    if (!userId) {

      return res.status(401).json({
        success: false,
        message:
          "Du mÃ¥ste vara inloggad."
      });

    }

    if (
      !mongoose.isValidObjectId(
        userId
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ogiltigt anvÃ¤ndar-ID."
      });

    }

    const orders =
      await orderModel
        .find({
          userId
        })
        .sort({
          createdAt: -1
        });

    return res.status(200).json({

      success: true,

      count:
        orders.length,

      data:
        orders

    });

  } catch (error) {

    console.log(
      "User orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "BestÃ¤llningarna kunde inte hÃ¤mtas."
    });

  }

};


// ======================================================
// GET ALL ORDERS - ADMIN
// ======================================================

const listOrders = async (
  req,
  res
) => {

  try {

    const orders =
      await orderModel
        .find({})
        .sort({
          createdAt: -1
        });

    return res.status(200).json({

      success: true,

      count:
        orders.length,

      data:
        orders

    });

  } catch (error) {

    console.log(
      "List orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "BestÃ¤llningarna kunde inte hÃ¤mtas."
    });

  }

};


// ======================================================
// UPDATE ORDER STATUS - ADMIN
// ======================================================

const updateStatus = async (
  req,
  res
) => {

  try {

    const {
      orderId,
      status
    } = req.body;

    if (
      !orderId ||
      !status
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Order-ID och status krÃ¤vs."
      });

    }

    if (
      !mongoose.isValidObjectId(
        orderId
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ogiltigt order-ID."
      });

    }

    const normalizedStatus =
      String(
        status
      ).trim();

    if (
      !ALLOWED_ORDER_STATUSES.includes(
        normalizedStatus
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ogiltig orderstatus."
      });

    }

    const order =
      await orderModel
        .findByIdAndUpdate(
          orderId,
          {
            status:
              normalizedStatus
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

      message:
        "Orderstatus uppdaterad.",

      data:
        order

    });

  } catch (error) {

    console.log(
      "Update status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Orderstatus kunde inte uppdateras."
    });

  }

};


// ======================================================
// EXPORT
// ======================================================

export {
  placeOrder,
  verifyOrder,
  stripeWebhook,
  userOrders,
  listOrders,
  updateStatus
};