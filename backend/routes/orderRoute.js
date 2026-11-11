
import express from "express";

import {
  placeOrder,
  verifyOrder,
  userOrders,
  listOrders,
  updateStatus,
  updateKitchenProgress
} from "../controllers/orderController.js";

import authMiddleware, {
  optionalAuthMiddleware
} from "../middleware/auth.js";

import adminAuth from "../middleware/adminAuth.js";

const orderRouter = express.Router();


// ======================================================
// CUSTOMER ROUTES
// ======================================================

// ------------------------------------------------------
// CREATE NEW ORDER
// ------------------------------------------------------
// Supports both:
// - logged-in customer
// - guest checkout
// ------------------------------------------------------

orderRouter.post(
  "/place",
  optionalAuthMiddleware,
  placeOrder
);


// ------------------------------------------------------
// VERIFY STRIPE PAYMENT
// ------------------------------------------------------

/*
  Ingen authMiddleware här.

  Kunden skickas tillbaka från Stripe och
  orderController verifierar betalningen
  direkt mot Stripe med:

  - orderId
  - sessionId
  - payment_status
  - amount_total
  - metadata
*/

orderRouter.post(
  "/verify",
  verifyOrder
);


// ------------------------------------------------------
// GET LOGGED-IN USER'S ORDERS
// ------------------------------------------------------

orderRouter.post(
  "/userorders",
  authMiddleware,
  userOrders
);


// ======================================================
// ADMIN ROUTES
// ======================================================

// ------------------------------------------------------
// GET ALL ORDERS
// ------------------------------------------------------

/*
  Först:
  authMiddleware verifierar JWT-token.

  Sedan:
  adminAuth kontrollerar att användaren
  har role: "admin" i MongoDB.
*/

orderRouter.get(
  "/list",
  authMiddleware,
  adminAuth,
  listOrders
);


// ------------------------------------------------------
// UPDATE ORDER STATUS
// ------------------------------------------------------

orderRouter.post(
  "/status",
  authMiddleware,
  adminAuth,
  updateStatus
);


// ======================================================
// KITCHEN CONTROL — ADMIN
// ======================================================

// ------------------------------------------------------
// UPDATE KITCHEN CHECKLIST
// ------------------------------------------------------

/*
  Sparar kökets framsteg i MongoDB.

  Funktioner:
  - Bocka av enskilda produktenheter
  - Ångra avprickningar
  - Bekräfta packning
  - Synkronisera mellan enheter
  - Förhindra samtidiga ändringskonflikter

  Endast administratörer har åtkomst.
*/

orderRouter.patch(
  "/kitchen/:orderId",
  authMiddleware,
  adminAuth,
  updateKitchenProgress
);


// ======================================================
// EXPORT
// ======================================================

export default orderRouter;
