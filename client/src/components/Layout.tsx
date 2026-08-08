import type { ReactNode } from "react";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useLanguage } from "@/contexts/LanguageContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isRTL } = useLanguage();
  const [location] = useLocation();
  const isCoreAppRoute =
    location === "/plan-trip" ||
    location === "/my-plans" ||
    location.startsWith("/trip/");

  return (
    <div
      className="flex min-h-screen flex-col bg-background print:bg-white"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <ScrollToTop />
      <TopHeader />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      {!isCoreAppRoute && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
      <MobileBottomNav />
    </div>
  );
}
