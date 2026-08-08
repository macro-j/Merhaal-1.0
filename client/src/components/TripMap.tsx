import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  findKnowledgePlace,
  getDestinationCenter,
  resolveDestination,
  type LatLng,
} from "@/lib/destinationsData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import type { TripActivity } from "@shared/tripTypes";

export interface MarkerPoint {
  activityId: string;
  order: number;
  lat: number;
  lng: number;
  title: string;
  time: string;
  startTime: string;
  locationName: string;
}

export function getActivityMarkers(
  activities: TripActivity[],
  destination: string
): MarkerPoint[] {
  const knowledge = resolveDestination(destination);
  if (!knowledge) return [];

  const seen = new Set<string>();
  const points: MarkerPoint[] = [];

  activities.forEach((activity, index) => {
    const location = activity?.locationName?.trim();
    if (!location) return;
    const place = findKnowledgePlace(location, knowledge);
    if (!place?.coordinates) return;

    const key = `${place.coordinates.lat},${place.coordinates.lng}`;
    if (seen.has(key)) return;
    seen.add(key);
    points.push({
      activityId: activity.id,
      order: index + 1,
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
      title: activity.title || place.name,
      time: activity.time || "",
      startTime: activity.startTime || "",
      locationName: location,
    });
  });

  return points;
}

function FitBounds({
  points,
  center,
}: {
  points: MarkerPoint[];
  center: LatLng;
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(
        L.latLngBounds(
          points.map(point => [point.lat, point.lng] as [number, number])
        ),
        { padding: [42, 42], maxZoom: 14 }
      );
    } else {
      map.setView([center.lat, center.lng], 11);
    }
  }, [points, center, map]);

  return null;
}

function FocusActivity({
  points,
  activeActivityId,
}: {
  points: MarkerPoint[];
  activeActivityId?: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!activeActivityId) return;
    const active = points.find(point => point.activityId === activeActivityId);
    if (active) map.panInside([active.lat, active.lng], { padding: [36, 36] });
  }, [activeActivityId, map, points]);

  return null;
}

function markerIcon(order: number, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: "merhaal-map-marker-shell",
    html: `<span class="merhaal-map-marker${selected ? " is-selected" : ""}">${order}</span>`,
    iconSize: selected ? [36, 36] : [30, 30],
    iconAnchor: selected ? [18, 18] : [15, 15],
    popupAnchor: [0, -18],
  });
}

interface TripMapProps {
  destination: string;
  activities?: TripActivity[];
  activeActivityId?: string;
  onSelectActivity?: (activityId: string) => void;
  className?: string;
}

export default function TripMap({
  destination,
  activities = [],
  activeActivityId,
  onSelectActivity,
  className,
}: TripMapProps) {
  const { language, isRTL } = useLanguage();
  const { theme } = useTheme();
  const center = useMemo(
    () => getDestinationCenter(destination),
    [destination]
  );
  const points = useMemo(
    () => getActivityMarkers(activities, destination),
    [activities, destination]
  );
  const routePositions = points.map(
    point => [point.lat, point.lng] as [number, number]
  );
  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution =
    theme === "dark"
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div
      className={cn(
        className ??
          "relative h-72 w-full overflow-hidden rounded-lg border bg-muted",
        theme === "dark" && "merhaal-map-dark"
      )}
      aria-label={
        language === "ar" ? "خريطة أنشطة اليوم" : "Day activities map"
      }
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={11}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer key={theme} attribution={attribution} url={tileUrl} />

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: theme === "dark" ? "#70c996" : "#237a45",
              weight: 3,
              opacity: 0.7,
              dashArray: "6 8",
            }}
          />
        )}

        {points.map(point => {
          const selected = point.activityId === activeActivityId;
          return (
            <Marker
              key={point.activityId}
              position={[point.lat, point.lng]}
              icon={markerIcon(point.order, selected)}
              eventHandlers={{
                click: () => onSelectActivity?.(point.activityId),
              }}
              zIndexOffset={selected ? 1000 : 0}
            >
              <Popup>
                <div
                  className="min-w-44 space-y-1.5 text-start"
                  dir={isRTL ? "rtl" : "ltr"}
                >
                  {(point.startTime || point.time) && (
                    <p className="text-xs font-medium text-primary">
                      {point.startTime || point.time}
                    </p>
                  )}
                  <p className="text-sm font-semibold">{point.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {point.locationName}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-8 items-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground no-underline"
                  >
                    {language === "ar"
                      ? "فتح في خرائط Google"
                      : "Open in Google Maps"}
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <FitBounds points={points} center={center} />
        <FocusActivity points={points} activeActivityId={activeActivityId} />
      </MapContainer>

      {points.length > 1 && (
        <div className="pointer-events-none absolute bottom-2 end-2 z-[400] rounded-md border bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
          {language === "ar"
            ? "الخط يوضح ترتيب التوقفات"
            : "Line shows stop order"}
        </div>
      )}
    </div>
  );
}
