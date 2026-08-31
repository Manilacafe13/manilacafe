import express from "express";

import {
  addFood,
  listFood,
  removeFood,
  updateStock
} from "../controllers/foodControllers.js";

import multer from "multer";

import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";


const foodRouter = express.Router();


// ======================================================
// IMAGE STORAGE ENGINE
// ======================================================

const storage = multer.diskStorage({

  destination: "uploads",

  filename: (req, file, cb) => {

    const safeName =
      file.originalname
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");

    cb(
      null,
      `${Date.now()}-${safeName}`
    );

  }

});


const upload = multer({

  storage: storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    if (
      file.mimetype.startsWith(
        "image/"
      )
    ) {

      cb(
        null,
        true
      );

    } else {

      cb(
        new Error(
          "Endast bildfiler är tillåtna."
        ),
        false
      );

    }

  }

});


// ======================================================
// FOOD ROUTES
// ======================================================


// ======================================================
// ADD PRODUCT - ADMIN
// ======================================================

foodRouter.post(

  "/add",

  authMiddleware,

  adminAuth,

  upload.single(
    "image"
  ),

  addFood

);


// ======================================================
// GET ALL PRODUCTS
// ======================================================

foodRouter.get(

  "/list",

  listFood

);


// ======================================================
// UPDATE SAME-DAY STOCK - ADMIN
// ======================================================

foodRouter.post(

  "/stock",

  authMiddleware,

  adminAuth,

  updateStock

);


// ======================================================
// REMOVE PRODUCT - ADMIN
// ======================================================

foodRouter.post(

  "/remove",

  authMiddleware,

  adminAuth,

  removeFood

);


// ======================================================
// EXPORT
// ======================================================

export default foodRouter;