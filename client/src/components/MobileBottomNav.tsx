import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Home, MapPinned, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";

const items = [
  { href: "/", labelAr: "الرئيسية", labelEn: "Home", icon: Home },
  { href: "/plan-trip", labelAr: "خطط", labelEn: "Plan", icon: Plus },
  { href: "/my-plans", labelAr: "رحلاتي", labelEn: "Trips", icon: MapPinned },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { language } = useLanguage();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-3 border-t bg-background/95 px-3 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden"
      aria-label={language === "ar" ? "التنقل الرئيسي" : "Primary navigation"}
    >
      {items.map(item => {
        const active =
          item.href === "/"
            ? location === "/"
            : location.startsWith(item.href) ||
              (item.href === "/my-plans" && location.startsWith("/trip/"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
            <span>{language === "ar" ? item.labelAr : item.labelEn}</span>
            {active && (
              <span className="absolute inset-x-1/3 top-0 h-0.5 bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
