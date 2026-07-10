import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";

export const uploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "truck-uploads")
  : path.join(process.cwd(), "uploads");

try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch {
  // Serverless filesystem may be read-only outside /tmp.
}

const storage = process.env.VERCEL
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
      }
    });

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  }
});

export function fileToPublicUrl(file) {
  if (!file) return null;
  if (process.env.VERCEL) {
    return `mock://upload-${Date.now()}`;
  }
  const filename = file.filename || path.basename(file.path);
  return `/uploads/${filename}`;
}
