import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PlanTrip = lazy(() => import("./pages/PlanTrip"));
const About = lazy(() => import("./pages/About"));
const Guides = lazy(() => import("./pages/Guides"));
const Support = lazy(() => import("./pages/Support"));
const Packages = lazy(() => import("./pages/Packages"));
const MyPlans = lazy(() => import("./pages/MyPlans"));
const TripDetails = lazy(() => import("./pages/TripDetails"));
const SharedTrip = lazy(() => import("./pages/SharedTrip"));
const Favorites = lazy(() => import("./pages/Favorites"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteLoading() {
  return (
    <div className="container mx-auto flex min-h-[55vh] max-w-5xl items-center justify-center px-4 pt-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/plan-trip"} component={PlanTrip} />
      <Route path={"/my-plans"} component={MyPlans} />
      <Route path={"/favorites"} component={Favorites} />
      <Route path={"/trip/:id"} component={TripDetails} />
      <Route path="/guides" component={Guides} />
      <Route path="/about" component={About} />
      <Route path="/support" component={Support} />
      <Route path="/packages" component={Packages} />
      <Route path="/shared/:token" component={SharedTrip} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="light" switchable>
          <TooltipProvider>
            <Toaster />
            <Layout>
              <Suspense fallback={<RouteLoading />}>
                <Router />
              </Suspense>
            </Layout>
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
