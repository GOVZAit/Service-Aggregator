import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import {
  Briefcase, FileText, CheckCircle2, ChevronRight, BadgeCheck, Award,
  Wrench, Zap, Sparkles, Hammer, Palette, Car, Package, BookOpen,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { executorTypeLabels } from "@shared/schema";
import type { ExecutorType, MasterSettingsInput } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PushNotificationCard } from "@/components/push-notification-card";

type Step = "welcome" | "category" | "details" | "description" | "done";

const categories: { name: string; icon: LucideIcon; color: string }[] = [
  { name: "Сантехника", icon: Wrench, color: "#007AFF" },
  { name: "Электрика", icon: Zap, color: "#FF9500" },
  { name: "Уборка", icon: Sparkles, color: "#34C759" },
  { name: "Ремонт", icon: Hammer, color: "#FF3B30" },
  { name: "Красота", icon: Palette, color: "#FF2D55" },
  { name: "Авто", icon: Car, color: "#5856D6" },
  { name: "Доставка", icon: Package, color: "#AF52DE" },
  { name: "Репетиторы", icon: BookOpen, color: "#00C7BE" },
];

const steps: { key: Step; icon: LucideIcon; label: string }[] = [
  { key: "category", icon: Briefcase, label: "Категория" },
  { key: "details", icon: BadgeCheck, label: "Детали" },
  { key: "description", icon: FileText, label: "О себе" },
  { key: "done", icon: CheckCircle2, label: "Готово" },
];

