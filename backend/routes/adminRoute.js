import express from "express";

import {
  loginAdmin
} from "../controllers/adminController.js";

import {
  loginLimiter
} from "../middleware/rateLimiters.js";

import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";


const adminRouter = express.Router();


// ======================================================
// ADMIN LOGIN
// ======================================================

adminRouter.post(
  "/login",
  loginLimiter,
  loginAdmin
);


// ======================================================
// VERIFY ADMIN SESSION
// ======================================================

adminRouter.get(
  "/verify",
  authMiddleware,
  adminAuth,
  (req, res) => {

    return res.status(200).json({
      success: true,
      message: "Admin session is valid.",
      user: req.user
    });

  }
);


// ======================================================
// EXPORT
// ======================================================

export default adminRouter;