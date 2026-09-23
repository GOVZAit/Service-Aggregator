import { ArrowLeft, Home, SearchX } from "lucide-react";
import { useLocation } from "wouter";
import { AppBrandHeader } from "@/components/app-brand-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background safe-area-pt safe-area-pb">
      <main className="mx-auto max-w-lg px-4 py-6">
        <AppBrandHeader compact />

        <section className="hero-gradient mt-10 rounded-[1.75rem] border border-primary/15 p-6 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
            <SearchX className="h-7 w-7" />
          </div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.16em] text-primary">Ошибка 404</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Страница не найдена</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Возможно, ссылка устарела или раздел был перемещён. Вернитесь на главную GOVZA мастера.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-12 rounded-2xl" onClick={() => history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Назад
            </Button>
            <Button className="accent-gradient h-12 rounded-2xl font-bold text-white" onClick={() => navigate("/")}>
              <Home className="mr-2 h-4 w-4" /> На главную
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
