import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Zap, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { categories as seededCategories } from "@shared/schema";
import type { Category, InsertRequest } from "@shared/schema";

const budgetOptions = [
  "до 1 000 ₽",
  "1 000 — 3 000 ₽",
  "3 000 — 7 000 ₽",
  "7 000 — 15 000 ₽",
  "от 15 000 ₽",
  "Обсудим с мастером",
];

interface Props {
  initialCategory?: string;
  onClose: () => void;
}

type Step = 'category' | 'details' | 'location' | 'done';

export function BroadcastModal({ initialCategory, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categoryOptions = seededCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    initialData: seededCategories,
  });

  const [step, setStep] = useState<Step>(initialCategory ? 'details' : 'category');
  const [category, setCategory] = useState(initialCategory ?? "");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: InsertRequest) => apiRequest("POST", "/api/requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setStep("done");
    },
    onError: (error: Error) => {
      toast({
        title: error.message.includes("401") ? "Нужно войти" : "Ошибка",
        description: error.message.includes("401")
          ? "Войдите в профиль клиента, чтобы отправить заявку мастерам."
          : "Не удалось отправить заявку. Попробуйте ещё раз.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!user) {
      toast({
        title: "Нужно войти",
        description: "Войдите в профиль клиента, чтобы отправить заявку мастерам.",
        variant: "destructive",
      });
      return;
    }
    const title = `${category}: ${description.slice(0, 40)}${description.length > 40 ? "..." : ""}`;
    createMutation.mutate({ title, category, description, budget, location });
  };

  const canGoNext = () => {
    if (step === "category") return category !== "";
    if (step === "details") return description.trim().length >= 5 && budget !== "";
    if (step === "location") return location.trim().length >= 3;
    return false;
  };

  const stepIndex = { category: 0, details: 1, location: 2, done: 3 };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background rounded-t-3xl max-h-[90vh] overflow-y-auto safe-area-pb">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {step !== "done" && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base">Найти мастера</h2>
            </div>
            <button onClick={onClose} aria-label="Закрыть" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </span>
            </button>
          </div>
        )}

        {step !== "done" && (
          <div className="flex items-center justify-center gap-2 py-3" aria-label={`Шаг ${stepIndex[step] + 1} из 3`}>
            <span className="text-xs font-medium text-muted-foreground">Шаг {stepIndex[step] + 1} из 3</span>
            {["category", "details", "location"].map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  stepIndex[step] >= i ? "bg-primary w-6" : "bg-border w-3"
                )}
              />
            ))}
          </div>
        )}

        <div className="px-5 pb-8">
          {step === "category" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Какая услуга нужна?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Подходящие мастера смогут предложить цену и написать вам</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.id}
                    data-testid={`category-${cat.id}`}
                    onClick={() => setCategory(cat.name)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all",
                      category === cat.name
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-card text-foreground hover:border-primary/50"
                    )}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep("details")}
                disabled={!canGoNext()}
                data-testid="button-next-category"
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                Далее <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Опишите задачу</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Категория: <span className="font-medium text-foreground">{category}</span></p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Что нужно сделать?</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Например: заменить смеситель на кухне, старый потёк снизу..."
                  data-testid="input-description"
                  rows={4}
                  className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground text-right">{description.length}/300</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Бюджет</label>
                <div className="flex flex-wrap gap-2">
                  {budgetOptions.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBudget(b)}
                      data-testid={`budget-${b}`}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border text-sm font-medium transition-all",
                        budget === b
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("category")}
                  className="py-3.5 px-5 rounded-2xl border border-border font-semibold text-sm"
                >
                  Назад
                </button>
                <button
                  onClick={() => setStep("location")}
                  disabled={!canGoNext()}
                  data-testid="button-next-details"
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Далее <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === "location" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Где выполнить работу?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Точный адрес откроется только мастеру, которого вы выберете</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Адрес</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="ул. Шейха Мансура, 45, Грозный"
                  data-testid="input-location"
                  className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="rounded-2xl bg-muted/50 border border-border/60 p-4 space-y-1.5 text-sm">
                <p className="font-semibold text-foreground">Сводка заявки</p>
                <p className="text-muted-foreground">📂 {category}</p>
                <p className="text-muted-foreground line-clamp-2">📝 {description}</p>
                <p className="text-muted-foreground">💰 {budget}</p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Мастера категории «{category}» смогут отправить вам цену и комментарий. Вы сами выберете подходящий отклик.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("details")}
                  className="py-3.5 px-5 rounded-2xl border border-border font-semibold text-sm"
                >
                  Назад
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canGoNext() || createMutation.isPending}
                  data-testid="button-submit-request"
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Отправляем...</>
                    : <><Zap className="w-4 h-4" />Отправить мастерам</>
                  }
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="py-8 flex flex-col items-center gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Заявка отправлена!</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Подходящие мастера уже могут увидеть задачу и предложить цену.<br />
                  Выберите исполнителя после получения откликов.
                </p>
              </div>
              <div className="rounded-2xl bg-primary/5 border border-primary/20 px-5 py-3 text-sm text-muted-foreground">
                Следите за предложениями в разделе <span className="font-semibold text-foreground">«Мои заявки»</span>
              </div>
              <button
                onClick={onClose}
                data-testid="button-done"
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold"
              >
                Готово
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
