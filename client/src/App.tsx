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
import ContactsHubPage from "@/pages/contacts-hub";
import MorePage from "@/pages/more";
import DoctorsPage from "@/pages/doctors";
import LostFoundPage from "@/pages/lost-found";
import AuthPage from "@/pages/auth";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import OrderChatPage from "@/pages/order-chat";
import PreviewWhatsApp from "@/pages/preview-whatsapp";
import NotFound from "@/pages/not-found";

// Master (executor) pages
import MasterDashboardPage from "@/pages/master/dashboard";
import MasterOrdersPage from "@/pages/master/orders";
import MasterProfileEditPage from "@/pages/master/profile";
import MasterOnboardingPage from "@/pages/master/onboarding";
import OrganizationOnboardingPage from "@/pages/organization/onboarding";
import OrganizationProfilePage from "@/pages/organization/profile";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";
import { NetworkStatusBanner } from "@/components/network-status-banner";
import { AppBootScreen } from "@/components/app-boot-screen";

// Executor-only routes (executor interface)
const MASTER_ROUTES = ["/master", "/master/orders", "/master/profile", "/master/onboarding"];
const ORGANIZATION_ROUTES = ["/organization", "/organization/orders", "/organization/profile", "/organization/onboarding"];
const PUBLIC_AUTH_ROUTES = ["/auth", "/forgot-password", "/reset-password"];

function isMasterRoute(path: string) {
  return MASTER_ROUTES.includes(path) || path.startsWith("/master/orders/");
}

function isOrganizationRoute(path: string) {
  return ORGANIZATION_ROUTES.includes(path) || path.startsWith("/organization/orders/");
}

function isProviderRoute(path: string) {
  return isMasterRoute(path) || isOrganizationRoute(path);
}

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    const onMasterRoute = isMasterRoute(location);
    const onOrganizationRoute = isOrganizationRoute(location);
    const onProviderRoute = onMasterRoute || onOrganizationRoute;

    if (!user && onProviderRoute) {
      navigate("/auth");
    } else if (user?.role === "master" && !onMasterRoute && !PUBLIC_AUTH_ROUTES.includes(location)) {
      navigate("/master");
    } else if (user?.role === "organization" && !onOrganizationRoute && !PUBLIC_AUTH_ROUTES.includes(location)) {
      navigate("/organization");
    } else if (user?.role === "client" && onProviderRoute) {
      navigate("/");
    } else if (user?.role === "master" && onOrganizationRoute) {
      navigate("/master");
    } else if (user?.role === "organization" && onMasterRoute) {
      navigate("/organization");
    }
  }, [user, isLoading, location, navigate]);

  if (isLoading || (!user && isProviderRoute(location))) return <AppBootScreen />;
  return <>{children}</>;
}

function Router() {
  return (
    <RoleGuard>
      <Switch>
        {/* Executor (master) routes — declared first so /master/orders and /master/profile
            are matched before the parameterized /master/:id client route */}
        <Route path="/master" component={MasterDashboardPage} />
        <Route path="/master/orders/:id/chat" component={OrderChatPage} />
        <Route path="/master/orders" component={MasterOrdersPage} />
        <Route path="/master/profile" component={MasterProfileEditPage} />
        <Route path="/master/onboarding" component={MasterOnboardingPage} />

        {/* Organization routes */}
        <Route path="/organization" component={MasterDashboardPage} />
        <Route path="/organization/orders/:id/chat" component={OrderChatPage} />
        <Route path="/organization/orders" component={MasterOrdersPage} />
        <Route path="/organization/profile" component={OrganizationProfilePage} />
        <Route path="/organization/onboarding" component={OrganizationOnboardingPage} />

        {/* Client routes */}
        <Route path="/" component={HomePage} />
        <Route path="/master/:id" component={MasterProfilePage} />
        <Route path="/requests" component={RequestsPage} />
        <Route path="/orders/:id/chat" component={OrderChatPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/city" component={CityServicesPage} />
        <Route path="/contacts/services" component={CityServicesPage} />
        <Route path="/contacts/useful" component={ContactsPage} />
        <Route path="/doctors" component={DoctorsPage} />
        <Route path="/contacts" component={ContactsHubPage} />
        <Route path="/more" component={MorePage} />
        <Route path="/lost-found" component={LostFoundPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/preview/whatsapp" component={PreviewWhatsApp} />

        <Route component={NotFound} />
      </Switch>
    </RoleGuard>
  );
}


function RouteEffects() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const title =
      location === "/" ? "GOVZA мастера — мастера рядом" :
      location.startsWith("/doctors") ? "Врачи — GOVZA мастера" :
      location.startsWith("/contacts") || location === "/city" ? "Контакты — GOVZA мастера" :
      location.startsWith("/requests") ? "Мои заявки — GOVZA мастера" :
      location.startsWith("/orders") ? "Мои заказы — GOVZA мастера" :
      location.startsWith("/profile") ? "Профиль — GOVZA мастера" :
      location.startsWith("/master") ? "Кабинет мастера — GOVZA мастера" :
      location.startsWith("/organization") ? "Кабинет организации — GOVZA мастера" :
      location.startsWith("/lost-found") ? "Потеряно / Найдено — GOVZA мастера" :
      "GOVZA мастера";

    document.title = title;
  }, [location]);

  return null;
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
          <RouteEffects />
          <Toaster />
          <Router />
          <PwaInstallPrompt />
          <PwaUpdatePrompt />
          <NetworkStatusBanner />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
