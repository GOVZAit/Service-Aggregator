import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import HomePage from "@/pages/home";
import MasterProfilePage from "@/pages/master-profile";
import RequestsPage from "@/pages/requests";
import OrdersPage from "@/pages/orders";
import ProfilePage from "@/pages/profile";
import CityServicesPage from "@/pages/city-services";
import ContactsPage from "@/pages/contacts";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/master/:id" component={MasterProfilePage} />
      <Route path="/requests" component={RequestsPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/city" component={CityServicesPage} />
      <Route path="/contacts" component={ContactsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeInitializer />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
