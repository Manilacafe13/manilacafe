import mongoose from "mongoose";
import foodModel from "../models/foodmodel.js";

const IMAGE_HOST =
  "shrill-frost-36cd.manilacafe-goteborg.workers.dev";

const updateFoodImage = async (req, res) => {
  try {
    const { id, image, expectedImage } = req.body ?? {};

    if (
      !mongoose.isValidObjectId(id) ||
      typeof image !== "string" ||
      typeof expectedImage !== "string" ||
      !expectedImage
    ) {
      return res.status(400).json({
        success: false,
        message: "Ogiltiga bilduppgifter."
      });
    }

    let parsed;

    try {
      parsed = new URL(image);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Ogiltig bildadress."
      });
    }

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== IMAGE_HOST ||
      parsed.port ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !new RegExp("^/products/[a-z0-9-]+-[0-9]{2}[.]jpg$").test(parsed.pathname)
    ) {
      return res.status(400).json({
        success: false,
        message: "Bilden måste komma från Manila Cafés Cloudflare."
      });
    }

    const updated = await foodModel.findOneAndUpdate(
      {
        _id: id,
        image: expectedImage
      },
      {
        $set: { image: parsed.href }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updated) {
      const exists = await foodModel.exists({ _id: id });

      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists
          ? "Produktens bild har ändrats. Läs in produktlistan igen."
          : "Produkten hittades inte."
      });
    }

    return res.json({
      success: true,
      id: updated._id,
      name: updated.name,
      previousImage: expectedImage,
      image: updated.image
    });

  } catch (error) {
    console.error("Update food image:", error.message);

    return res.status(500).json({
      success: false,
      message: "Produktbilden kunde inte uppdateras."
    });
  }
};

export default updateFoodImage;
