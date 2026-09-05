import { ChevronRight, LayoutGrid, PackageSearch } from "lucide-react";
import { Link } from "wouter";
import { BottomNavigation } from "@/components/bottom-navigation";

const sections = [
  {
    href: "/lost-found",
    icon: PackageSearch,
    title: "Потеряно / Найдено",
    description: "Объявления о потерянных и найденных вещах, документах и животных",
  },
] as const;

export default function MorePage() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-background/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs text-muted-foreground">Служба 995</p>
          <h1 className="mt-1 text-2xl font-bold">Ещё</h1>
          <p className="mt-1 text-sm text-muted-foreground">Дополнительные полезные разделы</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-3 px-4 py-5">
        {sections.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={title}
            href={href}
            className="pressable flex min-h-[104px] items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <div className="shrink-0 rounded-2xl bg-primary/10 p-3 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}

        <div className="rounded-2xl border border-dashed border-border p-5 text-center">
          <LayoutGrid className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Здесь будут появляться новые разделы
          </p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}