
import express from "express";

import {
  validateDiscount,
  createDiscount,
  listDiscounts,
  toggleDiscount
} from "../controllers/discountController.js";

import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";

const discountRouter = express.Router();

// ======================================================
// CUSTOMER — VALIDATE DISCOUNT CODE
// ======================================================
// Public endpoint for checkout.
// Does not require login.

discountRouter.post(
  "/validate",
  validateDiscount
);

// ======================================================
// ADMIN — PROTECTED ROUTES
// ======================================================
// First verify JWT token.
// Then verify admin role.

discountRouter.use(
  authMiddleware,
  adminAuth
);

// Create discount code
discountRouter.post(
  "/create",
  createDiscount
);

// List discount codes
discountRouter.get(
  "/list",
  listDiscounts
);

// Activate / deactivate discount code
discountRouter.patch(
  "/toggle/:id",
  toggleDiscount
);

export default discountRouter;
