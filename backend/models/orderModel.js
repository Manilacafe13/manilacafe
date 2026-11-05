import mongoose from "mongoose";


// ======================================================
// FAS 2: SNAPSHOTS AV KUNDVAL
// ======================================================
// Ordern ska bevara de val kunden betalade för även om en
// produkt eller ett tillval senare ändras i adminpanelen.
// Backend beräknar och kontrollerar alltid priser och val.

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

// En ingrediens som kunden valt att INTE få.
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

// Ett extra tillval med namn, antal och styckpris vid köpet.
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
        message: "Antalet extra tillval måste vara ett heltal."
      }
    },
    // Pris per tillval exklusive moms. Sätts av backend.
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 100000
    }
  },
  { _id: false }
);


/* ======================================================
   MANILA CAFÉ — BUNDLE SNAPSHOTS
   Sparar paketets innehåll och avtalade pris.
   ====================================================== */

const bundleProductSnapshotSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    group: {
      type: String,
      required: true,
      enum: ["meal", "dessert", "drink"]
    }
  },
  { _id: false }
);

const bundleSchema = new mongoose.Schema(
  {
    // Kopplar paketet till dess produktrader.
    bundleKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    type: {
      type: String,
      required: true,
      enum: ["manila-solo"]
    },

    name: {
      type: String,
      required: true,
      default: "Manila Solo"
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      max: 1,
      validate: {
        validator: Number.isInteger,
        message: "Ogiltigt antal paket."
      }
    },

    products: {
      type: [bundleProductSnapshotSchema],
      required: true,

      validate: {
        validator: (products) => {
          if (!Array.isArray(products)) return false;

          const groups = products.map(p => p.group);

          return (
            products.length === 3 &&
            new Set(groups).size === 3 &&
            ["meal", "dessert", "drink"].every(
              group => groups.includes(group)
            ) &&
            new Set(
              products.map(p => String(p.productId))
            ).size === 3
          );
        },
        message:
          "Manila Solo måste innehålla en maträtt, en dessert och en dryck."
      }
    },

    // Paketets avtalade pris inklusive moms.
    // Beräknas och sätts endast av backend.
    priceIncludingVat: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);


// ======================================================
// ORDER ITEM SCHEMA
// ======================================================

const orderItemSchema = new mongoose.Schema(
  {

    // Anges endast för produkter som ingår i ett paket.
    // Vanliga produkter påverkas inte.
    bundleKey: {
      type: String,
      default: undefined,
      trim: true,
      maxlength: 100
    },


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

    // Valfritt för vanliga produkter. Finns endast när kunden
    // har gjort anpassningar av just denna orderrad.
    // Använd explicita nestade paths så att orderController.js
    // kan verifiera schema-stödet före Stripe-betalningen.
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
    // MANILA CAFÉ — MENU BUNDLES
    // ==================================================

    bundles: {
      type: [bundleSchema],
      default: [],

      validate: {
        validator: (bundles) => {
          if (!Array.isArray(bundles)) return false;

          const keys = bundles.map(
            bundle => String(bundle.bundleKey)
          );

          return new Set(keys).size === keys.length;
        },

        message: "Samma paket-ID förekommer flera gånger."
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

/*
  Manila Café öppettider:

  Måndag - söndag:
  10:00 - 23:00

  Samma tider gäller alla dagar.

  Tillåtna tider kontrolleras även i
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

// Rabattens ursprungliga värde
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