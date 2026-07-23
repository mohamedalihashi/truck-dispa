/** Digits-only length after stripping formatting. */
export function phoneDigits(value) {
  return String(value || "").trim().replace(/[\s()-]/g, "").replace(/^\+/, "").replace(/^00/, "");
}

export function isValidBookingPhone(value) {
  const digits = phoneDigits(value).replace(/^0/, "");
  // Accept Somali mobiles and general test numbers (min 7 digits).
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Normalize phone for storage/SMS.
 * Prefers Somali international form when the number matches local mobile patterns;
 * otherwise returns a cleaned +digits value for any valid-length number.
 */
export function normalizeSomaliPhone(value) {
  const raw = String(value || "").trim().replace(/[\s()-]/g, "");
  let digits = raw.replace(/^\+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `252${digits.slice(1)}`;

  if (/^252(?:6[1-9]|7\d|9\d)\d{7}$/.test(digits)) {
    return `+${digits}`;
  }

  // Already includes country code or a generic international number
  if (!digits.startsWith("252") && /^(?:6[1-9]|7\d|9\d)\d{7}$/.test(digits)) {
    return `+252${digits}`;
  }

  const loose = phoneDigits(value);
  if (loose.length >= 7 && loose.length <= 15) {
    return loose.startsWith("+") ? loose : `+${loose.replace(/^0+/, "") || loose}`;
  }

  throw new Error("Enter a valid phone number (at least 7 digits)");
}
