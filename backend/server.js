import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectedDB } from "./config/db.js";

import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import futureProductRouter from "./routes/futureProductRoute.js";


// ======================================================
// APP CONFIG
// ======================================================

const app = express();

const port =
  process.env.PORT || 4000;


// ======================================================
// ALLOWED FRONTENDS
// ======================================================

const frontendUrl =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";


const adminUrl =
  process.env.ADMIN_URL ||
  "http://localhost:5174";


const allowedOrigins = [
  frontendUrl,
  adminUrl
];


// ======================================================
// CORS
// ======================================================

app.use(
  cors({

    origin: (origin, callback) => {

      // Tillåt exempelvis Postman / server requests
      if (!origin) {

        return callback(
          null,
          true
        );

      }


      if (
        allowedOrigins.includes(origin)
      ) {

        return callback(
          null,
          true
        );

      }


      console.log(
        "Blocked by CORS:",
        origin
      );


      return callback(
        new Error(
          `CORS blocked origin: ${origin}`
        )
      );

    },

    credentials: true

  })
);


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  express.json({
    limit: "10mb"
  })
);


app.use(
  express.urlencoded({
    extended: true
  })
);


// ======================================================
// DATABASE
// ======================================================

connectedDB();


// ======================================================
// STATIC FILES
// ======================================================

app.use(
  "/images",
  express.static("uploads")
);


// ======================================================
// API ROUTES
// ======================================================

app.use(
  "/api/food",
  foodRouter
);


app.use(
  "/api/user",
  userRouter
);


app.use(
  "/api/cart",
  cartRouter
);


app.use(
  "/api/order",
  orderRouter
);


// ======================================================
// FUTURE PRODUCTS / CUSTOMER VOTING
// ======================================================

app.use(
  "/api/future-product",
  futureProductRouter
);


// ======================================================
// TEST ROUTE
// ======================================================

app.get(
  "/",
  (req, res) => {

    res
      .status(200)
      .send(
        "Manila Café API Working"
      );

  }
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
  "/api/health",
  (req, res) => {

    res.status(200).json({

      success: true,

      message:
        "Server is running",

      allowedOrigins

    });

  }
);


// ======================================================
// 404 HANDLER
// ======================================================

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        "Route not found"

    });

  }
);


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.log(
      "Server error:",
      error.message
    );


    // ==================================================
    // CORS ERROR
    // ==================================================

    if (
      error.message?.includes(
        "CORS blocked origin"
      )
    ) {

      return res.status(403).json({

        success: false,

        message:
          "Frontend is not allowed to access the API"

      });

    }


    // ==================================================
    // MULTER FILE SIZE ERROR
    // ==================================================

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Bilden får vara högst 5 MB."

      });

    }


    // ==================================================
    // MULTER / IMAGE ERROR
    // ==================================================

    if (
      error.message ===
      "Endast bildfiler är tillåtna."
    ) {

      return res.status(400).json({

        success: false,

        message:
          error.message

      });

    }


    // ==================================================
    // GENERAL ERROR
    // ==================================================

    return res.status(500).json({

      success: false,

      message:
        "Internal server error"

    });

  }
);


// ======================================================
// START SERVER
// ======================================================

app.listen(
  port,
  () => {

    console.log(
      `Server Started on http://localhost:${port}`
    );


    console.log(
      "Customer frontend:",
      frontendUrl
    );


    console.log(
      "Admin frontend:",
      adminUrl
    );


    console.log(
      "Future products API:",
      `http://localhost:${port}/api/future-product/list`
    );

  }
);