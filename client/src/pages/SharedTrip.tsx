import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Loader2 } from "lucide-react";
import { useRoute } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SharedTrip() {
  const [, params] = useRoute("/shared/:token");
  const { language, isRTL } = useLanguage();
  const content = {
    ar: {
      planNotFound: "الخطة غير موجودة",
      invalidLink: "هذا الرابط غير صالح أو تم إلغاء المشاركة",
      sharedPlan: "خطة مشاركة",
    },
    en: {
      planNotFound: "Plan not found",
      invalidLink: "This link is invalid or sharing has been removed",
      sharedPlan: "Shared Plan",
    },
  };
  const t = content[language];
  const shareToken = params?.token || "";
  const isLoading = false;
  const trip = null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto max-w-3xl px-4 py-24 pt-[calc(env(safe-area-inset-top)+6rem)]">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !trip ? (
          <Card>
            <CardContent className="text-center py-16">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h1 className="text-xl font-semibold mb-2">{t.planNotFound}</h1>
              <p className="text-muted-foreground text-sm">
                {shareToken ? t.invalidLink : t.sharedPlan}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
