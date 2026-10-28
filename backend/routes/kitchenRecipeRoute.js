import express from "express";
import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import {
  listKitchenRecipes,
  saveKitchenRecipe
} from "../controllers/kitchenRecipeController.js";

// Internal kitchen recipes. All endpoints require a verified admin account.
const kitchenRecipeRouter = express.Router();

// The JWT must be verified before adminAuth checks the user's role in MongoDB.
kitchenRecipeRouter.use(authMiddleware, adminAuth);

// GET /api/kitchen-recipe/list
kitchenRecipeRouter.get("/list", listKitchenRecipes);

// POST /api/kitchen-recipe/save
kitchenRecipeRouter.post("/save", saveKitchenRecipe);

export default kitchenRecipeRouter;