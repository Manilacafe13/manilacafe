import mongoose from "mongoose";
import foodModel from "../models/foodmodel.js";
import kitchenRecipeModel from "../models/kitchenRecipeModel.js";

// Endast fÃ¶r admin-API:t. Ã…tkomstkontroll måste gÃ¶ras i kitchenRecipeRoute.js.
// GET /api/kitchen-recipe/list
const listKitchenRecipes = async (req, res) => {
  try {
    const recipes = await kitchenRecipeModel
      .find({})
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: recipes
    });
  } catch (error) {
    console.error("Kunde inte hÃ¤mta kÃ¶ksrecept:", error);
    return res.status(500).json({
      success: false,
      message: "Recepten kunde inte hÃ¤mtas."
    });
  }
};

// POST /api/kitchen-recipe/save
// Body: { foodId, ingredients: [{ name, amount, unit }], steps: ["Steg 1", ...] }
// Skapar eller uppdaterar receptet fÃ¶r en befintlig produkt.
const saveKitchenRecipe = async (req, res) => {
  try {
    const { foodId, ingredients, steps } = req.body || {};

    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Ogiltigt produkt-ID."
      });
    }

    if (!Array.isArray(ingredients) || !Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        message: "Ingredienser och tillagningssteg mÃ¥ste vara listor."
      });
    }

    if (ingredients.length > 80 || steps.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Max 80 ingredienser och 50 tillagningssteg per recept."
      });
    }

    const cleanedIngredients = [];
    for (const entry of ingredients) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return res.status(400).json({
          success: false,
          message: "Varje ingrediens mÃ¥ste innehÃ¥lla namn och eventuella mÃ¤ngder."
        });
      }

      const { name, amount = "", unit = "" } = entry;
      if (
        typeof name !== "string" ||
        typeof amount !== "string" ||
        typeof unit !== "string" ||
        !name.trim() ||
        name.trim().length > 120 ||
        amount.trim().length > 40 ||
        unit.trim().length > 30
      ) {
        return res.status(400).json({
          success: false,
          message: "Kontrollera ingrediensernas namn, mÃ¤ngder och enheter."
        });
      }

      cleanedIngredients.push({
        name: name.trim(),
        amount: amount.trim(),
        unit: unit.trim()
      });
    }

    const cleanedSteps = [];
    for (const step of steps) {
      if (
        typeof step !== "string" ||
        !step.trim() ||
        step.trim().length > 800
      ) {
        return res.status(400).json({
          success: false,
          message: "Varje tillagningssteg mÃ¥ste vara text pÃ¥ hÃ¶gst 800 tecken."
        });
      }
      cleanedSteps.push(step.trim());
    }

    const food = await foodModel.findById(foodId).select("name").lean();
    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Produkten finns inte lÃ¤ngre."
      });
    }

    const recipe = await kitchenRecipeModel.findOneAndUpdate(
      { foodId: food._id },
      {
        $set: {
          name: food.name,
          ingredients: cleanedIngredients,
          steps: cleanedSteps
        }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Receptet har sparats.",
      data: recipe
    });
  } catch (error) {
    console.error("Kunde inte spara kÃ¶ksrecept:", error);
    return res.status(500).json({
      success: false,
      message: "Receptet kunde inte sparas."
    });
  }
};

export { listKitchenRecipes, saveKitchenRecipe };