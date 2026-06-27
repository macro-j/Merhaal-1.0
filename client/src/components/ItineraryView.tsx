import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { TripActivity, TripDay, TripHotel } from "@/lib/llm";
import {
  findKnowledgePlace,
  resolveDestination,
  type DestinationPlace,
} from "@/lib/destinationsData";
import { buildMapsUrl } from "@/lib/maps";
import { cn, getLocalizedName } from "@/lib/utils";
import {
  BedDouble,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  Moon,
  Printer,
  Search,
  Sparkles,
  Sun,
  Sunset,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { lazy, Suspense } from "react";

// Lazy-load the map so Leaflet stays out of the main bundle.
const TripMap = lazy(() => import("@/components/TripMap"));

function MapLoadingFallback() {
  return (
    <div className="relative h-72 w-full overflow-hidden bg-muted/40">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/30 via-muted/50 to-muted/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
      </div>
    </div>
  );
}

function buildBookingUrl(hotel: TripHotel, destination: string): string {
  if (hotel.bookingUrl && /^https?:\/\//i.test(hotel.bookingUrl)) {
    return hotel.bookingUrl;
  }
  const query = encodeURIComponent(`${hotel.name} ${destination}`.trim()).replace(
    /%20/g,
    "+"
  );
  return `https://www.booking.com/searchresults.html?ss=${query}`;
}

const ARABIC_DAY_ORDINALS = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
];

function getArabicDayLabel(dayNumber: number): string {
  const index = dayNumber - 1;
  if (index >= 0 && index < ARABIC_DAY_ORDINALS.length) {
    return `اليوم ${ARABIC_DAY_ORDINALS[index]}`;
  }
  return `اليوم ${dayNumber}`;
}

function TimeIcon({ time }: { time: string }) {
  if (time === "الصباح") return <Sun className="w-4 h-4 text-amber-500" />;
  if (time === "الظهر") return <Sunset className="w-4 h-4 text-orange-500" />;
  return <Moon className="w-4 h-4 text-indigo-500" />;
}

function timeBadgeClass(time: string): string {
  if (time === "الصباح") return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25";
  if (time === "الظهر") return "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/25";
  return "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/25";
}

function timeAccentClass(time: string): string {
  if (time === "الصباح") return "from-amber-400/30 via-amber-300/10 to-transparent";
  if (time === "الظهر") return "from-orange-400/30 via-orange-300/10 to-transparent";
  return "from-indigo-400/30 via-violet-300/10 to-transparent";
}

function lookupPlace(locationName: string, destination: string): DestinationPlace | null {
  const knowledge = resolveDestination(destination);
  if (!knowledge || !locationName) return null;
  return findKnowledgePlace(locationName, knowledge);
}

function isLuxuryPlace(place: DestinationPlace): boolean {
  return place.budgetLevel.includes("luxury");
}

function requiresAdvanceBooking(place: DestinationPlace): boolean {
  return (
    place.bookingDifficulty === "الحجز ضروري" || place.bookingDifficulty === "تذاكر مسبقة"
  );
}

function getPlaceTags(place: DestinationPlace | null): string[] {
  if (!place) return [];
  const tags: string[] = [];
  if (isLuxuryPlace(place)) tags.push("✨ فاخر");
  if (requiresAdvanceBooking(place)) tags.push("🎟️ يتطلب حجز مسبق");
  return tags;
}

