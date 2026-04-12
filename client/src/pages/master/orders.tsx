import { useState } from "react";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import { Clock, MapPin, Tag, CheckCircle2, XCircle, PhoneCall, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderTab = "new" | "active" | "done";

const newRequests = [
  {
    id: 1,
    title: "Замена смесителя на кухне",
    category: "Сантехника",
    budget: "1 500 — 3 000 ₽",
    location: "пр. Путина, 15",
    postedAt: "10 мин назад",
    description: "Нужно заменить кран на кухне. Желательно сегодня во второй половине дня.",
    responses: 2,
    phone: "+7 (928) 123-45-67",
    clientName: "Рамзан",
  },
  {
    id: 2,
    title: "Прочистка засора в ванной",
    category: "Сантехника",
    budget: "до 2 000 ₽",
    location: "ул. Маяковского, 7",
    postedAt: "35 мин назад",
    description: "Засор в ванной, вода уходит очень медленно. Срочно.",
    responses: 0,
    phone: "+7 (928) 765-43-21",
    clientName: "Аиша",
  },
  {
    id: 3,
    title: "Установка счётчиков воды",
    category: "Сантехника",
    budget: "2 000 — 4 000 ₽",
    location: "ул. Чехова, 22",
    postedAt: "1 ч назад",
    description: "Нужно установить счётчики на холодную и горячую воду в квартире.",
    responses: 5,
    phone: "+7 (938) 555-12-34",
    clientName: "Ибрагим",
  },
];

const activeOrders = [
  {
    id: 101,
    title: "Разводка труб в ванной",
    clientName: "Муса Дудаев",
    phone: "+7 (928) 001-23-45",
    address: "ул. Первомайская, 3",
    date: "Сегодня, 16:00",
    price: "8 500 ₽",
    status: "В процессе",
  },
  {
    id: 102,
    title: "Замена батарей отопления",
    clientName: "Лейла Гучигова",
    phone: "+7 (938) 200-44-55",
    address: "пр. Кадырова, 18",
    date: "Завтра, 10:00",
    price: "12 000 ₽",
    status: "Подтверждён",
  },
];

const doneOrders = [
  {
    id: 201,
    title: "Замена смесителя в ванной",
    clientName: "Зара Эдилова",
    date: "10 апр 2026",
    price: "1 500 ₽",
    rating: 5,
    review: "Отличный мастер! Быстро и аккуратно сделал всё, что нужно.",
  },
  {
    id: 202,
    title: "Прочистка засора",
    clientName: "Аслан Мусаев",
    date: "7 апр 2026",
    price: "2 000 ₽",
    rating: 4,
    review: "Хорошая работа, пришёл вовремя.",
  },
  {
    id: 203,
    title: "Установка унитаза",
    clientName: "Рукият Хасанова",
    date: "3 апр 2026",
    price: "3 000 ₽",
    rating: 5,
    review: "Всё отлично, рекомендую!",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-yellow-400" : "text-muted-foreground/30"}>★</span>
      ))}
    </div>
  );
}

function NewRequestCard({ req }: { req: typeof newRequests[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [accepted, setAccepted] = useState<boolean | null>(null);

  if (accepted === false) return null;

  return (
    <div
      data-testid={`card-new-order-${req.id}`}
      className={cn(
        "rounded-2xl bg-card border border-border/60 p-4 space-y-2 transition-all",
        accepted === true && "border-green-300 bg-green-50/50 dark:bg-green-950/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-tight">{req.title}</h3>
        {req.responses === 0 && (
          <span className="shrink-0 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900">
            Первый!
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{req.budget}</span>
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.location}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{req.postedAt}</span>
      </div>

      <p className={cn("text-xs text-muted-foreground", !expanded && "line-clamp-2")}>{req.description}</p>

      {req.description.length > 60 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary font-medium"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />Свернуть</> : <><ChevronDown className="w-3 h-3" />Читать полностью</>}
        </button>
      )}

      {accepted === true ? (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Отклик отправлен — ждите звонка
          </div>
          <a
            href={`tel:${req.phone}`}
            data-testid={`link-call-${req.id}`}
            className="flex items-center gap-1 text-xs text-primary font-semibold border border-primary/40 px-3 py-1.5 rounded-lg"
          >
            <PhoneCall className="w-3 h-3" />
            Позвонить
          </a>
        </div>
      ) : (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setAccepted(false)}
            data-testid={`button-decline-${req.id}`}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground border border-border rounded-xl py-2"
          >
            <XCircle className="w-4 h-4" />
            Отклонить
          </button>
          <button
            onClick={() => setAccepted(true)}
            data-testid={`button-accept-${req.id}`}
            className="flex-[2] flex items-center justify-center gap-1 text-xs font-semibold text-white bg-primary rounded-xl py-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Откликнуться
          </button>
        </div>
      )}
    </div>
  );
}

export default function MasterOrdersPage() {
  const [activeTab, setActiveTab] = useState<OrderTab>("new");

  const tabs: { key: OrderTab; label: string; count: number }[] = [
    { key: "new", label: "Новые", count: newRequests.length },
    { key: "active", label: "Активные", count: activeOrders.length },
    { key: "done", label: "Завершённые", count: doneOrders.length },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-lg mx-auto px-4 pt-12 pb-0">
          <h1 className="text-xl font-bold mb-3">Заявки</h1>
          <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-none">
            {tabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                data-testid={`tab-orders-${key}`}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === key
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                <span className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded-full",
                  activeTab === key ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {activeTab === "new" && (
          <div className="space-y-3">
            {newRequests.map((req) => (
              <NewRequestCard key={req.id} req={req} />
            ))}
          </div>
        )}

        {activeTab === "active" && (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                data-testid={`card-active-order-${order.id}`}
                className="rounded-2xl bg-card border border-border/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight">{order.title}</h3>
                  <span className={cn(
                    "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    order.status === "В процессе"
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900"
                      : "text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900"
                  )}>
                    {order.status}
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{order.date}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{order.address}</span>
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{order.price}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <div>
                    <p className="text-xs text-muted-foreground">Клиент</p>
                    <p className="text-sm font-medium">{order.clientName}</p>
                  </div>
                  <a
                    href={`tel:${order.phone}`}
                    data-testid={`link-call-active-${order.id}`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary border border-primary/40 px-3 py-2 rounded-xl"
                  >
                    <PhoneCall className="w-4 h-4" />
                    Позвонить
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "done" && (
          <div className="space-y-3">
            {doneOrders.map((order) => (
              <div
                key={order.id}
                data-testid={`card-done-order-${order.id}`}
                className="rounded-2xl bg-card border border-border/60 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{order.title}</h3>
                  <span className="text-sm font-bold text-foreground">{order.price}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{order.clientName} · {order.date}</span>
                  <StarRating rating={order.rating} />
                </div>
                {order.review && (
                  <p className="text-xs text-muted-foreground italic">«{order.review}»</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <MasterBottomNavigation />
    </div>
  );
}
