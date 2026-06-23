import AppShell from "@/components/AppShell";
import { SavedTripItinerary } from "@/components/ItineraryView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSavedTrips, type SavedTrip } from "@/lib/tripsStorage";
import {
  Calendar,
  CalendarDays,
  MapPin,
  Wallet,
  MapPinOff,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

export default function TripDetails() {
  const [, params] = useRoute("/trip/:id");
  const [, setLocation] = useLocation();
  const [trip, setTrip] = useState<SavedTrip | null | undefined>(undefined);

  useEffect(() => {
    const id = params?.id;
    if (!id) {
      setTrip(null);
      return;
    }
    const found = getSavedTrips().find((t) => t.id === id) ?? null;
    setTrip(found);
  }, [params?.id]);

  if (trip === undefined) {
    return (
      <AppShell title="تفاصيل الرحلة" showBack>
        <div className="flex items-center justify-center py-24" dir="rtl">
          <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>
        </div>
      </AppShell>
    );
  }

  if (!trip) {
    return (
      <AppShell title="تفاصيل الرحلة" showBack>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center" dir="rtl">
          <Card className="w-full max-w-md border-dashed">
            <CardContent className="pt-10 pb-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MapPinOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">لم يتم العثور على الرحلة</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  قد تكون الخطة محذوفة أو الرابط غير صحيح. تحقق من خططك المحفوظة على هذا الجهاز.
                </p>
              </div>
              <Button className="mt-2 gap-2" onClick={() => setLocation("/my-plans")}>
                <ArrowRight className="w-4 h-4" />
                العودة إلى خططي
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const dayCount = trip.dayCount ?? trip.days?.length ?? 0;
  const createdLabel = new Date(trip.createdAt).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell title={trip.title || "تفاصيل الرحلة"} showBack>
      <div className="space-y-8" dir="rtl">
        <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-background to-accent/10 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm text-muted-foreground mb-1">وجهة الرحلة</p>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  <MapPin className="w-7 h-7 text-primary shrink-0" />
                  {trip.destination}
                </h1>
                {trip.title && trip.title !== trip.destination && (
                  <p className="text-base text-muted-foreground mt-2">{trip.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-background/80 border p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المدة</p>
                    <p className="font-semibold">
                      {dayCount} {dayCount === 1 ? "يوم" : "أيام"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-background/80 border p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">نمط الرحلة</p>
                    <p className="font-semibold">{trip.budgetTier || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 font-normal">
                  <Calendar className="w-3 h-3" />
                  أُنشئت في {createdLabel}
                </Badge>
                {trip.interests?.map((interest) => (
                  <Badge key={interest} variant="secondary" className="font-normal">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <SavedTripItinerary days={trip.days} destination={trip.destination} hotel={trip.hotel} />
      </div>
    </AppShell>
  );
}
