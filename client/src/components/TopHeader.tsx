import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  Globe,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo.jpg";

interface NavLink {
  href: string;
  labelAr: string;
  labelEn: string;
}

const primaryNavLinks: NavLink[] = [
  { href: "/", labelAr: "الرئيسية", labelEn: "Home" },
  { href: "/plan-trip", labelAr: "خطط رحلة", labelEn: "Plan Trip" },
  { href: "/my-plans", labelAr: "خططي", labelEn: "My Plans" },
];

const secondaryNavLinks: NavLink[] = [
  { href: "/about", labelAr: "عن مرحال", labelEn: "About" },
  { href: "/support", labelAr: "الدعم", labelEn: "Support" },
];

const navLinkClass = (active: boolean) =>
  cn(
    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
  );

const mobileNavLinkClass = (active: boolean) =>
  cn(
    "min-h-[44px] w-full rounded-xl px-4 py-3.5 text-start text-base font-medium transition-colors",
    active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
  );

export function TopHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    setLocation(href);
  };

  const t = {
    language: language === "ar" ? "اللغة" : "Language",
    more: language === "ar" ? "المزيد" : "More",
    menu: language === "ar" ? "القائمة" : "Menu",
    themeLight: language === "ar" ? "الوضع الفاتح" : "Light mode",
    themeDark: language === "ar" ? "الوضع الداكن" : "Dark mode",
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-background/75 shadow-sm backdrop-blur-xl print:hidden dark:border-white/10"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between md:h-16">
          <Link
            href="/"
            aria-label={language === "ar" ? "الرئيسية" : "Home"}
            className="flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img src={logoUrl} alt="مرحال" className="h-8 w-auto md:h-9" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {primaryNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={navLinkClass(isActive(link.href))}
              >
                {language === "ar" ? link.labelAr : link.labelEn}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  {t.more}
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuLabel>{t.more}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {secondaryNavLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href}>
                      {language === "ar" ? link.labelAr : link.labelEn}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden gap-1.5 md:inline-flex"
                  aria-label={t.language}
                >
                  <Globe className="h-4 w-4" />
                  {language === "ar" ? "العربية" : "English"}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuLabel>{t.language}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={language}
                  onValueChange={(value) => setLanguage(value as "ar" | "en")}
                >
                  <DropdownMenuRadioItem value="ar">العربية</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 rounded-full"
              aria-label={theme === "dark" ? t.themeLight : t.themeDark}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              className="h-11 w-11 rounded-full md:hidden"
              aria-label={t.menu}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side={language === "ar" ? "right" : "left"}
          className="flex w-[85vw] max-w-sm flex-col p-0"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <SheetHeader className="border-b border-border p-6 pb-4">
            <SheetTitle className="text-start">
              <Link
                href="/"
                className="text-xl font-bold text-primary"
                onClick={() => setIsOpen(false)}
              >
                مرحال
              </Link>
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-1 p-4">
            {[...primaryNavLinks, ...secondaryNavLinks].map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleNavClick(link.href)}
                className={mobileNavLinkClass(isActive(link.href))}
              >
                {language === "ar" ? link.labelAr : link.labelEn}
              </button>
            ))}
          </div>

          <div className="mt-auto border-t border-border p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">{t.language}</p>
            <div className="flex items-center gap-3">
              <Button
                variant={language === "ar" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("ar")}
                className="h-11 flex-1"
              >
                العربية
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en")}
                className="h-11 flex-1"
              >
                English
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
