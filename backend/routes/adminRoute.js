
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
// SHARED ADMIN AUTHENTICATION
// Used by admin panel and Manila Café Livechat
// ======================================================

export const requireAdmin = (req, res, next) => {

  authMiddleware(req, res, (error) => {

    if (error) {
      return next(error);
    }

    return adminAuth(req, res, next);

  });

};


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
  requireAdmin,
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
