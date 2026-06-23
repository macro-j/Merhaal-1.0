import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  findKnowledgePlace,
  getDestinationCenter,
  resolveDestination,
  type LatLng,
} from "@/lib/destinationsData";
import type { TripActivity } from "@/lib/llm";

// Vite serves Leaflet's default marker images as URLs; wire them up so markers render.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MarkerPoint {
  lat: number;
  lng: number;
  title: string;
  time: string;
  locationName: string;
}

/**
 * Match each activity's locationName against the curated knowledge base and
 * collect the ones with real coordinates. De-duplicates by coordinate so repeated
 * stops don't stack markers.
 */
function getActivityMarkers(
  activities: TripActivity[],
  destination: string
): MarkerPoint[] {
  const knowledge = resolveDestination(destination);
  if (!knowledge) return [];

  const seen = new Set<string>();
  const points: MarkerPoint[] = [];

  for (const activity of activities) {
    const location = activity?.locationName?.trim();
    if (!location) continue;

    const place = findKnowledgePlace(location, knowledge);
    if (!place?.coordinates) continue;

    const key = `${place.coordinates.lat},${place.coordinates.lng}`;
    if (seen.has(key)) continue;
    seen.add(key);

    points.push({
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
      title: activity.title || place.name,
      time: activity.time || "",
      locationName: location,
    });
  }

  return points;
}

/**
 * Auto-fits the map to all plotted markers, or recenters on the destination when
 * there are none.
 */
function FitBounds({ points, center }: { points: MarkerPoint[]; center: LatLng }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(
        points.map((p) => [p.lat, p.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView([center.lat, center.lng], 11);
    }
  }, [points, center, map]);

  return null;
}

interface TripMapProps {
  destination: string;
  activities?: TripActivity[];
  className?: string;
}

export default function TripMap({ destination, activities = [], className }: TripMapProps) {
  const center = useMemo(() => getDestinationCenter(destination), [destination]);
  const points = useMemo(
    () => getActivityMarkers(activities, destination),
    [activities, destination]
  );

  return (
    <div
      className={
        className ??
        "relative h-72 w-full overflow-hidden rounded-xl border bg-muted"
      }
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={11}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((point, index) => (
          <Marker key={`${point.lat}-${point.lng}-${index}`} position={[point.lat, point.lng]}>
            <Popup>
              <div className="space-y-1.5 text-right" dir="rtl">
                {point.time && (
                  <p className="text-xs font-medium text-primary">{point.time}</p>
                )}
                <p className="text-sm font-semibold">{point.title}</p>
                <p className="text-xs text-muted-foreground">{point.locationName}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground no-underline"
                >
                  📍 افتح في Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        <FitBounds points={points} center={center} />
      </MapContainer>
    </div>
  );
}
