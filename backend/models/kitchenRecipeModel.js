import mongoose from "mongoose";

// Interna recept lagras separat frÃ¥n produktmodellen.
// De fÃ¥r bara hÃ¤mtas via administratÃ¶rsskyddade API-rutter.

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
    // Kopplar receptet till rÃ¤tt produkt i MongoDB.
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "food",
      required: true,
      unique: true
    },

    // AnvÃ¤nds som lÃ¤sbar rubrik och reserv fÃ¶r Ã¤ldre bestÃ¤llningar.
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    // Exempel: { name: "VetemjÃ¶l", amount: "420", unit: "g" }
    ingredients: {
      type: [ingredientSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 80,
        message: "Ett recept fÃ¥r ha hÃ¶gst 80 ingredienser."
      }
    },

    // En enkel lista med numrerade tillagningssteg i adminpanelen.
    steps: {
      type: [{ type: String, trim: true, maxlength: 800 }],
      default: [],
      validate: {
        validator: (items) => items.length <= 50,
        message: "Ett recept fÃ¥r ha hÃ¶gst 50 tillagningssteg."
      }
    }
  },
  { timestamps: true }
);

const kitchenRecipeModel =
  mongoose.models.kitchenRecipe ||
  mongoose.model("kitchenRecipe", kitchenRecipeSchema);

export default kitchenRecipeModel;