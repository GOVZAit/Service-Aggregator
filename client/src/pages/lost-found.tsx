import { PackageSearch, Search, MapPin } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function LostFoundPage() {
  return (
    <div className="app-page bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl safe-area-pt">
        <div className="mx-auto max-w-lg px-4 py-4 lg:max-w-5xl lg:px-6">
          <p className="text-xs text-muted-foreground">Чеченская Республика</p>
          <h1 className="mt-0.5 text-xl font-bold">Потеряно / Найдено</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 lg:max-w-5xl lg:px-6">
        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <PackageSearch className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Раздел объявлений</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Здесь будут объявления о потерянных и найденных вещах, документах и животных.
          </p>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4">
            <Search className="h-5 w-5 text-primary" />
            <p className="mt-3 font-semibold">Потеряно</p>
            <p className="mt-1 text-xs text-muted-foreground">Объявления о пропаже</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <MapPin className="h-5 w-5 text-primary" />
            <p className="mt-3 font-semibold">Найдено</p>
            <p className="mt-1 text-xs text-muted-foreground">Найденные вещи</p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Публикация объявлений появится в следующем обновлении.
        </p>
      </main>

      <BottomNavigation />
    </div>
  );
}