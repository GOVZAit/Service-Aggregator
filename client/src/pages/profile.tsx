import {
  Check, ChevronRight, FileText, HelpCircle, LogIn, LogOut,
  Moon, Pencil, Save, Sun, UserPlus, X, Download, UserRound, Mail,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/bottom-navigation";
import { PushNotificationCard } from "@/components/push-notification-card";
import { AppBrandHeader } from "@/components/app-brand-header";
import { OrderCard } from "@/components/order-card";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import type { Order, Master } from "@shared/schema";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);
}

type CabinetTab = "account" | "orders" | "settings";

export default function ProfilePage() {
  const [isDark, setIsDark] = useState(false);
  const [tab, setTab] = useState<CabinetTab>("account");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
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
        <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
          <Skeleton className="h-24 rounded-[1.5rem]" />
          <Skeleton className="h-48 rounded-[1.5rem]" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-page bg-background">
        <header className="app-header-shell safe-area-pt">
          <div className="mx-auto max-w-4xl px-4 py-4">
            <AppBrandHeader compact />
            <h1 className="-mt-10 pr-28 text-2xl font-bold tracking-tight">Профиль</h1>
          </div>
        </header>
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-14 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary/10 text-primary">
            <UserRound className="h-9 w-9" />
          </div>
          <h2 className="mt-5 text-xl font-extrabold">Войдите в аккаунт</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Сохраняйте заявки, заказы, переписку и настройки в одном месте.
          </p>
          <div className="mt-6 grid w-full max-w-xs gap-3">
            <Button className="accent-gradient h-12 rounded-2xl" onClick={() => navigate("/auth")}>
              <LogIn className="mr-2 h-4 w-4" /> Войти
            </Button>
            <Button variant="outline" className="h-12 rounded-2xl" onClick={() => navigate("/auth?tab=register")}>
              <UserPlus className="mr-2 h-4 w-4" /> Зарегистрироваться
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
      <header className="app-header-shell safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <div className="-mt-10 flex items-end justify-between gap-3 pr-14">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Профиль</h1>
              <p className="mt-1 text-sm text-muted-foreground">Данные и настройки</p>
            </div>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl" onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-3 px-4 py-4">
        <section className="flex items-center gap-3 py-2">
          <Avatar className="h-14 w-14 shrink-0 bg-primary">
            <AvatarFallback className="bg-transparent text-lg font-bold text-white">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{user.name}</h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{contact}</p>
            <p className="mt-1 text-xs font-semibold text-primary">Клиент · {orders.length} заказов</p>
          </div>
          <Button variant="outline" size="sm" className="hidden rounded-xl sm:flex" onClick={() => { setEditingName(true); setTab("account"); }}>
            <Pencil className="mr-1.5 h-4 w-4" /> Редактировать
          </Button>
        </section>

        <div className="grid grid-cols-3 border-b border-border/70">
          {([
            ["account", "Профиль"],
            ["orders", `Заказы${orders.length ? ` (${orders.length})` : ""}`],
            ["settings", "Настройки"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "min-h-11 border-b-2 px-2 text-xs font-semibold transition-colors sm:text-sm",
                tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "account" && (
          <>
            <section className="py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Личные данные</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Данные вашего аккаунта</p>
                </div>
                {!editingName && (
                  <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setEditingName(true)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Изменить
                  </Button>
                )}
              </div>

              {editingName ? (
                <div className="mt-4 space-y-3">
                  <Input
                    className="h-12 rounded-2xl"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    placeholder="Имя"
                  />
                  <div className="flex gap-2">
                    <Button className="rounded-xl" onClick={saveName} disabled={nameDraft.trim().length < 2}>
                      <Save className="mr-1.5 h-4 w-4" /> Сохранить
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => { setNameDraft(user.name); setEditingName(false); }}>
                      <X className="mr-1.5 h-4 w-4" /> Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 divide-y divide-border/70">
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Имя</p>
                      <p className="truncate text-sm font-bold">{user.name}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Телефон или email</p>
                      <p className="truncate text-sm font-bold">{contact}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
            >
              <Check className="h-5 w-5" /> Найти мастера <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {tab === "orders" && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="section-title">Мои заказы</h2>
            </div>
            {ordersLoading ? (
              <Skeleton className="h-32 rounded-[1.5rem]" />
            ) : orders.length === 0 ? (
              <div className="premium-card p-8 text-center">
                <p className="font-bold">Заказов пока нет</p>
                <p className="mt-1 text-sm text-muted-foreground">Выберите мастера и оформите первый заказ.</p>
                <Button className="mt-4 rounded-xl" onClick={() => navigate("/")}>Найти мастера</Button>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} master={masters.find((master) => master.id === order.masterId)} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "settings" && (
          <div className="space-y-3">
            <PushNotificationCard />

            <section className="rounded-xl bg-muted/70 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Download className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">Установить GOVZA мастера</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Быстрый доступ с главного экрана телефона.</p>
                </div>
                <Button size="sm" className="rounded-xl" onClick={() => window.dispatchEvent(new Event("govza:install"))}>
                  Установить
                </Button>
              </div>
            </section>

            <Card className="overflow-hidden rounded-xl border-border/70 shadow-none">
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={toggleTheme}>
                {isDark ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
                <div className="flex-1">
                  <p className="font-bold">Оформление</p>
                  <p className="text-xs text-muted-foreground">{isDark ? "Тёмная тема" : "Светлая тема"}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <a className="flex items-center gap-3 py-3" href="tel:995">
                <HelpCircle className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-bold">Помощь</p>
                  <p className="text-xs text-muted-foreground">Поддержка GOVZA мастера</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
              <button className="flex w-full items-center gap-3 border-t border-border/70 p-4 text-left text-destructive" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="font-bold">Выйти из аккаунта</span>
              </button>
            </Card>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
