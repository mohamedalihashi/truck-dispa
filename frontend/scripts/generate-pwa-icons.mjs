import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const svg = readFileSync(join(publicDir, "favicon.svg"));

const sizes = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },
  { name: "pwa-maskable-512x512.png", size: 512, maskable: true }
];

for (const { name, size, maskable } of sizes) {
  const iconSize = maskable ? Math.round(size * 0.62) : size;
  const image = sharp(svg).resize(iconSize, iconSize, { fit: "contain" });

  if (maskable) {
    await image
      .extend({
        top: Math.floor((size - iconSize) / 2),
        bottom: Math.ceil((size - iconSize) / 2),
        left: Math.floor((size - iconSize) / 2),
        right: Math.ceil((size - iconSize) / 2),
        background: "#0d1c32"
      })
      .png()
      .toFile(join(publicDir, name));
  } else {
    await image.png().toFile(join(publicDir, name));
  }
}

console.log("PWA icons generated in frontend/public/");
