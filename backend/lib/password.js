import crypto from "node:crypto";

/** Readable temporary password for admin-created accounts. */
export function generateTempPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
  let value = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    value += chars[bytes[i] % chars.length];
  }
  return value;
}
