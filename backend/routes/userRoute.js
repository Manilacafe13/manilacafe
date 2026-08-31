import express from "express";

import {
  loginUser,
  registerUser
} from "../controllers/userControllers.js";


const userRouter = express.Router();


// ======================================================
// REGISTER USER
// ======================================================

userRouter.post(
  "/register",
  registerUser
);


// ======================================================
// LOGIN USER
// ======================================================

userRouter.post(
  "/login",
  loginUser
);


// ======================================================
// EXPORT
// ======================================================

export default userRouter;