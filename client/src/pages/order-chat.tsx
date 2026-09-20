import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LockKeyhole, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@shared/schema";
import type { OrderMessageView } from "@shared/order-chat-schema";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

export default function OrderChatPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const endRef = useRef<HTMLDivElement>(null);

  const backPath = user?.role === "master"
    ? "/master/orders"
    : user?.role === "organization"
      ? "/organization/orders"
      : "/orders";

  const { data: order, isLoading: orderLoading } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
    enabled: Number.isInteger(orderId) && orderId > 0,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<OrderMessageView[]>({
    queryKey: ["/api/orders", orderId, "messages"],
    enabled: Number.isInteger(orderId) && orderId > 0,
    refetchInterval: 3000,
    staleTime: 0,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/messages`, {
        text: text.trim(),
      });
      return response.json() as Promise<OrderMessageView>;
    },
    onSuccess: async (message) => {
      setText("");
      queryClient.setQueryData<OrderMessageView[]>(
        ["/api/orders", orderId, "messages"],
        (current = []) => current.some((item) => item.id === message.id) ? current : [...current, message],
      );
      await queryClient.invalidateQueries({ queryKey: ["/api/order-chats/unread-count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Сообщение не отправлено",
        description: error.message.includes("403")
          ? "У вас нет доступа к этому чату."
          : "Проверьте соединение и попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  const submit = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return (
      <div className="min-h-screen bg-background px-4 py-20 text-center">
        <p className="font-semibold">Некорректный заказ</p>
        <Button className="mt-4" onClick={() => navigate(backPath)}>Назад</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 safe-area-pt backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-3 py-3">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => navigate(backPath)} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h1 className="truncate font-semibold">{orderLoading ? "Чат по заказу" : order?.title ?? "Чат по заказу"}</h1>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <LockKeyhole className="h-3 w-3" />
              Только вы и {user?.role === "master" ? "клиент" : "выбранный мастер"}
            </p>
          </div>
          {order && <span className="shrink-0 text-sm font-bold">{order.price}</span>}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        {messagesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
            <Skeleton className="ml-auto h-20 w-2/3 rounded-2xl" />
            <Skeleton className="h-14 w-1/2 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="my-auto py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-semibold">Начните разговор</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Уточните время, детали работы и что входит в стоимость. Переписка сохранится внутри заказа.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const showDay = !previous || formatDay(previous.createdAt) !== formatDay(message.createdAt);

              return (
                <div key={message.id}>
                  {showDay && (
                    <div className="my-4 text-center">
                      <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{formatDay(message.createdAt)}</span>
                    </div>
                  )}
                  <div className={message.mine ? "flex justify-end" : "flex justify-start"}>
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                      message.mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border/70 bg-card"
                    }`}>
                      {!message.mine && <p className="mb-1 text-[11px] font-semibold text-primary">{message.senderName}</p>}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                      <p className={`mt-1 text-right text-[10px] ${message.mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <div className="sticky bottom-0 border-t border-border/70 bg-background/95 safe-area-pb backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2 px-3 py-3">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Напишите сообщение…"
            rows={1}
            maxLength={2000}
            className="min-h-11 max-h-32 resize-none rounded-2xl"
            data-testid="order-chat-input"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="icon"
            className="h-11 w-11 shrink-0 rounded-2xl"
            disabled={!text.trim() || sendMutation.isPending}
            onClick={submit}
            data-testid="order-chat-send"
            aria-label="Отправить"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
