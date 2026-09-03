
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";


// ======================================================
// CREATE JWT TOKEN
// ======================================================

const createToken = (id) => {

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }


  return jwt.sign(

    {
      id: id.toString()
    },

    process.env.JWT_SECRET,

    {
      expiresIn: "7d"
    }

  );

};


// ======================================================
// LOGIN USER
// ======================================================

const loginUser = async (req, res) => {

  try {

    // --------------------------------------------------
    // CHECK REQUEST BODY
    // --------------------------------------------------

    if (!req.body) {

      return res.status(400).json({

        success: false,

        message:
          "Request body is missing"

      });

    }


    const {
      email,
      password
    } = req.body;


    // --------------------------------------------------
    // CHECK REQUIRED FIELDS
    // --------------------------------------------------

    if (!email || !password) {

      return res.status(400).json({

        success: false,

        message:
          "E-post och lösenord krävs."

      });

    }


    // --------------------------------------------------
    // NORMALIZE EMAIL
    // --------------------------------------------------

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();


    // --------------------------------------------------
    // VALIDATE EMAIL
    // --------------------------------------------------

    if (
      !validator.isEmail(
        normalizedEmail
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ange en giltig e-postadress."

      });

    }


    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user =
      await userModel.findOne({

        email:
          normalizedEmail

      });


    /*
      Same message whether email or password
      is incorrect.

      This avoids revealing whether an
      account exists.
    */

    if (!user) {

      return res.status(401).json({

        success: false,

        message:
          "Felaktig e-postadress eller lösenord."

      });

    }


    // --------------------------------------------------
    // CHECK PASSWORD
    // --------------------------------------------------

    const isMatch =
      await bcrypt.compare(

        password,

        user.password

      );


    if (!isMatch) {

      return res.status(401).json({

        success: false,

        message:
          "Felaktig e-postadress eller lösenord."

      });

    }


    // --------------------------------------------------
    // CREATE TOKEN
    // --------------------------------------------------

    const token =
      createToken(
        user._id
      );


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({

      success: true,

      message:
        "Inloggningen lyckades.",

      token

    });

  } catch (error) {

    console.error("Login error:", error.message);


    return res.status(500).json({

      success: false,

      message:
        "Ett serverfel uppstod."

    });

  }

};


// ======================================================
// REGISTER USER
// ======================================================

const registerUser = async (req, res) => {

  try {

    // --------------------------------------------------
    // CHECK REQUEST BODY
    // --------------------------------------------------

    if (!req.body) {

      return res.status(400).json({

        success: false,

        message:
          "Request body is missing"

      });

    }


    const {
      name,
      email,
      password
    } = req.body;


    // --------------------------------------------------
    // CHECK REQUIRED FIELDS
    // --------------------------------------------------

    if (
      !name ||
      !email ||
      !password
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Namn, e-post och lösenord krävs."

      });

    }


    // --------------------------------------------------
    // CHECK JWT CONFIGURATION
    // --------------------------------------------------

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


    // --------------------------------------------------
    // NORMALIZE DATA
    // --------------------------------------------------

    const normalizedName =
      name.trim();


    const normalizedEmail =
      email
        .trim()
        .toLowerCase();


    // --------------------------------------------------
    // VALIDATE NAME
    // --------------------------------------------------

    if (
      normalizedName.length < 2
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Namnet måste innehålla minst 2 tecken."

      });

    }


    // --------------------------------------------------
    // VALIDATE EMAIL
    // --------------------------------------------------

    if (
      !validator.isEmail(
        normalizedEmail
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ange en giltig e-postadress."

      });

    }


    // --------------------------------------------------
    // VALIDATE PASSWORD
    // --------------------------------------------------

    if (
      password.length < 8
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Lösenordet måste innehålla minst 8 tecken."

      });

    }


    // --------------------------------------------------
    // CHECK IF USER EXISTS
    // --------------------------------------------------

    const exists =
      await userModel.findOne({

        email:
          normalizedEmail

      });


    if (exists) {

      return res.status(409).json({

        success: false,

        message:
          "Det finns redan ett konto med denna e-postadress."

      });

    }


    // --------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------

    const salt =
      await bcrypt.genSalt(10);


    const hashedPassword =
      await bcrypt.hash(

        password,

        salt

      );


    // --------------------------------------------------
    // CREATE USER
    // --------------------------------------------------

    const newUser =
      new userModel({

        name:
          normalizedName,

        email:
          normalizedEmail,

        password:
          hashedPassword

      });


    // --------------------------------------------------
    // SAVE USER
    // --------------------------------------------------

    const user =
      await newUser.save();


    // --------------------------------------------------
    // CREATE JWT
    // --------------------------------------------------

    const token =
      createToken(
        user._id
      );


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(201).json({

      success: true,

      message:
        "Kontot skapades.",

      token

    });

  } catch (error) {

    console.error("Register error:", error.message);


    // --------------------------------------------------
    // DUPLICATE EMAIL
    // --------------------------------------------------

    if (
      error.code === 11000
    ) {

      return res.status(409).json({

        success: false,

        message:
          "Det finns redan ett konto med denna e-postadress."

      });

    }


    // --------------------------------------------------
    // SERVER ERROR
    // --------------------------------------------------

    return res.status(500).json({

      success: false,

      message:
        "Ett serverfel uppstod."

    });

  }

};


// ======================================================
// EXPORT
// ======================================================

export {
  loginUser,
  registerUser
};

