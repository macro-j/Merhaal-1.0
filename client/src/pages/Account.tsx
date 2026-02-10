import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Crown, Settings, Globe, Moon, Sun } from "lucide-react";

export default function Account() {
  const { user } = useAuth();
  const { language, isRTL, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const tierLabels: Record<string, { ar: string; en: string }> = {
    free: { ar: "مجاني", en: "Free" },
    smart: { ar: "ذكي", en: "Smart" },
    professional: { ar: "احترافي", en: "Professional" },
  };

  const tier = tierLabels[user?.tier || "free"];

  return (
    <AppShell>
      <div className="space-y-4 max-w-lg mx-auto" dir={isRTL ? "rtl" : "ltr"}>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6">
            <Avatar className="h-20 w-20 border">
              <AvatarFallback className="text-2xl font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold" data-testid="text-account-name">
                {user?.name || "-"}
              </h2>
              <p className="text-sm text-muted-foreground" data-testid="text-account-email">
                {user?.email || "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4" />
              {language === "ar" ? "الباقة" : "Tier"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold" data-testid="text-account-tier">
              {language === "ar" ? tier.ar : tier.en}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {language === "ar" ? "الإعدادات" : "Settings"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium" data-testid="text-setting-language-label">
                    {language === "ar" ? "اللغة" : "Language"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" ? "تبديل لغة التطبيق" : "Switch app language"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                data-testid="button-toggle-language"
              >
                {language === "ar" ? "English" : "العربية"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium" data-testid="text-setting-theme-label">
                    {language === "ar" ? "المظهر" : "Theme"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" ? "الوضع الفاتح أو الداكن" : "Light or dark mode"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                data-testid="button-toggle-theme"
              >
                {theme === "dark"
                  ? (language === "ar" ? "فاتح" : "Light")
                  : (language === "ar" ? "داكن" : "Dark")}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}
