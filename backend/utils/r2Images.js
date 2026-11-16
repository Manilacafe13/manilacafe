import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";

export async function uploadProductImageToR2(filePath) {
  const names = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL"
  ];

  for (const name of names) {
    if (!process.env[name]) {
      throw new Error(`Saknar R2-inställning: ${name}`);
    }
  }

  const buffer = await readFile(filePath);
  const detected = await fileTypeFromBuffer(buffer);

  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  const extension = extensions[detected?.mime];

  if (!extension) {
    throw new Error("Endast JPG, PNG och WebP stöds.");
  }

  const base = process.env.R2_PUBLIC_URL.replace(/\/+$/, "");
  const key = `products/${randomUUID()}.${extension}`;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });

  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: detected.mime
  }));

  return {
    secure_url: `${base}/${key}`,
    public_id: key
  };
}
