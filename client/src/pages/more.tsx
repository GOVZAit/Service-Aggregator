import { ChevronRight, ClipboardList, Download, Heart, Landmark, MessageCircle, PackageSearch, ReceiptText } from "lucide-react";
import { Link } from "wouter";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";

const sections = [
  {
    href: "/contacts",
    icon: Landmark,
    title: "Город и контакты",
    description: "Полезные службы, организации, телефоны, адреса и городские сервисы",
  },
  {
    href: "/requests",
    icon: ClipboardList,
    title: "Мои заявки",
    description: "Создавайте заявки, смотрите предложения и выбирайте исполнителя",
  },
  {
    href: "/orders",
    icon: ReceiptText,
    title: "Мои заказы",
    description: "Следите за выбранными мастерами и статусами текущих заказов",
  },
  {
    href: "/messages",
    icon: MessageCircle,
    title: "Сообщения",
    description: "Прямые диалоги с мастерами и организациями GOVZA",
  },
  {
    href: "/lost-found",
    icon: PackageSearch,
    title: "Потеряно / Найдено",
    description: "Объявления о потерянных и найденных вещах, документах и животных",
  },
  {
    href: "/",
    icon: Heart,
    title: "Избранное",
    description: "Сохранённые мастера и услуги, к которым хочется вернуться",
  },
] as const;

export default function MorePage() {
  const openInstall = () => window.dispatchEvent(new Event("govza:install"));

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <div className="mt-6">
            <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Ещё</h1>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Ваши заявки, заказы и дополнительные полезные сервисы.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map(({ href, icon: Icon, title, description }) => (
            <Link
              key={title}
              href={href}
              className="premium-card pressable group flex min-h-[126px] items-center gap-4 p-4 transition-transform active:scale-[.99]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold tracking-[-0.03em]">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        <section className="hero-gradient relative mt-5 overflow-hidden rounded-[1.75rem] border border-primary/15 p-5 shadow-sm">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-cyan-300/30 blur-2xl" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Download className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold tracking-[-0.03em]">
                Установите <span className="text-primary">GOVZA pro</span>
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Быстрый доступ к сервису с главного экрана телефона.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="rounded-full bg-background/70 px-2.5 py-1">Быстрый доступ</span>
                <span className="rounded-full bg-background/70 px-2.5 py-1">Push-уведомления</span>
                <span className="rounded-full bg-background/70 px-2.5 py-1">Всегда под рукой</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openInstall}
            className="accent-gradient relative z-10 mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-md"
          >
            <Download className="h-4 w-4" />
            Установить на главный экран
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}
