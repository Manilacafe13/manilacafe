
import express from "express";

import {
  validateDiscount,
  createDiscount,
  listDiscounts,
  toggleDiscount
} from "../controllers/discountController.js";

import adminAuth from "../middleware/adminAuth.js";

const discountRouter = express.Router();

// Kund: kontrollera rabattkod
discountRouter.post(
  "/validate",
  validateDiscount
);

// Admin: skapa rabattkod
discountRouter.post(
  "/create",
  adminAuth,
  createDiscount
);

// Admin: visa alla rabattkoder
discountRouter.get(
  "/list",
  adminAuth,
  listDiscounts
);

// Admin: aktivera/inaktivera rabattkod
discountRouter.patch(
  "/toggle/:id",
  adminAuth,
  toggleDiscount
);

export default discountRouter;
