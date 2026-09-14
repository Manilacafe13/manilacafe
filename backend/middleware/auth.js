import jwt from "jsonwebtoken";


// ======================================================
// GET TOKEN HELPER
// ======================================================

const getToken = (req) => {

  let token = req.headers.token;


  // Standard Authorization header:
  // Authorization: Bearer TOKEN
  if (
    !token &&
    req.headers.authorization
  ) {

    const authHeader =
      req.headers.authorization;


    if (
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    ) {

      token =
        authHeader.substring(7);

    }

  }


  // Make sure token is always a clean string
  if (typeof token === "string") {

    token = token.trim();

  }


  return token || null;

};



// ======================================================
// CREATE USER OBJECT FROM TOKEN
// ======================================================

const createUserFromToken = (tokenDecode) => {

  return {

    id:
      tokenDecode.id,

    role:
      tokenDecode.role || null,

    email:
      tokenDecode.email || null,

    isAdmin:
      tokenDecode.isAdmin === true

  };

};



// ======================================================
// REQUIRED AUTH MIDDLEWARE
// ======================================================

const authMiddleware = async (req, res, next) => {

  try {

    const token =
      getToken(req);


    // ==================================================
    // TOKEN MISSING
    // ==================================================

    if (!token) {

      return res.status(401).json({

        success: false,

        code:
          "AUTH_REQUIRED",

        message:
          "Du är inte inloggad. Logga in igen."

      });

    }


    // ==================================================
    // JWT SECRET CHECK
    // ==================================================

    if (!process.env.JWT_SECRET) {

      console.error(
        "JWT_SECRET is missing"
      );


      return res.status(500).json({

        success: false,

        code:
          "AUTH_CONFIG_ERROR",

        message:
          "Server configuration error"

      });

    }


    // ==================================================
    // VERIFY TOKEN
    // ==================================================

    const tokenDecode =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );


    // ==================================================
    // VALIDATE TOKEN PAYLOAD
    // ==================================================

    if (
      !tokenDecode ||
      typeof tokenDecode !== "object" ||
      !tokenDecode.id
    ) {

      return res.status(401).json({

        success: false,

        code:
          "INVALID_TOKEN",

        message:
          "Ogiltig inloggning."

      });

    }


    // ==================================================
    // ADD USER TO REQUEST
    // ==================================================

    req.userId =
      tokenDecode.id;


    req.user =
      createUserFromToken(
        tokenDecode
      );


    return next();

  } catch (error) {


    console.error(
      "Auth middleware error:",
      error.message
    );


    // ==================================================
    // EXPIRED TOKEN
    // ==================================================

    if (
      error.name ===
      "TokenExpiredError"
    ) {

      return res.status(401).json({

        success: false,

        code:
          "TOKEN_EXPIRED",

        message:
          "Din session har gått ut. Logga in igen."

      });

    }


    // ==================================================
    // INVALID TOKEN
    // ==================================================

    if (
      error.name ===
      "JsonWebTokenError" ||
      error.name ===
      "NotBeforeError"
    ) {

      return res.status(401).json({

        success: false,

        code:
          "INVALID_TOKEN",

        message:
          "Ogiltig inloggning."

      });

    }


    // ==================================================
    // UNKNOWN AUTH ERROR
    // ==================================================

    return res.status(500).json({

      success: false,

      code:
        "AUTH_ERROR",

      message:
        "Authentication error"

    });

  }

};



// ======================================================
// OPTIONAL AUTH MIDDLEWARE
// ======================================================
//
// Used for routes where BOTH are allowed:
//
// - logged-in customer
// - guest customer
//
// IMPORTANT:
//
// A broken or expired token should NOT prevent
// a customer from continuing as a guest.
//
// ======================================================

export const optionalAuthMiddleware =
  async (req, res, next) => {

    try {

      const token =
        getToken(req);


      // ==================================================
      // NO TOKEN = GUEST
      // ==================================================

      if (!token) {

        req.userId = null;

        req.user = null;

        req.authStatus =
          "guest";


        return next();

      }


      // ==================================================
      // JWT SECRET CHECK
      // ==================================================

      if (!process.env.JWT_SECRET) {

        console.error(
          "JWT_SECRET is missing"
        );


        return res.status(500).json({

          success: false,

          code:
            "AUTH_CONFIG_ERROR",

          message:
            "Server configuration error"

        });

      }


      // ==================================================
      // VERIFY TOKEN
      // ==================================================

      const tokenDecode =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );


      // ==================================================
      // INVALID PAYLOAD
      // ==================================================

      if (
        !tokenDecode ||
        typeof tokenDecode !== "object" ||
        !tokenDecode.id
      ) {

        req.userId = null;

        req.user = null;

        req.authStatus =
          "invalid";


        return next();

      }


      // ==================================================
      // VALID LOGGED-IN USER
      // ==================================================

      req.userId =
        tokenDecode.id;


      req.user =
        createUserFromToken(
          tokenDecode
        );


      req.authStatus =
        "authenticated";


      return next();

    } catch (error) {


      // ==================================================
      // EXPIRED TOKEN
      // ==================================================
      //
      // Important:
      // optional authentication means checkout
      // should still work as guest.
      // ==================================================

      if (
        error.name ===
        "TokenExpiredError"
      ) {

        console.log(
          "Expired optional token - continuing as guest"
        );


        req.userId = null;

        req.user = null;

        req.authStatus =
          "expired";


        return next();

      }


      // ==================================================
      // INVALID TOKEN
      // ==================================================

      if (
        error.name ===
          "JsonWebTokenError" ||
        error.name ===
          "NotBeforeError"
      ) {

        console.log(
          "Invalid optional token - continuing as guest"
        );


        req.userId = null;

        req.user = null;

        req.authStatus =
          "invalid";


        return next();

      }


      // ==================================================
      // UNKNOWN ERROR
      // ==================================================

      console.error(
        "Optional auth middleware error:",
        error.message
      );


      return res.status(500).json({

        success: false,

        code:
          "AUTH_ERROR",

        message:
          "Authentication error"

      });

    }

  };



export default authMiddleware;