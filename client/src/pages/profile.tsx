import {
  Bell, Check, ChevronRight, FileText, HelpCircle, LogIn, LogOut,
  Moon, Pencil, Save, Sun, UserPlus, X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/bottom-navigation";
import { OrderCard } from "@/components/order-card";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import type { Order, Master } from "@shared/schema";

function getInitials(name: string) {
  return name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);
}

type CabinetTab = "account" | "orders" | "settings";

export default function ProfilePage() {
  const [isDark, setIsDark] = useState(false);
  const [tab, setTab] = useState<CabinetTab>("account");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("client-notifications") !== "off",
  );
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, logout, updateProfile } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (user) setNameDraft(user.name);
  }, [user]);

  const toggleTheme = () => {
    const dark = !isDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  };

  const setNotificationPreference = (enabled: boolean) => {
    setNotifications(enabled);
    localStorage.setItem("client-notifications", enabled ? "on" : "off");
    toast({ title: enabled ? "Уведомления включены" : "Уведомления выключены" });
  };

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });
  const { data: masters = [] } = useQuery<Master[]>({ queryKey: ["/api/masters"] });

  const saveName = async () => {
    try {
      await updateProfile(nameDraft.trim());
      setEditingName(false);
      toast({ title: "Профиль сохранён" });
    } catch (error: any) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logout();
    queryClient.removeQueries({ queryKey: ["/api/orders"] });
    toast({ title: "Вы вышли из аккаунта" });
    navigate("/");
  };

  if (authLoading) {
    return (
       <div className="app-page bg-background">
        <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!user) {
    return (
       <div className="app-page bg-background">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4 safe-area-pt">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold">Кабинет клиента</h1>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </header>
        <main className="px-4 py-12 max-w-lg mx-auto flex flex-col items-center text-center gap-6">
          <Avatar className="w-24 h-24 bg-muted"><AvatarFallback className="text-3xl">GM</AvatarFallback></Avatar>
          <div>
            <h2 className="text-xl font-bold mb-2">Войдите в аккаунт</h2>
            <p className="text-muted-foreground text-sm">Регистрация доступна по номеру телефона или email</p>
          </div>
          <div className="grid gap-3 w-full max-w-xs">
            <Button className="h-12 rounded-xl" onClick={() => navigate("/auth")} data-testid="button-go-login">
              <LogIn className="w-4 h-4 mr-2" /> Войти
            </Button>
            <Button variant="outline" className="h-12 rounded-xl" onClick={() => navigate("/auth?tab=register")} data-testid="button-go-register">
              <UserPlus className="w-4 h-4 mr-2" /> Зарегистрироваться
            </Button>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const contact = user.email ?? user.phone ?? "Контакт не указан";

  return (
    <div className="app-page bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4 safe-area-pt">
        <div className="max-w-lg lg:max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Кабинет клиента</h1>
            <p className="text-xs text-muted-foreground">Ваши данные и заказы</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-toggle-theme">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg lg:max-w-4xl mx-auto space-y-4">
        <Card className="p-5 flex items-center gap-4">
          <Avatar className="w-16 h-16 bg-primary shrink-0">
            <AvatarFallback className="bg-transparent text-white text-xl font-semibold">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate">{user.name}</h2>
            <p className="text-sm text-muted-foreground truncate">{contact}</p>
            <p className="text-xs text-primary mt-1">Клиент · {orders.length} заказов</p>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-1 bg-muted rounded-2xl p-1" role="tablist">
          {([
            ["account", "Профиль"],
            ["orders", `Заказы${orders.length ? ` (${orders.length})` : ""}`],
            ["settings", "Настройки"],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} role="tab" aria-selected={tab === key}
              data-testid={`cabinet-tab-${key}`}
              className={`rounded-xl py-2.5 text-xs font-semibold transition-all ${tab === key ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "account" && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="font-semibold">Личные данные</h2><p className="text-xs text-muted-foreground">Данные вашего аккаунта</p></div>
              {!editingName && <Button variant="ghost" size="sm" onClick={() => setEditingName(true)} data-testid="button-edit-profile"><Pencil className="w-4 h-4 mr-1.5" />Изменить</Button>}
            </div>
            {editingName ? (
              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground">Имя</label>
                 <Input className="h-12 rounded-xl" autoComplete="name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} data-testid="input-profile-name" />
                <div className="flex gap-2">
                  <Button onClick={saveName} disabled={nameDraft.trim().length < 2} data-testid="button-save-profile"><Save className="w-4 h-4 mr-1.5" />Сохранить</Button>
                  <Button variant="outline" onClick={() => { setNameDraft(user.name); setEditingName(false); }}><X className="w-4 h-4 mr-1.5" />Отмена</Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border">
                <div className="p-3"><p className="text-xs text-muted-foreground">Имя</p><p className="text-sm font-medium">{user.name}</p></div>
                <div className="p-3"><p className="text-xs text-muted-foreground">Телефон или email</p><p className="text-sm font-medium">{contact}</p></div>
              </div>
            )}
            <Button className="w-full rounded-xl" onClick={() => navigate("/")}><Check className="w-4 h-4 mr-2" />Найти мастера</Button>
          </Card>
        )}

        {tab === "orders" && (
          <section>
            <div className="flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-primary" /><h2 className="font-semibold">Мои заказы</h2></div>
            {ordersLoading ? <Skeleton className="h-32 rounded-xl" /> : orders.length === 0 ? (
              <Card className="p-8 text-center"><p className="font-medium">Заказов пока нет</p><p className="text-sm text-muted-foreground mt-1 mb-4">Выберите мастера и оформите первый заказ</p><Button onClick={() => navigate("/")}>Найти мастера</Button></Card>
            ) : <div className="grid lg:grid-cols-2 gap-3">{orders.map((order) => <OrderCard key={order.id} order={order} master={masters.find((m) => m.id === order.masterId)} />)}</div>}
          </section>
        )}

        {tab === "settings" && (
          <Card className="overflow-hidden divide-y divide-border">
            <button className="w-full p-4 flex items-center gap-3 text-left" onClick={() => setNotificationPreference(!notifications)} data-testid="toggle-client-notifications">
              <Bell className="w-5 h-5 text-primary" /><div className="flex-1"><p className="font-medium">Уведомления</p><p className="text-xs text-muted-foreground">{notifications ? "Включены на этом устройстве" : "Выключены на этом устройстве"}</p></div>
              <div className={`w-11 h-6 rounded-full p-1 transition-colors ${notifications ? "bg-primary" : "bg-muted"}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifications ? "translate-x-5" : ""}`} /></div>
            </button>
            <button className="w-full p-4 flex items-center gap-3 text-left" onClick={toggleTheme}>
              {isDark ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}<div className="flex-1"><p className="font-medium">Оформление</p><p className="text-xs text-muted-foreground">{isDark ? "Тёмная тема" : "Светлая тема"}</p></div><ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <a className="p-4 flex items-center gap-3" href="tel:995"><HelpCircle className="w-5 h-5 text-primary" /><div className="flex-1"><p className="font-medium">Помощь</p><p className="text-xs text-muted-foreground">Поддержка GOVZAmastera</p></div><ChevronRight className="w-5 h-5 text-muted-foreground" /></a>
            <button className="w-full p-4 flex items-center gap-3 text-left text-destructive" onClick={handleLogout} data-testid="button-logout"><LogOut className="w-5 h-5" /><span className="font-medium">Выйти из аккаунта</span></button>
          </Card>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
