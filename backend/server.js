
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";

// ======================================================
// DATABASE
// ======================================================

import { connectedDB } from "./config/db.js";

// ======================================================
// API ROUTERS
// ======================================================

import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import futureProductRouter from "./routes/futureProductRoute.js";
import discountRouter from "./routes/discountRoute.js";
import kitchenRecipeRouter from "./routes/kitchenRecipeRoute.js";

// ======================================================
// ADMIN AUTHENTICATION
// ======================================================

import adminRouter, {
  requireAdmin
} from "./routes/adminRoute.js";

// ======================================================
// MANILA CAFÉ LIVECHAT
// ======================================================

import {
  makeChatRouter
} from "./routes/chatRoutes.js";

// ======================================================
// STRIPE WEBHOOK
// ======================================================

import {
  stripeWebhook,
  reconcileExpiredStockHolds
} from "./controllers/orderController.js";

// ======================================================
// APP CONFIG
// ======================================================

const app = express();

const port = process.env.PORT || 4000;

// ======================================================
// SECURITY HEADERS
// ======================================================

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);

// ======================================================
// FRONTEND URLS
// ======================================================

const frontendUrl =
  process.env.FRONTEND_URL ||
  "https://www.manilacafe.se";

const adminUrl =
  process.env.ADMIN_URL ||
  "https://admin.manilacafe.se";

// ======================================================
// NORMALIZE URL
// ======================================================

const normalizeOrigin = (origin) => {
  if (!origin) {
    return "";
  }

  return origin
    .trim()
    .replace(/\/+$/, "");
};

// ======================================================
// ALLOWED FRONTENDS
// ======================================================

const allowedOrigins = [
  normalizeOrigin(frontendUrl),
  normalizeOrigin(adminUrl),

  // Production customer website
  "https://www.manilacafe.se",
  "https://manilacafe.se",

  // Production admin website
  "https://admin.manilacafe.se",

  // Vercel admin fallback
  "https://manilacafe-admin.vercel.app",

  // Local customer frontend
  "http://localhost:5173",

  // Local admin frontend
  "http://localhost:5174"
].filter(Boolean);

const uniqueAllowedOrigins = [
  ...new Set(allowedOrigins)
];

// ======================================================
// VERCEL PREVIEW ORIGINS
// ======================================================

const isManilaCafeVercelOrigin = (origin) => {
  return /^https:\/\/manilacafe-[a-z0-9-]+-manilacafe\.vercel\.app$/.test(
    origin
  );
};

// ======================================================
// CORS OPTIONS
// ======================================================

const corsOptions = {
  origin: (origin, callback) => {

    // Server-to-server requests and curl
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin =
      normalizeOrigin(origin);

    if (
      uniqueAllowedOrigins.includes(normalizedOrigin) ||
      isManilaCafeVercelOrigin(normalizedOrigin)
    ) {
      return callback(null, true);
    }

    console.log(
      "Blocked by CORS:",
      normalizedOrigin
    );

    console.log(
      "Allowed origins:",
      uniqueAllowedOrigins
    );

    return callback(
      new Error(
        `CORS blocked origin: ${normalizedOrigin}`
      )
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "token",
    "X-Chat-Token",
    "Stripe-Signature"
  ],

  optionsSuccessStatus: 204
};

// ======================================================
// CORS
// ======================================================

app.use(cors(corsOptions));

// ======================================================
// STRIPE WEBHOOK
//
// IMPORTANT:
// MUST BE BEFORE express.json()
// ======================================================

app.post(
  "/api/order/webhook",

  express.raw({
    type: "application/json"
  }),

  stripeWebhook
);

// ======================================================
// NORMAL JSON MIDDLEWARE
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
// DATABASE CONNECTION
// ======================================================

connectedDB().then(() => {
  // Recover held inventory when Stripe expiry webhooks were missed.
  // Do not release unless Stripe confirms the session is expired.
  const run = () => reconcileExpiredStockHolds().catch(error =>
    console.error("Inventory hold reconciliation failed:", error.message)
  );
  void run();
  const stockTimer = setInterval(run, 5 * 60 * 1000);
  stockTimer.unref?.();
});

// ======================================================
// STATIC FILES
// ======================================================

app.use(
  "/images",
  express.static("uploads")
);

// ======================================================
// CUSTOMER API ROUTES
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
// ADMIN ROUTES
//
// IMPORTANT:
// Required for admin login and verification
// ======================================================

app.use(
  "/api/admin",
  adminRouter
);

// ======================================================
// MANILA CAFÉ LIVECHAT
//
// Customer conversations
// Automatic responses
// Protected staff inbox
// ======================================================

app.use(
  "/api/chat",
  makeChatRouter({
    mongoose,
    staffAuth: requireAdmin
  })
);

// ======================================================
// DISCOUNT ROUTES
// ======================================================

app.use(
  "/api/discount",
  discountRouter
);

// ======================================================
// INTERNAL KITCHEN RECIPES
// ======================================================

app.use(
  "/api/kitchen-recipe",
  kitchenRecipeRouter
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

    return res
      .status(200)
      .send("Manila Café API Working");

  }
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
  "/api/health",
  (req, res) => {

    return res.status(200).json({

      success: true,

      message: "Server is running",

      allowedOrigins: uniqueAllowedOrigins,

      stripeConfigured: Boolean(
        process.env.STRIPE_SECRET_KEY
      ),

      stripeWebhookConfigured: Boolean(
        process.env.STRIPE_WEBHOOK_SECRET
      )

    });

  }
);

// ======================================================
// 404 HANDLER
// ======================================================

app.use(
  (req, res) => {

    return res.status(404).json({

      success: false,

      message: "Route not found"

    });

  }
);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
  (error, req, res, next) => {

    console.error(
      "Server error:",
      error.message
    );

    // CORS ERRORS

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

    // MULTER FILE SIZE

    if (
      error.code === "LIMIT_FILE_SIZE"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Bilden får vara högst 5 MB."

      });

    }

    // IMAGE VALIDATION

    if (
      error.message ===
      "Endast bildfiler är tillåtna."
    ) {

      return res.status(400).json({

        success: false,

        message: error.message

      });

    }

    // GENERAL ERROR

    return res.status(500).json({

      success: false,

      message: "Internal server error"

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
      `Server Started on port ${port}`
    );

    console.log(
      "Customer frontend:",
      normalizeOrigin(frontendUrl)
    );

    console.log(
      "Admin frontend:",
      normalizeOrigin(adminUrl)
    );

    console.log(
      "Allowed origins:",
      uniqueAllowedOrigins
    );

    console.log(
      "Stripe configured:",
      Boolean(process.env.STRIPE_SECRET_KEY)
    );

    console.log(
      "Stripe webhook configured:",
      Boolean(process.env.STRIPE_WEBHOOK_SECRET)
    );

    console.log(
      "Stripe webhook:",
      "/api/order/webhook"
    );

    console.log(
      "Admin API:",
      "/api/admin/login"
    );

    console.log(
      "Admin verification:",
      "/api/admin/verify"
    );

    console.log(
      "Livechat API:",
      "/api/chat"
    );

    console.log(
      "Future products API:",
      "/api/future-product/list"
    );

  }
);
