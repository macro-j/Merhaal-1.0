import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, MapPin, Plus, Star } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const trips: never[] = [];

  const content = {
    ar: {
      welcome: "مرحبًا",
      guest: "مسافر",
      planTrip: "خطط رحلة جديدة",
      totalTrips: "إجمالي الرحلات",
      plannedTrip: "رحلة مخططة",
      favorites: "الوجهات المفضلة",
      savedDest: "وجهة محفوظة",
      myTrips: "رحلاتي",
      noTrips: "لا توجد رحلات بعد",
      startPlanning: "ابدأ بتخطيط رحلتك الأولى الآن!",
    },
    en: {
      welcome: "Welcome",
      guest: "Traveler",
      planTrip: "Plan New Trip",
      totalTrips: "Total Trips",
      plannedTrip: "planned trip",
      favorites: "Favorite Destinations",
      savedDest: "saved destination",
      myTrips: "My Trips",
      noTrips: "No trips yet",
      startPlanning: "Start planning your first trip now!",
    },
  };
  const t = content[language];

  return (
    <AppShell>
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {t.welcome}, {t.guest}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {language === "ar"
                ? "خطط رحلاتك محليًا — بدون تسجيل دخول"
                : "Plan trips locally — no sign-in required"}
            </p>
          </div>
          <Button onClick={() => setLocation("/plan-trip")} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 me-2" />
            {t.planTrip}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.totalTrips}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trips.length}</div>
              <p className="text-xs text-muted-foreground">{t.plannedTrip}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.favorites}</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">{t.savedDest}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {language === "ar" ? "الوجهات" : "Destinations"}
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                {language === "ar" ? "مدن متاحة" : "cities available"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">{t.myTrips}</h2>
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t.noTrips}</h3>
              <p className="text-muted-foreground mb-4 text-sm">{t.startPlanning}</p>
              <Button onClick={() => setLocation("/plan-trip")}>
                <Plus className="w-4 h-4 me-2" />
                {t.planTrip}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
