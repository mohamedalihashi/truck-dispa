import { SOMALIA_BOUNDS, SOMALIA_CITIES } from "../constants/map";

const CITY_LIST = Object.values(SOMALIA_CITIES);

/** Random coordinates near a major Somali city (for demo / GPS fallback). */
export function randomSomaliaCoords() {
  const base = CITY_LIST[Math.floor(Math.random() * CITY_LIST.length)];
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.12,
    lng: base.lng + (Math.random() - 0.5) * 0.12,
  };
}

export function isInSomalia(lat, lng) {
  return (
    lat >= SOMALIA_BOUNDS.south &&
    lat <= SOMALIA_BOUNDS.north &&
    lng >= SOMALIA_BOUNDS.west &&
    lng <= SOMALIA_BOUNDS.east
  );
}

/** Build map markers from trip list. */
export function tripsToMarkers(trips = []) {
  return trips
    .filter((trip) => trip.lastLocation?.lat != null && trip.lastLocation?.lng != null)
    .map((trip) => ({
      id: trip.id,
      lat: Number(trip.lastLocation.lat),
      lng: Number(trip.lastLocation.lng),
      label: trip.id,
      subtitle: `${trip.pickup} → ${trip.destination}`,
      driver: trip.driver,
      status: trip.status,
    }));
}
