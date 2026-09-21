import { Building2, Car, ChevronRight, HeartPulse, Lightbulb, Phone, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";

const sections = [
  {
    href: "/contacts/services",
    icon: Building2,
    title: "Городские службы",
    description: "Экстренные службы, медицина, госучреждения и транспорт",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    href: "/contacts/useful",
    icon: Phone,
    title: "Полезные контакты",
    description: "Отели, банки, нотариусы, ЖКХ, почта и другие места",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    href: "/contacts/services",
    icon: Car,
    title: "Авто и транспорт",
    description: "Такси, вокзалы, эвакуаторы, АЗС и автомойки",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    href: "/doctors",
    icon: HeartPulse,
    title: "Медицина",
    description: "Врачи, клиники, больницы и полезные медицинские контакты",
    color: "bg-rose-500/10 text-rose-600",
  },
] as const;

export default function ContactsHubPage() {
  return (
    <div className="app-page bg-background">
      <header className="app-header-shell safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <div className="mt-6">
            <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Контакты</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Службы и полезные места, которые не относятся к мастерам.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5">
        <a
          href="tel:112"
          className="hero-gradient relative block overflow-hidden rounded-[1.75rem] border border-primary/15 p-5 shadow-sm"
        >
          <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-cyan-300/30 blur-2xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold tracking-[-0.03em]">Нужна срочная помощь?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Экстренный номер — <span className="font-extrabold text-primary">112</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Звонок бесплатный и доступен круглосуточно.</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-lg font-extrabold text-white shadow-md">
              112
            </div>
          </div>
        </a>

        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map(({ href, icon: Icon, title, description, color }) => (
            <Link
              key={title}
              href={href}
              className="premium-card pressable group flex min-h-[120px] items-center gap-4 p-4 transition-transform active:scale-[.99]"
            >
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color}`}>
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

        <div className="flex items-start gap-3 rounded-[1.5rem] border border-primary/10 bg-primary/[0.035] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Не нашли нужный контакт?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Новые справочные категории будут появляться здесь отдельными карточками.
            </p>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
