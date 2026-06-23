import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const navLinkClass = (active: boolean) =>
  cn(
    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
    active
      ? "text-primary bg-primary/10"
      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
  );

const mobileNavLinkClass = (active: boolean) =>
  cn(
    "w-full px-4 py-3.5 rounded-xl text-base font-medium text-start transition-colors min-h-[44px]",
    active ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted"
  );

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    setLocation(href);
  };

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 bg-background border-b border-border"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          <Link
            href="/"
            aria-label={language === "ar" ? "الرئيسية" : "Home"}
            className="flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img src={logoUrl} alt="مرحال" className="h-8 md:h-9 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {primaryNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={navLinkClass(isActive(link.href))}
              >
                {language === "ar" ? link.labelAr : link.labelEn}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full"
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden md:inline-flex text-sm"
            >
              {language === "ar" ? "English" : "العربية"}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              className="w-11 h-11 rounded-full md:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side={language === "ar" ? "right" : "left"}
          className="w-[85vw] max-w-sm p-0 flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <SheetHeader className="p-6 pb-4 border-b border-border">
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

          <div className="flex flex-col p-4 gap-1 flex-1">
            {primaryNavLinks.map((link) => (
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

          <div className="border-t border-border p-4 mt-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="flex-1 h-11"
              >
                {language === "ar" ? "English" : "العربية"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="w-11 h-11"
                aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
