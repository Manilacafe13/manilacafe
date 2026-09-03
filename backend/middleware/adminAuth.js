import userModel from "../models/userModel.js";


// ======================================================
// ADMIN AUTH MIDDLEWARE
// ======================================================

const adminAuth = async (req, res, next) => {

  try {

    // ==================================================
    // GET VERIFIED USER ID FROM authMiddleware
    // ==================================================

    const userId =
      req.userId;


    if (!userId) {

      return res.status(401).json({

        success: false,

        message:
          "Du är inte inloggad."

      });

    }


    // ==================================================
    // FIND USER
    // ==================================================

    const user =
      await userModel
        .findById(userId)
        .select("role");


    if (!user) {

      return res.status(401).json({

        success: false,

        message:
          "Användaren kunde inte hittas."

      });

    }


    // ==================================================
    // CHECK ADMIN ROLE
    // ==================================================

    if (user.role !== "admin") {

      return res.status(403).json({

        success: false,

        message:
          "Du har inte behörighet att använda denna funktion."

      });

    }


    // ==================================================
    // STORE ADMIN INFORMATION
    // ==================================================

    req.user = {

      ...(req.user || {}),

      id:
        user._id.toString(),

      role:
        user.role,

      isAdmin:
        true

    };


    // ==================================================
    // CONTINUE
    // ==================================================

    next();

  } catch (error) {

    console.error("Admin auth error:", error.message);


    return res.status(500).json({

      success: false,

      message:
        "Ett fel uppstod vid kontroll av administratörsbehörighet."

    });

  }

};


export default adminAuth;