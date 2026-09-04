import jwt from "jsonwebtoken";


// ======================================================
// GET TOKEN HELPER
// ======================================================

const getToken = (req) => {

  let token = req.headers.token;


  // Also support:
  // Authorization: Bearer TOKEN
  if (
    !token &&
    req.headers.authorization
  ) {

    const authHeader =
      req.headers.authorization;


    if (
      authHeader.startsWith("Bearer ")
    ) {

      token =
        authHeader.substring(7);

    }

  }


  return token;

};



// ======================================================
// REQUIRED AUTH MIDDLEWARE
// ======================================================

const authMiddleware = async (req, res, next) => {

  try {

    const token =
      getToken(req);


    // ==================================================
    // CHECK TOKEN EXISTS
    // ==================================================

    if (!token) {

      return res.status(401).json({

        success: false,

        message:
          "Du är inte inloggad. Logga in igen."

      });

    }


    // ==================================================
    // CHECK JWT SECRET
    // ==================================================

    if (!process.env.JWT_SECRET) {

      console.error(
        "JWT_SECRET is missing"
      );


      return res.status(500).json({

        success: false,

        message:
          "Server configuration error"

      });

    }


    // ==================================================
    // VERIFY JWT
    // ==================================================

    const tokenDecode =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );


    // ==================================================
    // CHECK USER ID
    // ==================================================

    if (!tokenDecode.id) {

      return res.status(401).json({

        success: false,

        message:
          "Ogiltig inloggning."

      });

    }


    // ==================================================
    // ADD VERIFIED USER TO REQUEST
    // ==================================================

    req.userId =
      tokenDecode.id;


    req.user = {

      id:
        tokenDecode.id,

      role:
        tokenDecode.role || null,

      email:
        tokenDecode.email || null,

      isAdmin:
        tokenDecode.isAdmin || false

    };


    next();

  } catch (error) {


    console.log(
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

        message:
          "Din session har gått ut. Logga in igen."

      });

    }


    // ==================================================
    // INVALID TOKEN
    // ==================================================

    if (
      error.name ===
      "JsonWebTokenError"
    ) {

      return res.status(401).json({

        success: false,

        message:
          "Ogiltig inloggning."

      });

    }


    // ==================================================
    // OTHER AUTH ERROR
    // ==================================================

    return res.status(500).json({

      success: false,

      message:
        "Authentication error"

    });

  }

};



// ======================================================
// OPTIONAL AUTH MIDDLEWARE
// ======================================================
// Allows both:
// - logged-in customers
// - guest customers
//
// If a valid token exists, req.userId is added.
// If no token exists, checkout continues as guest.
// ======================================================

export const optionalAuthMiddleware =
  async (req, res, next) => {

    try {

      const token =
        getToken(req);


      // ==================================================
      // NO TOKEN = CONTINUE AS GUEST
      // ==================================================

      if (!token) {

        req.userId = null;
        req.user = null;

        return next();

      }


      // ==================================================
      // CHECK JWT SECRET
      // ==================================================

      if (!process.env.JWT_SECRET) {

        console.error(
          "JWT_SECRET is missing"
        );


        return res.status(500).json({

          success: false,

          message:
            "Server configuration error"

        });

      }


      // ==================================================
      // VERIFY TOKEN IF PROVIDED
      // ==================================================

      const tokenDecode =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );


      if (!tokenDecode.id) {

        return res.status(401).json({

          success: false,

          message:
            "Ogiltig inloggning."

        });

      }


      // ==================================================
      // LOGGED-IN CUSTOMER
      // ==================================================

      req.userId =
        tokenDecode.id;


      req.user = {

        id:
          tokenDecode.id,

        role:
          tokenDecode.role || null,

        email:
          tokenDecode.email || null,

        isAdmin:
          tokenDecode.isAdmin || false

      };


      next();

    } catch (error) {


      console.log(
        "Optional auth middleware error:",
        error.message
      );


      // If customer sends a broken/expired token,
      // do not silently treat them as another person.

      if (
        error.name ===
        "TokenExpiredError"
      ) {

        return res.status(401).json({

          success: false,

          message:
            "Din session har gått ut. Logga in igen eller fortsätt som gäst."

        });

      }


      if (
        error.name ===
        "JsonWebTokenError"
      ) {

        return res.status(401).json({

          success: false,

          message:
            "Ogiltig inloggning."

        });

      }


      return res.status(500).json({

        success: false,

        message:
          "Authentication error"

      });

    }

  };



export default authMiddleware;