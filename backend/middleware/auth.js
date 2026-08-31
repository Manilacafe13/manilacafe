
import jwt from "jsonwebtoken";


// ======================================================
// AUTH MIDDLEWARE
// ======================================================

const authMiddleware = async (req, res, next) => {

  try {

    // ==================================================
    // GET TOKEN
    // ==================================================

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
    // ADD USER INFORMATION TO REQUEST
    // ==================================================

    /*
      Preferred way for future controllers:

      req.userId

      We also keep req.body.userId because
      your current controllers use it.
    */

    req.userId =
      tokenDecode.id;


    if (!req.body) {

      req.body = {};

    }


    req.body.userId =
      tokenDecode.id;


    // ==================================================
    // OPTIONAL TOKEN DATA
    // ==================================================

    /*
      If your JWT later contains:

      role
      email
      isAdmin

      they can also be accessed here.
    */

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


    // ==================================================
    // CONTINUE
    // ==================================================

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


export default authMiddleware;
