import mongoose from "mongoose";


// ======================================================
// CONNECT TO MONGODB
// ======================================================

export const connectedDB = async () => {

  try {

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI saknas i backend/.env"
      );
    }


    await mongoose.connect(
      process.env.MONGO_URI
    );


    console.log("DB Connected");

  } catch (error) {

    console.error(
      "MongoDB connection error:",
      error.message
    );

    process.exit(1);

  }

};


export default connectedDB;