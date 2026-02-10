import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Favorites() {
  const { language } = useLanguage();

  return (
    <AppShell>
      <Card className="border-dashed">
        <CardContent className="text-center py-16">
          <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2" data-testid="text-favorites-title">
            {language === "ar" ? "المفضلة" : "Favorites"}
          </h2>
          <p className="text-sm text-muted-foreground" data-testid="text-favorites-empty">
            {language === "ar"
              ? "ستظهر وجهاتك المفضلة هنا قريبًا"
              : "Your favorite destinations will appear here soon"}
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
