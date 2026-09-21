import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

type RealtimeEvent =
  | { type: "ready" }
  | { type: "direct-conversation"; conversationId: number }
  | { type: "direct-message"; conversationId: number }
  | { type: "order-message"; orderId: number };

export function RealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    let socket: WebSocket | null = null;
    let disposed = false;
    let reconnectTimer = 0;
    let attempt = 0;

    const invalidate = (event: RealtimeEvent) => {
      if (event.type === "direct-conversation") {
        void queryClient.invalidateQueries({ queryKey: ["/api/direct-chats"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/direct-chats/unread-count"] });
        return;
      }

      if (event.type === "direct-message") {
        void queryClient.invalidateQueries({
          queryKey: ["/api/direct-chats", event.conversationId, "messages"],
        });
        void queryClient.invalidateQueries({ queryKey: ["/api/direct-chats"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/direct-chats/unread-count"] });
        return;
      }

      if (event.type === "order-message") {
        void queryClient.invalidateQueries({
          queryKey: ["/api/orders", event.orderId, "messages"],
        });
        void queryClient.invalidateQueries({ queryKey: ["/api/order-chats/unread-count"] });
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      const delay = Math.min(30_000, 1000 * Math.max(1, 2 ** attempt));
      attempt = Math.min(attempt + 1, 5);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = 0;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (disposed || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
      if (!navigator.onLine) {
        scheduleReconnect();
        return;
      }

      try {
        const response = await fetch("/api/realtime-token", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) {
          if (response.status !== 401) scheduleReconnect();
          return;
        }

        const data = await response.json() as { token?: string };
        if (!data.token || disposed) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(
          `${protocol}//${window.location.host}/ws/realtime`,
          ["govza-realtime", data.token],
        );

        socket.addEventListener("open", () => {
          attempt = 0;
        });

        socket.addEventListener("message", (message) => {
          try {
            invalidate(JSON.parse(String(message.data)) as RealtimeEvent);
          } catch {
            // Ignore malformed realtime events.
          }
        });

        socket.addEventListener("close", () => {
          socket = null;
          scheduleReconnect();
        });

        socket.addEventListener("error", () => {
          socket?.close();
        });
      } catch {
        scheduleReconnect();
      }
    };

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "govza:push-received") return;
      void queryClient.invalidateQueries({ queryKey: ["/api/push/notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/push/notifications/unread-count"] });
    };

    const onOnline = () => void connect();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void connect();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    void connect();

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
      socket?.close();
    };
  }, [queryClient, user?.id]);

  return null;
}
