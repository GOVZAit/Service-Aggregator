import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import OrganizationBottomNavigation from "@/components/organization-bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";
import {
  CheckCircle2, ChevronRight, ClipboardCheck, Clock, MapPin, Settings,
  ToggleLeft, ToggleRight, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Master, Order } from "@shared/schema";

function priceNumber(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

export default function MasterDashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const masterId = user?.masterId;
  const isOrganization = user?.role === "organization";
  const ordersPath = isOrganization ? "/organization/orders" : "/master/orders";
  const profilePath = isOrganization ? "/organization/profile" : "/master/profile";

  const { data: master } = useQuery<Master>({
    queryKey: [`/api/masters/${masterId}`],
    enabled: !!masterId,
  });
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const onlineMutation = useMutation({
    mutationFn: (isOnline: boolean) => apiRequest("PATCH", `/api/masters/${masterId}`, { isOnline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/masters/${masterId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/masters"] });
    },
  });

  const pending = orders.filter((order) => order.status === "pending");
  const active = orders.filter((order) => order.status === "in_progress");
  const completed = orders.filter((order) => order.status === "completed");
  const earnings = completed.reduce((sum, order) => sum + priceNumber(order.price), 0);
  const isOnline = master?.isOnline ?? false;

  const stats = [
    { label: "Новых заказов", value: pending.length, icon: ClipboardCheck, tone: "bg-blue-500/10 text-blue-600" },
    { label: "Активных", value: active.length, icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-600" },
    { label: "Заработано", value: `${earnings.toLocaleString("ru-RU")} ₽`, icon: Wallet, tone: "bg-orange-500/10 text-orange-600" },
  ];

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {isOrganization ? "Кабинет организации" : "Кабинет мастера"}
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em]">
                {user?.name || (isOrganization ? "Организация" : "Мастер")}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => onlineMutation.mutate(!isOnline)}
              disabled={onlineMutation.isPending}
              aria-pressed={isOnline}
              className={cn(
                "pressable flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-bold shadow-sm",
                isOnline
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-border/70 bg-card text-muted-foreground"
              )}
            >
              {isOnline ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              {isOnline ? "Онлайн" : "Офлайн"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5">
        {!isOnline && (
          <div className="rounded-[1.4rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Вы сейчас офлайн</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-700/80 dark:text-amber-300/80">
              Профиль остаётся доступен, но клиенты видят, что вы не в сети.
            </p>
          </div>
        )}

        <section className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="premium-card min-h-[126px] p-3.5">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-2xl", tone)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-lg font-extrabold leading-tight tracking-[-0.03em]">{isLoading ? "—" : value}</p>
              <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Новые заказы</h2>
              <p className="mt-1 text-xs text-muted-foreground">Заявки клиентов, которые ждут решения</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(ordersPath)}
              className="flex min-h-11 items-center gap-1 text-sm font-bold text-primary"
            >
              Все <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {pending.length === 0 ? (
            <div className="premium-card py-12 text-center">
              <ClipboardCheck className="mx-auto h-8 w-8 text-primary/60" />
              <p className="mt-3 text-sm font-bold">Новых заказов пока нет</p>
              <p className="mt-1 text-xs text-muted-foreground">Они появятся здесь после выбора вашего предложения.</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {pending.slice(0, 4).map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => navigate(ordersPath)}
                  className="premium-card pressable w-full p-4 text-left"
                  data-testid={`dashboard-order-${order.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold">{order.title}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-primary" /> {order.date}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-primary">{order.price}</span>
                  </div>
                  {order.address && (
                    <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-muted/55 p-2.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {order.address}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => navigate(profilePath)}
          className="hero-gradient flex w-full items-center justify-between gap-4 rounded-[1.5rem] border border-primary/15 p-4 text-left shadow-sm"
        >
          <div>
            <p className="text-sm font-extrabold">Управление профилем</p>
            <p className="mt-1 text-xs text-muted-foreground">Услуги, расписание, документы, уведомления и видимость</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
        </button>
      </main>

      {isOrganization ? <OrganizationBottomNavigation /> : <MasterBottomNavigation />}
    </div>
  );
}
