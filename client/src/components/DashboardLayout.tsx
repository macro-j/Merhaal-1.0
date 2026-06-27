import { useLanguage } from "@/contexts/LanguageContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isRTL } = useLanguage();

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <main className="container mx-auto max-w-5xl px-4 pb-8 pt-[calc(env(safe-area-inset-top)+4.5rem)]">
        {children}
      </main>
    </div>
  );
}
