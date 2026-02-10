import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Calendar, MapPin, Plus, Trash2, Clock, FileDown, Loader2, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils";

export default function MyPlans() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const { data: trips, isLoading, refetch } = trpc.trips.list.useQuery(undefined, {
    enabled: !!user,
  });
  const [exportingPdf, setExportingPdf] = useState<number | null>(null);

  const content = {
    ar: {
      title: 'خططي',
      subtitle: 'عرض وإدارة خطط رحلاتك المحفوظة',
      noTrips: 'لا توجد خطط محفوظة',
      noTripsDesc: 'لم تقم بحفظ أي خطة رحلة بعد',
      startBtn: 'ابدأ الآن',
      loading: 'جارٍ التحميل...',
      day: 'يوم',
      days: 'أيام',
      created: 'تاريخ الإنشاء',
      duration: 'المدة',
      delete: 'حذف',
      deleteConfirm: 'هل أنت متأكد من حذف هذه الخطة؟',
      tripFallback: 'رحلة',
      deleted: 'تم حذف الخطة',
      loginRequired: 'يجب تسجيل الدخول أولاً',
      exportTierRequired: 'تصدير PDF متاح فقط لمستخدمي الباقة الاحترافية',
      planNotFound: 'الخطة غير موجودة',
      exportSuccess: 'تم تصدير الخطة بنجاح',
      exportError: 'حدث خطأ أثناء التصدير',
      viewPlan: 'عرض الخطة الكاملة',
      exportPdf: 'تصدير PDF',
    },
    en: {
      title: 'My Plans',
      subtitle: 'View and manage your saved trip plans',
      noTrips: 'No saved plans',
      noTripsDesc: 'You haven\'t saved any trip plans yet',
      startBtn: 'Start Now',
      loading: 'Loading...',
      day: 'day',
      days: 'days',
      created: 'Created',
      duration: 'Duration',
      delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this plan?',
      tripFallback: 'Trip',
      deleted: 'Plan deleted',
      loginRequired: 'Please log in first',
      exportTierRequired: 'PDF export is for Professional tier only',
      planNotFound: 'Plan not found',
      exportSuccess: 'Plan exported successfully',
      exportError: 'Error exporting plan',
      viewPlan: 'View full plan',
      exportPdf: 'Export PDF',
    }
  };

  const t = content[language];

  const deleteMutation = trpc.trips.delete.useMutation({
    onSuccess: () => {
      toast.success(t.deleted);
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return null;
  }

  const handleDelete = (tripId: number) => {
    if (confirm(t.deleteConfirm)) {
      deleteMutation.mutate({ tripId });
    }
  };

  const handleExportPDF = async (tripId: number) => {
    setExportingPdf(tripId);
    
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
          toast.error(errorData.error || t.exportTierRequired);
        } else if (response.status === 404) {
          toast.error(t.planNotFound);
        } else {
          toast.error(errorData.error || t.exportError);
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
      setExportingPdf(null);
    }
  };

  const isProfessional = user?.tier === 'professional';

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AppShell>
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t.subtitle}</p>
          </div>
          <Button onClick={() => setLocation('/plan-trip')} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 me-2" />
            {t.startBtn}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t.loading}</p>
          </div>
        ) : trips?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">{t.noTrips}</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">{t.noTripsDesc}</p>
              <Button onClick={() => setLocation('/plan-trip')}>
                <Plus className="w-4 h-4 me-2" />
                {t.startBtn}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {trips?.map((trip) => {
              const plan = trip.plan as any;
              const cityName = getLocalizedName(plan?.destination, plan?.destinationEn, language) || `${t.tripFallback} #${trip.id}`;

              return (
                <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">{cityName}</CardTitle>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {trip.days} {trip.days > 1 ? t.days : t.day}
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
                        {isProfessional && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={exportingPdf === trip.id}
                            onClick={() => handleExportPDF(trip.id)}
                            title={t.exportPdf}
                            data-testid={`button-export-trip-${trip.id}`}
                          >
                            {exportingPdf === trip.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(trip.id)}
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
