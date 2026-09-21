import {
  BadgeCheck,
  Bell,
  ClipboardList,
  Info,
  MessageCircle,
  PackageCheck,
  Settings2,
  Star,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { PushNotificationCard } from "@/components/push-notification-card";
import {
  notificationTypeLabels,
  notificationTypes,
  type InAppNotification,
  type NotificationPreferences,
  type NotificationType,
} from "@shared/push-schema";

interface NotificationsPanelProps {
  onClose: () => void;
}

const typeMeta: Record<NotificationType, { icon: typeof Bell; tone: string }> = {
  request: { icon: ClipboardList, tone: "bg-blue-500/10 text-blue-600" },
  order: { icon: PackageCheck, tone: "bg-emerald-500/10 text-emerald-600" },
  message: { icon: MessageCircle, tone: "bg-cyan-500/10 text-cyan-600" },
  review: { icon: Star, tone: "bg-amber-500/10 text-amber-600" },
  verification: { icon: BadgeCheck, tone: "bg-violet-500/10 text-violet-600" },
  system: { icon: Info, tone: "bg-muted text-muted-foreground" },
};

function relativeTime(value: string) {
  const date = new Date(value);
  const delta = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function defaultTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow";
  } catch {
    return "Europe/Moscow";
  }
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<"history" | "settings">("history");

  const { data: notifications = [], isLoading } = useQuery<InAppNotification[]>({
    queryKey: ["/api/push/notifications"],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: preferences } = useQuery<NotificationPreferences>({
    queryKey: ["/api/push/preferences"],
  });

  const activePreferences: NotificationPreferences = preferences ?? {
    enabledTypes: [...notificationTypes],
    quietHoursEnabled: false,
    quietStart: "22:00",
    quietEnd: "08:00",
    timezone: defaultTimeZone(),
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/push/notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/push/notifications/unread-count"] }),
    ]);
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/push/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/push/notifications/read-all"),
    onSuccess: invalidate,
  });

  const preferenceMutation = useMutation({
    mutationFn: (next: NotificationPreferences) =>
      apiRequest("PUT", "/api/push/preferences", next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/push/preferences"] });
    },
  });

  const savePreferences = (patch: Partial<NotificationPreferences>) => {
    preferenceMutation.mutate({
      ...activePreferences,
      timezone: activePreferences.timezone || defaultTimeZone(),
      ...patch,
    });
  };

  const toggleType = (type: NotificationType) => {
    const enabled = activePreferences.enabledTypes.includes(type);
    savePreferences({
      enabledTypes: enabled
        ? activePreferences.enabledTypes.filter((item) => item !== type)
        : [...activePreferences.enabledTypes, type],
    });
  };

  const openNotification = async (notification: InAppNotification) => {
    if (!notification.read) {
      await markReadMutation.mutateAsync(notification.id).catch(() => undefined);
    }
    if (notification.url?.startsWith("/")) {
      onClose();
      navigate(notification.url);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mt-auto flex max-h-[88vh] w-full flex-col rounded-t-[2rem] bg-background shadow-2xl">
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 pb-3 pt-2">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-foreground" />
            <h2 className="text-lg font-bold">Уведомления</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть уведомления"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-2 border-b border-border/60 px-4 py-2">
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cn(
              "min-h-10 rounded-xl text-sm font-bold",
              tab === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            История
          </button>
          <button
            type="button"
            onClick={() => setTab("settings")}
            className={cn(
              "min-h-10 rounded-xl text-sm font-bold",
              tab === "settings" ? "bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            Настройки
          </button>
        </div>

        <div className="flex-1 overflow-y-auto safe-area-pb">
          {tab === "history" ? (
            <>
              {unreadCount > 0 && (
                <div className="flex justify-end px-5 py-2">
                  <button
                    type="button"
                    onClick={() => markAllMutation.mutate()}
                    disabled={markAllMutation.isPending}
                    className="min-h-9 text-xs font-bold text-primary"
                    data-testid="button-mark-all-read"
                  >
                    Прочитать все
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="space-y-2 px-5 py-5">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <Bell className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-bold">История пока пустая</p>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    Здесь появятся заявки, сообщения, статусы заказов, отзывы и результаты верификации.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {notifications.map((notification) => {
                    const meta = typeMeta[notification.type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        data-testid={`notification-${notification.id}`}
                        onClick={() => void openNotification(notification)}
                        className={cn(
                          "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30",
                          !notification.read && "bg-primary/[0.035]",
                        )}
                      >
                        <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-sm font-bold">{notification.title}</p>
                            {!notification.read && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{notification.body}</p>
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                            <span>{notificationTypeLabels[notification.type]}</span>
                            <span>·</span>
                            <span>{relativeTime(notification.createdAt)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 px-5 py-5">
              <PushNotificationCard />

              <section className="rounded-[1.4rem] border border-border/70 bg-card p-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-extrabold">Какие push отправлять</h3>
                </div>
                <div className="mt-3 divide-y divide-border/60">
                  {notificationTypes.map((type) => {
                    const enabled = activePreferences.enabledTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleType(type)}
                        disabled={preferenceMutation.isPending}
                        className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
                      >
                        <span className="flex-1 text-sm font-semibold">{notificationTypeLabels[type]}</span>
                        <span className={cn("relative h-6 w-11 rounded-full p-1 transition-colors", enabled ? "bg-primary" : "bg-muted")}>
                          <span className={cn("block h-4 w-4 rounded-full bg-white transition-transform", enabled && "translate-x-5")} />
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Отключённые типы всё равно сохраняются в истории внутри GOVZA, но не отправляются как системный push.
                </p>
              </section>

              <section className="rounded-[1.4rem] border border-border/70 bg-card p-4">
                <button
                  type="button"
                  onClick={() => savePreferences({ quietHoursEnabled: !activePreferences.quietHoursEnabled })}
                  disabled={preferenceMutation.isPending}
                  className="flex min-h-12 w-full items-center gap-3 text-left"
                >
                  <div className="flex-1">
                    <p className="text-sm font-extrabold">Тихие часы</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Push не приходит ночью, история сохраняется.
                    </p>
                  </div>
                  <span className={cn("relative h-6 w-11 rounded-full p-1 transition-colors", activePreferences.quietHoursEnabled ? "bg-primary" : "bg-muted")}>
                    <span className={cn("block h-4 w-4 rounded-full bg-white transition-transform", activePreferences.quietHoursEnabled && "translate-x-5")} />
                  </span>
                </button>

                {activePreferences.quietHoursEnabled && (
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                    <label className="text-xs font-semibold text-muted-foreground">
                      С
                      <input
                        type="time"
                        value={activePreferences.quietStart}
                        onChange={(event) => savePreferences({ quietStart: event.target.value })}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                      />
                    </label>
                    <label className="text-xs font-semibold text-muted-foreground">
                      До
                      <input
                        type="time"
                        value={activePreferences.quietEnd}
                        onChange={(event) => savePreferences({ quietEnd: event.target.value })}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                      />
                    </label>
                    <div className="col-span-2 text-[11px] text-muted-foreground">
                      Часовой пояс: {activePreferences.timezone}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
