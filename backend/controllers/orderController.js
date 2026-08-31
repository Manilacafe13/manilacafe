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
// ROUND MONEY
// ======================================================

const roundMoney = (value) => {

  const number =
    Number(value);


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
        timeZone:
          "Europe/Stockholm",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit"
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


// ======================================================
// VALIDATE DATE STRING
// ======================================================

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


// ======================================================
// DATE FOR MONGOOSE
// ======================================================

const createStoredDate = (
  dateString
) => {

  return new Date(
    `${dateString}T12:00:00.000Z`
  );

};


// ======================================================
// PLACE ORDER
// ======================================================

const placeOrder = async (
  req,
  res
) => {

  try {

    // ==================================================
    // REQUEST DATA
    // ==================================================

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
          "Du måste vara inloggad."

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
          "Ogiltig användarsession."

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
          "Din varukorg är tom."

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
          "Välj avhämtning eller leverans."

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


    // Alltid obligatoriska
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
          "Namn, e-post och telefonnummer måste fyllas i."

      });

    }


    // ==================================================
    // DELIVERY ADDRESS
    // ==================================================

    /*
      Vid AVHÄMTNING behövs ingen adress.

      Vid LEVERANS krävs:
      - street
      - city
      - zipcode
    */

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
            "Fullständig leveransadress måste fyllas i."

        });

      }

    }


    // ==================================================
    // FULFILLMENT TYPE
    // ==================================================

    if (
      !ALLOWED_FULFILLMENT_TYPES
        .includes(
          fulfillmentType
        )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt beställningsalternativ."

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
          "Ogiltigt beställningsdatum."

      });

    }


    // ==================================================
    // REQUESTED TIME
    // ==================================================

    if (
      !ALLOWED_TIME_SLOTS
        .includes(
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


    // ==================================================
    // SAME DAY
    // ==================================================

    if (
      fulfillmentType ===
      "same-day"
    ) {

      if (
        requestedDate !==
        today
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Beställning för idag måste ha dagens datum."

        });

      }

    }


    // ==================================================
    // NEXT DAY
    // ==================================================

    if (
      fulfillmentType ===
      "next-day"
    ) {

      if (
        requestedDate !==
        tomorrow
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Beställning för imorgon måste ha morgondagens datum."

        });

      }

    }


    // ==================================================
    // LARGE ORDER
    // ==================================================

    if (
      fulfillmentType ===
      "large-order"
    ) {

      if (
        requestedDate <
        minimumLargeOrderDate
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Större beställningar måste göras minst 48 timmar i förväg."

        });

      }

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
          "Stripe är inte konfigurerat."

      });

    }


    // ==================================================
    // PRODUCT IDS
    // ==================================================

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


    // ==================================================
    // GET PRODUCTS FROM DATABASE
    // ==================================================

    const products =
      await foodModel.find({

        _id: {
          $in: productIds
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


      // ==================================================
      // QUANTITY
      // ==================================================

      const quantity =
        Number(
          item.quantity
        );


      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Ogiltigt antal produkter."

        });

      }


      totalQuantity +=
        quantity;


      // ==================================================
      // PRICE
      // ==================================================

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


      // ==================================================
      // SAME-DAY STOCK
      // ==================================================

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
              `${product.name} finns inte i tillräckligt antal för beställning idag.`

          });

        }

      }


      // ==================================================
      // SUBTOTAL
      // ==================================================

      subtotal +=
        price *
        quantity;


      // ==================================================
      // VERIFIED ORDER ITEM
      // ==================================================

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
          `Beställningar med ${LARGE_ORDER_LIMIT} produkter eller fler måste göras som en större beställning.`

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


        // PRODUCTS
        items:
          verifiedItems,


        // PICKUP / DELIVERY
        deliveryMethod,


        // FULFILLMENT
        fulfillmentType,


        requestedDate:
          createStoredDate(
            requestedDate
          ),


        requestedTime,


        // CUSTOMER / ADDRESS
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


          // Vid pickup sparas dessa tomma
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


        // PRICE
        subtotal:
          roundedSubtotal,


        vatRate:
          6,


        vatAmount:
          roundedVat,


        amount:
          roundedTotal,


        // PAYMENT
        payment:
          false,


        paymentMethod:
          "Stripe",


        status:
          "Inväntar betalning"

      });


    await newOrder.save();


    // ==================================================
    // STRIPE PRODUCT LINES
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


    // ==================================================
    // VAT LINE
    // ==================================================

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
      process.env.FRONTEND_URL ||
      "http://localhost:5173";


    // ==================================================
    // STRIPE SESSION
    // ==================================================

    let session;


    try {

      session =
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

            }

          });


    } catch (stripeError) {

      // Om Stripe-sessionen inte kan skapas
      // tar vi bort den obetalda ordern.

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
        "Beställningen har skapats.",


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
        session.url,


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
        "Ett fel uppstod när beställningen skulle skapas."

    });

  }

};


