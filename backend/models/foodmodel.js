import mongoose from "mongoose";


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
      trim: true
    },


    // ==================================================
    // DESCRIPTION
    // ==================================================

    description: {
      type: String,
      required: true,
      trim: true
    },


    // ==================================================
    // PRICE EXCLUDING VAT
    // ==================================================

    price: {
      type: Number,
      required: true,
      min: 0
    },


    // ==================================================
    // PRODUCT IMAGE
    // ==================================================

    image: {
      type: String,
      required: true
    },


    // ==================================================
    // CATEGORY
    // ==================================================

    category: {
      type: String,
      required: true,
      trim: true
    },


    // ==================================================
    // SAME-DAY STOCK
    // ==================================================

    /*
      Antal färdiga portioner som finns
      tillgängliga för beställning idag.

      Exempel:

      Mango Float
      sameDayStock: 8

      Kunden kan då köpa maximalt
      8 portioner för samma dag.

      När lagret är 0 är samma-dag
      inte tillgängligt för produkten.
    */

    sameDayStock: {
      type: Number,
      default: 0,
      min: 0,

      validate: {
        validator: Number.isInteger,
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