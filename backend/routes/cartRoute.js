import express from "express";

import {
  addToCart,
  removeFromCart,
  getCart
} from "../controllers/cartController.js";

import authMiddleware from "../middleware/auth.js";

const cartRouter = express.Router();


// add item to cart
cartRouter.post(
  "/add",
  authMiddleware,
  addToCart
);


// remove item from cart
cartRouter.post(
  "/remove",
  authMiddleware,
  removeFromCart
);


// get user cart
cartRouter.post(
  "/get",
  authMiddleware,
  getCart
);


export default cartRouter;