// ======================================================
// DECREASE SAME-DAY STOCK
// ======================================================

const decreaseSameDayStock =
  async (order) => {

    const mongoSession =
      await mongoose.startSession();


    try {

      await mongoSession.withTransaction(
        async () => {

          for (
            const item
            of order.items
          ) {

            const quantity =
              Number(
                item.quantity
              );


            const result =
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
              result.modifiedCount !==
              1
            ) {

              throw new Error(
                `SAME_DAY_STOCK:${item.name}`
              );

            }

          }

        }
      );


      return {
        success: true
      };


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


        return {

          success: false,

          productName

        };

      }


      throw error;


    } finally {

      await mongoSession.endSession();

    }

  };


// ======================================================
// VERIFY PAYMENT
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


    // ==================================================
    // ORDER ID
    // ==================================================

    if (!orderId) {

      return res.status(400).json({

        success: false,

        message:
          "Order-ID saknas."

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


    // ==================================================
    // GET ORDER
    // ==================================================

    const order =
      await orderModel.findById(
        orderId
      );


    if (!order) {

      return res.status(404).json({

        success: false,

        message:
          "Beställningen kunde inte hittas."

      });

    }


    // ==================================================
    // ALREADY PAID
    // ==================================================

    if (order.payment) {

      return res.status(200).json({

        success: true,

        message:
          "Beställningen är redan betald.",

        data:
          order

      });

    }


    // ==================================================
    // SUCCESSFUL STRIPE RETURN
    // ==================================================

    if (
      success === true ||
      success === "true"
    ) {

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
            "Stripe är inte konfigurerat."

        });

      }


      // ==================================================
      // GET STRIPE SESSION
      // ==================================================

      const session =
        await stripe.checkout
          .sessions
          .retrieve(
            sessionId
          );


      // ==================================================
      // VERIFY ORDER
      // ==================================================

      if (
        !session.metadata ||
        session.metadata.orderId !==
          order._id.toString()
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Stripe-betalningen matchar inte beställningen."

        });

      }


      // ==================================================
      // PAYMENT STATUS
      // ==================================================

      if (
        session.payment_status !==
        "paid"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Betalningen är inte genomförd."

        });

      }


      // ==================================================
      // AMOUNT
      // ==================================================

      const expectedAmount =
        Math.round(
          Number(
            order.amount
          ) *
          100
        );


      if (
        session.amount_total !==
        expectedAmount
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Betalningsbeloppet matchar inte beställningen."

        });

      }


      // ==================================================
      // CURRENCY
      // ==================================================

      if (
        session.currency &&
        session.currency
          .toLowerCase() !==
          "sek"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Fel valuta i betalningen."

        });

      }


      // ==================================================
      // SAME-DAY STOCK
      // ==================================================

      let stockWarning =
        null;


      if (
        order.fulfillmentType ===
        "same-day"
      ) {

        const stockResult =
          await decreaseSameDayStock(
            order
          );


        if (
          !stockResult.success
        ) {

          stockWarning =
            `${stockResult.productName} har inte längre tillräckligt dagslager.`;


          order.status =
            "Betalning mottagen - lagerkontroll krävs";

        }

      }


      // ==================================================
      // MARK PAID
      // ==================================================

      order.payment =
        true;


      if (!stockWarning) {

        order.status =
          "Betalning mottagen";

      }


      await order.save();


      // ==================================================
      // CLEAR CART
      // ==================================================

      await userModel.findByIdAndUpdate(

        order.userId,

        {
          cartData: {}
        }

      );


      return res.status(200).json({

        success: true,

        message:
          stockWarning
            ? "Betalningen lyckades, men ordern behöver lagerkontrolleras."
            : "Betalningen lyckades.",

        warning:
          stockWarning,

        data:
          order

      });

    }


    // ==================================================
    // PAYMENT CANCELLED
    // ==================================================

    if (
      success === false ||
      success === "false"
    ) {

      order.status =
        "Betalning avbruten";


      await order.save();


      return res.status(200).json({

        success: false,

        message:
          "Betalningen avbröts."

      });

    }


    return res.status(400).json({

      success: false,

      message:
        "Ogiltig betalningsstatus."

    });


  } catch (error) {

    console.log(
      "Verify order error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Ett fel uppstod när betalningen skulle verifieras."

    });

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
          "Du måste vara inloggad."

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
          "Ogiltigt användar-ID."

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
        "Beställningarna kunde inte hämtas."

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
        "Beställningarna kunde inte hämtas."

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
          "Order-ID och status krävs."

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


    if (!normalizedStatus) {

      return res.status(400).json({

        success: false,

        message:
          "Orderstatus saknas."

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
          "Beställningen kunde inte hittas."

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
  userOrders,
  listOrders,
  updateStatus
};