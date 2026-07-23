/** Somalia city coordinates for map placement and ETA. */
const CITY_ALIASES = [
  { lat: 2.0469, lng: 45.3182, names: ["mogadishu", "muqdisho", "xamar", "hamar"] },
  { lat: 9.5624, lng: 44.077, names: ["hargeisa", "hargeysa"] },
  { lat: -0.3557, lng: 42.5457, names: ["kismayo", "kismaayo"] },
  { lat: 3.1167, lng: 43.65, names: ["baidoa", "baydhabo"] },
  { lat: 11.2842, lng: 49.1816, names: ["bosaso", "boosaaso"] },
  { lat: 8.4021, lng: 48.4847, names: ["garowe", "garoowe"] }
];

const DEFAULT_CENTER = { lat: 2.0469, lng: 45.3182 };
const TRUCK_SPEED_KMH = 42;

export function coordsFromPlaceName(text = "") {
  const normalized = String(text).toLowerCase();
  for (const city of CITY_ALIASES) {
    if (city.names.some((name) => normalized.includes(name))) {
      return { lat: city.lat, lng: city.lng };
    }
  }
  return DEFAULT_CENTER;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(totalMinutes) {
  const minutes = Math.max(1, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function estimateEta(fromLat, fromLng, destinationText) {
  const dest = coordsFromPlaceName(destinationText);
  const distanceKm = haversineKm(fromLat, fromLng, dest.lat, dest.lng);
  const minutes = (distanceKm / TRUCK_SPEED_KMH) * 60;
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    minutes: Math.round(minutes),
    label: formatDuration(minutes),
    destination: dest
  };
}

export function shouldRecordPoint(lastLat, lastLng, lat, lng, minKm = 0.015) {
  if (lastLat == null || lastLng == null) return true;
  return haversineKm(lastLat, lastLng, lat, lng) >= minKm;
}
