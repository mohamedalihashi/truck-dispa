export function payloadDistance(from, to) {
  return `${Math.max(80, Math.abs(String(from).length * 37 + String(to).length * 29))} mi`;
}

export function estimateFare(weight) {
  const numeric = Number(String(weight).replace(/[^\d.]/g, "")) || 1;
  return Math.round(numeric * 650 * 100) / 100;
}
