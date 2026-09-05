import { Building2, Car, ChevronRight, Landmark, Phone, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { BottomNavigation } from "@/components/bottom-navigation";

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
] as const;

export default function ContactsHubPage() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-background/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs text-muted-foreground">Чеченская Республика</p>
          <h1 className="mt-1 text-2xl font-bold">Контакты</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Службы и полезные места, которые не относятся к мастерам
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-3 px-4 py-5">
        <div className="rounded-3xl border border-border bg-muted/35 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold">Нужна срочная помощь?</h2>
              <p className="text-sm text-muted-foreground">Экстренный номер — 112</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map(({ href, icon: Icon, title, description, color }) => (
            <Link
              key={title}
              href={href}
              className="pressable flex min-h-[104px] items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className={`shrink-0 rounded-2xl p-3 ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{title}</h2>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border p-4 text-muted-foreground">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Новые справочные категории можно добавлять сюда отдельными карточками.
          </p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}