import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

function base64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function PushNotificationCard({ compact = false }: { compact?: boolean }) {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const available =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(available);
    if (!available) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription)))
      .catch(() => setEnabled(false));
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") return;

      const configResponse = await fetch("/api/push/config", { credentials: "include" });
      if (!configResponse.ok) throw new Error("push config");
      const { publicKey } = await configResponse.json();

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(publicKey),
        });
      }

      await apiRequest("POST", "/api/push/subscribe", subscription.toJSON());
      setEnabled(true);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiRequest("DELETE", "/api/push/subscribe", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return compact ? null : (
      <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        Push-уведомления не поддерживаются этим браузером.
      </div>
    );
  }

  return (
    <div className={compact ? "" : "rounded-2xl border bg-card p-4"}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Push-уведомления</p>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? "Включены для этого устройства"
              : permission === "denied"
                ? "Заблокированы в настройках браузера"
                : "Заявки, сообщения и статусы заказов"}
          </p>
        </div>
        {enabled ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={disable}>Выключить</Button>
        ) : (
          <Button size="sm" disabled={busy || permission === "denied"} onClick={enable}>
            {busy ? "…" : "Включить"}
          </Button>
        )}
      </div>
    </div>
  );
}
