import mongoose from "mongoose";


// ======================================================
// LIMITS
// ======================================================

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_CATEGORY_LENGTH = 100;

const MAX_PRICE = 100000;
const MAX_SAME_DAY_STOCK = 10000;


// ======================================================
// FOOD SCHEMA
// ======================================================

const foodSchema = new mongoose.Schema(
  {

    // ==================================================
    // PRODUCT NAME
    // ==================================================

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: MAX_NAME_LENGTH
    },


    // ==================================================
    // DESCRIPTION
    // ==================================================

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: MAX_DESCRIPTION_LENGTH
    },


    // ==================================================
    // PRICE EXCLUDING VAT
    // ==================================================

    price: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_PRICE
    },


    // ==================================================
    // PRODUCT IMAGE
    // ==================================================

    image: {
      type: String,
      required: true,
      trim: true
    },


    // ==================================================
    // CATEGORY
    // ==================================================

    category: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: MAX_CATEGORY_LENGTH
    },


    // ==================================================
    // SAME-DAY STOCK
    // ==================================================

    sameDayStock: {
      type: Number,
      default: 0,
      min: 0,
      max: MAX_SAME_DAY_STOCK,

      validate: {

        validator:
          Number.isInteger,

        message:
          "Same-day stock must be a whole number"

      }
    }

  },

  {
    timestamps: true
  }
);


// ======================================================
// MODEL
// ======================================================

const foodModel =
  mongoose.models.food ||
  mongoose.model(
    "food",
    foodSchema
  );


export default foodModel;