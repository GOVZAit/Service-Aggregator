import { useEffect, useRef, useState } from "react";
import { Search, Send, ShieldCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "welcome-onboarding-seen";

const slides = [
  {
    icon: Search,
    color: "#007AFF",
    title: "Найдите мастера",
    text: "Выберите категорию или воспользуйтесь поиском — сотни проверенных мастеров Грозного рядом с вами.",
  },
  {
    icon: Send,
    color: "#34C759",
    title: "Оставьте заявку",
    text: "Опишите задачу один раз — свободные мастера сами откликнутся, вам останется выбрать лучшего.",
  },
  {
    icon: ShieldCheck,
    color: "#FF9500",
    title: "Работайте безопасно",
    text: "Значок «проверено» — личность мастера подтверждена. Отзывы и рейтинги помогут сделать выбор.",
  },
];

export function useWelcomeOnboarding() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch { /* ignore */ }
  }, []);
  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };
  return { show, dismiss };
}

export function WelcomeOnboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slide = slides[index];
  const Icon = slide.icon;
  const isLast = index === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col" role="dialog" aria-modal="true" aria-label="Знакомство с приложением">
      <div className="flex justify-end px-5 pt-14">
        <button onClick={onDone} data-testid="button-onboarding-close" className="text-sm text-muted-foreground py-2 px-3 min-h-11">
          Пропустить
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 transition-all"
          style={{ backgroundColor: slide.color + "20" }}
        >
          <Icon className="w-12 h-12" style={{ color: slide.color }} />
        </div>
        <h1 className="text-2xl font-bold mb-3" data-testid="text-onboarding-title">{slide.title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{slide.text}</p>
      </div>

      <div className="px-6 pb-12 space-y-6 safe-area-pb w-full max-w-md mx-auto">
        <div className="flex justify-center gap-2" aria-label={`Экран ${index + 1} из ${slides.length}`}>
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-2 bg-muted"
              )}
            />
          ))}
        </div>
        <button
          ref={nextRef}
          onClick={() => (isLast ? onDone() : setIndex(index + 1))}
          data-testid="button-onboarding-next"
          className="w-full h-13 py-3.5 rounded-2xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2"
        >
          {isLast ? "Начать" : "Далее"} {!isLast && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
