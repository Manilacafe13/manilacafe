import mongoose from "mongoose";


// ======================================================
// USER SCHEMA
// ======================================================

const userSchema = new mongoose.Schema(
  {

    // ==================================================
    // NAME
    // ==================================================

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },


    // ==================================================
    // EMAIL
    // ==================================================

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },


    // ==================================================
    // PASSWORD
    // ==================================================

    password: {
      type: String,
      required: true
    },


    // ==================================================
    // USER ROLE
    // ==================================================

    /*
      Vanliga användare får rollen "user".

      Senare kan du ändra ditt eget konto
      till "admin" i MongoDB.

      Admin-routes kan sedan kontrollera
      denna roll via databasen.
    */

    role: {
      type: String,
      enum: [
        "user",
        "admin"
      ],
      default: "user"
    },


    // ==================================================
    // CART
    // ==================================================

    /*
      Exempel:

      cartData: {
        "productId1": 2,
        "productId2": 1
      }
    */

    cartData: {
      type: Object,
      default: {}
    }

  },

  {
    minimize: false,
    timestamps: true
  }
);


// ======================================================
// MODEL
// ======================================================

const userModel =
  mongoose.models.user ||
  mongoose.model(
    "user",
    userSchema
  );


export default userModel;