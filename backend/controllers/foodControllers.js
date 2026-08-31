import foodModel from "../models/foodmodel.js";
import mongoose from "mongoose";
import fs from "fs";


// ======================================================
// ADD FOOD
// ======================================================

const addFood = async (req, res) => {

  try {

    // ==================================================
    // CHECK IMAGE
    // ==================================================

    if (!req.file) {

      return res.status(400).json({

        success: false,

        message:
          "Produktbild saknas."

      });

    }


    // ==================================================
    // PRODUCT DATA
    // ==================================================

    const name =
      String(
        req.body.name || ""
      ).trim();


    const description =
      String(
        req.body.description || ""
      ).trim();


    const category =
      String(
        req.body.category || ""
      ).trim();


    const price =
      Number(
        req.body.price
      );


    const sameDayStock =
      Number(
        req.body.sameDayStock || 0
      );


    // ==================================================
    // VALIDATE REQUIRED DATA
    // ==================================================

    if (
      !name ||
      !description ||
      !category
    ) {

      // Remove uploaded image
      fs.unlink(
        `uploads/${req.file.filename}`,
        () => {}
      );


      return res.status(400).json({

        success: false,

        message:
          "Alla produktuppgifter måste fyllas i."

      });

    }


    // ==================================================
    // VALIDATE PRICE
    // ==================================================

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {

      fs.unlink(
        `uploads/${req.file.filename}`,
        () => {}
      );


      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produktpris."

      });

    }


    // ==================================================
    // VALIDATE SAME-DAY STOCK
    // ==================================================

    if (
      !Number.isInteger(
        sameDayStock
      ) ||
      sameDayStock < 0
    ) {

      fs.unlink(
        `uploads/${req.file.filename}`,
        () => {}
      );


      return res.status(400).json({

        success: false,

        message:
          "Dagslagret måste vara ett heltal från 0 och uppåt."

      });

    }


    // ==================================================
    // CREATE PRODUCT
    // ==================================================

    const food =
      new foodModel({

        name,

        description,

        price,

        category,

        image:
          req.file.filename,

        sameDayStock

      });


    // ==================================================
    // SAVE PRODUCT
    // ==================================================

    await food.save();


    return res.status(201).json({

      success: true,

      message:
        "Produkten har lagts till.",

      data:
        food

    });


  } catch (error) {

    console.log(
      "Add food error:",
      error
    );


    // ==================================================
    // REMOVE IMAGE IF SAVE FAILED
    // ==================================================

    if (
      req.file?.filename
    ) {

      fs.unlink(
        `uploads/${req.file.filename}`,
        () => {}
      );

    }


    return res.status(500).json({

      success: false,

      message:
        "Produkten kunde inte läggas till."

    });

  }

};


// ======================================================
// LIST ALL FOOD
// ======================================================

const listFood = async (
  req,
  res
) => {

  try {

    const foods =
      await foodModel
        .find({})
        .sort({
          createdAt: -1
        });


    return res.status(200).json({

      success: true,

      count:
        foods.length,

      data:
        foods

    });


  } catch (error) {

    console.log(
      "List food error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Produkterna kunde inte hämtas."

    });

  }

};


// ======================================================
// UPDATE SAME-DAY STOCK
// ======================================================

const updateStock = async (
  req,
  res
) => {

  try {

    const {
      id,
      sameDayStock
    } = req.body;


    // ==================================================
    // CHECK PRODUCT ID
    // ==================================================

    if (!id) {

      return res.status(400).json({

        success: false,

        message:
          "Produkt-ID saknas."

      });

    }


    if (
      !mongoose.isValidObjectId(
        id
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produkt-ID."

      });

    }


    // ==================================================
    // VALIDATE STOCK
    // ==================================================

    const stock =
      Number(
        sameDayStock
      );


    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Dagslagret måste vara ett heltal från 0 och uppåt."

      });

    }


    // ==================================================
    // UPDATE PRODUCT
    // ==================================================

    const food =
      await foodModel.findByIdAndUpdate(

        id,

        {
          sameDayStock:
            stock
        },

        {
          new: true,
          runValidators: true
        }

      );


    // ==================================================
    // PRODUCT NOT FOUND
    // ==================================================

    if (!food) {

      return res.status(404).json({

        success: false,

        message:
          "Produkten kunde inte hittas."

      });

    }


    // ==================================================
    // SUCCESS
    // ==================================================

    return res.status(200).json({

      success: true,

      message:
        "Dagslagret har uppdaterats.",

      data:
        food

    });


  } catch (error) {

    console.log(
      "Update stock error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Dagslagret kunde inte uppdateras."

    });

  }

};


// ======================================================
// REMOVE FOOD
// ======================================================

const removeFood = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.body;


    // ==================================================
    // CHECK ID
    // ==================================================

    if (!id) {

      return res.status(400).json({

        success: false,

        message:
          "Produkt-ID saknas."

      });

    }


    if (
      !mongoose.isValidObjectId(
        id
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ogiltigt produkt-ID."

      });

    }


    // ==================================================
    // FIND PRODUCT
    // ==================================================

    const food =
      await foodModel.findById(
        id
      );


    if (!food) {

      return res.status(404).json({

        success: false,

        message:
          "Produkten kunde inte hittas."

      });

    }


    // ==================================================
    // REMOVE PRODUCT FROM DATABASE
    // ==================================================

    await foodModel.findByIdAndDelete(
      id
    );


    // ==================================================
    // REMOVE IMAGE
    // ==================================================

    if (food.image) {

      fs.unlink(
        `uploads/${food.image}`,
        (error) => {

          if (
            error &&
            error.code !== "ENOENT"
          ) {

            console.log(
              "Could not remove image:",
              error.message
            );

          }

        }
      );

    }


    // ==================================================
    // SUCCESS
    // ==================================================

    return res.status(200).json({

      success: true,

      message:
        "Produkten har tagits bort."

    });


  } catch (error) {

    console.log(
      "Remove food error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Produkten kunde inte tas bort."

    });

  }

};


// ======================================================
// EXPORT
// ======================================================

export {
  addFood,
  listFood,
  updateStock,
  removeFood
};