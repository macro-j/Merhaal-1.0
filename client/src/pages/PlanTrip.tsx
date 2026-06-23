import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Loader2,
  MapPin,
  Calendar as CalendarIcon,
  Wallet,
  Sparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
  Check,
  CalendarDays,
  Landmark,
  Leaf,
  PartyPopper,
  Gem,
  Coins,
  Scale,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLocalizedName, getDestinationSubtitle, sortDestinations } from "@/lib/utils";
import { destinationImages } from "@/constants/destinationImages";
import { DESTINATIONS_CATALOG } from "@/constants/destinationsCatalog";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  generateTrip,
  formatLlmError,
  type ArabicBudgetTier,
  type TripMood,
} from "@/lib/llm";
import { saveTrip } from "@/lib/tripsStorage";

type LucideIcon = typeof Wallet;

const BUDGET_TIER_CARDS: Array<{
  value: ArabicBudgetTier;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: LucideIcon;
}> = [
  {
    value: "اقتصادية",
    titleAr: "اقتصادية وعملية",
    titleEn: "Practical & Budget",
    descAr: "أماكن محبوبة بأسعار مناسبة وتجارب عملية",
    descEn: "Well-loved spots, smart spending, practical picks",
    icon: Coins,
  },
  {
    value: "متوسطة",
    titleAr: "متوازنة ومريحة",
    titleEn: "Balanced & Mid-range",
    descAr: "توازن مثالي بين الجودة والراحة والقيمة",
    descEn: "The sweet spot of quality, comfort and value",
    icon: Scale,
  },
  {
    value: "فاخرة",
    titleAr: "فاخرة VIP",
    titleEn: "Luxury & VIP",
    descAr: "وجهات راقية ومطاعم فاخرة وتجارب استثنائية",
    descEn: "Premium districts, fine dining, exceptional moments",
    icon: Gem,
  },
];

const MOOD_CARDS: Array<{
  value: TripMood;
  titleAr: string;
  titleEn: string;
  icon: LucideIcon;
}> = [
  { value: "عريق وتراثي", titleAr: "عريق وتراثي", titleEn: "Heritage", icon: Landmark },
  { value: "ترند ولايف ستايل", titleAr: "ترند ولايف ستايل", titleEn: "Trendy", icon: Sparkles },
  { value: "استرخاء وطبيعة", titleAr: "استرخاء وطبيعة", titleEn: "Nature", icon: Leaf },
  { value: "حيوية وترفيه", titleAr: "حيوية وترفيه", titleEn: "Entertainment", icon: PartyPopper },
];

const TOTAL_STEPS = 5;

const generatingMessages = [
  "تحليل تفضيلاتك",
  "اختيار الأماكن الأنسب",
  "ترتيب الجدول اليومي",
  "تنسيق اللمسات الأخيرة",
];

