import mongoose from "mongoose";

// Interna recept lagras separat från produktmodellen.
// De får bara hämtas via administratörsskyddade API-rutter.

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    amount: {
      type: String,
      trim: true,
      default: "",
      maxlength: 40
    },
    unit: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30
    }
  },
  { _id: false }
);

const kitchenRecipeSchema = new mongoose.Schema(
  {
    // Kopplar receptet till rätt produkt i MongoDB.
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "food",
      required: true,
      unique: true
    },

    // Används som läsbar rubrik och reserv för äldre beställningar.
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    // Exempel: { name: "Vetemjöl", amount: "420", unit: "g" }
    ingredients: {
      type: [ingredientSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 80,
        message: "Ett recept får ha högst 80 ingredienser."
      }
    },

    // En enkel lista med numrerade tillagningssteg i adminpanelen.
    steps: {
      type: [{ type: String, trim: true, maxlength: 800 }],
      default: [],
      validate: {
        validator: (items) => items.length <= 50,
        message: "Ett recept får ha högst 50 tillagningssteg."
      }
    }
  },
  { timestamps: true }
);

const kitchenRecipeModel =
  mongoose.models.kitchenRecipe ||
  mongoose.model("kitchenRecipe", kitchenRecipeSchema);

export default kitchenRecipeModel;