import foodModel from "../models/foodmodel.js";
import mongoose from "mongoose";
import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import { fileTypeFromFile } from "file-type";

// ======================================================
// ALLOWED IMAGE TYPES
// ======================================================

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];


// ======================================================
// REMOVE LOCAL TEMP FILE
// ======================================================

const removeLocalFile = (filePath) => {

  if (!filePath) {
    return;
  }


  fs.unlink(
    filePath,
    (error) => {

      if (
        error &&
        error.code !== "ENOENT"
      ) {

        console.log(
          "Could not remove local image:",
          error.message
        );

      }

    }
  );

};


// ======================================================
// GET CLOUDINARY PUBLIC ID FROM URL
// ======================================================

const getCloudinaryPublicId = (imageUrl) => {

  try {

    if (
      !imageUrl ||
      !imageUrl.includes(
        "res.cloudinary.com"
      )
    ) {

      return null;

    }


    const uploadPart =
      imageUrl.split(
        "/upload/"
      )[1];


    if (!uploadPart) {

      return null;

    }


    const withoutVersion =
      uploadPart.replace(
        /^v\d+\//,
        ""
      );


    const lastDot =
      withoutVersion.lastIndexOf(
        "."
      );


    if (lastDot === -1) {

      return withoutVersion;

    }


    return withoutVersion.substring(
      0,
      lastDot
    );


  } catch (error) {

    console.log(
      "Cloudinary public ID error:",
      error.message
    );


    return null;

  }

};


// ======================================================
// ADD FOOD
// ======================================================

const addFood = async (
  req,
  res
) => {

  let cloudinaryPublicId = null;


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

    // ======================================================
// VERIFY ACTUAL IMAGE FILE
// ======================================================

const detectedFileType =
  await fileTypeFromFile(
    req.file.path
  );


if (
  !detectedFileType ||
  !ALLOWED_IMAGE_TYPES.includes(
    detectedFileType.mime
  )
) {

  removeLocalFile(
    req.file.path
  );


  return res.status(400).json({

    success: false,

    message:
      "Ogiltig bildfil. Endast JPEG, PNG och WebP är tillåtna."

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

      removeLocalFile(
        req.file.path
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

      removeLocalFile(
        req.file.path
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

      removeLocalFile(
        req.file.path
      );


      return res.status(400).json({

        success: false,

        message:
          "Dagslagret måste vara ett heltal från 0 och uppåt."

      });

    }


    // ==================================================
    // UPLOAD IMAGE TO CLOUDINARY
    // ==================================================

    const uploadResult =
      await cloudinary
        .uploader
        .upload(
          req.file.path,
          {

            folder:
              "manilacafe/products",

            resource_type:
              "image"

          }
        );


    cloudinaryPublicId =
      uploadResult.public_id;


    // ==================================================
    // REMOVE TEMP IMAGE
    // ==================================================

    removeLocalFile(
      req.file.path
    );


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
          uploadResult.secure_url,

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
    // REMOVE LOCAL TEMP IMAGE
    // ==================================================

    if (
      req.file?.path
    ) {

      removeLocalFile(
        req.file.path
      );

    }


    // ==================================================
    // REMOVE CLOUDINARY IMAGE IF SAVE FAILED
    // ==================================================

    if (
      cloudinaryPublicId
    ) {

      try {

        await cloudinary
          .uploader
          .destroy(
            cloudinaryPublicId
          );

      } catch (
        cloudinaryError
      ) {

        console.log(
          "Could not remove Cloudinary image:",
          cloudinaryError.message
        );

      }

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
      !Number.isInteger(
        stock
      ) ||
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
    // REMOVE CLOUDINARY IMAGE
    // ==================================================

    if (
      food.image &&
      food.image.includes(
        "res.cloudinary.com"
      )
    ) {

      const publicId =
        getCloudinaryPublicId(
          food.image
        );


      if (publicId) {

        try {

          await cloudinary
            .uploader
            .destroy(
              publicId
            );

        } catch (
          cloudinaryError
        ) {

          console.log(
            "Could not remove Cloudinary image:",
            cloudinaryError.message
          );

        }

      }

    }


    // ==================================================
    // SUPPORT OLD LOCAL IMAGES
    // ==================================================

    else if (
      food.image
    ) {

      fs.unlink(
        `uploads/${food.image}`,
        (error) => {

          if (
            error &&
            error.code !== "ENOENT"
          ) {

            console.log(
              "Could not remove local image:",
              error.message
            );

          }

        }
      );

    }


    // ==================================================
    // REMOVE PRODUCT FROM DATABASE
    // ==================================================

    await foodModel.findByIdAndDelete(
      id
    );


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