import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PlanTrip from "./pages/PlanTrip";
import About from "./pages/About";
import Guides from "./pages/Guides";
import Support from "./pages/Support";
import Packages from "./pages/Packages";
import MyPlans from "./pages/MyPlans";
import TripDetails from "./pages/TripDetails";
import SharedTrip from "./pages/SharedTrip";
import Favorites from "./pages/Favorites";

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
              <Router />
            </Layout>
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
