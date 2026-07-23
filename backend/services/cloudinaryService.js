import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { uploadDir } from "../lib/uploads.js";

function looksLikePlaceholder(value = "") {
  return /your[_-]?api[_-]?key|your[_-]?api[_-]?secret|your[_-]?cloud[_-]?name|<|>|replace-with|changeme|example/i.test(
    String(value)
  );
}

export function isCloudinaryConfigured() {
  const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (CLOUDINARY_URL && !looksLikePlaceholder(CLOUDINARY_URL)) return true;
  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
      CLOUDINARY_API_KEY &&
      CLOUDINARY_API_SECRET &&
      !looksLikePlaceholder(CLOUDINARY_CLOUD_NAME) &&
      !looksLikePlaceholder(CLOUDINARY_API_KEY) &&
      !looksLikePlaceholder(CLOUDINARY_API_SECRET)
  );
}

function hasUsableCloudinaryConfig() {
  return isCloudinaryConfigured();
}

function configure() {
  const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (CLOUDINARY_URL && !looksLikePlaceholder(CLOUDINARY_URL)) {
    const configured = cloudinary.config();
    if (configured.cloud_name && configured.api_key && configured.api_secret) {
      if (
        looksLikePlaceholder(configured.api_key) ||
        looksLikePlaceholder(configured.api_secret) ||
        looksLikePlaceholder(configured.cloud_name)
      ) {
        return false;
      }
      return true;
    }
  }

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET ||
    looksLikePlaceholder(CLOUDINARY_CLOUD_NAME) ||
    looksLikePlaceholder(CLOUDINARY_API_KEY) ||
    looksLikePlaceholder(CLOUDINARY_API_SECRET)
  ) {
    return false;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
  return true;
}

function saveLocalBuffer(file, folder) {
  const safeFolder = String(folder || "misc").replace(/[^a-zA-Z0-9_-]/g, "") || "misc";
  const dir = path.join(uploadDir, safeFolder);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, file.buffer);
  return {
    url: `/uploads/${safeFolder}/${filename}`,
    publicId: null
  };
}

export function uploadBuffer(file, folder) {
  if (!file?.buffer) return Promise.resolve(null);

  if (!hasUsableCloudinaryConfig() || !configure()) {
    // Local/dev fallback when Cloudinary credentials are missing or still placeholders.
    return Promise.resolve(saveLocalBuffer(file, folder));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `truck-dispatch/${folder}`, resource_type: "auto", use_filename: false },
      (error, result) =>
        error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id })
    );
    stream.end(file.buffer);
  });
}

export async function deleteAssets(publicIds = []) {
  const ids = publicIds.filter(Boolean);
  if (!ids.length) return;
  if (!hasUsableCloudinaryConfig() || !configure()) return;
  await Promise.allSettled(
    ids.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image" }))
  );
}
