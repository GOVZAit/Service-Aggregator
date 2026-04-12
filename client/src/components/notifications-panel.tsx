import { X, ClipboardList, Star, XCircle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Notification {
  id: number;
  type: "new_request" | "review" | "cancel";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: "new_request",
    title: "Новая заявка",
    body: "Рамзан ищет сантехника: Замена смесителя на кухне",
    time: "10 мин назад",
    read: false,
  },
  {
    id: 2,
    type: "review",
    title: "Новый отзыв ⭐⭐⭐⭐⭐",
    body: "Зара оставила отзыв: «Отличный мастер! Быстро и аккуратно»",
    time: "1 ч назад",
    read: false,
  },
  {
    id: 3,
    type: "new_request",
    title: "Новая заявка",
    body: "Ибрагим ищет сантехника: Установка счётчиков воды",
    time: "2 ч назад",
    read: true,
  },
  {
    id: 4,
    type: "cancel",
    title: "Заказ отменён",
    body: "Лейла отменила заказ «Замена батарей» на завтра в 10:00",
    time: "Вчера",
    read: true,
  },
];

const typeIcon: Record<Notification["type"], React.ReactNode> = {
  new_request: <ClipboardList className="w-4 h-4 text-blue-500" />,
  review: <Star className="w-4 h-4 text-yellow-500" />,
  cancel: <XCircle className="w-4 h-4 text-red-500" />,
};

const typeBg: Record<Notification["type"], string> = {
  new_request: "bg-blue-50 dark:bg-blue-950/40",
  review: "bg-yellow-50 dark:bg-yellow-950/40",
  cancel: "bg-red-50 dark:bg-red-950/40",
};

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAllRead = () => {
    setNotifications((n) => n.map((item) => ({ ...item, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mt-auto w-full max-h-[80vh] bg-background rounded-t-3xl shadow-2xl flex flex-col">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-foreground" />
            <h2 className="font-bold text-lg">Уведомления</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                data-testid="button-mark-all-read"
                className="text-xs text-primary font-medium"
              >
                Прочитать все
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Bell className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">Нет уведомлений</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  data-testid={`notification-${n.id}`}
                  onClick={() => setNotifications((list) =>
                    list.map((item) => item.id === n.id ? { ...item, read: true } : item)
                  )}
                  className={cn(
                    "w-full text-left px-5 py-4 flex items-start gap-3 transition-colors hover:bg-muted/30",
                    !n.read && "bg-primary/3"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", typeBg[n.type])}>
                    {typeIcon[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-semibold", !n.read && "text-foreground")}>{n.title}</p>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{n.time}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
