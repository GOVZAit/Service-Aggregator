import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import {
  CheckCircle2,
  Clock,
  Inbox,
  Mail,
  MapPin,
  MessageSquare,
  PhoneCall,
  Send,
  Tag,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order, OrderStatus } from "@shared/schema";
import type { ServiceRequestView } from "@shared/request-schema";

type OrderTab = "new" | "active" | "done";
type Section = "market" | "orders";

function RequestOpportunityCard({ request }: { request: ServiceRequestView }) {
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const responseMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/requests/${request.id}/responses`, {
      price: price.trim(),
      message: message.trim(),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setShowForm(false);
      toast({
        title: "Отклик отправлен",
        description: "Клиент увидит вашу цену и комментарий в своей заявке.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Не удалось отправить отклик",
        description: error.message.includes("409")
          ? "Вы уже откликались на эту заявку или она уже закрыта."
          : "Проверьте данные и попробуйте ещё раз.",
        variant: "destructive",
      });
    },
  });

  const canSubmit = price.trim().length > 0 && message.trim().length >= 3;

  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm" data-testid={`master-request-${request.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{request.category}</span>
            <span className="text-[11px] text-muted-foreground">{request.postedAt}</span>
          </div>
          <h2 className="font-semibold leading-snug">{request.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Клиент: {request.user.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          {request.responses} откл.
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{request.description}</p>

      <div className="mt-3 grid gap-2 rounded-xl bg-muted/45 p-3 text-xs text-muted-foreground sm:grid-cols-2">
        <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-primary" />Бюджет: {request.budget}</span>
        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" />{request.location}</span>
      </div>

      {request.hasResponded ? (
        <div className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-500/10 px-3 text-sm font-semibold text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" /> Отклик уже отправлен
        </div>
      ) : !showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-white"
        >
          <Send className="mr-2 inline h-4 w-4" /> Предложить цену
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Ваша цена</label>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Например, 2 500 ₽"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              data-testid={`response-price-${request.id}`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Комментарий клиенту</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Когда сможете приехать, что входит в цену, есть ли гарантия…"
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              data-testid={`response-message-${request.id}`}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-11 flex-1 rounded-xl border border-border px-3 text-sm font-semibold"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={!canSubmit || responseMutation.isPending}
              onClick={() => responseMutation.mutate()}
              className="min-h-11 flex-[2] rounded-xl bg-primary px-3 text-sm font-semibold text-white disabled:opacity-40"
              data-testid={`response-submit-${request.id}`}
            >
              {responseMutation.isPending ? "Отправляем…" : "Отправить отклик"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function MasterOrdersPage() {
  const [section, setSection] = useState<Section>("market");
  const [activeTab, setActiveTab] = useState<OrderTab>("new");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading: requestsLoading, isError: requestsError } = useQuery<ServiceRequestView[]>({
    queryKey: ["/api/requests"],
  });
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });

  const orderMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => apiRequest("PATCH", `/api/orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
  });

  const groups = {
    new: orders.filter((order) => order.status === "pending"),
    active: orders.filter((order) => order.status === "in_progress"),
    done: orders.filter((order) => order.status === "completed" || order.status === "rejected"),
  };
  const current = groups[activeTab];
  const tabs: { key: OrderTab; label: string }[] = [
    { key: "new", label: "Новые" },
    { key: "active", label: "Активные" },
    { key: "done", label: "Завершённые" },
  ];

  const contactLink = (value?: string) => value?.includes("@") ? `mailto:${value}` : `tel:${value}`;

  return (
    <div className="app-page bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 safe-area-pt backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-4xl">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Кабинет исполнителя</p>
              <h1 className="text-xl font-bold">Заявки</h1>
            </div>
            <span className="text-xs text-muted-foreground">{requests.length} доступно</span>
          </div>

          <div className="mb-3 grid grid-cols-2 rounded-2xl bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setSection("market")}
              className={cn("min-h-11 rounded-xl text-sm font-semibold transition-all", section === "market" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
            >
              Биржа заявок
            </button>
            <button
              type="button"
              onClick={() => setSection("orders")}
              className={cn("min-h-11 rounded-xl text-sm font-semibold transition-all", section === "orders" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
            >
              Мои заказы
            </button>
          </div>

          {section === "orders" && (
            <div className="flex gap-1 pb-3">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  data-testid={`tab-orders-${key}`}
                  className={cn(
                    "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium",
                    activeTab === key ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {label}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-bold", activeTab === key ? "bg-white/20" : "bg-background")}>
                    {groups[key].length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4 lg:max-w-4xl">
        {section === "market" ? (
          requestsLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div>
          ) : requestsError ? (
            <div className="rounded-2xl border bg-card py-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Не удалось загрузить заявки</p>
              <p className="mt-1 text-sm text-muted-foreground">Обновите страницу и попробуйте ещё раз</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border bg-card py-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Новых заявок вашей категории пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">Когда клиент разместит подходящую задачу, она появится здесь</p>
            </div>
          ) : (
            <div className="grid items-start gap-3 lg:grid-cols-2">
              {requests.map((request) => <RequestOpportunityCard key={request.id} request={request} />)}
            </div>
          )
        ) : ordersLoading ? (
          <div className="space-y-3 py-2">{[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : current.length === 0 ? (
          <div className="rounded-2xl border bg-card py-12 text-center">
            <p className="font-medium">Здесь пока пусто</p>
            <p className="mt-1 text-sm text-muted-foreground">После выбора вашего отклика заказ появится в разделе «Новые»</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {current.map((order) => (
              <article key={order.id} className="space-y-3 rounded-2xl border border-border/60 bg-card p-4" data-testid={`master-order-${order.id}`}>
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{order.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Клиент: {order.clientName || "Клиент"}</p>
                  </div>
                  <span className="whitespace-nowrap font-bold">{order.price}</span>
                </div>

                <div className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-sm">
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{order.date}</p>
                  {order.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" />{order.address}</p>}
                  {order.comment && <p className="flex items-start gap-2 text-muted-foreground"><MessageSquare className="mt-0.5 h-4 w-4" />{order.comment}</p>}
                </div>

                {order.clientContact && activeTab !== "done" && (
                  <a href={contactLink(order.clientContact)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/30 text-sm font-semibold text-primary">
                    {order.clientContact.includes("@") ? <Mail className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
                    {order.clientContact}
                  </a>
                )}

                {order.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => navigate(`/master/orders/${order.id}/chat`)}
                    className="h-11 w-full rounded-xl border border-primary/30 text-sm font-semibold text-primary"
                    data-testid={`master-order-chat-${order.id}`}
                  >
                    <MessageSquare className="mr-1.5 inline h-4 w-4" />Написать клиенту
                  </button>
                )}

                {order.status === "pending" && (
                  <div className="flex gap-2">
                    <button disabled={orderMutation.isPending} onClick={() => orderMutation.mutate({ id: order.id, status: "rejected" })} className="h-11 flex-1 rounded-xl border text-sm font-semibold text-muted-foreground">
                      <XCircle className="mr-1 inline h-4 w-4" />Отклонить
                    </button>
                    <button disabled={orderMutation.isPending} onClick={() => orderMutation.mutate({ id: order.id, status: "in_progress" })} className="h-11 flex-[2] rounded-xl bg-primary text-sm font-semibold text-white">
                      <CheckCircle2 className="mr-1 inline h-4 w-4" />Принять
                    </button>
                  </div>
                )}
                {order.status === "in_progress" && (
                  <button disabled={orderMutation.isPending} onClick={() => orderMutation.mutate({ id: order.id, status: "completed" })} className="h-11 w-full rounded-xl bg-green-600 text-sm font-semibold text-white">
                    <CheckCircle2 className="mr-1 inline h-4 w-4" />Завершить заказ
                  </button>
                )}
                {order.status === "completed" && <p className="flex items-center gap-1 text-sm font-medium text-green-600"><CheckCircle2 className="h-4 w-4" />Заказ выполнен</p>}
                {order.status === "rejected" && <p className="text-sm text-muted-foreground">Заказ отклонён</p>}
              </article>
            ))}
          </div>
        )}

        {orderMutation.isError && <p className="mt-4 text-center text-sm text-destructive">Не удалось изменить статус. Обновите страницу и попробуйте ещё раз.</p>}
      </main>

      <MasterBottomNavigation />
    </div>
  );
}
