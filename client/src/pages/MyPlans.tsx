import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteTrip, getSavedTrips, type SavedTrip } from "@/lib/tripsStorage";
import { Calendar, Clock, Eye, MapPin, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function MyPlans() {
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTrips(getSavedTrips());
    setLoaded(true);
  }, []);

  const content = {
    ar: {
      title: "خططي",
      subtitle: "عرض وإدارة خطط رحلاتك المحفوظة",
      noTrips: "لم تقم بتخطيط أي رحلة بعد",
      noTripsDesc: "ابدأ بتصميم رحلتك الذكية الأولى — تُحفظ تلقائيًا على جهازك",
      startBtn: "خطط رحلة جديدة",
      day: "يوم",
      days: "أيام",
      viewPlan: "عرض الخطة",
      delete: "حذف",
      deleteConfirm: "هل أنت متأكد من حذف هذه الخطة؟",
      deleted: "تم حذف الخطة",
      tripFallback: "رحلة",
    },
    en: {
      title: "My Plans",
      subtitle: "View and manage your saved trip plans",
      noTrips: "You haven't planned any trips yet",
      noTripsDesc: "Create your first smart itinerary — saved automatically on your device",
      startBtn: "Plan a New Trip",
      day: "day",
      days: "days",
      viewPlan: "View plan",
      delete: "Delete",
      deleteConfirm: "Are you sure you want to delete this plan?",
      deleted: "Plan deleted",
      tripFallback: "Trip",
    },
  };

  const t = content[language];

  const handleDelete = (tripId: string) => {
    if (!confirm(t.deleteConfirm)) return;
    deleteTrip(tripId);
    setTrips(getSavedTrips());
    toast.success(t.deleted);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <AppShell>
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t.subtitle}</p>
          </div>
          <Button onClick={() => setLocation("/plan-trip")} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 me-2" />
            {t.startBtn}
          </Button>
        </div>

        {!loaded ? null : trips.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.noTrips}</h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">{t.noTripsDesc}</p>
              <Button onClick={() => setLocation("/plan-trip")} size="lg">
                <Plus className="w-4 h-4 me-2" />
                {t.startBtn}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {trips.map((trip) => {
              const cityName = trip.destination || trip.title || t.tripFallback;
              const duration = trip.dayCount ?? trip.days?.length ?? 0;

              return (
                <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">
                            {trip.title || cityName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {cityName}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {duration} {duration > 1 ? t.days : t.day}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(trip.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLocation(`/trip/${trip.id}`)}
                          title={t.viewPlan}
                          data-testid={`button-view-trip-${trip.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(trip.id)}
                          title={t.delete}
                          data-testid={`button-delete-trip-${trip.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
