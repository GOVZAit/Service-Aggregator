import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import OrganizationBottomNavigation from "@/components/organization-bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";
import {
  CheckCircle2,
  Clock,
  Inbox,
  Mail,
  MapPin,
  MapPinned,
  MessageSquare,
  Navigation,
  PhoneCall,
  Send,
  Tag,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { Order, OrderStatus } from "@shared/schema";
import type { ServiceRequestView } from "@shared/request-schema";
import type { OrderReviewView } from "@shared/order-review-schema";
import type { InvitationView } from "@shared/provider-engagement-schema";

type OrderTab = "new" | "active" | "done";
type Section = "market" | "orders";

function RequestOpportunityCard({ request, invitation }: { request: ServiceRequestView; invitation?: InvitationView }) {
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const responseMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/requests/${request.id}/responses`, {
      price: price.trim(),
      message: message.trim(),
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/requests"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/provider-invitations"] }),
      ]);
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

  const declineMutation = useMutation({
    mutationFn: () => {
      if (!invitation) throw new Error("Приглашение не найдено");
      return apiRequest("POST", `/api/provider-invitations/${invitation.id}/decline`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/provider-invitations"] });
      toast({ title: "Приглашение отклонено" });
    },
    onError: (error: Error) => {
      toast({ title: "Не удалось отклонить приглашение", description: error.message, variant: "destructive" });
    },
  });

  return (
    <article className="premium-card p-4" data-testid={`master-request-${request.id}`}>
      {invitation && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[.06] px-3 py-2.5">
          <div>
            <p className="text-xs font-extrabold text-primary">Персональное приглашение</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Клиент выбрал ваш профиль и предлагает посмотреть эту заявку.</p>
          </div>
          <button
            type="button"
            disabled={declineMutation.isPending}
            onClick={() => declineMutation.mutate()}
            className="min-h-9 shrink-0 rounded-xl border border-border bg-background px-3 text-xs font-bold text-muted-foreground"
          >
            Отклонить
          </button>
        </div>
      )}
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

      <div className="mt-3 grid gap-2 rounded-2xl bg-muted/55 p-3 text-xs text-muted-foreground sm:grid-cols-2">
        <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-primary" />Бюджет: {request.budget}</span>
        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" />{request.location}</span>
      </div>

      {request.hasResponded ? (
        <div className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-500/10 px-3 text-sm font-bold text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" /> Отклик уже отправлен
        </div>
      ) : !showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-bold text-white"
        >
          <Send className="mr-2 inline h-4 w-4" /> Предложить цену
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.03] p-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Ваша цена</label>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Например, 2 500 ₽"
              className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
              className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              data-testid={`response-message-${request.id}`}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-11 flex-1 rounded-2xl border border-border px-3 text-sm font-bold"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={!canSubmit || responseMutation.isPending}
              onClick={() => responseMutation.mutate()}
              className="min-h-11 flex-[2] rounded-2xl bg-primary px-3 text-sm font-bold text-white disabled:opacity-40"
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

function TravelControls({ order }: { order: Order }) {
  const [liveUrl, setLiveUrl] = useState(order.liveLocationUrl ?? "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (payload: { status: "idle" | "en_route" | "arrived"; liveLocationUrl?: string }) =>
      apiRequest("PATCH", `/api/orders/${order.id}/travel`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Не удалось изменить статус поездки",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const travelStatus = order.travelStatus ?? "idle";

  if (travelStatus === "en_route") {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/[.05] p-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-primary">
          <Navigation className="h-4 w-4" />
          Геопозиция передаётся клиенту
        </div>
        {order.liveLocationUrl && (
          <a
            href={order.liveLocationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-background text-xs font-bold text-primary"
          >
            <MapPinned className="h-4 w-4" />
            Открыть live-карту
          </a>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ status: "idle" })}
            className="min-h-11 rounded-xl border border-border text-xs font-bold text-muted-foreground"
          >
            Остановить
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ status: "arrived" })}
            className="min-h-11 rounded-xl bg-emerald-600 text-xs font-bold text-white"
          >
            Прибыл к клиенту
          </button>
        </div>
      </div>
    );
  }

  if (travelStatus === "arrived") {
    return (
      <div className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        Прибыл к клиенту
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 p-3">
      <p className="text-xs font-extrabold">Мастер в пути</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Вставьте live-ссылку геопозиции из Google Maps или Яндекс Карт. GOVZA хранит только ссылку, а не маршрут.
      </p>
      <input
        value={liveUrl}
        onChange={(event) => setLiveUrl(event.target.value)}
        placeholder="https://maps.app.goo.gl/…"
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
      />
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate({
          status: "en_route",
          ...(liveUrl.trim() ? { liveLocationUrl: liveUrl.trim() } : {}),
        })}
        className="mt-2 min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-white disabled:opacity-50"
      >
        <Navigation className="mr-1.5 inline h-4 w-4" />
        Выехал к клиенту
      </button>
    </div>
  );
}

function ReviewReplyPanel({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const { data: review, isLoading } = useQuery<OrderReviewView | null>({
    queryKey: ["/api/orders", orderId, "review"],
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!review) throw new Error("Отзыв не найден");
      const response = await apiRequest("PATCH", `/api/reviews/${review.id}/reply`, { text: draft.trim() });
      return response.json() as Promise<OrderReviewView>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/orders", orderId, "review"], updated);
      void queryClient.invalidateQueries({ queryKey: [`/api/masters/${updated.masterId}/reviews`] });
      setEditing(false);
      setDraft("");
      toast({ title: "Ответ опубликован" });
    },
    onError: () => {
      toast({ title: "Не удалось сохранить ответ", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded-2xl bg-muted/60" />;
  }

  if (!review) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
        Клиент пока не оставил отзыв по этому заказу.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold">Отзыв клиента · {review.rating}/5</p>
        <span className="text-[10px] text-muted-foreground">Проверенный заказ</span>
      </div>
      {review.comment && <p className="mt-2 text-sm leading-relaxed">«{review.comment}»</p>}

      {review.providerReply && !editing ? (
        <div className="mt-3 rounded-xl bg-background p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Ваш ответ</p>
          <p className="mt-1 text-sm leading-relaxed">{review.providerReply}</p>
          <button
            type="button"
            onClick={() => {
              setDraft(review.providerReply ?? "");
              setEditing(true);
            }}
            className="mt-2 text-xs font-bold text-primary"
          >
            Изменить ответ
          </button>
        </div>
      ) : editing || !review.providerReply ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Поблагодарите клиента или поясните детали работы…"
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex gap-2">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft("");
                }}
                className="h-10 flex-1 rounded-xl border border-border text-xs font-bold"
              >
                Отмена
              </button>
            )}
            <button
              type="button"
              disabled={draft.trim().length < 2 || replyMutation.isPending}
              onClick={() => replyMutation.mutate()}
              className="h-10 flex-[2] rounded-xl bg-primary px-3 text-xs font-bold text-white disabled:opacity-40"
            >
              {replyMutation.isPending ? "Сохраняем…" : review.providerReply ? "Сохранить ответ" : "Ответить на отзыв"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MasterOrdersPage() {
  const [section, setSection] = useState<Section>("market");
  const [activeTab, setActiveTab] = useState<OrderTab>("new");
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isOrganization = user?.role === "organization";

  const { data: requests = [], isLoading: requestsLoading, isError: requestsError } = useQuery<ServiceRequestView[]>({
    queryKey: ["/api/requests"],
  });
  const { data: invitations = [] } = useQuery<InvitationView[]>({
    queryKey: ["/api/provider-invitations"],
  });
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });

  const orderMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => apiRequest("PATCH", `/api/orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
  });

  const pendingInvitationByRequest = new Map(
    invitations.filter((invitation) => invitation.status === "pending").map((invitation) => [invitation.requestId, invitation]),
  );
  const sortedRequests = [...requests].sort((left, right) => {
    const leftInvited = pendingInvitationByRequest.has(left.id) ? 1 : 0;
    const rightInvited = pendingInvitationByRequest.has(right.id) ? 1 : 0;
    return rightInvited - leftInvited;
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
      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="mx-auto max-w-lg px-4 pt-3 lg:max-w-4xl">
          <AppBrandHeader compact />
          <div className="mb-4 mt-6 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{isOrganization ? "Кабинет организации" : "Кабинет мастера"}</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em]">Заявки</h1>
            </div>
            <span className="rounded-full bg-primary/[0.08] px-3 py-1.5 text-xs font-bold text-primary">{requests.length} доступно</span>
          </div>

          <div className="mb-3 grid grid-cols-2 rounded-[1.25rem] bg-muted/70 p-1">
            <button
              type="button"
              onClick={() => setSection("market")}
              className={cn("min-h-11 rounded-2xl text-sm font-bold transition-all", section === "market" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
            >
              Биржа заявок
            </button>
            <button
              type="button"
              onClick={() => setSection("orders")}
              className={cn("min-h-11 rounded-2xl text-sm font-bold transition-all", section === "orders" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
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
                    activeTab === key ? "bg-primary text-white shadow-sm" : "bg-muted/70 text-muted-foreground",
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
            <div className="premium-card py-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Не удалось загрузить заявки</p>
              <p className="mt-1 text-sm text-muted-foreground">Обновите страницу и попробуйте ещё раз</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="premium-card py-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Новых заявок вашей категории пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">Когда клиент разместит подходящую задачу, она появится здесь</p>
            </div>
          ) : (
            <div className="grid items-start gap-3 lg:grid-cols-2">
              {sortedRequests.map((request) => <RequestOpportunityCard key={request.id} request={request} invitation={pendingInvitationByRequest.get(request.id)} />)}
            </div>
          )
        ) : ordersLoading ? (
          <div className="space-y-3 py-2">{[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : current.length === 0 ? (
          <div className="premium-card py-12 text-center">
            <p className="font-medium">Здесь пока пусто</p>
            <p className="mt-1 text-sm text-muted-foreground">После выбора вашего отклика заказ появится в разделе «Новые»</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {current.map((order) => (
              <article key={order.id} className="space-y-3 premium-card p-4" data-testid={`master-order-${order.id}`}>
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{order.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Клиент: {order.clientName || "Клиент"}</p>
                  </div>
                  <span className="whitespace-nowrap font-bold">{order.price}</span>
                </div>

                <div className="space-y-1.5 rounded-2xl bg-muted/55 p-3 text-sm">
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{order.date}</p>
                  {order.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" />{order.address}</p>}
                  {order.comment && <p className="flex items-start gap-2 text-muted-foreground"><MessageSquare className="mt-0.5 h-4 w-4" />{order.comment}</p>}
                </div>

                {order.clientContact && activeTab !== "done" && (
                  <a href={contactLink(order.clientContact)} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary/25 text-sm font-bold text-primary">
                    {order.clientContact.includes("@") ? <Mail className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
                    {order.clientContact}
                  </a>
                )}

                {order.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => navigate(`${isOrganization ? "/organization/orders" : "/master/orders"}/${order.id}/chat`)}
                    className="h-11 w-full rounded-2xl border border-primary/25 text-sm font-bold text-primary"
                    data-testid={`master-order-chat-${order.id}`}
                  >
                    <MessageSquare className="mr-1.5 inline h-4 w-4" />Написать клиенту
                  </button>
                )}

                {order.status === "pending" && (
                  <div className="flex gap-2">
                    <button disabled={orderMutation.isPending} onClick={() => orderMutation.mutate({ id: order.id, status: "rejected" })} className="h-11 flex-1 rounded-2xl border text-sm font-bold text-muted-foreground">
                      <XCircle className="mr-1 inline h-4 w-4" />Отклонить
                    </button>
                    <button disabled={orderMutation.isPending} onClick={() => orderMutation.mutate({ id: order.id, status: "in_progress" })} className="h-11 flex-[2] rounded-2xl bg-primary text-sm font-bold text-white">
                      <CheckCircle2 className="mr-1 inline h-4 w-4" />Принять
                    </button>
                  </div>
                )}
                {order.status === "in_progress" && (
                  <>
                    <TravelControls order={order} />
                    <button disabled={orderMutation.isPending} onClick={() => orderMutation.mutate({ id: order.id, status: "completed" })} className="h-11 w-full rounded-2xl bg-emerald-600 text-sm font-bold text-white">
                      <CheckCircle2 className="mr-1 inline h-4 w-4" />Завершить заказ
                    </button>
                  </>
                )}
                {order.status === "completed" && <><p className="flex items-center gap-1 text-sm font-medium text-green-600"><CheckCircle2 className="h-4 w-4" />Заказ выполнен</p><ReviewReplyPanel orderId={order.id} /></>}
                {order.status === "rejected" && <p className="text-sm text-muted-foreground">Заказ отклонён</p>}
              </article>
            ))}
          </div>
        )}

        {orderMutation.isError && <p className="mt-4 text-center text-sm text-destructive">Не удалось изменить статус. Обновите страницу и попробуйте ещё раз.</p>}
      </main>

      {isOrganization ? <OrganizationBottomNavigation /> : <MasterBottomNavigation />}
    </div>
  );
}
