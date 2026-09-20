import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";


// ======================================================
// CREATE ADMIN JWT TOKEN
// ======================================================

const createAdminToken = (user) => {

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }


  return jwt.sign(
    {
      id: user._id.toString(),
      role: "admin",
      isAdmin: true
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );

};


// ======================================================
// LOGIN ADMIN
// ======================================================

const loginAdmin = async (req, res) => {

  try {

    // ==================================================
    // CHECK REQUEST BODY
    // ==================================================

    if (!req.body) {

      return res.status(400).json({
        success: false,
        message: "Request body is missing"
      });

    }


    const {
      email,
      password
    } = req.body;


    // ==================================================
    // CHECK REQUIRED FIELDS
    // ==================================================

    if (!email || !password) {

      return res.status(400).json({
        success: false,
        message: "E-post och lösenord krävs."
      });

    }


    // ==================================================
    // NORMALIZE EMAIL
    // ==================================================

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();


    // ==================================================
    // VALIDATE EMAIL
    // ==================================================

    if (!validator.isEmail(normalizedEmail)) {

      return res.status(400).json({
        success: false,
        message: "Ange en giltig e-postadress."
      });

    }


    // ==================================================
    // FIND USER
    // ==================================================

    const user =
      await userModel.findOne({
        email: normalizedEmail
      });


    // Same response for unknown account and wrong password.
    if (!user) {

      return res.status(401).json({
        success: false,
        message: "Felaktig e-postadress eller lösenord."
      });

    }


    // ==================================================
    // CHECK PASSWORD
    // ==================================================

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!isMatch) {

      return res.status(401).json({
        success: false,
        message: "Felaktig e-postadress eller lösenord."
      });

    }


    // ==================================================
    // CHECK ADMIN ROLE
    // ==================================================

    if (user.role !== "admin") {

      return res.status(403).json({
        success: false,
        message: "Du har inte behörighet till adminpanelen."
      });

    }


    // ==================================================
    // CREATE ADMIN TOKEN
    // ==================================================

    const token =
      createAdminToken(user);


    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,
      message: "Admin-inloggningen lyckades.",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });


  } catch (error) {

    console.error(
      "Admin login error:",
      error.message
    );


    return res.status(500).json({
      success: false,
      message: "Ett serverfel uppstod."
    });

  }

};


// ======================================================
// EXPORT
// ======================================================

export {
  loginAdmin
};