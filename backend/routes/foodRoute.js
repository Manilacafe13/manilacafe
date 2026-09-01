import express from "express";

import {
  addFood,
  listFood,
  removeFood,
  updateStock
} from "../controllers/foodControllers.js";

import multer from "multer";
import fs from "fs";

import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";


const foodRouter = express.Router();


// ======================================================
// TEMP UPLOAD DIRECTORY
// ======================================================

const uploadDirectory = "uploads";


if (!fs.existsSync(uploadDirectory)) {

  fs.mkdirSync(
    uploadDirectory,
    {
      recursive: true
    }
  );

}


// ======================================================
// IMAGE STORAGE ENGINE
// ======================================================

const storage = multer.diskStorage({

  destination: (
    req,
    file,
    cb
  ) => {

    cb(
      null,
      uploadDirectory
    );

  },

  filename: (
    req,
    file,
    cb
  ) => {

    const safeName =
      file.originalname
        .replace(
          /\s+/g,
          "-"
        )
        .replace(
          /[^a-zA-Z0-9._-]/g,
          ""
        );


    cb(
      null,
      `${Date.now()}-${safeName}`
    );

  }

});


// ======================================================
// MULTER CONFIG
// ======================================================

const upload = multer({

  storage,

  limits: {
    fileSize:
      5 * 1024 * 1024
  },

  fileFilter: (
    req,
    file,
    cb
  ) => {

    if (
      file.mimetype.startsWith(
        "image/"
      )
    ) {

      return cb(
        null,
        true
      );

    }


    return cb(
      new Error(
        "Endast bildfiler är tillåtna."
      ),
      false
    );

  }

});


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