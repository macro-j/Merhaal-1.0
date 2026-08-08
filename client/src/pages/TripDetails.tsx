import AppShell from "@/components/AppShell";
import { SavedTripItinerary } from "@/components/ItineraryView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSavedTrips, type SavedTrip } from "@/lib/tripsStorage";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Loader2,
  MapPin,
  MapPinOff,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

const INTEREST_LABELS: Record<string, string> = {
  "عريق وتراثي": "Heritage",
  "ترند ولايف ستايل": "Lifestyle",
  "استرخاء وطبيعة": "Nature",
  "حيوية وترفيه": "Entertainment",
};

function budgetLabel(value: string | undefined, language: "ar" | "en"): string {
  if (!value) return "—";
  if (language === "ar") return value;
  if (value === "اقتصادية") return "Budget";
  if (value === "متوسطة") return "Mid-range";
  if (value === "فاخرة") return "Luxury";
  return value;
}

function formatDateRange(
  trip: SavedTrip,
  language: "ar" | "en"
): string | null {
  const start = trip.metadata?.startDate ?? trip.startDate;
  const end = trip.metadata?.endDate;
  if (!start) return null;
  const locale = language === "ar" ? "ar-SA" : "en-US";
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString(
    locale,
    options
  );
  const endLabel = end
    ? new Date(`${end}T00:00:00`).toLocaleDateString(locale, options)
    : null;
  return endLabel && end !== start ? `${startLabel} – ${endLabel}` : startLabel;
}

export default function TripDetails() {
  const [, params] = useRoute("/trip/:id");
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const [trip, setTrip] = useState<SavedTrip | null | undefined>(undefined);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  useEffect(() => {
    const id = params?.id;
    if (!id) {
      setTrip(null);
      return;
    }
    setTrip(getSavedTrips().find(savedTrip => savedTrip.id === id) ?? null);
  }, [params?.id]);

  if (trip === undefined) {
    return (
      <AppShell showBack>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {language === "ar" ? "جارٍ تحميل الرحلة" : "Loading trip"}
        </div>
      </AppShell>
    );
  }

  if (!trip) {
    return (
      <AppShell showBack>
        <div className="flex justify-center px-4 py-16 text-center">
          <Card className="w-full max-w-md border-dashed">
            <CardContent className="flex flex-col items-center gap-4 pb-8 pt-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <MapPinOff className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">
                  {language === "ar"
                    ? "لم يتم العثور على الرحلة"
                    : "Trip not found"}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {language === "ar"
                    ? "قد تكون الخطة محذوفة أو محفوظة على جهاز آخر."
                    : "This plan may have been deleted or saved on another device."}
                </p>
              </div>
              <Button
                className="mt-2 gap-2"
                onClick={() => setLocation("/my-plans")}
              >
                <BackArrow className="h-4 w-4" />
                {language === "ar" ? "العودة إلى رحلاتي" : "Back to my trips"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const dayCount = trip.dayCount ?? trip.days?.length ?? 0;
  const travelerCount = trip.travelerCount ?? trip.preferences?.travelerCount;
  const dateRange = formatDateRange(trip, language);

  return (
    <AppShell showBack>
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <section className="overflow-hidden rounded-lg border bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_12%,var(--background)),var(--background)_58%,color-mix(in_oklab,var(--accent)_10%,var(--background)))] p-5 shadow-sm sm:p-6 print:border-gray-200 print:bg-white print:text-black">
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                <MapPin className="h-3.5 w-3.5" />
                {trip.destination}
              </p>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                {trip.title || (language === "ar" ? "رحلتك" : "Your trip")}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border bg-background/75 px-3 font-medium">
                <CalendarRange className="h-3.5 w-3.5 text-primary" />
                {dateRange ??
                  `${dayCount} ${language === "ar" ? (dayCount === 1 ? "يوم" : "أيام") : dayCount === 1 ? "day" : "days"}`}
              </span>
              {travelerCount && (
                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border bg-background/75 px-3 font-medium">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {travelerCount}{" "}
                  {language === "ar"
                    ? "مسافر"
                    : travelerCount === 1
                      ? "traveler"
                      : "travelers"}
                </span>
              )}
              <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border bg-background/75 px-3 font-medium">
                <WalletCards className="h-3.5 w-3.5 text-primary" />
                {budgetLabel(trip.budgetTier, language)}
              </span>
            </div>

            {trip.interests?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {trip.interests.map(interest => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="font-normal"
                  >
                    {language === "ar"
                      ? interest
                      : (INTEREST_LABELS[interest] ?? interest)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        <SavedTripItinerary
          days={trip.days}
          destination={trip.destination}
          hotel={trip.hotel}
        />
      </div>
    </AppShell>
  );
}
