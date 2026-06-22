import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

const SHELL_TOP_PADDING = "calc(env(safe-area-inset-top) + 4.5rem)";

export default function AppShell({ children, title, showBack }: AppShellProps) {
  const { language, isRTL } = useLanguage();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div
      className="min-h-screen bg-background"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Navbar />

      <div
        className="container mx-auto px-4 pb-8 max-w-5xl"
        style={{ paddingTop: SHELL_TOP_PADDING }}
      >
        {(title || showBack) && (
          <header className="flex items-center gap-2 mb-6">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                data-testid="button-back"
                aria-label={language === "ar" ? "رجوع" : "Back"}
              >
                <BackArrow className="h-5 w-5" />
              </Button>
            )}
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold truncate" data-testid="text-page-title">
                {title}
              </h1>
            )}
          </header>
        )}

        <main>{children}</main>
      </div>
    </div>
  );
}
