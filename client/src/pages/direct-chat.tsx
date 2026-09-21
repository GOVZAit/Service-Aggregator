import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { DirectConversationView, DirectMessageView } from "@shared/direct-chat-schema";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(value));
}

export default function DirectChatPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = Number(id);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const endRef = useRef<HTMLDivElement>(null);

  const listPath = user?.role === "organization"
    ? "/organization/messages"
    : user?.role === "master"
      ? "/master/messages"
      : "/messages";

  const { data: conversations = [] } = useQuery<DirectConversationView[]>({
    queryKey: ["/api/direct-chats"],
    enabled: !!user,
    refetchInterval: 15_000,
    staleTime: 0,
  });
  const conversation = conversations.find((item) => item.id === conversationId);

  const { data: messages = [], isLoading } = useQuery<DirectMessageView[]>({
    queryKey: ["/api/direct-chats", conversationId, "messages"],
    enabled: Number.isInteger(conversationId) && conversationId > 0 && !!user,
    refetchInterval: 3000,
    staleTime: 0,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    void queryClient.invalidateQueries({ queryKey: ["/api/direct-chats/unread-count"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/direct-chats"] });
  }, [messages.length, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/direct-chats/${conversationId}/messages`, { text: text.trim() });
      return response.json() as Promise<DirectMessageView>;
    },
    onSuccess: (message) => {
      setText("");
      queryClient.setQueryData<DirectMessageView[]>(
        ["/api/direct-chats", conversationId, "messages"],
        (current = []) => current.some((item) => item.id === message.id) ? current : [...current, message],
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/direct-chats"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/direct-chats/unread-count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Сообщение не отправлено",
        description: error.message.includes("403")
          ? "У вас нет доступа к этому диалогу."
          : "Проверьте соединение и попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  const submit = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return (
      <div className="min-h-screen bg-background px-4 py-20 text-center">
        <p className="font-bold">Некорректный диалог</p>
        <Button className="mt-4 rounded-2xl" onClick={() => navigate(listPath)}>Назад</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 safe-area-pt shadow-sm backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-3 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-2xl"
            onClick={() => navigate(listPath)}
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold tracking-[-0.03em]">
              {conversation?.counterpartName ?? "Сообщения GOVZA"}
            </h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Прямой диалог в GOVZA</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
            <Skeleton className="ml-auto h-20 w-2/3 rounded-2xl" />
            <Skeleton className="h-14 w-1/2 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="my-auto py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
              <MessageCircle className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-lg font-extrabold tracking-[-0.03em]">Начните разговор</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Обсудите задачу, сроки и стоимость. Сообщения сохраняются в вашем аккаунте.
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
                    <div className="my-5 text-center">
                      <span className="rounded-full bg-muted/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        {formatDay(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={message.mine ? "flex justify-end" : "flex justify-start"}>
                    <div className={`max-w-[84%] rounded-[1.4rem] px-4 py-3 shadow-sm ${
                      message.mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border/65 bg-card"
                    }`}>
                      {!message.mine && <p className="mb-1 text-[11px] font-bold text-primary">{message.senderName}</p>}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                      <p className={`mt-1.5 text-right text-[10px] ${message.mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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

      <div className="sticky bottom-0 border-t border-border/70 bg-background/92 safe-area-pb shadow-[0_-18px_50px_-34px_hsl(var(--foreground)/0.34)] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2 px-3 py-3">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Напишите сообщение…"
            rows={1}
            maxLength={2000}
            className="min-h-12 max-h-32 resize-none rounded-2xl border-border/70 bg-card shadow-sm"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="icon"
            className="accent-gradient h-12 w-12 shrink-0 rounded-2xl shadow-sm"
            disabled={!text.trim() || sendMutation.isPending}
            onClick={submit}
            aria-label="Отправить"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
