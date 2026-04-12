import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import { NotificationsPanel } from "@/components/notifications-panel";
import { Bell, Eye, ClipboardCheck, Wallet, ChevronRight, Clock, MapPin, Tag, ToggleLeft, ToggleRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Просмотры сегодня", value: "24", icon: Eye, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" },
  { label: "Активных заказов", value: "3", icon: ClipboardCheck, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/40" },
  { label: "Заработано (месяц)", value: "52 400 ₽", icon: Wallet, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/40" },
];

const newRequests = [
  {
    id: 1,
    title: "Замена смесителя на кухне",
    category: "Сантехника",
    budget: "1 500 — 3 000 ₽",
    location: "пр. Путина, 15",
    postedAt: "10 мин назад",
    description: "Нужно заменить кран на кухне, желательно сегодня",
    responses: 2,
  },
  {
    id: 2,
    title: "Прочистка засора в ванной",
    category: "Сантехника",
    budget: "до 2 000 ₽",
    location: "ул. Маяковского, 7",
    postedAt: "35 мин назад",
    description: "Засор в ванной, вода уходит медленно",
    responses: 0,
  },
  {
    id: 3,
    title: "Установка счётчиков воды",
    category: "Сантехника",
    budget: "2 000 — 4 000 ₽",
    location: "ул. Чехова, 22",
    postedAt: "1 ч назад",
    description: "Нужно установить счётчики на холодную и горячую воду",
    responses: 5,
  },
];

const UNREAD_COUNT = 2;

export default function MasterDashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isOnline, setIsOnline] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "МС";

  return (
    <div className="min-h-screen bg-background pb-24">
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {initials}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Добро пожаловать</p>
              <h1 className="font-semibold text-sm leading-tight">{user?.name || "Мастер"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOnline((v) => !v)}
              data-testid="button-online-toggle"
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                isOnline
                  ? "border-green-300 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {isOnline ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {isOnline ? "Онлайн" : "Офлайн"}
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              data-testid="button-notifications"
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 relative"
            >
              <Bell className="w-4 h-4" />
              {UNREAD_COUNT > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {UNREAD_COUNT}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Offline banner */}
        {!isOnline && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            ⚠ Вы офлайн — клиенты не видят вас в поиске. Включите онлайн, чтобы получать заявки.
          </div>
        )}

        {/* Stats */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-2xl bg-card border border-border/60 p-3 flex flex-col gap-2">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", bg)}>
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
                <div>
                  <p className="text-base font-bold leading-tight">{value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* New requests */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Новые заявки</h2>
            <button
              onClick={() => navigate("/master/orders")}
              className="text-primary text-sm font-medium flex items-center gap-0.5"
              data-testid="link-all-requests"
            >
              Все <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {isOnline ? (
            <div className="space-y-3">
              {newRequests.map((req) => (
                <div
                  key={req.id}
                  data-testid={`card-request-${req.id}`}
                  className="rounded-2xl bg-card border border-border/60 p-4 space-y-2 active:scale-[0.99] transition-transform cursor-pointer"
                  onClick={() => navigate("/master/orders")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight">{req.title}</h3>
                    {req.responses === 0 && (
                      <span className="shrink-0 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900">
                        Первый!
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{req.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{req.budget}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.location}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{req.postedAt}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {req.responses === 0 ? "Откликов ещё нет" : `${req.responses} отклика`}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate("/master/orders"); }}
                      data-testid={`button-respond-${req.id}`}
                      className="text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-lg"
                    >
                      Откликнуться
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-muted border border-border py-10 flex flex-col items-center gap-3 text-center">
              <ToggleLeft className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">Вы офлайн</p>
                <p className="text-xs text-muted-foreground mt-0.5">Включите онлайн, чтобы видеть новые заявки</p>
              </div>
              <button
                onClick={() => setIsOnline(true)}
                className="text-xs font-semibold text-white bg-primary px-4 py-2 rounded-xl"
                data-testid="button-go-online"
              >
                Включить онлайн
              </button>
            </div>
          )}
        </section>

        {/* Quick tip */}
        <section className="rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Заполните профиль</p>
              <p className="text-xs text-muted-foreground mt-0.5">Мастера с фото получают в 3× больше заявок</p>
            </div>
            <button onClick={() => navigate("/master/profile")} data-testid="button-complete-profile" className="shrink-0 ml-3">
              <Settings className="w-5 h-5 text-primary" />
            </button>
          </div>
        </section>
      </main>

      <MasterBottomNavigation />
    </div>
  );
}