function ActivityTimelineItem({
  activity,
  destination,
  isLast,
}: {
  activity: TripActivity;
  destination: string;
  isLast: boolean;
}) {
  const place = lookupPlace(activity.locationName, destination);
  const placeTags = getPlaceTags(place);
  const mapsQuery = place?.mapSearchQuery || activity.locationName || activity.title;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapsQuery
  )}`;

  const bookingUrl = activity.bookingSearchQuery
    ? `https://www.google.com/search?q=${encodeURIComponent(activity.bookingSearchQuery)}`
    : null;

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0" data-testid={`activity-${activity.title}`}>
      {!isLast && (
        <span
          className="absolute top-12 bottom-0 w-px bg-gradient-to-b from-primary/30 via-border to-transparent"
          style={{ insetInlineStart: "1.125rem" }}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/70 shadow-md shadow-black/5 backdrop-blur-md dark:border-white/10 dark:bg-white/10"
        )}
      >
        <TimeIcon time={activity.time} />
      </div>

      <div
        className={cn(
          "relative flex-1 min-w-0 overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-white/75 via-white/55 to-white/35 p-5 shadow-lg shadow-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-transparent dark:shadow-black/20"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-80",
            timeAccentClass(activity.time)
          )}
          aria-hidden
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold tracking-wide backdrop-blur-sm",
                timeBadgeClass(activity.time)
              )}
            >
              {activity.time}
            </Badge>
            {activity.startTime && activity.endTime && (
              <Badge
                variant="secondary"
                className="text-[11px] font-medium gap-1 border-white/20 bg-white/50 text-foreground/80 backdrop-blur-sm dark:bg-white/10"
              >
                <Clock className="w-3 h-3 opacity-70" />
                {activity.startTime} – {activity.endTime}
              </Badge>
            )}
          </div>

          <h4 className="text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground">
            {activity.title}
          </h4>

          {activity.description && (
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground/90">
              {activity.description}
            </p>
          )}

          {activity.locationName && (
            <div className="mt-4 space-y-2.5">
              <div className="flex items-start gap-2 text-sm font-medium text-foreground/90">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="leading-snug">{activity.locationName}</span>
              </div>

              {placeTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ps-6">
                  {placeTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-white/30 bg-white/50 px-2.5 py-1 text-[11px] font-medium text-foreground/80 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-9 gap-1.5 border-0 bg-primary/90 shadow-sm backdrop-blur-sm print:hidden hover:bg-primary"
              asChild
            >
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="w-3.5 h-3.5" />
                فتح في خرائط Google
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </Button>

            {bookingUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-white/40 bg-white/40 backdrop-blur-sm print:hidden hover:bg-white/60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                asChild
              >
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <Search className="w-3.5 h-3.5" />
                  ابحث عن الحجز
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SavedTripItineraryProps {
  days: TripDay[];
  destination: string;
  hotel?: TripHotel;
}

export function SavedTripItinerary({ days, destination, hotel }: SavedTripItineraryProps) {
  if (!days?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          لا توجد أنشطة في هذه الخطة بعد.
        </CardContent>
      </Card>
    );
  }

  const hotelBookingUrl = hotel ? buildBookingUrl(hotel, destination) : null;
  const allActivities = days.flatMap((day) => day.activities ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold">برنامج الرحلة اليومي</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 print:hidden"
          onClick={() => window.print()}
          data-testid="button-export-pdf"
        >
          <Printer className="w-4 h-4" />
          تصدير الخطة كـ PDF
        </Button>
      </div>

      <Card className="overflow-hidden print:hidden">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            خريطة الوجهة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense fallback={<MapLoadingFallback />}>
            <TripMap
              destination={destination}
              activities={allActivities}
              className="h-72 w-full"
            />
          </Suspense>
        </CardContent>
      </Card>

      {hotel && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-primary" />
              الإقامة المقترحة
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <h4 className="font-semibold leading-snug">{hotel.name}</h4>
              {hotel.description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {hotel.description}
                </p>
              )}
            </div>
            {hotelBookingUrl && (
              <Button variant="secondary" size="sm" className="gap-1.5 print:hidden" asChild>
                <a href={hotelBookingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  احجز عبر Booking.com
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {days.map((day) => (
        <Card
          key={day.dayNumber}
          className="overflow-hidden border-white/30 bg-gradient-to-br from-white/60 via-white/40 to-white/20 shadow-xl shadow-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.03] dark:to-transparent"
          data-testid={`day-${day.dayNumber}`}
        >
          <CardHeader className="border-b border-white/20 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent py-4 backdrop-blur-sm dark:border-white/10">
            <CardTitle className="flex items-center justify-between gap-2 text-base font-bold tracking-tight">
              <span>{getArabicDayLabel(day.dayNumber)}</span>
              <Badge
                variant="secondary"
                className="border-white/30 bg-white/50 font-normal backdrop-blur-sm dark:border-white/10 dark:bg-white/10"
              >
                {day.activities?.length ?? 0}{" "}
                {(day.activities?.length ?? 0) === 1 ? "نشاط" : "أنشطة"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white/20 pt-6 backdrop-blur-sm dark:bg-transparent">
            {day.activities?.length ? (
              <div>
                {day.activities.map((activity, index) => (
                  <ActivityTimelineItem
                    key={`${day.dayNumber}-${index}`}
                    activity={activity}
                    destination={destination}
                    isLast={index === day.activities.length - 1}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                لا توجد أنشطة لهذا اليوم
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export type ActivityLookupMap = Record<
  number,
  {
    name: string;
    nameEn?: string | null;
    details?: string | null;
    detailsEn?: string | null;
    googleMapsUrl?: string | null;
    type?: string;
    category?: string | null;
    duration?: string | null;
  }
>;

interface ItineraryViewProps {
  dailyPlan: any[];
  destination: string;
  formatDayDate: (dayIndex: number) => string | null;
  getBestTimeToVisit?: (period: string, type: string) => string | null;
  showBudgetSummary?: boolean;
  activitiesMap?: ActivityLookupMap;
}

function LegacyActivityCard({
  activity,
  destination,
  bestTime,
  activitiesMap,
}: {
  activity: any;
  destination: string;
  bestTime?: string | null;
  activitiesMap?: ActivityLookupMap;
}) {
  const { language } = useLanguage();

  const dbActivity =
    activity.activityId && activitiesMap ? activitiesMap[activity.activityId] : undefined;

  const activityName = dbActivity
    ? getLocalizedName(dbActivity.name, dbActivity.nameEn, language)
    : activity.activity || activity.name;

  const activityDescription = dbActivity
    ? getLocalizedName(dbActivity.details || "", dbActivity.detailsEn || "", language)
    : activity.description;

  const activityGoogleMapsUrl = dbActivity?.googleMapsUrl || activity.googleMapsUrl;

  const displayCost =
    typeof activity.estimatedCost === "number" ? activity.estimatedCost : parseFloat(activity.cost) || 0;
  const hasCost = displayCost > 0;
  const mapsResult = buildMapsUrl({
    name: activityName,
    destinationName: destination,
    googleMapsUrl: activityGoogleMapsUrl,
  });

  return (
    <div className="flex gap-3 p-3 rounded-md bg-muted/20" data-testid={`card-activity-${activityName}`}>
      <div className="flex flex-col items-center pt-0.5 min-w-[52px] shrink-0">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">
          {activity.startTime && activity.endTime ? `${activity.startTime}` : activity.time || ""}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm leading-snug">{activityName}</h4>
        {activityDescription && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {activityDescription}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {activity.type && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {activity.type}
            </Badge>
          )}
          {hasCost ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <DollarSign className="w-2.5 h-2.5" />
              {displayCost} {language === "ar" ? "ر.س" : "SAR"}
            </Badge>
          ) : null}
        </div>
        {bestTime && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
            <Sparkles className="w-3 h-3" />
            {bestTime}
          </div>
        )}
      </div>

      <div className="shrink-0 self-start mt-0.5">
        <a href={mapsResult.url} target="_blank" rel="noopener noreferrer">
          <Button size="icon" variant="ghost">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </Button>
        </a>
      </div>
    </div>
  );
}

export default function ItineraryView({
  dailyPlan,
  destination,
  formatDayDate,
  getBestTimeToVisit,
  activitiesMap,
}: ItineraryViewProps) {
  const { language } = useLanguage();

  if (!dailyPlan || dailyPlan.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2 px-1">
        <Calendar className="w-5 h-5 text-primary" />
        {language === "ar" ? "برنامج الرحلة اليومي" : "Daily Itinerary"}
      </h2>

      <Accordion type="single" collapsible defaultValue="day-0" className="space-y-2">
        {dailyPlan.map((day: any, dayIdx: number) => {
          const dayDate = formatDayDate(dayIdx);
          const actCount = day.activities?.length || 0;

          return (
            <AccordionItem key={dayIdx} value={`day-${dayIdx}`} className="border rounded-md bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex flex-col items-start gap-0.5 text-start">
                  <span className="font-semibold text-sm">
                    {day.title || `${language === "ar" ? "اليوم" : "Day"} ${day.day}`}
                  </span>
                  {dayDate && (
                    <span className="text-xs text-muted-foreground font-normal">— {dayDate}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {actCount} {language === "ar" ? "أنشطة" : "activities"}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <div className="space-y-2">
                  {day.activities?.map((activity: any, actIdx: number) => (
                    <LegacyActivityCard
                      key={actIdx}
                      activity={activity}
                      destination={destination}
                      bestTime={
                        getBestTimeToVisit
                          ? getBestTimeToVisit(activity.period, activity.type)
                          : null
                      }
                      activitiesMap={activitiesMap}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
