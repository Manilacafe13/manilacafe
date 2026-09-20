import express from "express";

import {
  loginAdmin
} from "../controllers/adminController.js";

import {
  loginLimiter
} from "../middleware/rateLimiters.js";


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
// EXPORT
// ======================================================

export default adminRouter;