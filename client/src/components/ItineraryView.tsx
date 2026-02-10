import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildMapsUrl } from "@/lib/maps";
import { getLocalizedName } from "@/lib/utils";

export type ActivityLookupMap = Record<number, {
  name: string;
  nameEn?: string | null;
  details?: string | null;
  detailsEn?: string | null;
  googleMapsUrl?: string | null;
  type?: string;
  category?: string | null;
  duration?: string | null;
}>;

interface ItineraryViewProps {
  dailyPlan: any[];
  destination: string;
  formatDayDate: (dayIndex: number) => string | null;
  getBestTimeToVisit?: (period: string, type: string) => string | null;
  showBudgetSummary?: boolean;
  activitiesMap?: ActivityLookupMap;
}

function ActivityCard({
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

  const dbActivity = activity.activityId && activitiesMap
    ? activitiesMap[activity.activityId]
    : undefined;

  const activityName = dbActivity
    ? getLocalizedName(dbActivity.name, dbActivity.nameEn, language)
    : (activity.activity || activity.name);

  const activityDescription = dbActivity
    ? getLocalizedName(dbActivity.details || '', dbActivity.detailsEn || '', language)
    : activity.description;

  const activityGoogleMapsUrl = dbActivity?.googleMapsUrl || activity.googleMapsUrl;

  const displayCost = typeof activity.estimatedCost === 'number'
    ? activity.estimatedCost
    : (parseFloat(activity.cost) || 0);
  const hasCost = displayCost > 0;
  const mapsResult = buildMapsUrl({
    name: activityName,
    destinationName: destination,
    googleMapsUrl: activityGoogleMapsUrl,
  });

  return (
    <div
      className="flex gap-3 p-3 rounded-md bg-muted/20"
      data-testid={`card-activity-${activityName}`}
    >
      <div className="flex flex-col items-center pt-0.5 min-w-[52px] shrink-0">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">
          {activity.startTime && activity.endTime
            ? `${activity.startTime}`
            : activity.time || ""}
        </span>
        {activity.startTime && activity.endTime && (
          <span className="text-[10px] text-muted-foreground text-center leading-tight">
            {activity.endTime}
          </span>
        )}
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
          {activity.duration && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {activity.duration}
            </Badge>
          )}
          {hasCost ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0" data-testid={`badge-cost-${activityName}`}>
              <DollarSign className="w-2.5 h-2.5" />
              {displayCost} {language === "ar" ? "ر.س" : "SAR"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 dark:text-green-400" data-testid={`badge-free-${activityName}`}>
              {language === "ar" ? "مجاني" : "Free"}
            </Badge>
          )}
        </div>

        {bestTime && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
            <Sparkles className="w-3 h-3" />
            {bestTime}
          </div>
        )}
      </div>

      <div className="shrink-0 self-start mt-0.5 flex flex-col items-center">
        <a
          href={mapsResult.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`button-maps-${activityName}`}
        >
          <Button
            size="icon"
            variant="ghost"
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </Button>
        </a>
        <span className="text-[9px] text-muted-foreground leading-tight text-center max-w-[52px]">
          {mapsResult.isFallback
            ? (language === "ar" ? "بحث في خرائط Google" : "Search Maps")
            : (language === "ar" ? "فتح في الخرائط" : "Open in Maps")}
        </span>
      </div>
    </div>
  );
}

export default function ItineraryView({
  dailyPlan,
  destination,
  formatDayDate,
  getBestTimeToVisit,
  showBudgetSummary = false,
  activitiesMap,
}: ItineraryViewProps) {
  const { language } = useLanguage();

  if (!dailyPlan || dailyPlan.length === 0) return null;

  const defaultValue = "day-0";

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2 px-1">
        <Calendar className="w-5 h-5 text-primary" />
        {language === "ar" ? "برنامج الرحلة اليومي" : "Daily Itinerary"}
      </h2>

      <Accordion
        type="single"
        collapsible
        defaultValue={defaultValue}
        className="space-y-2"
      >
        {dailyPlan.map((day: any, dayIdx: number) => {
          const dayDate = formatDayDate(dayIdx);
          const actCount = day.activities?.length || 0;

          return (
            <AccordionItem
              key={dayIdx}
              value={`day-${dayIdx}`}
              className="border rounded-md bg-card"
            >
              <AccordionTrigger
                className="px-4 py-3 hover:no-underline"
                data-testid={`button-day-toggle-${dayIdx}`}
              >
                <div className="flex flex-col items-start gap-0.5 text-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {day.title || `${language === "ar" ? "اليوم" : "Day"} ${day.day}`}
                    </span>
                    {dayDate && (
                      <span
                        className="text-xs text-muted-foreground font-normal"
                        data-testid={`text-day-date-${dayIdx}`}
                      >
                        — {dayDate}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {actCount}{" "}
                      {language === "ar"
                        ? actCount === 1
                          ? "نشاط"
                          : "أنشطة"
                        : actCount === 1
                        ? "activity"
                        : "activities"}
                    </span>
                    {showBudgetSummary && day.dayBudgetSummary && (
                      <span className="flex items-center gap-0.5">
                        <DollarSign className="w-3 h-3" />
                        {Math.round(
                          day.dayBudgetSummary.dayItemsCost ?? (day.dayBudgetSummary.activitiesCost ?? 0) + (day.dayBudgetSummary.foodCost ?? 0)
                        )}{" "}
                        {language === "ar" ? "ر.س" : "SAR"}
                      </span>
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-3">
                {showBudgetSummary && day.dayBudgetSummary && (
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-3 px-1">
                    <span>
                      {language === "ar" ? "ميزانية اليوم" : "Budget"}:{" "}
                      {Math.round(day.dayBudgetSummary.dailyBudget)}{" "}
                      {language === "ar" ? "ر.س" : "SAR"}
                    </span>
                    <span>
                      {language === "ar" ? "السكن" : "Accommodation"}:{" "}
                      {Math.round(
                        day.dayBudgetSummary.accommodationCostPerNight
                      )}{" "}
                      {language === "ar" ? "ر.س" : "SAR"}
                    </span>
                    <span>
                      {language === "ar" ? "المتبقي" : "Remaining"}:{" "}
                      {Math.round(
                        day.dayBudgetSummary.remainingAfterActivities ??
                          day.dayBudgetSummary.remainingAfterAccommodation ??
                          0
                      )}{" "}
                      {language === "ar" ? "ر.س" : "SAR"}
                    </span>
                  </div>
                )}

                {actCount === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    {language === "ar"
                      ? "لا توجد أنشطة لهذا اليوم"
                      : "No activities for this day"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {day.activities.map((activity: any, actIdx: number) => {
                      const bestTime = getBestTimeToVisit
                        ? getBestTimeToVisit(activity.period, activity.type)
                        : null;
                      return (
                        <ActivityCard
                          key={actIdx}
                          activity={activity}
                          destination={destination}
                          bestTime={bestTime}
                          activitiesMap={activitiesMap}
                        />
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
