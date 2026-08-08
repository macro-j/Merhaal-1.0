import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HotelRecommendationCard } from "@/components/HotelRecommendationCard";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { TripActivity, TripDay, TripHotel } from "@shared/tripTypes";
import {
  findKnowledgePlace,
  resolveDestination,
  type DestinationPlace,
} from "@/lib/destinationsData";
import { buildMapsUrl } from "@/lib/maps";
import { cn, getLocalizedName } from "@/lib/utils";
import {
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
import { lazy, Suspense, useEffect, useState } from "react";

// Lazy-load the map so Leaflet stays out of the main bundle.
const TripMap = lazy(() => import("@/components/TripMap"));

function MapLoadingFallback() {
  return (
    <div className="relative h-64 w-full overflow-hidden bg-muted/40 sm:h-72 lg:h-[340px]">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/30 via-muted/50 to-muted/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
      </div>
    </div>
  );
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

const CATEGORY_LABELS: Record<TripActivity["activityType"], { ar: string; en: string }> = {
  heritage: { ar: "تراث", en: "Heritage" },
  modern: { ar: "حديث", en: "Modern" },
  dining: { ar: "مطعم", en: "Dining" },
  cafe: { ar: "مقهى", en: "Cafe" },
  nature: { ar: "طبيعة", en: "Nature" },
  entertainment: { ar: "ترفيه", en: "Entertainment" },
  shopping: { ar: "تسوق", en: "Shopping" },
  family: { ar: "عائلي", en: "Family" },
  adventure: { ar: "مغامرة", en: "Adventure" },
  luxury: { ar: "فاخر", en: "Luxury" },
};

function localizedTime(time: string, language: "ar" | "en"): string {
  if (language === "ar") return time;
  if (time === "الصباح") return "Morning";
  if (time === "الظهر") return "Afternoon";
  return "Evening";
}

function getPlaceTags(place: DestinationPlace | null, language: "ar" | "en"): string[] {
  if (!place) return [];
  const tags: string[] = [];
  if (isLuxuryPlace(place)) tags.push(language === "ar" ? "فاخر" : "Luxury");
  if (requiresAdvanceBooking(place)) tags.push(language === "ar" ? "حجز مسبق" : "Book ahead");
  return tags;
}

function ActivityTimelineItem({
  activity,
  destination,
  isLast,
  selected,
  onSelect,
  language,
}: {
  activity: TripActivity;
  destination: string;
  isLast: boolean;
  selected: boolean;
  onSelect: () => void;
  language: "ar" | "en";
}) {
  const place = lookupPlace(activity.locationName, destination);
  const placeTags = getPlaceTags(place, language);
  const mapsQuery = place?.mapSearchQuery || activity.locationName || activity.title;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapsQuery
  )}`;

  const bookingUrl = activity.bookingSearchQuery
    ? `https://www.google.com/search?q=${encodeURIComponent(activity.bookingSearchQuery)}`
    : null;

  return (
    <div
      className="relative flex gap-3 pb-4 last:pb-0 print:break-inside-avoid print:pb-4"
      data-testid={`activity-${activity.title}`}
      onClick={onSelect}
    >
      {!isLast && (
        <span
          className="absolute bottom-0 top-10 w-px bg-border print:hidden"
          style={{ insetInlineStart: "1rem" }}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm",
          selected && "border-primary bg-primary/10 ring-4 ring-primary/10",
          "print:border-gray-200 print:bg-white print:shadow-none print:backdrop-blur-none"
        )}
      >
        <TimeIcon time={activity.time} />
      </div>

      <div
        className={cn(
          "relative min-w-0 flex-1 overflow-hidden rounded-lg border bg-card p-4 text-start shadow-sm transition-[border-color,box-shadow,transform] hover:border-primary/35",
          selected && "border-primary/60 shadow-md ring-1 ring-primary/15",
          "print:break-inside-avoid print:border-gray-200 print:bg-white print:shadow-none print:text-black"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b opacity-60 print:h-12",
            timeAccentClass(activity.time)
          )}
          aria-hidden
        />

        <div className="relative print:text-black">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold tracking-wide backdrop-blur-sm print:backdrop-blur-none",
                timeBadgeClass(activity.time)
              )}
            >
              {localizedTime(activity.time, language)}
            </Badge>
            {activity.startTime && activity.endTime && (
              <Badge
                variant="secondary"
                className="text-[11px] font-medium gap-1 border-white/20 bg-white/50 text-foreground/80 backdrop-blur-sm dark:bg-white/10 print:border-gray-200 print:bg-gray-50 print:text-black print:backdrop-blur-none"
              >
                <Clock className="w-3 h-3 opacity-70" />
                {activity.startTime} – {activity.endTime}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
              {CATEGORY_LABELS[activity.activityType]?.[language] ?? activity.activityType}
            </Badge>
          </div>

          <h4 className="text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground print:text-black">
            {activity.title}
          </h4>

          {activity.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground print:text-gray-700">
              {activity.description}
            </p>
          )}

          {activity.reason && (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-primary/90 print:text-gray-700">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{activity.reason}</span>
            </p>
          )}

          {activity.locationName && (
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2 text-sm font-medium text-foreground/90 print:text-black">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary print:text-gray-700" />
                <span className="leading-snug">{activity.locationName}</span>
              </div>

              {placeTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ps-6">
                  {placeTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-white/30 bg-white/50 px-2.5 py-1 text-[11px] font-medium text-foreground/80 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10 print:border-gray-200 print:bg-gray-50 print:text-black print:shadow-none print:backdrop-blur-none"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 print:hidden">
            <Button
              size="sm"
              className="h-9 gap-1.5 border-0 bg-primary/90 shadow-sm backdrop-blur-sm print:hidden hover:bg-primary"
              asChild
            >
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="w-3.5 h-3.5" />
                {language === "ar" ? "فتح في الخريطة" : "Open map"}
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
                  {language === "ar" ? "ابحث عن الحجز" : "Search booking"}
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
  const { language, isRTL } = useLanguage();
  const [activeDayNumber, setActiveDayNumber] = useState(days?.[0]?.dayNumber ?? 1);
  const activeDay = days?.find((day) => day.dayNumber === activeDayNumber) ?? days?.[0];
  const [selectedActivityId, setSelectedActivityId] = useState(
    activeDay?.activities?.[0]?.id
  );

  useEffect(() => {
    setSelectedActivityId(activeDay?.activities?.[0]?.id);
  }, [activeDayNumber, activeDay?.activities]);

  if (!days?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          {language === "ar" ? "لا توجد أنشطة في هذه الخطة بعد." : "This trip has no activities yet."}
        </CardContent>
      </Card>
    );
  }

  if (!activeDay) return null;

  const dayLabel = (day: TripDay) =>
    language === "ar" ? getArabicDayLabel(day.dayNumber) : `Day ${day.dayNumber}`;
  const activityCountLabel = (count: number) =>
    language === "ar"
      ? `${count} ${count === 1 ? "نشاط" : "أنشطة"}`
      : `${count} ${count === 1 ? "activity" : "activities"}`;

  return (
    <div className="space-y-5 print:space-y-4 print:text-black" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold print:text-xl">
            {language === "ar" ? "برنامج الرحلة" : "Trip itinerary"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {language === "ar" ? "اختر يومًا لرؤية مساره وتوقفاته" : "Choose a day to see its route and stops"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 print:hidden"
          onClick={() => window.print()}
          data-testid="button-export-pdf"
        >
          <Printer className="w-4 h-4" />
          {language === "ar" ? "طباعة الخطة" : "Print plan"}
        </Button>
      </div>

      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 -mx-4 border-y bg-background/95 px-4 py-2 backdrop-blur-xl md:static md:mx-0 md:rounded-lg md:border">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar" role="tablist" aria-label={language === "ar" ? "أيام الرحلة" : "Trip days"}>
          {days.map((day) => {
            const active = day.dayNumber === activeDay.dayNumber;
            return (
              <button
                key={day.dayNumber}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveDayNumber(day.dayNumber)}
                className={cn(
                  "min-h-11 shrink-0 rounded-lg border px-4 text-start transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                )}
                data-testid={`button-day-${day.dayNumber}`}
              >
                <span className="block text-sm font-semibold">{dayLabel(day)}</span>
                {day.date && <span className="block text-[10px] opacity-75">{day.date}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="order-2 min-w-0 lg:order-1" data-testid={`day-${activeDay.dayNumber}`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold">
                {activeDay.title || dayLabel(activeDay)}
              </h3>
              {activeDay.description && (
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {activeDay.description}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="shrink-0 font-normal">
              {activityCountLabel(activeDay.activities?.length ?? 0)}
            </Badge>
          </div>

          {activeDay.activities?.length ? (
            <div>
              {activeDay.activities.map((activity, index) => (
                <ActivityTimelineItem
                  key={activity.id}
                  activity={activity}
                  destination={destination}
                  isLast={index === activeDay.activities.length - 1}
                  selected={selectedActivityId === activity.id}
                  onSelect={() => setSelectedActivityId(activity.id)}
                  language={language}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              {language === "ar" ? "لا توجد أنشطة لهذا اليوم" : "No activities for this day"}
            </p>
          )}
        </section>

        <aside className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2 print:hidden">
          <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                {language === "ar" ? `مسار ${dayLabel(activeDay)}` : `${dayLabel(activeDay)} route`}
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {activityCountLabel(activeDay.activities?.length ?? 0)}
              </span>
            </div>
            <Suspense fallback={<MapLoadingFallback />}>
              <TripMap
                destination={destination}
                activities={activeDay.activities}
                activeActivityId={selectedActivityId}
                onSelectActivity={setSelectedActivityId}
                className="h-64 w-full sm:h-72 lg:h-[340px]"
              />
            </Suspense>
          </section>

          <div className="hidden lg:block">
            <HotelRecommendationCard hotel={hotel} destination={destination} />
          </div>
        </aside>

        <div className="order-3 lg:hidden">
          <HotelRecommendationCard hotel={hotel} destination={destination} />
        </div>
      </div>
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
