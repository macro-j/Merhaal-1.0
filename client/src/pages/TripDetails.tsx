import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar, MapPin, DollarSign, Hotel, Clock, ExternalLink, FileDown, Loader2, ArrowRight, Sparkles, Share2, Link, Copy, X, MessageCircle, Send, Undo2, Save, Bot, User as UserIcon } from "lucide-react";
import ItineraryView, { type ActivityLookupMap } from "@/components/ItineraryView";
import { buildMapsUrl } from "@/lib/maps";
import { useLocation, useRoute } from "wouter";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedName } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function TripDetails() {
  const { user } = useAuth();
  const [, params] = useRoute("/trip/:id");
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [previewPlan, setPreviewPlan] = useState<any>(null);
  const [originalPlan, setOriginalPlan] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const content = {
    ar: {
      errShareLink: 'حدث خطأ أثناء إنشاء رابط المشاركة',
      shareRemoved: 'تم إلغاء المشاركة',
      loginRequired: 'يجب تسجيل الدخول أولاً',
      planNotFound: 'الخطة غير موجودة',
      exportSuccess: 'تم تصدير الخطة بنجاح',
      exportError: 'حدث خطأ أثناء التصدير',
      linkCopied: 'تم نسخ الرابط',
      tripNotFound: 'الرحلة غير موجودة',
      backToPlans: 'العودة لخططي',
      newTrip: 'رحلة جديدة',
      currency: 'ريال',
      day: 'يوم',
      days: 'أيام',
      share: 'مشاركة',
      exportPdf: 'تصدير PDF',
      suggestedAccommodation: 'الإقامة المقترحة',
      luxury: 'فاخر',
      mid: 'متوسط',
      economy: 'اقتصادي',
      openInMaps: 'فتح في الخرائط',
      dailyBudget: 'ميزانية اليوم',
      sar: 'ر.س',
      accommodationCostPerNight: 'تكلفة السكن/ليلة (تقديري)',
      remainingAfterAccom: 'المتبقي بعد السكن',
      accommodation: 'الإقامة',
      sharePlan: 'مشاركة الخطة',
      shareDescription: 'شارك هذا الرابط مع الآخرين ليتمكنوا من مشاهدة خطة رحلتك',
      removeShare: 'إلغاء المشاركة',
      close: 'إغلاق',
      tripDetailsTitle: 'تفاصيل الرحلة',
      tripAssistant: 'مساعد الرحلة',
      aiAssistantTitle: 'مساعد الرحلة الذكي',
      planUpdated: 'تم تعديل الخطة بنجاح! يمكنك مراجعتها أدناه.',
      aiError: 'حدث خطأ. حاول مرة أخرى.',
      changesSaved: 'تم حفظ التعديلات',
      saveFailed: 'فشل الحفظ',
      changesReverted: 'تم التراجع عن التعديلات.',
      mockMode: 'وضع تجريبي — الذكاء الاصطناعي غير متاح حالياً',
      previewNotSaved: 'معاينة التعديلات — لم تُحفظ بعد',
      save: 'حفظ',
      revert: 'تراجع',
      changesReady: 'تعديلات جاهزة — احفظ أو تراجع',
      saveChanges: 'حفظ التعديلات',
      premiumFeature: 'ميزة حصرية للباقات المدفوعة',
      upgradePrompt: 'قم بترقية باقتك إلى ذكي أو احترافي لاستخدام مساعد الرحلة الذكي',
      ok: 'حسنًا',
      chatPlaceholder: 'اكتب تعليماتك هنا...',
      chatEmptyTitle: 'اكتب تعليماتك لتعديل خطة الرحلة',
      chatExample: 'مثال:',
      chatEx1: 'خل اليوم الثاني مطاعم أكثر',
      chatEx2: 'قلل التسوق وزد الطبيعة',
      chatEx3: 'أضف أنشطة مسائية',
      modifying: 'جاري التعديل...',
      bestTime: {
        morning: {
          tourism: 'أفضل وقت للزيارة - الجو معتدل صباحًا',
          nature: 'وقت مثالي للتصوير - إضاءة طبيعية ممتازة',
          culture: 'أقل ازدحامًا في الصباح الباكر',
        },
        noon: {
          shopping: 'أفضل وقت للتسوق - المتاجر مفتوحة بالكامل',
          food: 'وقت الغداء - تجربة مطاعم متكاملة',
        },
        afternoon: {
          culture: 'أفضل وقت لزيارة المتاحف',
          shopping: 'أجواء مميزة في الأسواق الشعبية',
        },
        evening: {
          food: 'أفضل تجربة للمطاعم والمقاهي',
          tourism: 'مناظر خلابة عند الغروب',
          nature: 'وقت مثالي للتنزه',
        },
      },
    },
    en: {
      errShareLink: 'Error creating share link',
      shareRemoved: 'Share removed',
      loginRequired: 'You must log in first',
      planNotFound: 'Plan not found',
      exportSuccess: 'Plan exported successfully',
      exportError: 'Error exporting plan',
      linkCopied: 'Link copied',
      tripNotFound: 'Trip not found',
      backToPlans: 'Back to My Plans',
      newTrip: 'New Trip',
      currency: 'SAR',
      day: 'day',
      days: 'days',
      share: 'Share',
      exportPdf: 'Export PDF',
      suggestedAccommodation: 'Suggested Accommodation',
      luxury: 'Luxury',
      mid: 'Mid-range',
      economy: 'Economy',
      openInMaps: 'Open in Maps',
      dailyBudget: 'Daily Budget',
      sar: 'SAR',
      accommodationCostPerNight: 'Accommodation cost/night (est.)',
      remainingAfterAccom: 'Remaining after accommodation',
      accommodation: 'Accommodation',
      sharePlan: 'Share Plan',
      shareDescription: 'Share this link with others so they can view your trip plan',
      removeShare: 'Remove Share',
      close: 'Close',
      tripDetailsTitle: 'Trip Details',
      tripAssistant: 'Trip Assistant',
      aiAssistantTitle: 'AI Trip Assistant',
      planUpdated: 'Plan updated successfully! Review it below.',
      aiError: 'An error occurred. Try again.',
      changesSaved: 'Changes saved',
      saveFailed: 'Save failed',
      changesReverted: 'Changes reverted.',
      mockMode: 'Mock mode — AI not available',
      previewNotSaved: 'Preview — not saved yet',
      save: 'Save',
      revert: 'Revert',
      changesReady: 'Changes ready — save or revert',
      saveChanges: 'Save',
      premiumFeature: 'Premium Feature',
      upgradePrompt: 'Upgrade to Smart or Professional tier to use the AI Trip Assistant',
      ok: 'OK',
      chatPlaceholder: 'Type your instructions...',
      chatEmptyTitle: 'Type your instructions to modify the trip plan',
      chatExample: 'Example:',
      chatEx1: 'Add more restaurants on day 2',
      chatEx2: 'Less shopping, more nature',
      chatEx3: 'Add evening activities',
      modifying: 'Modifying...',
      bestTime: {
        morning: {
          tourism: 'Best time to visit - cool morning weather',
          nature: 'Ideal for photography - excellent natural light',
          culture: 'Less crowded in the early morning',
        },
        noon: {
          shopping: 'Best time to shop - stores fully open',
          food: 'Lunchtime - full restaurant experience',
        },
        afternoon: {
          culture: 'Best time to visit museums',
          shopping: 'Great atmosphere in traditional markets',
        },
        evening: {
          food: 'Best restaurant and café experience',
          tourism: 'Stunning sunset views',
          nature: 'Ideal time for a stroll',
        },
      },
    },
  };

  const t = content[language];

  const tripId = params?.id ? parseInt(params.id) : null;
  const { data: trips, isLoading, refetch } = trpc.trips.list.useQuery(undefined, {
    enabled: !!user,
  });

  const [isMockMode, setIsMockMode] = useState(false);

  const aiAssistMutation = trpc.trips.aiAssist.useMutation({
    onSuccess: (data: any) => {
      const usedMock = data.usedMock === true;
      setIsMockMode(usedMock);
      const msg = usedMock && data.assistantMessage
        ? data.assistantMessage
        : t.planUpdated;
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: msg,
      }]);
      setPreviewPlan(data.updatedPlan);
    },
    onError: (error) => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: error.message || t.aiError,
      }]);
    },
  });

  const savePlanMutation = trpc.trips.savePlan.useMutation({
    onSuccess: () => {
      toast.success(t.changesSaved);
      setOriginalPlan(null);
      setPreviewPlan(null);
      setChatMessages([]);
      setAiChatOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t.saveFailed);
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = () => {
    const msg = chatInput.trim();
    if (!msg || !tripId || aiAssistMutation.isPending) return;
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatInput('');
    aiAssistMutation.mutate({ tripId, instruction: msg });
  };

  const handleSavePlan = () => {
    if (!tripId || !previewPlan) return;
    savePlanMutation.mutate({ tripId, plan: previewPlan });
  };

  const handleRevertPlan = () => {
    setPreviewPlan(null);
    setOriginalPlan(null);
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: t.changesReverted,
    }]);
  };

  const openAiChat = () => {
    if (!previewPlan) {
      setOriginalPlan(plan);
    }
    setAiChatOpen(true);
  };

  const generateShareMutation = trpc.trips.generateShareLink.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/shared/${data.shareToken}`;
      setShareUrl(url);
      setShareDialogOpen(true);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t.errShareLink);
    },
  });

  const removeShareMutation = trpc.trips.removeShareLink.useMutation({
    onSuccess: () => {
      setShareUrl(null);
      setShareDialogOpen(false);
      refetch();
      toast.success(t.shareRemoved);
    },
  });

  const trip = trips?.find((t: any) => t.id === tripId);
  const plan = trip?.plan as any;
  const isProfessional = user?.tier === 'professional';
  const canShare = user?.tier === 'smart' || user?.tier === 'professional';

  const planActivityIds = useMemo(() => {
    const currentPlan = previewPlan || plan;
    if (!currentPlan?.dailyPlan) return [];
    const ids = new Set<number>();
    for (const day of currentPlan.dailyPlan) {
      for (const act of day.activities || []) {
        if (act.activityId) ids.add(act.activityId);
      }
    }
    return Array.from(ids);
  }, [previewPlan, plan]);

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

  const handleExportPDF = async () => {
    if (!tripId) return;
    setExportingPdf(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error(t.loginRequired);
        return;
      }

      const response = await fetch(`/api/plans/${tripId}/pdf?lang=${language}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 && errorData.code === 'TIER_REQUIRED') {
          toast.error(errorData.error || t.exportError);
        } else if (response.status === 404) {
          toast.error(t.planNotFound);
        } else {
          const detail = errorData.detail ? ` (${errorData.detail})` : '';
          toast.error(`${errorData.error || t.exportError}${detail}`);
        }
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merhaal-trip-${tripId}-${language}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(t.exportSuccess);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t.exportError);
    } finally {
      setExportingPdf(false);
    }
  };


  const getBestTimeToVisit = (period: string, type: string): string | null => {
    if (!isProfessional) return null;
    
    const periodMap: Record<string, keyof typeof t.bestTime> = {
      'صباحًا': 'morning',
      'ظهرًا': 'noon',
      'عصرًا': 'afternoon',
      'مساءً': 'evening',
      'morning': 'morning',
      'noon': 'noon',
      'afternoon': 'afternoon',
      'evening': 'evening',
    };
    const typeMap: Record<string, string> = {
      'سياحة': 'tourism',
      'طبيعة': 'nature',
      'ثقافة': 'culture',
      'تسوق': 'shopping',
      'طعام': 'food',
      'tourism': 'tourism',
      'nature': 'nature',
      'culture': 'culture',
      'shopping': 'shopping',
      'food': 'food',
    };
    
    const p = periodMap[period];
    const ty = typeMap[type];
    if (!p || !ty) return null;
    
    return (t.bestTime[p] as Record<string, string>)?.[ty] || null;
  };

  const handleShare = () => {
    if (!tripId) return;
    if (trip?.shareToken) {
      const url = `${window.location.origin}/shared/${trip.shareToken}`;
      setShareUrl(url);
      setShareDialogOpen(true);
    } else {
      generateShareMutation.mutate({ tripId });
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success(t.linkCopied);
    }
  };

  if (isLoading) {
    return (
      <AppShell title={t.tripDetailsTitle} showBack>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!trip) {
    return (
      <AppShell title={t.tripDetailsTitle} showBack>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">{t.tripNotFound}</h2>
          <Button onClick={() => setLocation('/my-plans')}>
            {t.backToPlans}
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t.tripDetailsTitle} showBack>
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-none">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  {getLocalizedName(plan?.destination, plan?.destinationEn, language) || t.newTrip}
                </h1>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {formatDayDate(0) && (
                    <span className="flex items-center gap-1" data-testid="text-trip-start-date">
                      <Calendar className="w-4 h-4" />
                      {formatDayDate(0)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {trip.days} {trip.days === 1 ? t.day : t.days}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {trip.budget} {t.currency}
                  </span>
                  {trip.accommodationType && (
                    <span className="flex items-center gap-1">
                      <Hotel className="w-4 h-4" />
                      {trip.accommodationType}
                    </span>
                  )}
                </div>
                {trip.interests && trip.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {trip.interests.map((interest: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {canShare && (
                  <Button 
                    variant="outline"
                    onClick={handleShare}
                    disabled={generateShareMutation.isPending}
                    className="gap-2"
                  >
                    {generateShareMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {t.share}
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={openAiChat}
                  className="gap-2"
                  data-testid="button-ai-assistant"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t.tripAssistant}
                </Button>
                {isProfessional && (
                  <Button 
                    onClick={handleExportPDF}
                    disabled={exportingPdf}
                    className="gap-2"
                  >
                    {exportingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    {t.exportPdf}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {plan?.accommodation ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hotel className="w-5 h-5 text-primary" />
                {t.suggestedAccommodation}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{plan.accommodation.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.accommodation.class === 'luxury' ? t.luxury : 
                     plan.accommodation.class === 'mid' ? t.mid : t.economy}
                    {plan.accommodation.priceRange && ` • ${plan.accommodation.priceRange}`}
                  </p>
                  {plan?.accommodationSelectionNote && (
  <p className="mt-1 text-sm text-muted-foreground">
    {plan.accommodationSelectionNote}
  </p>
)}

                </div>
                <a
                  href={buildMapsUrl({ name: plan.accommodation.name, destinationName: plan.destination, googleMapsUrl: plan.accommodation.googleMapsUrl }).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  <MapPin className="w-4 h-4" />
                  {t.openInMaps}
                </a>
              </div>
              
              {(plan?.dailyBudget || plan?.accommodationCostPerNight || plan?.remainingAfterAccommodation) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    {plan?.dailyBudget && (
                      <div>
                        <p className="text-muted-foreground">{t.dailyBudget}</p>
                        <p className="font-semibold text-primary">{Math.round(plan.dailyBudget)} {t.sar}</p>
                      </div>
                    )}
                    {plan?.accommodationCostPerNight !== undefined && (
                      <div>
                        <p className="text-muted-foreground">{t.accommodationCostPerNight}</p>
                        <p className="font-semibold text-primary">{Math.round(plan.accommodationCostPerNight)} {t.sar}</p>
                      </div>
                    )}
                    {plan?.remainingAfterAccommodation !== undefined && (
                      <div>
                        <p className="text-muted-foreground">{t.remainingAfterAccom}</p>
                        <p className="font-semibold text-primary">{Math.round(plan.remainingAfterAccommodation)} {t.sar}</p>
                      </div>
                    )}
                  </div>
                  {plan?.budgetNote && (
                    <p className="mt-3 text-xs text-muted-foreground italic">
                      {plan.budgetNote}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : plan?.noAccommodationMessage ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hotel className="w-5 h-5 text-muted-foreground" />
                {t.accommodation}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-2">
                {plan.noAccommodationMessage}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {previewPlan && (
          <div className="flex flex-col gap-2">
            {isMockMode && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" data-testid="banner-mock-mode">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  {t.mockMode}
                </span>
              </div>
            )}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300 flex-1">
              {t.previewNotSaved}
            </span>
            <Button
              size="sm"
              onClick={handleSavePlan}
              disabled={savePlanMutation.isPending}
              className="gap-1"
              data-testid="button-save-plan"
            >
              {savePlanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {t.save}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRevertPlan}
              className="gap-1"
              data-testid="button-revert-plan"
            >
              <Undo2 className="w-3 h-3" />
              {t.revert}
            </Button>
          </div>
          </div>
        )}

        {(previewPlan || plan)?.dailyPlan && (
          <ItineraryView
            dailyPlan={(previewPlan || plan).dailyPlan}
            destination={getLocalizedName((previewPlan || plan).destination, (previewPlan || plan).destinationEn, language)}
            formatDayDate={formatDayDate}
            getBestTimeToVisit={getBestTimeToVisit}
            showBudgetSummary
            activitiesMap={activitiesMap}
          />
        )}

        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setLocation('/my-plans')}>
            <ArrowRight className="w-4 h-4 me-2" />
            {t.backToPlans}
          </Button>
        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              {t.sharePlan}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.shareDescription}
            </p>
            <div className="flex gap-2">
              <Input 
                value={shareUrl || ''} 
                readOnly 
                className="flex-1" 
                dir="ltr"
              />
              <Button size="icon" variant="outline" onClick={copyToClipboard}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex justify-between">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => tripId && removeShareMutation.mutate({ tripId })}
                disabled={removeShareMutation.isPending}
              >
                {removeShareMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <X className="w-4 h-4 me-2" />
                )}
                {t.removeShare}
              </Button>
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                {t.close}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aiChatOpen} onOpenChange={setAiChatOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {t.aiAssistantTitle}
            </DialogTitle>
          </DialogHeader>

          {user?.tier === 'free' ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-md p-4 text-center">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h3 className="font-semibold mb-2" data-testid="text-upgrade-message">
                  {t.premiumFeature}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t.upgradePrompt}
                </p>
              </div>
              <Button className="w-full" onClick={() => setAiChatOpen(false)} data-testid="button-close-upgrade">
                {t.ok}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 gap-3">
              <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[50vh] p-1">
                {chatMessages.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Bot className="w-10 h-10 mx-auto mb-3 text-primary/40" />
                    <p className="text-sm mb-2">
                      {t.chatEmptyTitle}
                    </p>
                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground/70">
                        {t.chatExample}
                      </p>
                      <p>&quot;{t.chatEx1}&quot;</p>
                      <p>&quot;{t.chatEx2}&quot;</p>
                      <p>&quot;{t.chatEx3}&quot;</p>
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`chat-message-${msg.role}-${idx}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-md px-3 py-2 text-sm max-w-[80%] ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {aiAssistMutation.isPending && (
                  <div className="flex gap-2 justify-start" data-testid="chat-loading">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-md px-3 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.modifying}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {previewPlan && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-800 dark:text-amber-300 flex-1">
                    {t.changesReady}
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSavePlan}
                    disabled={savePlanMutation.isPending}
                    className="gap-1"
                    data-testid="button-dialog-save"
                  >
                    {savePlanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {t.saveChanges}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRevertPlan}
                    className="gap-1"
                    data-testid="button-dialog-revert"
                  >
                    <Undo2 className="w-3 h-3" />
                    {t.revert}
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={t.chatPlaceholder}
                  className="resize-none flex-1"
                  rows={2}
                  disabled={aiAssistMutation.isPending}
                  data-testid="input-chat-message"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || aiAssistMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
