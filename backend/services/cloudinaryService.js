import { v2 as cloudinary } from "cloudinary";

function configure() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const error = new Error("Cloudinary is not configured");
    error.status = 503;
    throw error;
  }
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
}

export function uploadBuffer(file, folder) {
  if (!file?.buffer) return Promise.resolve(null);
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `truck-dispatch/${folder}`, resource_type: "auto", use_filename: false },
      (error, result) => error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id })
    );
    stream.end(file.buffer);
  });
}

export async function deleteAssets(publicIds = []) {
  const ids = publicIds.filter(Boolean);
  if (!ids.length) return;
  configure();
  await Promise.allSettled(ids.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image" })));
}
