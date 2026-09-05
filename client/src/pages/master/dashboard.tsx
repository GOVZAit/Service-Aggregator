import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import { ClipboardCheck, Wallet, ChevronRight, Clock, MapPin, ToggleLeft, ToggleRight, Settings, CheckCircle2 } from "lucide-react";
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
  const { data: master } = useQuery<Master>({ queryKey: [`/api/masters/${masterId}`], enabled: !!masterId });
  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"], enabled: !!user });
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
  const initials = user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "МС";
  const stats = [
    { label: "Новых заявок", value: pending.length, icon: ClipboardCheck, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: "Активных", value: active.length, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/40" },
    { label: "Заработано", value: `${earnings.toLocaleString("ru-RU")} ₽`, icon: Wallet, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/40" },
  ];

  return (
    <div className="app-page bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 py-3 safe-area-pt">
        <div className="max-w-lg lg:max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{initials}</div><div><p className="text-xs text-muted-foreground">Добро пожаловать</p><h1 className="font-semibold text-sm">{user?.name || "Мастер"}</h1></div></div>
          <button onClick={() => onlineMutation.mutate(!isOnline)} disabled={onlineMutation.isPending} aria-pressed={isOnline} data-testid="button-online-toggle" className={cn("pressable min-h-[44px] flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border transition-all", isOnline ? "border-green-300 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" : "border-border bg-muted text-muted-foreground")}>
            {isOnline ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}{isOnline ? "Онлайн" : "Офлайн"}
          </button>
        </div>
      </header>
      <main className="max-w-lg lg:max-w-4xl mx-auto px-4 py-4 space-y-6">
        {!isOnline && <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">Вы офлайн. Профиль остаётся доступен, но клиенты видят, что вы сейчас не в сети.</div>}
        <section className="grid grid-cols-3 gap-3">{stats.map(({ label, value, icon: Icon, color, bg }) => <div key={label} className="rounded-2xl bg-card border border-border/60 p-3 flex flex-col gap-2"><div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", bg)}><Icon className={cn("w-4 h-4", color)} /></div><p className="text-base font-bold leading-tight">{isLoading ? "—" : value}</p><p className="text-[10px] text-muted-foreground leading-tight">{label}</p></div>)}</section>
        <section>
          <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Новые заказы</h2><button onClick={() => navigate("/master/orders")} className="text-primary text-sm font-medium flex items-center">Все <ChevronRight className="w-4 h-4" /></button></div>
          {pending.length === 0 ? <div className="rounded-2xl border bg-card py-10 text-center"><p className="text-sm font-medium">Новых заказов пока нет</p><p className="text-xs text-muted-foreground mt-1">Они появятся здесь после записи клиента</p></div> : <div className="space-y-3">{pending.slice(0, 3).map((order) => <button key={order.id} onClick={() => navigate("/master/orders")} className="w-full rounded-2xl bg-card border border-border/60 p-4 text-left" data-testid={`dashboard-order-${order.id}`}><div className="flex justify-between gap-3"><h3 className="font-semibold text-sm">{order.title}</h3><span className="font-bold text-sm">{order.price}</span></div><div className="mt-2 space-y-1 text-xs text-muted-foreground"><p className="flex items-center gap-1"><Clock className="w-3 h-3" />{order.date}</p>{order.address && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{order.address}</p>}</div></button>)}</div>}
        </section>
        <button onClick={() => navigate("/master/profile")} className="w-full rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between text-left"><div><p className="text-sm font-semibold">Управление профилем</p><p className="text-xs text-muted-foreground">Услуги, расписание, документы и видимость</p></div><Settings className="w-5 h-5 text-primary" /></button>
      </main>
      <MasterBottomNavigation />
    </div>
  );
}