export default function MasterOnboardingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("welcome");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [executorType, setExecutorType] = useState<ExecutorType | null>(null);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [saveError, setSaveError] = useState("");
  const queryClient = useQueryClient();
  const saveProfile = useMutation({
    mutationFn: (patch: MasterSettingsInput) => apiRequest("PATCH", `/api/masters/${user?.masterId}`, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/masters/${user?.masterId}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/masters"] });
      setStep("done");
    },
    onError: () => setSaveError("Не удалось сохранить профиль. Попробуйте ещё раз."),
  });

  const completeOnboarding = (includeDescription = true) => {
    if (!selectedCategory || !executorType) return;
    const categoryId = categories.findIndex((item) => item.name === selectedCategory) + 1;
    saveProfile.mutate({
      category: selectedCategory,
      categoryId,
      executorType,
      hasCertificate,
      ...(includeDescription && description.trim() ? { description: description.trim() } : {}),
    });
  };

  const stepIndex = steps.findIndex((s) => s.key === step);

  if (step === "welcome") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 text-center safe-area-pt safe-area-pb">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <Briefcase className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          Добро пожаловать, {user?.name?.split(" ")[0] || "мастер"}!
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-8">
          Давайте настроим ваш профиль мастера — это займёт меньше минуты. Мастера с заполненным профилем получают в 3× больше заявок.
        </p>

        <div className="w-full space-y-3 mb-8">
          {[
            "Выберите категорию услуг",
            "Напишите пару слов о себе",
            "Начните получать заявки",
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3 text-left bg-muted rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <p className="text-sm font-medium">{text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep("category")}
          data-testid="button-onboarding-start"
          className="w-full h-13 py-3.5 rounded-2xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2"
        >
          Начать настройку <ChevronRight className="w-5 h-5" />
        </button>
        <div className="w-full mb-5 text-left">
          <PushNotificationCard />
        </div>

        <button
          onClick={() => navigate("/master")}
          className="mt-3 text-sm text-muted-foreground"
          data-testid="button-onboarding-skip"
        >
          Пропустить пока
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 text-center safe-area-pt safe-area-pb">
        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Профиль готов!</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-8">
          Ваш профиль активен. Включите онлайн на главной и начните получать заявки от клиентов Грозного.
        </p>

        <div className="w-full rounded-2xl bg-muted p-4 text-sm space-y-2 mb-8 text-left">
          {selectedCategory && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Категория</span>
              <span className="font-medium">{selectedCategory}</span>
            </div>
          )}
          {executorType && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Тип мастера</span>
              <span className="font-medium">{executorTypeLabels[executorType]}{hasCertificate ? " · сертификат" : ""}</span>
            </div>
          )}
          {description && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">О себе</span>
              <span className="font-medium text-right line-clamp-2">{description}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/master")}
          data-testid="button-onboarding-finish"
          className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-base"
        >
          Перейти на главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col safe-area-pt">
      {/* Progress */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => {
            const isDone = i < stepIndex;
            const isActive = s.key === step;
            return (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all",
                  isDone ? "bg-primary text-white" : isActive ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"
                )}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1 rounded-full transition-all", isDone ? "bg-primary" : "bg-muted")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-5 pb-6">
        {step === "category" && (
          <>
            <h2 className="text-xl font-bold mb-1">Ваша специализация</h2>
            <p className="text-muted-foreground text-sm mb-5">Выберите основную категорию услуг</p>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(({ name, icon: Icon, color }) => (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(name)}
                  data-testid={`onboarding-category-${name}`}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                    selectedCategory === name
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: color + "20" }}
                  >
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <p className={cn("text-sm font-medium", selectedCategory === name && "text-primary")}>{name}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "details" && (
          <>
            <h2 className="text-xl font-bold mb-1">Как вы работаете?</h2>
            <p className="text-muted-foreground text-sm mb-5">Это увидят клиенты в вашем профиле</p>
            <div className="space-y-2 mb-6">
              {(Object.keys(executorTypeLabels) as ExecutorType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setExecutorType(t)}
                  data-testid={`onboarding-executor-${t}`}
                  aria-pressed={executorType === t}
                  className={cn(
                    "w-full px-4 py-3.5 rounded-2xl border-2 text-left text-sm font-medium transition-all",
                    executorType === t ? "border-primary bg-primary/5 text-primary" : "border-border bg-card"
                  )}
                >
                  {executorTypeLabels[t]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setHasCertificate(!hasCertificate)}
              data-testid="onboarding-toggle-certificate"
              aria-pressed={hasCertificate}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all",
                hasCertificate ? "border-primary bg-primary/5" : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3 text-left">
                <Award className={cn("w-5 h-5 shrink-0", hasCertificate ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className={cn("text-sm font-medium", hasCertificate && "text-primary")}>У меня есть сертификат / диплом</p>
                  <p className="text-xs text-muted-foreground">Подтвердите позже фото документа</p>
                </div>
              </div>
              <div className={cn("w-12 h-6 rounded-full transition-all relative shrink-0", hasCertificate ? "bg-primary" : "bg-muted")}>
                <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all", hasCertificate ? "right-1" : "left-1")} />
              </div>
            </button>
          </>
        )}

        {step === "description" && (
          <>
            <h2 className="text-xl font-bold mb-1">Расскажите о себе</h2>
            <p className="text-muted-foreground text-sm mb-5">
              Клиенты выбирают мастеров с подробным описанием в 4× чаще
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              placeholder="Например: Опытный сантехник с 10-летним стажем. Работаю по всему Грозному, гарантия на все работы..."
              rows={6}
              data-testid="input-onboarding-description"
              className="w-full px-4 py-3 rounded-2xl bg-muted border border-border text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground mt-2">{description.length} / 300 символов</p>

            <div className="mt-5 space-y-2">
              {["Опыт работы и специализация", "Гарантии на выполненные работы", "Область обслуживания (районы, города)"].map((tip) => (
                <div key={tip} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {tip}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-3 shrink-0">
        <button
          onClick={() => {
            if (step === "category") setStep("details");
            else if (step === "details") setStep("description");
            else if (step === "description") completeOnboarding(true);
          }}
          disabled={(step === "category" && !selectedCategory) || (step === "details" && !executorType)}
          data-testid="button-onboarding-next"
          className={cn(
            "w-full py-3.5 rounded-2xl font-bold text-base transition-all",
            (step === "description" || (step === "details" ? executorType : selectedCategory))
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {step === "description" && saveProfile.isPending ? "Сохраняем..." : step === "description" ? "Завершить настройку" : "Далее"}
        </button>
        {step === "description" && (
          <button
            onClick={() => completeOnboarding(false)}
            className="w-full min-h-[44px] py-3 text-sm text-muted-foreground"
            data-testid="button-skip-description"
          >
            Заполнить позже
          </button>
        )}
        {saveError && <p className="text-sm text-destructive text-center">{saveError}</p>}
      </div>
    </div>
  );
}
