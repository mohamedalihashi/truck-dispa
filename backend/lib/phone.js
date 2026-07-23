export function normalizeSomaliPhone(value) {
  const raw = String(value || "").trim().replace(/[\s()-]/g, "");
  let digits = raw.replace(/^\+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `252${digits.slice(1)}`;
  if (!digits.startsWith("252")) digits = `252${digits}`;
  if (!/^252(?:6[1-9]|7\d|9\d)\d{7}$/.test(digits)) {
    throw new Error("Enter a valid Somali phone number in international format, for example +25261XXXXXXX");
  }
  return `+${digits}`;
}
