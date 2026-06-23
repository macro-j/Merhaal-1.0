import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { TripActivity, TripDay } from "@/lib/llm";
import { buildMapsUrl } from "@/lib/maps";
import { cn, getLocalizedName } from "@/lib/utils";
import {
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  Moon,
  Search,
  Sparkles,
  Sun,
  Sunset,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  if (time === "الصباح") return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  if (time === "الظهر") return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
  return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
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
  const mapsResult = buildMapsUrl({
    name: activity.locationName || activity.title,
    destinationName: destination,
  });

  const bookingUrl = activity.bookingSearchQuery
    ? `https://www.google.com/search?q=${encodeURIComponent(activity.bookingSearchQuery)}`
    : null;

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0" data-testid={`activity-${activity.title}`}>
      {!isLast && (
        <span
          className="absolute top-10 bottom-0 w-px bg-border"
          style={{ insetInlineStart: "1.125rem" }}
          aria-hidden
        />
      )}

      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
        <TimeIcon time={activity.time} />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="outline" className={cn("text-xs font-medium", timeBadgeClass(activity.time))}>
            {activity.time}
          </Badge>
        </div>

        <h4 className="text-base font-semibold leading-snug">{activity.title}</h4>

        {activity.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{activity.description}</p>
        )}

        {activity.locationName && (
          <div className="flex items-start gap-2 mt-3 text-sm text-foreground/80">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{activity.locationName}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
            <a href={mapsResult.url} target="_blank" rel="noopener noreferrer">
              <MapPin className="w-3.5 h-3.5" />
              فتح في الخرائط
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </Button>

          {bookingUrl && (
            <Button variant="secondary" size="sm" className="h-9 gap-1.5" asChild>
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
  );
}

interface SavedTripItineraryProps {
  days: TripDay[];
  destination: string;
}

export function SavedTripItinerary({ days, destination }: SavedTripItineraryProps) {
  if (!days?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          لا توجد أنشطة في هذه الخطة بعد.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">برنامج الرحلة اليومي</h2>

      {days.map((day) => (
        <Card key={day.dayNumber} className="overflow-hidden" data-testid={`day-${day.dayNumber}`}>
          <CardHeader className="bg-primary/5 border-b py-4">
            <CardTitle className="text-base font-bold flex items-center justify-between gap-2">
              <span>{getArabicDayLabel(day.dayNumber)}</span>
              <Badge variant="secondary" className="font-normal">
                {day.activities?.length ?? 0}{" "}
                {(day.activities?.length ?? 0) === 1 ? "نشاط" : "أنشطة"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
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
