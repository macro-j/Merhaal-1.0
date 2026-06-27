import { Link } from "wouter";
import { Mail, MapPin, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import logoUrl from "@/assets/logo.jpg";

const quickLinks = [
  { href: "/", labelAr: "الرئيسية", labelEn: "Home" },
  { href: "/plan-trip", labelAr: "خطط رحلة", labelEn: "Plan Trip" },
  { href: "/my-plans", labelAr: "خططي", labelEn: "My Plans" },
  { href: "/about", labelAr: "عن مرحال", labelEn: "About" },
  { href: "/support", labelAr: "الدعم", labelEn: "Support" },
];

export function Footer() {
  const { language, isRTL } = useLanguage();

  const t = {
    aboutTitle: language === "ar" ? "عن مرحال" : "About Merhaal",
    aboutText:
      language === "ar"
        ? "مساعد سفر ذكي يصمم رحلاتك داخل السعودية بأماكن منتقاة بعناية وتجربة بصرية راقية."
        : "An AI travel concierge crafting Saudi itineraries with curated places and a premium experience.",
    quickLinks: language === "ar" ? "روابط سريعة" : "Quick Links",
    contact: language === "ar" ? "تواصل معنا" : "Contact",
    contactText:
      language === "ar"
        ? "للاستفسارات والدعم، راسلنا عبر البريد الإلكتروني."
        : "For questions and support, reach us by email.",
    copyright: language === "ar" ? "© 2026 مرحال. جميع الحقوق محفوظة." : "© 2026 Merhaal. All rights reserved.",
    createdByPrefix: language === "ar" ? "تم التطوير بواسطة" : "Created by",
    createdByName: language === "ar" ? "محمد" : "Mohammed",
    tagline: language === "ar" ? "خطط. اكتشف. انطلق." : "Plan. Discover. Go.",
  };

  return (
    <footer
      className="mt-auto border-t border-white/20 bg-gradient-to-b from-background/90 via-muted/30 to-muted/50 backdrop-blur-xl print:hidden dark:border-white/10"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
    >
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="Merhaal" className="h-9 w-auto rounded-md" />
              <div>
                <p className="text-lg font-bold text-foreground">مرحال</p>
                <p className="text-xs text-muted-foreground">{t.tagline}</p>
              </div>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t.aboutText}</p>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {language === "ar" ? "ذكاء اصطناعي متقدم" : "Advanced AI"}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t.quickLinks}</h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {language === "ar" ? link.labelAr : link.labelEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t.contact}</h3>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t.contactText}</p>
            <a
              href="mailto:support@merhaal.app"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Mail className="h-4 w-4 shrink-0" />
              support@merhaal.app
            </a>
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground/80">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {language === "ar" ? "المملكة العربية السعودية" : "Kingdom of Saudi Arabia"}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-center md:flex-row md:text-start">
          <p className="text-xs text-muted-foreground/80">{t.copyright}</p>
          <p className="text-[11px] text-muted-foreground/60">
            {t.createdByPrefix}{" "}
            <a
              href="https://www.linkedin.com/in/alamri-mh"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-muted-foreground"
            >
              {t.createdByName}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
