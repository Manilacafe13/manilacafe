import express from "express";

import {
  loginUser,
  registerUser
} from "../controllers/userControllers.js";

import {
  loginLimiter,
  registerLimiter
} from "../middleware/rateLimiters.js";


const userRouter = express.Router();


// ======================================================
// REGISTER USER
// ======================================================

userRouter.post(
  "/register",
  registerLimiter,
  registerUser
);


// ======================================================
// LOGIN USER
// ======================================================

userRouter.post(
  "/login",
  loginLimiter,
  loginUser
);


// ======================================================
// EXPORT
// ======================================================

export default userRouter;