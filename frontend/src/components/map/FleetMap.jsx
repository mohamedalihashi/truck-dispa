import { useEffect, useMemo } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup, useMap as useLeafletMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GOOGLE_MAPS_API_KEY, SOMALIA_BOUNDS, SOMALIA_CENTER, SOMALIA_ZOOM } from "../../constants/map";

const truckIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px">🚛</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const selectedIcon = L.divIcon({
  className: "",
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#ea4335;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:16px">🚛</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function GoogleFitBounds({ markers, selectedId }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return;

    if (selectedId) {
      const sel = markers.find((m) => m.id === selectedId);
      if (sel) {
        map.panTo({ lat: sel.lat, lng: sel.lng });
        map.setZoom(SOMALIA_ZOOM.city);
        return;
      }
    }

    if (markers.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    } else if (markers.length === 1) {
      map.panTo({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(SOMALIA_ZOOM.tracking);
    } else {
      map.panTo(SOMALIA_CENTER);
      map.setZoom(SOMALIA_ZOOM.country);
    }
  }, [map, markers, selectedId]);

  return null;
}

function LeafletFitBounds({ markers, selectedId }) {
  const map = useLeafletMap();

  useEffect(() => {
    if (!map) return;

    if (selectedId) {
      const sel = markers.find((m) => m.id === selectedId);
      if (sel) {
        map.setView([sel.lat, sel.lng], SOMALIA_ZOOM.city, { animate: true });
        return;
      }
    }

    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [48, 48] });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], SOMALIA_ZOOM.tracking, { animate: true });
    } else {
      map.setView([SOMALIA_CENTER.lat, SOMALIA_CENTER.lng], SOMALIA_ZOOM.country);
    }
  }, [map, markers, selectedId]);

  return null;
}

function GoogleFleetMap({ markers, selectedId, onSelect, className }) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        className={className}
        defaultCenter={SOMALIA_CENTER}
        defaultZoom={SOMALIA_ZOOM.country}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        restriction={{
          latLngBounds: SOMALIA_BOUNDS,
          strictBounds: false,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <GoogleFitBounds markers={markers} selectedId={selectedId} />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.label}
            onClick={() => onSelect?.(m.id)}
            icon={
              m.id === selectedId
                ? { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }
                : { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
            }
          />
        ))}
      </Map>
    </APIProvider>
  );
}

function LeafletFleetMap({ markers, selectedId, onSelect, className }) {
  return (
    <MapContainer
      className={className}
      center={[SOMALIA_CENTER.lat, SOMALIA_CENTER.lng]}
      zoom={SOMALIA_ZOOM.country}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LeafletFitBounds markers={markers} selectedId={selectedId} />
      {markers.map((m) => (
        <LeafletMarker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={m.id === selectedId ? selectedIcon : truckIcon}
          eventHandlers={{ click: () => onSelect?.(m.id) }}
        >
          <Popup>
            <strong>{m.label}</strong>
            <br />
            {m.subtitle}
            {m.driver ? (
              <>
                <br />
                <span className="text-xs">{m.driver}</span>
              </>
            ) : null}
          </Popup>
        </LeafletMarker>
      ))}
    </MapContainer>
  );
}

/**
 * Interactive GPS fleet map centered on Somalia.
 * Uses Google Maps when VITE_GOOGLE_MAPS_API_KEY is set, otherwise OpenStreetMap.
 */
export function FleetMap({ trips = [], selectedId, onSelect, className = "h-full w-full" }) {
  const markers = useMemo(
    () =>
      (trips || [])
        .filter((t) => t.lastLocation?.lat != null && t.lastLocation?.lng != null)
        .map((trip) => ({
          id: trip.id,
          lat: Number(trip.lastLocation.lat),
          lng: Number(trip.lastLocation.lng),
          label: trip.id,
          subtitle: `${trip.pickup} → ${trip.destination}`,
          driver: trip.driver,
          status: trip.status,
        })),
    [trips]
  );

  const useGoogle = Boolean(GOOGLE_MAPS_API_KEY);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {useGoogle ? (
        <GoogleFleetMap markers={markers} selectedId={selectedId} onSelect={onSelect} className="h-full w-full" />
      ) : (
        <LeafletFleetMap markers={markers} selectedId={selectedId} onSelect={onSelect} className="h-full w-full z-0" />
      )}
      {!markers.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-container-low/60">
          <p className="rounded-lg bg-surface-container-lowest/90 px-4 py-2 text-sm text-on-surface-variant shadow">
            No GPS signals yet — waiting for driver location
          </p>
        </div>
      )}
      {!useGoogle && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-surface-container-lowest/80 px-2 py-1 text-[10px] text-on-surface-variant">
          Somalia · OpenStreetMap
        </div>
      )}
    </div>
  );
}
