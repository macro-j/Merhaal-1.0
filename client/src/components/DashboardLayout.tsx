import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";

const SHELL_TOP_PADDING = "calc(env(safe-area-inset-top) + 4.5rem)";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isRTL } = useLanguage();

  return (
    <div
      className="min-h-screen bg-background"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Navbar />

      <main
        className="container mx-auto px-4 pb-8 max-w-5xl"
        style={{ paddingTop: SHELL_TOP_PADDING }}
      >
        {children}
      </main>
    </div>
  );
}
