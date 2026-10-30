import mongoose from "mongoose";


// ======================================================
// FAS 2: SNAPSHOTS AV KUNDVAL
// ======================================================
// Ordern ska bevara de val kunden betalade fÃ¶r Ã¤ven om en
// produkt eller ett tillval senare Ã¤ndras i adminpanelen.
// Backend berÃ¤knar och kontrollerar alltid priser och val.

const MAX_ORDER_CUSTOMIZATION_OPTIONS = 30;

const uniqueOptionSnapshots = (options) => {
  if (options === undefined) return true;
  if (!Array.isArray(options) || options.length > MAX_ORDER_CUSTOMIZATION_OPTIONS) {
    return false;
  }

  const optionIds = options.map((option) =>
    String(option?.optionId || "").toLowerCase()
  );

  return optionIds.every(Boolean) &&
    new Set(optionIds).size === optionIds.length;
};

// En ingrediens som kunden valt att INTE fÃ¥.
const removedIngredientSnapshotSchema = new mongoose.Schema(
  {
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    }
  },
  { _id: false }
);

// Ett extra tillval med namn, antal och styckpris vid kÃ¶pet.
const extraSnapshotSchema = new mongoose.Schema(
  {
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      validate: {
        validator: Number.isInteger,
        message: "Antalet extra tillval mÃ¥ste vara ett heltal."
      }
    },
    // Pris per tillval exklusive moms. SÃ¤tts av backend.
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 100000
    }
  },
  { _id: false }
);

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
    },

    // Valfritt fÃ¶r vanliga produkter. Finns endast nÃ¤r kunden
    // har gjort anpassningar av just denna orderrad.
    // AnvÃ¤nd explicita nestade paths sÃ¥ att orderController.js
    // kan verifiera schema-stÃ¶det fÃ¶re Stripe-betalningen.
    customizations: {
      removedIngredients: {
        type: [removedIngredientSnapshotSchema],
        default: undefined,
        validate: {
          validator: uniqueOptionSnapshots,
          message: "Ogiltiga eller dubbla bortvalda ingredienser."
        }
      },
      extras: {
        type: [extraSnapshotSchema],
        default: undefined,
        validate: {
          validator: uniqueOptionSnapshots,
          message: "Ogiltiga eller dubbla extra tillval."
        }
      }
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
      Dessa fÃ¤lt krÃ¤vs endast nÃ¤r kunden
      vÃ¤ljer delivery.

      Vid pickup behÃ¶ver kunden inte
      ange leveransadress.

      Den kontrollen gÃ¶rs i
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
      userId Ã¤r valfritt.

      Inloggad kund:
      userId innehÃ¥ller kundens MongoDB-ID.

      GÃ¤stkund:
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
      = stÃ¶rre bestÃ¤llning,
        minst 48 timmar framÃ¥t
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
      = kunden hÃ¤mtar bestÃ¤llningen

      delivery
      = bestÃ¤llningen levereras
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

/*
  Manila CafÃ© Ã¶ppettider:

  MÃ¥ndag - sÃ¶ndag:
  10:00 - 23:00

  Samma tider gÃ¤ller alla dagar.

  TillÃ¥tna tider kontrolleras Ã¤ven i
  orderController.js.
*/

requestedTime: {
  type: String,

  enum: [
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
  ],

  required: true,
  trim: true
},


// ==================================================
// DISCOUNT / PROMO CODE
// ==================================================

discountCode: {
  type: String,
  default: null,
  trim: true,
  uppercase: true,
  maxlength: 50
},


discountId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "discount",
  default: null
},


// Rabattbelopp inklusive moms
discountAmount: {
  type: Number,
  default: 0,
  min: 0
},


discountReservationStatus: {
  type: String,
  enum: ["none", "reserved", "redeemed", "released"],
  default: "none"
},

discountReservedAt: {
  type: Date,
  default: null
},


// Rabattens typ
discountType: {
  type: String,
  enum: ["percentage", "fixed", null],
  default: null
},

// Rabattens ursprungliga vÃ¤rde
// Exempel: 15 (%) eller 30 (kr)
discountValue: {
  type: Number,
  default: 0,
  min: 0
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
        "InvÃ¤ntar betalning",
        "Betalning mottagen",
        "Betalning mottagen - lagerkontroll krÃ¤vs",
        "BestÃ¤llning mottagen",
        "FÃ¶rbereds",
        "Redo fÃ¶r upphÃ¤mtning",
        "UpphÃ¤mtad",
        "PÃ¥ vÃ¤g",
        "Levererad",
        "Avbruten"
      ],

      default:
        "InvÃ¤ntar betalning",

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

// Kundens senaste orders fÃ¶rst.
// GÃ¤storders har userId: null.
orderSchema.index({
  userId: 1,
  createdAt: -1
});


// Sortering efter Ã¶nskat datum
orderSchema.index({
  requestedDate: 1,
  fulfillmentType: 1
});


// Sortering efter avhÃ¤mtning / leverans
orderSchema.index({
  requestedDate: 1,
  deliveryMethod: 1
});


// Stripe Checkout Session ska endast
// kunna tillhÃ¶ra en order.
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
// kunna tillhÃ¶ra en order.
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