export default function PlanTrip() {
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const rawDestinations = useMemo(
    () =>
      DESTINATIONS_CATALOG.map((dest, index) => ({
        id: index + 1,
        slug: dest.slug,
        nameAr: dest.name,
        nameEn: dest.nameEn,
        titleAr: dest.subtitle,
        titleEn: dest.subtitleEn,
        descriptionAr: dest.description,
        descriptionEn: dest.descriptionEn,
      })),
    []
  );
  const destinations = useMemo(() => sortDestinations(rawDestinations), [rawDestinations]);
  const destinationsLoading = false;

  const [step, setStep] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [days, setDays] = useState(1);
  const [budgetTier, setBudgetTier] = useState<ArabicBudgetTier>("متوسطة");
  const [interests, setInterests] = useState<TripMood[]>([]);
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

  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingUI = isGenerating || showLoading;

  useEffect(() => {
    if (isGenerating) {
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
  }, [isGenerating, showLoading]);

  const toggleInterest = (interest: TripMood) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const stepLabels = [
    { ar: "الوجهة", en: "Destination", icon: MapPin },
    { ar: "التاريخ والمدة", en: "Date & Duration", icon: CalendarIcon },
    { ar: "نمط الرحلة", en: "Trip Style", icon: Wallet },
    { ar: "جو الرحلة", en: "Vibe", icon: Sparkles },
    { ar: "المراجعة", en: "Review", icon: Eye },
  ];

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return selectedDestination !== null;
      case 2:
        return startDate !== undefined && days >= 1;
      case 3:
        return Boolean(budgetTier);
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
        3: { ar: "الرجاء اختيار نمط الرحلة", en: "Please choose a trip style" },
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

  const handleGenerate = async () => {
    if (!selectedDestination || !selectedDest) return;

    const destinationName = getLocalizedName(
      selectedDest.nameAr,
      selectedDest.nameEn,
      language
    );

    setIsGenerating(true);
    loadingStartRef.current = Date.now();

    try {
      const plan = await generateTrip({
        destination: destinationName,
        durationDays: days,
        budgetTier,
        interests,
        language,
        startDate: toISODateString(startDate) || undefined,
      });

      const savedTrip = {
        ...plan,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        budgetTier,
        interests,
        startDate: toISODateString(startDate) || undefined,
        dayCount: days,
      };

      saveTrip(savedTrip);

      toast.success(
        language === "ar" ? "تم إنشاء خطتك وحفظها بنجاح!" : "Your plan was created and saved!"
      );
      setLocation("/my-plans");
    } catch (error) {
      console.error("[PlanTrip] generateTrip failed", error);
      toast.error(formatLlmError(error, language), { duration: 8000 });
    } finally {
      setIsGenerating(false);
      setShowLoading(false);
    }
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

  const dayChips = [1, 2, 3, 4, 5, 7];

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
          <Label>{language === "ar" ? "مدة الرحلة" : "Trip Duration"}</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {dayChips.map((d) => {
              const isActive = days === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  data-testid={`button-days-${d}`}
                  className={`flex flex-col items-center justify-center rounded-xl border py-3 transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-lg font-bold leading-none">{d}</span>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    {language === "ar" ? (d === 1 ? "يوم" : "أيام") : d === 1 ? "day" : "days"}
                  </span>
                </button>
              );
            })}
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
          <Wallet className="w-5 h-5" />
          {language === "ar" ? "نمط الرحلة" : "Trip Style"}
        </CardTitle>
        <CardDescription>
          {language === "ar"
            ? "اختر المستوى الذي يناسب ذوقك وميزانيتك"
            : "Pick the level that matches your taste and budget"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {BUDGET_TIER_CARDS.map((tier) => {
          const isActive = budgetTier === tier.value;
          const Icon = tier.icon;
          return (
            <button
              key={tier.value}
              type="button"
              onClick={() => setBudgetTier(tier.value)}
              data-testid={`button-budget-${tier.value}`}
              className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-start transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-snug">
                  {language === "ar" ? tier.titleAr : tier.titleEn}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {language === "ar" ? tier.descAr : tier.descEn}
                </p>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isActive ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                }`}
              >
                {isActive && <Check className="w-3 h-3" />}
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {language === "ar" ? "جو الرحلة" : "Trip Vibe"}
        </CardTitle>
        <CardDescription>
          {language === "ar"
            ? "اختر الأجواء التي تناسب مزاجك (يمكن اختيار أكثر من جو)"
            : "Choose the moods that fit you (multi-select)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {MOOD_CARDS.map((mood) => {
            const isActive = interests.includes(mood.value);
            const Icon = mood.icon;
            return (
              <button
                key={mood.value}
                type="button"
                onClick={() => toggleInterest(mood.value)}
                data-testid={`button-interest-${mood.value}`}
                className={`group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-5 text-center backdrop-blur-md transition-all ${
                  isActive
                    ? "border-primary/60 bg-primary/10 shadow-sm ring-1 ring-primary/25"
                    : "border-white/40 bg-white/40 hover:border-primary/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold leading-snug">
                  {language === "ar" ? mood.titleAr : mood.titleEn}
                </span>
                {isActive && (
                  <span className="absolute top-2 end-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderStep5 = () => {
    const budgetCard = BUDGET_TIER_CARDS.find((t) => t.value === budgetTier);

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
              <Wallet className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "نمط الرحلة" : "Trip Style"}
                </p>
                <p className="font-medium" data-testid="text-review-budget-tier">
                  {budgetCard
                    ? language === "ar"
                      ? budgetCard.titleAr
                      : budgetCard.titleEn
                    : budgetTier}
                </p>
              </div>
            </div>

            {interests.length > 0 && (
              <div className="flex items-start gap-3 py-2">
                <Sparkles className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === "ar" ? "جو الرحلة" : "Vibe"}
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
              disabled={isGeneratingUI}
              data-testid="button-generate-desktop"
            >
              {isGeneratingUI ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {language === "ar" ? "جاري تصميم رحلتك الذكية..." : "Designing your smart trip..."}
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
              disabled={isGeneratingUI}
              className="flex-1"
              data-testid="button-generate-mobile"
            >
              {isGeneratingUI ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {language === "ar" ? "جاري تصميم رحلتك الذكية..." : "Designing your smart trip..."}
                </>
              ) : (
                language === "ar" ? "توليد الخطة" : "Generate Plan"
              )}
            </Button>
          )}
        </div>
      </div>

      {isGeneratingUI && (
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
              {language === "ar" ? "جاري تصميم رحلتك الذكية..." : "Designing your smart trip..."}
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
