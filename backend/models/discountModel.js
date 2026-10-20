
import mongoose from "mongoose";

// ======================================================
// DISCOUNT SCHEMA
// ======================================================

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 50
    },

    // percentage = procent
    // fixed = fast belopp i kronor
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true
    },

    value: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          return this.type !== "percentage" ||
            value <= 100;
        },
        message: "Procentrabatt får inte överstiga 100 %."
      }
    },

    // Minsta produktvärde inklusive moms
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    // Totalt antal tillåtna användningar
    // null = obegränsat
    usageLimit: {
      type: Number,
      default: null,
      min: 1
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0
    },


    // Antal rabattkoder reserverade av
    // pågående Stripe-betalningar
    reservedCount: {
      type: Number,
      default: 0,
      min: 0
    },


    // När rabattkoden slutar gälla
    expiresAt: {
      type: Date,
      default: null
    },

    // Aktivera / inaktivera
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const discountModel =
  mongoose.models.discount ||
  mongoose.model("discount", discountSchema);

export default discountModel;
