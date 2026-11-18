import mongoose from "mongoose";
import { unlink } from "node:fs/promises";
import { fileTypeFromFile } from "file-type";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import foodModel from "../models/foodmodel.js";
import { uploadProductImageToR2 } from "../utils/r2Images.js";

const MAX_IMAGES = 5;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const cleanupLocal = async files => {
  await Promise.allSettled(
    files.map(file => unlink(file.path))
  );
};

const rollbackUploads = async uploaded => {
  if (!uploaded.length) return;

  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });

    const results = await Promise.allSettled(
      uploaded.map(item =>
        client.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: item.public_id
        }))
      )
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          "R2 rollback failed:",
          uploaded[index].public_id,
          result.reason
        );
      }
    });
  } catch (error) {
    console.error("R2 rollback error:", error);
  }
};

const updateFoodGallery = async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  const uploaded = [];
  let saved = false;

  try {
    const { id, expectedImage } = req.body ?? {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Ogiltigt produkt-ID."
      });
    }

    if (typeof expectedImage !== "string" || !expectedImage) {
      return res.status(400).json({
        success: false,
        message: "Nuvarande huvudbild saknas."
      });
    }

    const product = await foodModel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Produkten hittades inte."
      });
    }

    if (product.image !== expectedImage) {
      return res.status(409).json({
        success: false,
        message: "Huvudbilden har ändrats. Uppdatera produktlistan."
      });
    }

    const currentImages =
      Array.isArray(product.images) && product.images.length
        ? product.images
        : [product.image];

    let keepImages = currentImages;

    if (req.body.keepImages !== undefined) {
      try {
        keepImages = JSON.parse(req.body.keepImages);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Bildlistan har ogiltigt format."
        });
      }
    }

    if (
      !Array.isArray(keepImages) ||
      keepImages.some(value => typeof value !== "string") ||
      new Set(keepImages).size !== keepImages.length ||
      keepImages.some(value => !currentImages.includes(value))
    ) {
      return res.status(400).json({
        success: false,
        message: "Bildlistan innehåller ogiltiga bilder."
      });
    }

    if (
      keepImages.length + files.length < 1 ||
      keepImages.length + files.length > MAX_IMAGES
    ) {
      return res.status(400).json({
        success: false,
        message: "Produkten måste ha mellan 1 och 5 bilder."
      });
    }

    // Kontrollera filernas verkliga innehåll.
    for (const file of files) {
      const detected = await fileTypeFromFile(file.path);

      if (!detected || !ALLOWED_TYPES.has(detected.mime)) {
        return res.status(400).json({
          success: false,
          message: "Endast JPG, PNG och WebP är tillåtna."
        });
      }
    }

    // Ladda upp nya bilder till befintlig R2-bucket.
    for (const file of files) {
      const result = await uploadProductImageToR2(file.path);
      uploaded.push(result);
    }

    const images = [
      ...keepImages,
      ...uploaded.map(item => item.secure_url)
    ];

    // Behåll första bilden som huvudbild.
    const updated = await foodModel.findOneAndUpdate(
      {
        _id: id,
        image: expectedImage,
        updatedAt: product.updatedAt
      },
      {
        $set: {
          image: images[0],
          images
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "Produkten ändrades under tiden. Uppdatera listan."
      });
    }

    saved = true;

    return res.status(200).json({
      success: true,
      message: "Produktbilderna har sparats.",
      data: updated
    });

  } catch (error) {
    console.error("Update food gallery:", error);

    return res.status(500).json({
      success: false,
      message: "Kunde inte uppdatera produktbilderna."
    });

  } finally {
    await cleanupLocal(files);

    // Ta bort nya R2-bilder om databasändringen misslyckades.
    if (!saved) {
      await rollbackUploads(uploaded);
    }
  }
};

export default updateFoodGallery;
