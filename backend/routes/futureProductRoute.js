import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";

import {
  listFutureProducts,
  voteFutureProduct,
  removeFutureProductVote,
  addFutureProduct,
  adminListFutureProducts,
  updateFutureProductStatus,
  removeFutureProduct
} from "../controllers/futureProductController.js";

import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";


const futureProductRouter =
  express.Router();


// ======================================================
// OPTIONAL AUTH
// ======================================================

/*
  /list ska fungera även om kunden
  inte är inloggad.

  Om kunden däremot HAR en token
  läser vi userId så frontend kan få:

  hasVoted: true / false
*/

const optionalAuth = (
  req,
  res,
  next
) => {

  try {

    const customToken =
      req.headers.token;


    const authorization =
      req.headers.authorization;


    const bearerToken =
      authorization &&
      authorization.startsWith("Bearer ")
        ? authorization.split(" ")[1]
        : null;


    const token =
      customToken ||
      bearerToken;


    // Ingen token = fortsätt som gäst
    if (!token) {

      return next();

    }


    if (!process.env.JWT_SECRET) {

      console.log(
        "JWT_SECRET saknas."
      );

      return next();

    }


    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );


    if (decoded?.id) {

      req.userId =
        decoded.id;

    }


    next();


  } catch (error) {

    /*
      En ogiltig/gammal token ska inte
      hindra en besökare från att se
      framtida produkter.

      Personen behandlas istället
      som utloggad på den publika routen.
    */

    req.userId =
      null;


    next();

  }

};


// ======================================================
// IMAGE STORAGE
// ======================================================

const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        "uploads"
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
// IMAGE UPLOAD
// ======================================================

const upload =
  multer({

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
// PUBLIC
// GET FUTURE PRODUCTS
// ======================================================

futureProductRouter.get(
  "/list",
  optionalAuth,
  listFutureProducts
);


// ======================================================
// USER
// VOTE
// ======================================================

futureProductRouter.post(
  "/vote",
  authMiddleware,
  voteFutureProduct
);


// ======================================================
// USER
// REMOVE VOTE
// ======================================================

futureProductRouter.post(
  "/unvote",
  authMiddleware,
  removeFutureProductVote
);


// ======================================================
// ADMIN
// ADD FUTURE PRODUCT
// ======================================================

futureProductRouter.post(
  "/add",
  authMiddleware,
  adminAuth,
  upload.single("image"),
  addFutureProduct
);


// ======================================================
// ADMIN
// GET ALL FUTURE PRODUCTS
// ======================================================

futureProductRouter.get(
  "/admin/list",
  authMiddleware,
  adminAuth,
  adminListFutureProducts
);


// ======================================================
// ADMIN
// SHOW / HIDE PRODUCT
// ======================================================

futureProductRouter.post(
  "/status",
  authMiddleware,
  adminAuth,
  updateFutureProductStatus
);


// ======================================================
// ADMIN
// REMOVE PRODUCT
// ======================================================

futureProductRouter.post(
  "/remove",
  authMiddleware,
  adminAuth,
  removeFutureProduct
);


// ======================================================
// EXPORT
// ======================================================

export default futureProductRouter;