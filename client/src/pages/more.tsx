import { ChevronRight, ClipboardList, Download, Heart, Landmark, MessageCircle, PackageSearch, ReceiptText } from "lucide-react";
import { Link } from "wouter";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";

const sections = [
  { href: "/contacts", icon: Landmark, title: "Город и контакты", description: "Службы, организации, телефоны и адреса" },
  { href: "/requests", icon: ClipboardList, title: "Мои заявки", description: "Предложения исполнителей по вашим задачам" },
  { href: "/orders", icon: ReceiptText, title: "Мои заказы", description: "Текущие и завершённые заказы" },
  { href: "/messages", icon: MessageCircle, title: "Сообщения", description: "Диалоги с мастерами и организациями" },
  { href: "/lost-found", icon: PackageSearch, title: "Потеряно / Найдено", description: "Вещи, документы и животные" },
  { href: "/", icon: Heart, title: "Избранное", description: "Сохранённые специалисты" },
] as const;

export default function MorePage() {
  const openInstall = () => window.dispatchEvent(new Event("govza:install"));

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell safe-area-pt">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <AppBrandHeader compact />
          <div className="-mt-10 pr-28">
            <h1 className="text-2xl font-bold tracking-tight">Ещё</h1>
            <p className="mt-1 text-sm text-muted-foreground">Полезные разделы и настройки</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-2">
        <div className="divide-y divide-border/70">
          {sections.map(({ href, icon: Icon, title, description }) => (
            <Link key={title} href={href} className="pressable flex min-h-[76px] items-center gap-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">{title}</h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={openInstall}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3 text-left"
        >
          <Download className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Установить GOVZA мастера</p>
            <p className="text-xs text-muted-foreground">Ярлык на главном экране телефона</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </main>

      <BottomNavigation />
    </div>
  );
}
