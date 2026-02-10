import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar, MapPin, Hotel, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useRoute } from "wouter";
import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedName } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import ItineraryView, { type ActivityLookupMap } from "@/components/ItineraryView";
import { buildMapsUrl } from "@/lib/maps";

export default function SharedTrip() {
  const [, params] = useRoute("/shared/:token");
  const { language, isRTL } = useLanguage();
  const content = {
    ar: {
      planNotFound: 'الخطة غير موجودة',
      invalidLink: 'هذا الرابط غير صالح أو تم إلغاء المشاركة',
      sharedPlan: 'خطة مشاركة',
      oneDay: 'يوم واحد',
      days: 'أيام',
      created: 'تاريخ الإنشاء',
      suggestedAccommodation: 'الإقامة المقترحة',
      luxury: 'فاخر',
      mid: 'متوسط',
      economy: 'اقتصادي',
      openInMaps: 'فتح في الخرائط',
      footer: 'تم إنشاء هذه الخطة بواسطة مرحال - رفيقك في السفر داخل السعودية',
    },
    en: {
      planNotFound: 'Plan not found',
      invalidLink: 'This link is invalid or sharing has been removed',
      sharedPlan: 'Shared Plan',
      oneDay: '1 day',
      days: 'days',
      created: 'Created',
      suggestedAccommodation: 'Suggested Accommodation',
      luxury: 'Luxury',
      mid: 'Mid-range',
      economy: 'Economy',
      openInMaps: 'Open in Maps',
      footer: 'This plan was created by Marhal - your travel companion in Saudi Arabia',
    },
  };
  const t = content[language];
  const shareToken = params?.token || '';

  const { data: trip, isLoading, error } = trpc.trips.getShared.useQuery(
    { shareToken },
    { enabled: !!shareToken }
  );

  const plan = trip?.plan as any;

  const planActivityIds = useMemo(() => {
    if (!plan?.dailyPlan) return [];
    const ids = new Set<number>();
    for (const day of plan.dailyPlan) {
      for (const act of day.activities || []) {
        if (act.activityId) ids.add(act.activityId);
      }
    }
    return Array.from(ids);
  }, [plan]);

  const { data: activitiesData } = trpc.destinations.getActivitiesByIds.useQuery(
    { ids: planActivityIds },
    { enabled: planActivityIds.length > 0 }
  );

  const activitiesMap = useMemo<ActivityLookupMap>(() => {
    if (!activitiesData) return {};
    const map: ActivityLookupMap = {};
    for (const act of activitiesData) {
      map[act.id] = act;
    }
    return map;
  }, [activitiesData]);

  const formatDayDate = (dayIndex: number): string | null => {
    if (!trip?.startDate) return null;
    try {
      const start = new Date(trip.startDate + 'T00:00:00');
      if (isNaN(start.getTime())) return null;
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + dayIndex);
      return dayDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-semibold mb-4">{t.planNotFound}</h2>
          <p className="text-muted-foreground">
            {t.invalidLink}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <Badge variant="outline" className="mb-2">{t.sharedPlan}</Badge>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-primary" />
                    {getLocalizedName(trip.destination, trip.destinationEn, language)}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {trip.days === 1 ? t.oneDay : `${trip.days} ${t.days}`}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {formatDayDate(0) && (
                  <span className="flex items-center gap-1" data-testid="text-shared-start-date">
                    <Calendar className="w-4 h-4" />
                    {formatDayDate(0)}
                  </span>
                )}
                <span>
                  {t.created}: {new Date(trip.createdAt).toLocaleDateString(
                    language === 'ar' ? 'ar-SA' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {plan?.accommodation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hotel className="w-5 h-5 text-primary" />
                  {t.suggestedAccommodation}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{plan.accommodation.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.accommodation.class === 'luxury' ? t.luxury : 
                       plan.accommodation.class === 'mid' ? t.mid : t.economy}
                      {plan.accommodation.priceRange && ` • ${plan.accommodation.priceRange}`}
                    </p>
                  </div>
                  <a
                    href={buildMapsUrl({ name: plan.accommodation.name, destinationName: trip.destination, googleMapsUrl: plan.accommodation.googleMapsUrl }).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    <MapPin className="w-4 h-4" />
                    {t.openInMaps}
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {plan?.dailyPlan && (
            <ItineraryView
              dailyPlan={plan.dailyPlan}
              destination={getLocalizedName(trip.destination, trip.destinationEn, language)}
              formatDayDate={formatDayDate}
              activitiesMap={activitiesMap}
            />
          )}

          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>{t.footer}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
