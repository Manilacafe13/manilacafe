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
      trim: true,
      maxlength: 100
    },


    // Pris exklusive moms
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 100000
    },


    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,

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
      trim: true,
      maxlength: 80
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
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
      trim: true,
      maxlength: 150
    },

    city: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100
    },

    zipcode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20
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

    /*
      userId är valfritt.

      Inloggad kund:
      userId innehåller kundens MongoDB-ID.

      Gästkund:
      userId blir null.

      Kundens namn, e-post och telefonnummer
      sparas fortfarande i address.
    */

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
      default: null
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

      required: true,
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
      required: true
    },


    // ==================================================
    // REQUESTED TIME / TIME WINDOW
    // ==================================================

    requestedTime: {
      type: String,

      enum: [
        "15:00-16:00",
        "16:00-17:00",
        "17:00-18:00",
        "18:00-19:00"
      ],

      required: true,
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

      enum: [
        "Inväntar betalning",
        "Betalning mottagen",
        "Betalning mottagen - lagerkontroll krävs",
        "Beställning mottagen",
        "Förbereds",
        "Redo för upphämtning",
        "Upphämtad",
        "På väg",
        "Levererad",
        "Avbruten"
      ],

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
      enum: ["Stripe"],
      default: "Stripe",
      trim: true
    },


    // ==================================================
    // STRIPE CHECKOUT SESSION
    // ==================================================

    stripeSessionId: {
      type: String,
      trim: true,
      default: undefined
    },


    // ==================================================
    // STRIPE PAYMENT INTENT
    // ==================================================

    stripePaymentIntentId: {
      type: String,
      trim: true,
      default: undefined
    },


    // ==================================================
    // PAYMENT PROCESSED DATE
    // ==================================================

    paymentProcessedAt: {
      type: Date,
      default: null
    },
    

    // ==================================================
// ORDER CONFIRMATION EMAIL
// ==================================================

orderConfirmationEmailSent: {
  type: Boolean,
  default: false
},

orderConfirmationEmailSentAt: {
  type: Date,
  default: null
},

orderConfirmationEmailId: {
  type: String,
  default: undefined,
  trim: true
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

// Kundens senaste orders först.
// Gästorders har userId: null.
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