import type { ReactNode } from "react";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useLanguage } from "@/contexts/LanguageContext";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isRTL } = useLanguage();

  return (
    <div
      className="flex min-h-screen flex-col bg-background print:bg-white"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <ScrollToTop />
      <TopHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
