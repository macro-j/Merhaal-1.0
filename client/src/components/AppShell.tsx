import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export default function AppShell({ children, title, showBack }: AppShellProps) {
  const { language, isRTL } = useLanguage();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto max-w-5xl px-4 pb-8 pt-[calc(env(safe-area-inset-top)+4.5rem)] print:max-w-none print:px-0 print:pb-0 print:pt-4">
        {(title || showBack) && (
          <header className="mb-6 flex items-center gap-2 print:hidden">
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
              <h1 className="truncate text-xl font-bold sm:text-2xl" data-testid="text-page-title">
                {title}
              </h1>
            )}
          </header>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
