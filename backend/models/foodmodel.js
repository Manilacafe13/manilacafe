import mongoose from "mongoose";

// Manila Cafe - food model with Phase 2 customer customizations.
// Existing food fields are kept unchanged.
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_CATEGORY_LENGTH = 100;
const MAX_PRICE = 100000;
const MAX_SAME_DAY_STOCK = 10000;
const MAX_OPTION_NAME_LENGTH = 100;

// Mongoose creates an _id for each option automatically.
// ProductPage and the order controller use these IDs for validated selections.
const removableIngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_OPTION_NAME_LENGTH
  },
  available: { type: Boolean, default: true }
});

const extraOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_OPTION_NAME_LENGTH
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    max: MAX_PRICE
  },
  maxQuantity: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
    validate: {
      validator: Number.isInteger,
      message: "Max quantity must be a whole number"
    }
  },
  available: { type: Boolean, default: true }
});

const customizationSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  removableIngredients: {
    type: [removableIngredientSchema],
    default: [],
    validate: {
      validator: items => Array.isArray(items) && items.length <= 30,
      message: "At most 30 removable ingredients are allowed"
    }
  },
  extras: {
    type: [extraOptionSchema],
    default: [],
    validate: {
      validator: items => Array.isArray(items) && items.length <= 30,
      message: "At most 30 extras are allowed"
    }
  }
}, { _id: false });

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_NAME_LENGTH
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_DESCRIPTION_LENGTH
  },
  price: { type: Number, required: true, min: 0, max: MAX_PRICE },
  image: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_CATEGORY_LENGTH
  },
  sameDayStock: {
    type: Number,
    default: 0,
    min: 0,
    max: MAX_SAME_DAY_STOCK,
    validate: {
      validator: Number.isInteger,
      message: "Same-day stock must be a whole number"
    }
  },
  customizations: {
    type: customizationSchema,
    default: () => ({
      enabled: false,
      removableIngredients: [],
      extras: []
    })
  }
}, { timestamps: true });

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);
export default foodModel;