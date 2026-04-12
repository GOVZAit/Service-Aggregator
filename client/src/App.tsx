import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

// Client pages
import HomePage from "@/pages/home";
import MasterProfilePage from "@/pages/master-profile";
import RequestsPage from "@/pages/requests";
import OrdersPage from "@/pages/orders";
import ProfilePage from "@/pages/profile";
import CityServicesPage from "@/pages/city-services";
import ContactsPage from "@/pages/contacts";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

// Master (executor) pages
import MasterDashboardPage from "@/pages/master/dashboard";
import MasterOrdersPage from "@/pages/master/orders";
import MasterProfileEditPage from "@/pages/master/profile";

// Executor-only routes (executor interface)
const EXECUTOR_ROUTES = ["/master", "/master/orders", "/master/profile"];

function isExecutorRoute(path: string) {
  return EXECUTOR_ROUTES.includes(path);
}

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    const onExecutorRoute = isExecutorRoute(location);

    if (user?.role === "master" && !onExecutorRoute && location !== "/auth") {
      // Executor landed on a client page → go to executor dashboard
      navigate("/master");
    } else if (user?.role === "client" && onExecutorRoute) {
      // Client somehow landed on executor route → go to client home
      navigate("/");
    }
  }, [user, isLoading, location, navigate]);

  return <>{children}</>;
}

function Router() {
  return (
    <RoleGuard>
      <Switch>
        {/* Executor (master) routes — declared first so /master/orders and /master/profile
            are matched before the parameterized /master/:id client route */}
        <Route path="/master" component={MasterDashboardPage} />
        <Route path="/master/orders" component={MasterOrdersPage} />
        <Route path="/master/profile" component={MasterProfileEditPage} />

        {/* Client routes */}
        <Route path="/" component={HomePage} />
        <Route path="/master/:id" component={MasterProfilePage} />
        <Route path="/requests" component={RequestsPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/city" component={CityServicesPage} />
        <Route path="/contacts" component={ContactsPage} />
        <Route path="/auth" component={AuthPage} />

        <Route component={NotFound} />
      </Switch>
    </RoleGuard>
  );
}

function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ThemeInitializer />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
