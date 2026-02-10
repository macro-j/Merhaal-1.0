import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocation } from "wouter";
import { Home, Calendar, Headset, User, ArrowRight, ArrowLeft, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_LOGO, APP_TITLE } from "@/const";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

const navItems = [
  { icon: Home, labelAr: "الرئيسية", labelEn: "Home", path: "/dashboard" },
  { icon: Calendar, labelAr: "خططي", labelEn: "My Plans", path: "/my-plans" },
  { icon: Headset, labelAr: "الدعم", labelEn: "Support", path: "/support" },
  { icon: User, labelAr: "الحساب", labelEn: "Account", path: "/account" },
];

function isNavActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === "/dashboard") {
    return currentPath === "/" || currentPath === "/dashboard";
  }
  if (itemPath === "/my-plans") {
    return (
      currentPath === "/my-plans" ||
      currentPath.startsWith("/my-plans/") ||
      currentPath.startsWith("/trip/") ||
      currentPath.startsWith("/plan-trip")
    );
  }
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:flex md:w-64 md:flex-col md:border-e border-border bg-background p-4 space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children, title, showBack }: AppShellProps) {
  const { loading, user, logout } = useAuth();
  const { language, isRTL } = useLanguage();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  if (loading) {
    return <AppShellSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <img
              src={APP_LOGO}
              alt={APP_TITLE}
              className="h-20 w-20 rounded-md object-cover shadow"
            />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "يرجى تسجيل الدخول للمتابعة" : "Please sign in to continue"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => { window.location.href = "/login"; }}
            size="lg"
            className="w-full"
            data-testid="button-signin"
          >
            {language === "ar" ? "تسجيل الدخول" : "Sign in"}
          </Button>
        </div>
      </div>
    );
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const activeItem = navItems.find((item) => location === item.path);
  const pageTitle = title || (activeItem ? (language === "ar" ? activeItem.labelAr : activeItem.labelEn) : "");

  if (isMobile) {
    return (
      <div
        className="flex flex-col min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-background"
        dir={isRTL ? "rtl" : "ltr"}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header
          className="sticky top-0 left-0 right-0 z-40 flex h-14 w-full items-center gap-2 border-b bg-background px-4"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <BackArrow className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold truncate flex-1 min-w-0" data-testid="text-page-title">
            {pageTitle}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full" data-testid="button-user-menu">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="text-xs font-medium">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
              {user.role === "admin" && (
                <DropdownMenuItem
                  onClick={() => setLocation("/admin")}
                  className="cursor-pointer"
                  data-testid="link-admin"
                >
                  <Settings className="me-2 h-4 w-4" />
                  <span>{language === "ar" ? "لوحة الإدارة" : "Admin"}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
                data-testid="button-logout"
              >
                <LogOut className="me-2 h-4 w-4" />
                <span>{language === "ar" ? "تسجيل الخروج" : "Sign out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-4 min-w-0">
          {children}
        </main>

        <nav
          className="sticky bottom-0 left-0 right-0 z-40 w-full border-t bg-background"
          data-testid="nav-bottom"
        >
          <div className="flex items-center justify-around h-14">
            {navItems.map((item) => {
              const active = isNavActive(item.path, location);
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`relative flex flex-col items-center justify-center gap-1 flex-1 h-full ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                  data-testid={`nav-item-${item.path.replace("/", "")}`}
                >
                  {active && (
                    <span className="absolute top-0 inset-x-0 mx-auto w-8 h-0.5 rounded-full bg-primary" />
                  )}
                  <item.icon className="w-6 h-6" strokeWidth={active ? 2 : 1.5} />
                  <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                    {language === "ar" ? item.labelAr : item.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <aside className="sticky top-0 h-screen w-64 flex flex-col border-e border-border bg-card/50 z-30 shrink-0">
        <div className="flex items-center gap-3 h-14 px-4 border-b border-border">
          <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8 rounded-md object-cover" />
          <span className="font-semibold text-sm truncate">{APP_TITLE}</span>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto" data-testid="nav-sidebar">
          {navItems.map((item) => {
            const active = isNavActive(item.path, location);
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex items-center gap-3 w-full rounded-md px-3 h-10 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover-elevate"
                }`}
                data-testid={`nav-item-${item.path.replace("/", "")}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{language === "ar" ? item.labelAr : item.labelEn}</span>
              </button>
            );
          })}
          {user.role === "admin" && (
            <button
              onClick={() => setLocation("/admin")}
              className={`flex items-center gap-3 w-full rounded-md px-3 h-10 text-sm transition-colors ${
                location.startsWith("/admin")
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover-elevate"
              }`}
              data-testid="nav-item-admin"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>{language === "ar" ? "الإدارة" : "Admin"}</span>
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 w-full rounded-md px-2 py-2 hover-elevate transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="button-user-menu"
              >
                <Avatar className="h-8 w-8 border shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-sm font-medium truncate leading-none">{user.name || "-"}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">{user.email || "-"}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
                data-testid="button-logout"
              >
                <LogOut className="me-2 h-4 w-4" />
                <span>{language === "ar" ? "تسجيل الخروج" : "Sign out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-6">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <BackArrow className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold truncate" data-testid="text-page-title">
            {pageTitle}
          </h1>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
