import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { Loader2, MapPin, Calendar as CalendarIcon, DollarSign, Heart, Eye, ChevronLeft, ChevronRight, Check, Hotel, CalendarDays, UtensilsCrossed } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLocalizedName, getDestinationSubtitle, sortDestinations } from "@/lib/utils";
import { destinationImages } from "@/constants/destinationImages";
import { useLanguage } from "@/contexts/LanguageContext";

const TOTAL_STEPS = 5;

const generatingMessages = [
  "تحليل تفضيلاتك",
  "اختيار الأنشطة المناسبة",
  "ترتيب الجدول اليومي",
  "مراجعة الميزانية",
];

export default function PlanTrip() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const { data: rawDestinations, isLoading: destinationsLoading } = trpc.destinations.list.useQuery();
  const destinations = useMemo(() => rawDestinations ? sortDestinations(rawDestinations) : undefined, [rawDestinations]);

  const [step, setStep] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [days, setDays] = useState(1);
  const [budget, setBudget] = useState(500);
  const [interests, setInterests] = useState<string[]>([]);
  const [accommodationType, setAccommodationType] = useState("متوسط");
  const [mealsPerDay, setMealsPerDay] = useState(2);
  const [msgIndex, setMsgIndex] = useState(0);
  const [showLoading, setShowLoading] = useState(false);
  const loadingStartRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatDate = (date: Date | undefined, locale: string): string => {
    if (!date) return "";
    return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const toISODateString = (date: Date | undefined): string => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const endDate = useMemo(() => {
    if (!startDate || days < 1) return undefined;
    const end = new Date(startDate);
    end.setDate(end.getDate() + days - 1);
    return end;
  }, [startDate, days]);

  const todayDate = useMemo(() => new Date(), []);

  const MIN_LOADING_MS = 1300;

  const finishLoading = (callback: () => void) => {
    const elapsed = Date.now() - loadingStartRef.current;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    setTimeout(() => {
      setShowLoading(false);
      callback();
    }, remaining);
  };

  const createTripMutation = trpc.trips.create.useMutation({
    onSuccess: (data) => {
      finishLoading(() => {
        toast.success(language === "ar" ? "تم إنشاء الرحلة بنجاح!" : "Trip created successfully!");
        setLocation(`/trip/${data.id}`);
      });
    },
    onError: (error) => {
      finishLoading(() => {
        toast.error((language === "ar" ? "حدث خطأ: " : "Error: ") + error.message);
      });
    },
  });

  const isGenerating = createTripMutation.isPending || showLoading;

  useEffect(() => {
    if (createTripMutation.isPending) {
      loadingStartRef.current = Date.now();
      setShowLoading(true);
      setMsgIndex(0);
      intervalRef.current = setInterval(() => {
        setMsgIndex((prev) => (prev + 1) % generatingMessages.length);
      }, 1500);
    } else if (!showLoading) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [createTripMutation.isPending, showLoading]);

  const interestOptions = [
    "ثقافة وتراث",
    "تسوق وترفيه",
    "عائلي وأطفال",
    "طعام ومطاعم",
    "مغامرات ورياضة",
  ];

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const tierInfo: Record<string, { maxDays: number; maxActivities: number; maxTrips: number }> = {
    free: { maxDays: 1, maxActivities: 3, maxTrips: 1 },
    smart: { maxDays: 10, maxActivities: 5, maxTrips: 3 },
    professional: { maxDays: 999, maxActivities: 999, maxTrips: 999 },
  };

  const currentTier = tierInfo[user?.tier || "free"];

  const stepLabels = [
    { ar: "الوجهة", en: "Destination", icon: MapPin },
    { ar: "التاريخ والأيام", en: "Date & Days", icon: CalendarIcon },
    { ar: "الميزانية والإقامة", en: "Budget", icon: DollarSign },
    { ar: "الاهتمامات", en: "Interests", icon: Heart },
    { ar: "المراجعة", en: "Review", icon: Eye },
  ];

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return selectedDestination !== null;
      case 2:
        return startDate !== undefined && days >= 1;
      case 3:
        return budget >= 100;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      const msgs: Record<number, { ar: string; en: string }> = {
        1: { ar: "الرجاء اختيار وجهة", en: "Please select a destination" },
        2: { ar: "الرجاء تحديد تاريخ البداية وعدد الأيام", en: "Please set start date and days" },
        3: { ar: "الرجاء تحديد الميزانية", en: "Please set a budget" },
      };
      const msg = msgs[step];
      if (msg) toast.error(language === "ar" ? msg.ar : msg.en);
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGenerate = () => {
    if (!selectedDestination) return;

    const tier = user?.tier || "free";
    if (tier === "free" && days > 1) {
      toast.error(language === "ar"
        ? "الباقة المجانية تسمح بيوم واحد فقط. قم بترقية باقتك للمزيد!"
        : "Free plan allows only 1 day. Upgrade for more!");
      return;
    }
    if (tier === "smart" && days > 10) {
      toast.error(language === "ar"
        ? "الباقة الذكية تسمح بـ 10 أيام كحد أقصى."
        : "Smart plan allows up to 10 days.");
      return;
    }

    createTripMutation.mutate({
      destinationId: selectedDestination,
      days,
      budget,
      interests,
      accommodationType,
      startDate: toISODateString(startDate) || undefined,
      mealsPerDay,
    });
  };

  const selectedDest = destinations?.find((d) => d.id === selectedDestination);


  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {stepLabels.map((s, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === step;
        const isDone = stepNum < step;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (stepNum < step) setStep(stepNum);
              }}
              className={`flex items-center justify-center rounded-full transition-colors ${
                isActive
                  ? "h-9 w-9 bg-primary text-primary-foreground"
                  : isDone
                    ? "h-8 w-8 bg-primary/20 text-primary cursor-pointer"
                    : "h-8 w-8 bg-muted text-muted-foreground"
              }`}
              data-testid={`button-step-${stepNum}`}
            >
              {isDone ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
            </button>
            {i < stepLabels.length - 1 && (
              <div className={`hidden sm:block w-6 h-0.5 ${stepNum < step ? "bg-primary/40" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {language === "ar" ? "اختر الوجهة" : "Choose Destination"}
        </CardTitle>
        <CardDescription>
          {language === "ar" ? "اختر المدينة التي تريد زيارتها" : "Select the city you want to visit"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {destinationsLoading ? (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {destinations?.map((dest) => (
              <div
                key={dest.id}
                onClick={() => setSelectedDestination(dest.id)}
                className={`relative cursor-pointer rounded-md overflow-visible border-2 transition-colors ${
                  selectedDestination === dest.id
                    ? "border-primary"
                    : "border-border"
                }`}
                data-testid={`card-destination-${dest.id}`}
              >
                <div className="aspect-video relative overflow-hidden rounded-md">
                  <img
                    src={
                      destinationImages[dest.slug] ||
                      destinationImages[dest.slug?.replace(/-/g, "")] ||
                      destinationImages[dest.slug?.replace(/-/g, "_")] ||
                      "/images/cities/riyadh-hero.jpg"
                    }
                    alt={getLocalizedName(dest.nameAr, dest.nameEn, language)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="text-lg font-bold">{getLocalizedName(dest.nameAr, dest.nameEn, language)}</h3>
                    <p className="text-sm text-gray-200">{getDestinationSubtitle(dest, language)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const dayChips = [1, 2, 3, 4, 5, 7, 10].filter(
    (d) => d <= (currentTier.maxDays >= 999 ? 365 : currentTier.maxDays)
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          {language === "ar" ? "التاريخ والمدة" : "Date & Duration"}
        </CardTitle>
        <CardDescription>
          {language === "ar" ? "حدد تاريخ البداية وعدد الأيام" : "Set the start date and number of days"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>
            {language === "ar" ? "تاريخ البداية" : "Start Date"} *
          </Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-start font-normal ${
                  !startDate ? "text-muted-foreground" : ""
                }`}
                data-testid="button-open-calendar"
              >
                <CalendarDays className="w-4 h-4 me-2 shrink-0" />
                {startDate
                  ? formatDate(startDate, language)
                  : (language === "ar" ? "اختر التاريخ" : "Pick a date")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                  setCalendarOpen(false);
                }}
                disabled={(date) => date < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())}
                data-testid="calendar-start-date"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>
            {language === "ar"
              ? `مدة الرحلة${currentTier.maxDays < 999 ? ` (الحد الأقصى: ${currentTier.maxDays})` : ""}`
              : `Trip Duration${currentTier.maxDays < 999 ? ` (max: ${currentTier.maxDays})` : ""}`}
          </Label>
          <div className="flex flex-wrap gap-2">
            {dayChips.map((d) => (
              <Button
                key={d}
                type="button"
                variant={days === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
                data-testid={`button-days-${d}`}
              >
                {d} {language === "ar" ? (d === 1 ? "يوم" : "أيام") : (d === 1 ? "day" : "days")}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Label htmlFor="customDays" className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {language === "ar" ? "عدد مخصص:" : "Custom:"}
            </Label>
            <Input
              id="customDays"
              type="number"
              min="1"
              max={currentTier.maxDays >= 999 ? 365 : currentTier.maxDays}
              value={days}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1) setDays(val);
              }}
              className="w-24"
              data-testid="input-days"
            />
          </div>
        </div>

        {(startDate || days >= 1) && (
          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {language === "ar" ? "ملخص" : "Summary"}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === "ar" ? "من" : "From"}
              </span>
              <span className="font-medium" data-testid="text-summary-start">
                {startDate ? formatDate(startDate, language) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === "ar" ? "إلى" : "To"}
              </span>
              <span className="font-medium" data-testid="text-summary-end">
                {endDate ? formatDate(endDate, language) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === "ar" ? "المدة" : "Duration"}
              </span>
              <span className="font-medium" data-testid="text-summary-days">
                {days} {language === "ar" ? (days === 1 ? "يوم" : "أيام") : (days === 1 ? "day" : "days")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {language === "ar" ? "الميزانية والإقامة" : "Budget & Accommodation"}
        </CardTitle>
        <CardDescription>
          {language === "ar" ? "حدد ميزانيتك ونوع الإقامة المفضل" : "Set your budget and preferred accommodation"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="budget">
            {language === "ar" ? "الميزانية (ريال)" : "Budget (SAR)"}
          </Label>
          <Input
            id="budget"
            type="number"
            min="100"
            step="100"
            value={budget}
            onChange={(e) => setBudget(parseInt(e.target.value) || 100)}
            required
            data-testid="input-budget"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accommodation">
            {language === "ar" ? "نوع الإقامة" : "Accommodation Type"}
          </Label>
          <Select value={accommodationType} onValueChange={setAccommodationType}>
            <SelectTrigger data-testid="select-accommodation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="فاخر">{language === "ar" ? "فاخر" : "Luxury"}</SelectItem>
              <SelectItem value="متوسط">{language === "ar" ? "متوسط" : "Mid-range"}</SelectItem>
              <SelectItem value="اقتصادي">{language === "ar" ? "اقتصادي" : "Economy"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mealsPerDay">
            {language === "ar" ? "عدد الوجبات يومياً" : "Meals per Day"}
          </Label>
          <Select value={String(mealsPerDay)} onValueChange={(v) => setMealsPerDay(parseInt(v))}>
            <SelectTrigger data-testid="select-meals-per-day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">{language === "ar" ? "وجبتان (غداء + عشاء)" : "2 Meals (Lunch + Dinner)"}</SelectItem>
              <SelectItem value="3">{language === "ar" ? "3 وجبات (فطور + غداء + عشاء)" : "3 Meals (Breakfast + Lunch + Dinner)"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          {language === "ar" ? "اهتماماتك" : "Your Interests"}
        </CardTitle>
        <CardDescription>
          {language === "ar"
            ? "اختر الأنشطة التي تفضلها (اختياري)"
            : "Select activities you prefer (optional)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((interest) => (
            <Button
              key={interest}
              type="button"
              variant={interests.includes(interest) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleInterest(interest)}
              data-testid={`button-interest-${interest}`}
            >
              {interest}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderStep5 = () => {
    const accomLabels: Record<string, string> = {
      "فاخر": language === "ar" ? "فاخر" : "Luxury",
      "متوسط": language === "ar" ? "متوسط" : "Mid-range",
      "اقتصادي": language === "ar" ? "اقتصادي" : "Economy",
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {language === "ar" ? "مراجعة وتوليد" : "Review & Generate"}
          </CardTitle>
          <CardDescription>
            {language === "ar" ? "تأكد من التفاصيل ثم قم بتوليد الخطة" : "Confirm details then generate your plan"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 py-2 border-b border-border">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "الوجهة" : "Destination"}
                </p>
                <p className="font-medium">{selectedDest ? getLocalizedName(selectedDest.nameAr, selectedDest.nameEn, language) : "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2 border-b border-border">
              <CalendarIcon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "تاريخ البداية" : "Start Date"}
                </p>
                <p className="font-medium">{formatDate(startDate, language) || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2 border-b border-border">
              <CalendarIcon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "المدة" : "Duration"}
                </p>
                <p className="font-medium">
                  {days} {language === "ar" ? (days === 1 ? "يوم" : "أيام") : (days === 1 ? "day" : "days")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2 border-b border-border">
              <DollarSign className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "الميزانية" : "Budget"}
                </p>
                <p className="font-medium">
                  {budget} {language === "ar" ? "ريال" : "SAR"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2 border-b border-border">
              <Hotel className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "الإقامة" : "Accommodation"}
                </p>
                <p className="font-medium">{accomLabels[accommodationType] || accommodationType}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2 border-b border-border">
              <UtensilsCrossed className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "الوجبات يومياً" : "Meals per Day"}
                </p>
                <p className="font-medium" data-testid="text-review-meals">
                  {mealsPerDay === 3
                    ? (language === "ar" ? "3 وجبات (فطور + غداء + عشاء)" : "3 Meals (Breakfast + Lunch + Dinner)")
                    : (language === "ar" ? "وجبتان (غداء + عشاء)" : "2 Meals (Lunch + Dinner)")}
                </p>
              </div>
            </div>

            {interests.length > 0 && (
              <div className="flex items-start gap-3 py-2">
                <Heart className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === "ar" ? "الاهتمامات" : "Interests"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {interests.map((i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {i}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <AppShell title={language === "ar" ? "خطط رحلة" : "Plan Trip"}>
      <div className="max-w-2xl mx-auto pb-24 md:pb-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground text-center">
            {language === "ar"
              ? `الخطوة ${step} من ${TOTAL_STEPS} — ${stepLabels[step - 1].ar}`
              : `Step ${step} of ${TOTAL_STEPS} — ${stepLabels[step - 1].en}`}
          </p>
        </div>

        {renderStepIndicator()}

        {stepContent[step - 1]()}

        <div className="hidden md:flex gap-3 mt-6">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              data-testid="button-back-desktop"
            >
              {isRTL ? <ChevronRight className="w-4 h-4 me-1" /> : <ChevronLeft className="w-4 h-4 me-1" />}
              {language === "ar" ? "السابق" : "Back"}
            </Button>
          )}
          <div className="flex-1" />
          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              data-testid="button-next-desktop"
            >
              {language === "ar" ? "التالي" : "Next"}
              {isRTL ? <ChevronLeft className="w-4 h-4 ms-1" /> : <ChevronRight className="w-4 h-4 ms-1" />}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              data-testid="button-generate-desktop"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {language === "ar" ? "جاري التوليد..." : "Generating..."}
                </>
              ) : (
                language === "ar" ? "توليد الخطة" : "Generate Plan"
              )}
            </Button>
          )}
        </div>

        <div className="fixed bottom-16 left-0 right-0 w-full z-30 bg-background border-t border-border p-3 flex gap-3 md:hidden">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1"
              data-testid="button-back-mobile"
            >
              {isRTL ? <ChevronRight className="w-4 h-4 me-1" /> : <ChevronLeft className="w-4 h-4 me-1" />}
              {language === "ar" ? "السابق" : "Back"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-cancel-mobile"
            >
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
              data-testid="button-next-mobile"
            >
              {language === "ar" ? "التالي" : "Next"}
              {isRTL ? <ChevronLeft className="w-4 h-4 ms-1" /> : <ChevronRight className="w-4 h-4 ms-1" />}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1"
              data-testid="button-generate-mobile"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {language === "ar" ? "جاري التوليد..." : "Generating..."}
                </>
              ) : (
                language === "ar" ? "توليد الخطة" : "Generate Plan"
              )}
            </Button>
          )}
        </div>
      </div>

      {isGenerating && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
          data-testid="overlay-generating"
        >
          <div className="flex flex-col items-center gap-6 px-6 text-center">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            </div>

            <h2 className="text-xl font-bold" data-testid="text-generating-title">
              {language === "ar" ? "جاري توليد خطتك..." : "Generating your plan..."}
            </h2>

            <p
              key={msgIndex}
              className="text-sm text-muted-foreground animate-pulse"
              data-testid="text-generating-subtitle"
            >
              {generatingMessages[msgIndex]}
            </p>

            <div className="mt-4 w-48 overflow-hidden rounded-full bg-muted h-1.5">
              <div className="h-full w-full origin-left animate-[progress_6s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
