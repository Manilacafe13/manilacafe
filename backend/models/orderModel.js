import mongoose from "mongoose";


// ======================================================
// ORDER ITEM SCHEMA
// ======================================================

const orderItemSchema = new mongoose.Schema(
  {

    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },


    name: {
      type: String,
      required: true,
      trim: true
    },


    // Pris exklusive moms
    price: {
      type: Number,
      required: true,
      min: 0
    },


    quantity: {
      type: Number,
      required: true,
      min: 1,

      validate: {
        validator: Number.isInteger,

        message:
          "Quantity must be a whole number"
      }
    },


    image: {
      type: String,
      default: ""
    }

  },

  {
    _id: false
  }
);


// ======================================================
// CUSTOMER / ADDRESS SCHEMA
// ======================================================

const addressSchema = new mongoose.Schema(
  {

    // ==================================================
    // CUSTOMER INFORMATION
    // ==================================================

    firstName: {
      type: String,
      required: true,
      trim: true
    },


    lastName: {
      type: String,
      required: true,
      trim: true
    },


    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },


    phone: {
      type: String,
      required: true,
      trim: true
    },


    // ==================================================
    // DELIVERY ADDRESS
    // ==================================================

    /*
      Dessa fält krävs endast när kunden
      väljer delivery.

      Vid pickup behöver kunden inte
      ange leveransadress.

      Den kontrollen görs i
      orderController.js.
    */

    street: {
      type: String,
      default: "",
      trim: true
    },


    city: {
      type: String,
      default: "",
      trim: true
    },


    zipcode: {
      type: String,
      default: "",
      trim: true
    }

  },

  {
    _id: false
  }
);


// ======================================================
// ORDER SCHEMA
// ======================================================

const orderSchema = new mongoose.Schema(
  {

    // ==================================================
    // USER
    // ==================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },


    // ==================================================
    // PRODUCTS
    // ==================================================

    items: {
      type: [orderItemSchema],
      required: true,

      validate: {

        validator: function (items) {

          return (
            Array.isArray(items) &&
            items.length > 0
          );

        },

        message:
          "Order must contain at least one product"

      }
    },


    // ==================================================
    // FULFILLMENT TYPE
    // ==================================================

    /*
      same-day
      = kunden vill ha ordern idag

      next-day
      = kunden vill ha ordern imorgon

      large-order
      = större beställning,
        minst 48 timmar framåt
    */

    fulfillmentType: {
      type: String,

      enum: [
        "same-day",
        "next-day",
        "large-order"
      ],

      default:
        "next-day",

      trim: true
    },


    // ==================================================
    // DELIVERY METHOD
    // ==================================================

    /*
      pickup
      = kunden hämtar beställningen

      delivery
      = beställningen levereras
        till kundens adress
    */

    deliveryMethod: {
      type: String,

      enum: [
        "pickup",
        "delivery"
      ],

      default:
        "delivery",

      required: true,

      trim: true
    },


    // ==================================================
    // REQUESTED DATE
    // ==================================================

    requestedDate: {
      type: Date,
      default: null
    },


    // ==================================================
    // REQUESTED TIME / TIME WINDOW
    // ==================================================

    requestedTime: {
      type: String,
      default: "",
      trim: true
    },


    // ==================================================
    // PRICE EXCLUDING VAT
    // ==================================================

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },


    // ==================================================
    // VAT RATE
    // ==================================================

    vatRate: {
      type: Number,
      required: true,
      default: 6,
      min: 0,
      max: 100
    },


    // ==================================================
    // VAT AMOUNT
    // ==================================================

    vatAmount: {
      type: Number,
      required: true,
      min: 0
    },


    // ==================================================
    // TOTAL INCLUDING VAT
    // ==================================================

    amount: {
      type: Number,
      required: true,
      min: 0
    },


    // ==================================================
    // CUSTOMER / DELIVERY INFORMATION
    // ==================================================

    address: {
      type: addressSchema,
      required: true
    },


    // ==================================================
    // ORDER STATUS
    // ==================================================

    status: {
      type: String,

      default:
        "Inväntar betalning",

      trim: true
    },


    // ==================================================
    // PAYMENT
    // ==================================================

    payment: {
      type: Boolean,
      default: false
    },


    paymentMethod: {
      type: String,
      default: "Stripe",
      trim: true
    },


    // ==================================================
    // STRIPE CHECKOUT SESSION
    // ==================================================

    /*
      Stripe Checkout Session som skapades
      för just denna order.

      Exempel:
      cs_test_...
      cs_live_...
    */

    stripeSessionId: {
      type: String,
      trim: true,
      default: undefined
    },


    // ==================================================
    // STRIPE PAYMENT INTENT
    // ==================================================

    /*
      Det faktiska betalnings-ID:t hos Stripe.

      Sparas när betalningen har bekräftats.
    */

    stripePaymentIntentId: {
      type: String,
      trim: true,
      default: undefined
    },


    // ==================================================
    // PAYMENT PROCESSED DATE
    // ==================================================

    /*
      När vår backend faktiskt behandlade
      Stripe-betalningen och markerade
      ordern som betald.
    */

    paymentProcessedAt: {
      type: Date,
      default: null
    },


    // ==================================================
    // ORDER DATE
    // ==================================================

    date: {
      type: Date,
      default: Date.now
    }

  },

  {
    timestamps: true,
    minimize: false
  }
);


// ======================================================
// INDEXES
// ======================================================

// Kundens senaste orders först
orderSchema.index({
  userId: 1,
  createdAt: -1
});


// Sortering efter önskat datum
orderSchema.index({
  requestedDate: 1,
  fulfillmentType: 1
});


// Sortering efter avhämtning / leverans
orderSchema.index({
  requestedDate: 1,
  deliveryMethod: 1
});


// Stripe Checkout Session ska endast
// kunna tillhöra en order.
orderSchema.index(
  {
    stripeSessionId: 1
  },
  {
    unique: true,
    sparse: true
  }
);


// Stripe Payment Intent ska endast
// kunna tillhöra en order.
orderSchema.index(
  {
    stripePaymentIntentId: 1
  },
  {
    unique: true,
    sparse: true
  }
);


// ======================================================
// MODEL
// ======================================================

const orderModel =
  mongoose.models.order ||
  mongoose.model(
    "order",
    orderSchema
  );


export default orderModel;