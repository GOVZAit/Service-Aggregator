import {
  ChevronRight, CreditCard, MapPin, Bell, Shield, HelpCircle,
  Moon, Sun, FileText, LogOut, LogIn, UserPlus
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/bottom-navigation";
import { OrderCard } from "@/components/order-card";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import type { Order, Master } from "@shared/schema";

const menuItems = [
  { icon: CreditCard, label: 'Способы оплаты', sublabel: '•••• 4242' },
  { icon: MapPin, label: 'Адреса', sublabel: '2 адреса' },
  { icon: Bell, label: 'Уведомления', sublabel: 'Включены' },
  { icon: Shield, label: 'Безопасность', sublabel: '' },
  { icon: HelpCircle, label: 'Помощь', sublabel: '' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const [isDark, setIsDark] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, logout } = useAuth();

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: masters = [] } = useQuery<Master[]>({
    queryKey: ['/api/masters'],
  });

  const handleLeaveReview = () => {
    toast({ title: "Форма отзыва", description: "Функция отзывов будет добавлена в ближайшее время" });
  };

  const handleLogout = async () => {
    await logout();
    toast({ title: "Вы вышли из аккаунта" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto">
            <Skeleton className="h-8 w-32" />
          </div>
        </header>
        <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // Not logged in — show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4 safe-area-pt">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold">Профиль</h1>
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-toggle-theme">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </header>
        <main className="px-4 py-12 max-w-lg mx-auto flex flex-col items-center text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Войдите в аккаунт</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Чтобы видеть заказы, избранных мастеров и управлять настройками
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              className="h-12 rounded-xl text-base"
              onClick={() => navigate("/auth")}
              data-testid="button-go-login"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Войти
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl text-base"
              onClick={() => navigate("/auth?tab=register")}
              data-testid="button-go-register"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Зарегистрироваться
            </Button>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const initials = getInitials(user.name);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4 safe-area-pt">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Профиль</h1>
          <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-toggle-theme">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* User card */}
        <Card className="p-6 text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-primary to-violet-500">
            <AvatarFallback className="bg-transparent text-white text-3xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold mb-1">{user.name}</h2>
          <p className="text-muted-foreground text-sm mb-6">{user.phone}</p>

          <div className="flex justify-center gap-8 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{orders.length}</p>
              <p className="text-xs text-muted-foreground">заказов</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">4.9</p>
              <p className="text-xs text-muted-foreground">рейтинг</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">3</p>
              <p className="text-xs text-muted-foreground">избранных</p>
            </div>
          </div>
        </Card>

        {/* Orders section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">Мои заказы</h2>
          </div>

          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-10 text-center">
              <p className="text-muted-foreground text-sm">У вас пока нет заказов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  master={masters.find((m) => m.id === order.masterId)}
                  onLeaveReview={handleLeaveReview}
                />
              ))}
            </div>
          )}
        </section>

        {/* Settings menu */}
        <section>
          <div className="space-y-2">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  className="w-full bg-card rounded-xl p-4 flex items-center gap-4 hover-elevate active-elevate-2 text-left"
                  data-testid={`menu-item-${idx}`}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-sm text-muted-foreground">{item.sublabel}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full h-12 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Выйти из аккаунта
        </Button>
      </main>

      <BottomNavigation />
    </div>
  );
}
