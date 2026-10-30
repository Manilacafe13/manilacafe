import foodModel from "../models/foodmodel.js";
import mongoose from "mongoose";
import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import { fileTypeFromFile } from "file-type";


// ======================================================
// PRODUCT LIMITS
// ======================================================

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_CATEGORY_LENGTH = 100;

const MAX_PRICE = 100000;
const MAX_SAME_DAY_STOCK = 10000;

// Customizations must match backend/models/foodModel.js.
const MAX_CUSTOMIZATION_OPTIONS = 30;
const MAX_OPTION_NAME_LENGTH = 100;
const MAX_EXTRA_QUANTITY = 10;


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
// VALIDATE AND NORMALIZE PRODUCT CUSTOMIZATIONS
// ======================================================
// Accepts an object (JSON request) or a JSON string (multipart form).
// Never trusts option prices or IDs supplied by a customer at checkout.
// Checkout must look up the stored options and recalculate the total.

const customizationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeProductCustomizations = (rawValue, currentValue = null) => {
  // Existing products and old admin forms stay compatible.
  if (rawValue === undefined) {
    return {
      enabled: false,
      removableIngredients: [],
      extras: []
    };
  }

  let value = rawValue;

  if (typeof value === "string") {
    if (value.length > 30000) {
      throw customizationError("Produktanpassningarna Ã¤r fÃ¶r stora.");
    }

    try {
      value = JSON.parse(value);
    } catch {
      throw customizationError("Ogiltigt JSON-format fÃ¶r produktanpassningar.");
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw customizationError("Produktanpassningarna mÃ¥ste vara ett objekt.");
  }

  const enabled = value.enabled ?? false;

  if (typeof enabled !== "boolean") {
    throw customizationError("Aktivering av produktanpassningar mÃ¥ste vara true eller false.");
  }

  const removableIngredients = value.removableIngredients ?? [];
  const extras = value.extras ?? [];

  if (!Array.isArray(removableIngredients) || !Array.isArray(extras)) {
    throw customizationError("Ingredienser och tillval mÃ¥ste vara listor.");
  }

  if (
    removableIngredients.length > MAX_CUSTOMIZATION_OPTIONS ||
    extras.length > MAX_CUSTOMIZATION_OPTIONS
  ) {
    throw customizationError(`HÃ¶gst ${MAX_CUSTOMIZATION_OPTIONS} alternativ per grupp tillÃ¥ts.`);
  }

  const validateName = (name) => {
    if (typeof name !== "string") {
      throw customizationError("Varje alternativ mÃ¥ste ha ett namn.");
    }

    const trimmed = name.trim();

    if (!trimmed || trimmed.length > MAX_OPTION_NAME_LENGTH) {
      throw customizationError(`Alternativnamn mÃ¥ste vara 1â€“${MAX_OPTION_NAME_LENGTH} tecken.`);
    }

    return trimmed;
  };

  const validateAvailability = (available) => {
    if (available === undefined) return true;
    if (typeof available !== "boolean") {
      throw customizationError("TillgÃ¤nglighet mÃ¥ste vara true eller false.");
    }
    return available;
  };

  const getPreservedId = (option, name, existingOptions = []) => {
    // Keep option IDs stable across admin edits so selections can be
    // matched reliably. IDs may only belong to this product/group.
    const existing = Array.isArray(existingOptions) ? existingOptions : [];
    const submittedId = option._id;

    if (submittedId !== undefined && submittedId !== null && submittedId !== "") {
      const id = String(submittedId);
      const matched = existing.some((item) => String(item._id) === id);

      if (!mongoose.isValidObjectId(id) || !matched) {
        throw customizationError("Ogiltigt alternativ-ID fÃ¶r produkten.");
      }
      return id;
    }

    // For forms that submit only names, retain matching existing IDs.
    const matchingByName = existing.find(
      (item) => String(item.name).trim().toLocaleLowerCase("sv") === name.toLocaleLowerCase("sv")
    );

    return matchingByName ? matchingByName._id : undefined;
  };

  const normalizeGroup = (items, currentItems, type) => {
    const seenNames = new Set();
    const seenIds = new Set();

    return items.map((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        throw customizationError("Varje alternativ mÃ¥ste vara ett objekt.");
      }

      const name = validateName(option.name);
      const key = name.toLocaleLowerCase("sv");

      if (seenNames.has(key)) {
        throw customizationError(`Dubblett bland ${type === "extra" ? "tillval" : "ingredienser"}: ${name}.`);
      }
      seenNames.add(key);

      const normalized = {
        name,
        available: validateAvailability(option.available)
      };

      const id = getPreservedId(option, name, currentItems);
      if (id) {
        if (seenIds.has(String(id))) {
          throw customizationError("Samma alternativ-ID fÃ¥r inte fÃ¶rekomma tvÃ¥ gÃ¥nger.");
        }
        seenIds.add(String(id));
        normalized._id = id;
      }

      if (type === "extra") {
        if (
          option.price === undefined ||
          option.price === null ||
          (typeof option.price === "string" && !option.price.trim())
        ) {
          throw customizationError(`Pris saknas fÃ¶r tillvalet ${name}.`);
        }

        const price = Number(option.price);
        if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
          throw customizationError(`Ogiltigt pris fÃ¶r tillvalet ${name}.`);
        }

        const rawMaxQuantity = option.maxQuantity ?? 1;
        const maxQuantity = Number(rawMaxQuantity);
        if (
          !Number.isInteger(maxQuantity) ||
          maxQuantity < 1 ||
          maxQuantity > MAX_EXTRA_QUANTITY
        ) {
          throw customizationError(`Maxantal fÃ¶r ${name} mÃ¥ste vara 1â€“${MAX_EXTRA_QUANTITY}.`);
        }

        normalized.price = price;
        normalized.maxQuantity = maxQuantity;
      }

      return normalized;
    });
  };

  return {
    enabled,
    removableIngredients: normalizeGroup(
      removableIngredients,
      currentValue?.removableIngredients,
      "remove"
    ),
    extras: normalizeGroup(extras, currentValue?.extras, "extra")
  };
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
          "Ogiltig bildfil. Endast JPEG, PNG och WebP Ã¤r tillÃ¥tna."

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

    // ======================================================
    // VALIDATE TEXT LENGTHS
    // ======================================================

    if (name.length > MAX_NAME_LENGTH) {

      removeLocalFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          `Produktnamnet fÃ¥r vara hÃ¶gst ${MAX_NAME_LENGTH} tecken.`
      });

    }


    if (
      description.length >
      MAX_DESCRIPTION_LENGTH
    ) {

      removeLocalFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          `Produktbeskrivningen fÃ¥r vara hÃ¶gst ${MAX_DESCRIPTION_LENGTH} tecken.`
      });

    }


    if (
      category.length >
      MAX_CATEGORY_LENGTH
    ) {

      removeLocalFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          `Kategorin fÃ¥r vara hÃ¶gst ${MAX_CATEGORY_LENGTH} tecken.`
      });

    }


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
          "Alla produktuppgifter mÃ¥ste fyllas i."

      });

    }


    // ==================================================
    // VALIDATE PRICE
    // ==================================================

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      price > MAX_PRICE
    ) {

      removeLocalFile(
        req.file.path
      );


      return res.status(400).json({

        success: false,

        message:
          `Priset mÃ¥ste vara mellan 0 och ${MAX_PRICE} kr.`

      });

    }


    // ==================================================
    // VALIDATE SAME-DAY STOCK
    // ==================================================

    if (
      !Number.isInteger(
        sameDayStock
      ) ||
      sameDayStock < 0 ||
      sameDayStock >
      MAX_SAME_DAY_STOCK
    ) {

      removeLocalFile(
        req.file.path
      );


      return res.status(400).json({

        success: false,

        message:
          `Dagslagret mÃ¥ste vara ett heltal mellan 0 och ${MAX_SAME_DAY_STOCK}.`

      });

    }


    // ==================================================
    // OPTIONAL PRODUCT CUSTOMIZATIONS
    // ==================================================
    // Old admin form uploads are still supported.

    let customizations;

    try {
      customizations = normalizeProductCustomizations(req.body.customizations);
    } catch (error) {
      removeLocalFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: error.message
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

        sameDayStock,

        customizations

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

    console.error("Add food error:", error.message);


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
        "Produkten kunde inte lÃ¤ggas till."

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

    console.error("List food error:", error.message);


    return res.status(500).json({

      success: false,

      message:
        "Produkterna kunde inte hÃ¤mtas."

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
      stock < 0 ||
      stock >
      MAX_SAME_DAY_STOCK
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Dagslagret mÃ¥ste vara ett heltal frÃ¥n 0 och uppÃ¥t."

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

    console.error("Update stock error:", error.message);


    return res.status(500).json({

      success: false,

      message:
        "Dagslagret kunde inte uppdateras."

    });

  }

};


// ======================================================
// UPDATE PRODUCT CUSTOMIZATIONS (ADMIN ONLY)
// ======================================================
// IMPORTANT: protect this handler in foodRoute.js with
// authMiddleware + adminAuth.

const updateFoodCustomizations = async (req, res) => {
  try {
    const { id, customizations } = req.body ?? {};

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Ogiltigt eller saknat produkt-ID."
      });
    }

    if (customizations === undefined) {
      return res.status(400).json({
        success: false,
        message: "Produktanpassningarna saknas."
      });
    }

    const food = await foodModel.findById(id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Produkten kunde inte hittas."
      });
    }

    food.customizations = normalizeProductCustomizations(
      customizations,
      food.customizations
    );

    // save() runs full document and nested option validators.
    await food.save();

    return res.status(200).json({
      success: true,
      message: "Produktanpassningarna har uppdaterats.",
      data: food
    });
  } catch (error) {
    if (error.statusCode === 400 || error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Update food customizations error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Produktanpassningarna kunde inte uppdateras."
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

    console.error("Remove food error:", error.message);


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
  removeFood,
  updateFoodCustomizations
};