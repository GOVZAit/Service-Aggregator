import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import { Clock, MapPin, CheckCircle2, XCircle, PhoneCall, Mail, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Order, OrderStatus } from "@shared/schema";

type OrderTab = "new" | "active" | "done";

export default function MasterOrdersPage() {
  const [activeTab, setActiveTab] = useState<OrderTab>("new");
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => apiRequest("PATCH", `/api/orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
  });
  const groups = {
    new: orders.filter((order) => order.status === "pending"),
    active: orders.filter((order) => order.status === "in_progress"),
    done: orders.filter((order) => order.status === "completed" || order.status === "rejected"),
  };
  const current = groups[activeTab];
  const tabs: { key: OrderTab; label: string }[] = [{ key: "new", label: "Новые" }, { key: "active", label: "Активные" }, { key: "done", label: "Завершённые" }];

  const contactLink = (value?: string) => value?.includes("@") ? `mailto:${value}` : `tel:${value}`;

  return <div className="min-h-screen bg-background pb-24 lg:pb-28">
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60 safe-area-pt"><div className="max-w-lg lg:max-w-4xl mx-auto px-4 pt-4"><h1 className="text-xl font-bold mb-3">Заказы</h1><div className="flex gap-1 pb-3">{tabs.map(({ key, label }) => <button key={key} onClick={() => setActiveTab(key)} data-testid={`tab-orders-${key}`} className={cn("flex-1 flex justify-center items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium", activeTab === key ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{label}<span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full", activeTab === key ? "bg-white/20" : "bg-background")}>{groups[key].length}</span></button>)}</div></div></header>
    <main className="max-w-lg lg:max-w-4xl mx-auto px-4 py-4">
      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div> : current.length === 0 ? <div className="rounded-2xl border bg-card py-12 text-center"><p className="font-medium">Здесь пока пусто</p><p className="text-sm text-muted-foreground mt-1">Заказы автоматически распределяются по статусам</p></div> : <div className="grid lg:grid-cols-2 gap-3">{current.map((order) => <article key={order.id} className="rounded-2xl bg-card border border-border/60 p-4 space-y-3" data-testid={`master-order-${order.id}`}>
        <div className="flex justify-between gap-3"><div><h2 className="font-semibold">{order.title}</h2><p className="text-xs text-muted-foreground mt-0.5">Клиент: {order.clientName || "Клиент"}</p></div><span className="font-bold whitespace-nowrap">{order.price}</span></div>
        <div className="rounded-xl bg-muted/50 p-3 space-y-1.5 text-sm"><p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{order.date}</p>{order.address && <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-primary mt-0.5" />{order.address}</p>}{order.comment && <p className="flex items-start gap-2 text-muted-foreground"><MessageSquare className="w-4 h-4 mt-0.5" />{order.comment}</p>}</div>
        {order.clientContact && activeTab !== "done" && <a href={contactLink(order.clientContact)} className="flex items-center justify-center gap-2 h-10 rounded-xl border border-primary/30 text-primary text-sm font-semibold">{order.clientContact.includes("@") ? <Mail className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}{order.clientContact}</a>}
        {order.status === "pending" && <div className="flex gap-2"><button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: order.id, status: "rejected" })} className="flex-1 h-10 rounded-xl border text-sm font-semibold text-muted-foreground"><XCircle className="w-4 h-4 inline mr-1" />Отклонить</button><button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: order.id, status: "in_progress" })} className="flex-[2] h-10 rounded-xl bg-primary text-white text-sm font-semibold"><CheckCircle2 className="w-4 h-4 inline mr-1" />Принять</button></div>}
        {order.status === "in_progress" && <button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: order.id, status: "completed" })} className="w-full h-10 rounded-xl bg-green-600 text-white text-sm font-semibold"><CheckCircle2 className="w-4 h-4 inline mr-1" />Завершить заказ</button>}
        {order.status === "completed" && <p className="text-sm text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Заказ выполнен</p>}{order.status === "rejected" && <p className="text-sm text-muted-foreground">Заказ отклонён</p>}
      </article>)}</div>}
      {mutation.isError && <p className="text-sm text-destructive text-center mt-4">Не удалось изменить статус. Обновите страницу и попробуйте ещё раз.</p>}
    </main><MasterBottomNavigation />
  </div>;
}
