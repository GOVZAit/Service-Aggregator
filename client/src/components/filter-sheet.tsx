import { useState } from "react";
import { X, Star, BadgeCheck, ArrowUpDown, Wifi, Award, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutorType } from "@shared/schema";

export type SortBy = "rating" | "price_asc" | "price_desc" | "reviews" | "distance";

export interface FilterState {
  sortBy: SortBy;
  verifiedOnly: boolean;
  onlineOnly: boolean;
  certifiedOnly: boolean;
  executorType: ExecutorType | "all";
}

export const defaultFilterState: FilterState = {
  sortBy: "rating",
  verifiedOnly: false,
  onlineOnly: false,
  certifiedOnly: false,
  executorType: "all",
};

interface FilterSheetProps {
  value: FilterState;
  onChange: (v: FilterState) => void;
  onClose: () => void;
  totalCount: number;
}

const sortOptions: { key: SortBy; label: string; desc: string }[] = [
  { key: "rating", label: "По рейтингу", desc: "Сначала лучшие" },
  { key: "reviews", label: "По отзывам", desc: "Больше всего отзывов" },
  { key: "price_asc", label: "По цене ↑", desc: "Сначала дешевле" },
  { key: "price_desc", label: "По цене ↓", desc: "Сначала дороже" },
  { key: "distance", label: "По расстоянию", desc: "Ближайшие первые" },
];

interface FilterPanelProps {
  value: FilterState;
  onChange: (v: FilterState) => void;
}
export default function FilterSheet({ value, onChange, onClose, totalCount }: FilterSheetProps) {
  const [draft, setDraft] = useState<FilterState>(value);

  const apply = () => {
    onChange(draft);
    onClose();
  };

  const reset = () => {
    setDraft(defaultFilterState);
    onChange(defaultFilterState);
    onClose();
  };

  const hasChanges =
    draft.sortBy !== "rating" || draft.verifiedOnly || draft.onlineOnly ||
    draft.certifiedOnly || draft.executorType !== "all";

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mt-auto w-full bg-background rounded-t-3xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-border/60">
          <h2 className="font-bold text-lg">Фильтры и сортировка</h2>
          <button onClick={onClose} aria-label="Закрыть фильтры" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center">
            <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </span>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Sort */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpDown className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Сортировка</p>
            </div>
            <div className="space-y-2">
              {sortOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDraft((d) => ({ ...d, sortBy: opt.key }))}
                  data-testid={`sort-option-${opt.key}`}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left",
                    draft.sortBy === opt.key
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div>
                    <p className={cn("text-sm font-medium", draft.sortBy === opt.key && "text-primary")}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    draft.sortBy === opt.key ? "border-primary bg-primary" : "border-border"
                  )}>
                    {draft.sortBy === opt.key && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Фильтры</p>
            </div>
            <div className="space-y-2">
              {([
                { key: "verifiedOnly" as const, icon: BadgeCheck, label: "Только проверенные", desc: "Личность подтверждена командой" },
                { key: "onlineOnly" as const, icon: Wifi, label: "Онлайн сейчас", desc: "Быстрее ответят на заявку" },
                { key: "certifiedOnly" as const, icon: Award, label: "Есть сертификат", desc: "Подтверждённая квалификация" },
              ]).map(({ key, icon: Icon, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setDraft((d) => ({ ...d, [key]: !d[key] }))}
                  data-testid={`filter-${key}`}
                  aria-pressed={draft[key]}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                    draft[key] ? "border-primary bg-primary/5" : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-5 h-5", draft[key] ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-left">
                      <p className={cn("text-sm font-medium", draft[key] && "text-primary")}>{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full transition-all relative shrink-0",
                    draft[key] ? "bg-primary" : "bg-muted"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                      draft[key] ? "right-1" : "left-1"
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Executor type */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Кто исполнитель</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all", label: "Все" },
                { key: "private", label: "Частное лицо" },
                { key: "self_employed", label: "Самозанятый" },
                { key: "company", label: "Компания" },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDraft((d) => ({ ...d, executorType: opt.key }))}
                  data-testid={`filter-executor-${opt.key}`}
                  className={cn(
                    "px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                    draft.executorType === opt.key
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/60 flex gap-3">
          {hasChanges && (
            <button
              onClick={reset}
              data-testid="button-filter-reset"
              className="px-4 h-12 rounded-xl border border-border text-sm font-medium text-muted-foreground"
            >
              Сбросить
            </button>
          )}
          <button
            onClick={apply}
            data-testid="button-filter-apply"
            className="flex-1 h-12 rounded-xl bg-primary text-white font-semibold text-sm"
          >
            Показать {totalCount} мастеров
          </button>
        </div>
      </div>
    </div>
  );
}

/** Inline filter panel for the desktop sidebar (applies changes immediately). */
export function FilterPanel({ value, onChange }: FilterPanelProps) {
  const hasChanges =
    value.sortBy !== "rating" || value.verifiedOnly || value.onlineOnly ||
    value.certifiedOnly || value.executorType !== "all";

  return (
    <div className="space-y-5" data-testid="filter-panel-desktop">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Сортировка</p>
        </div>
        <div className="space-y-2">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onChange({ ...value, sortBy: opt.key })}
              data-testid={`desktop-sort-option-${opt.key}`}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left",
                value.sortBy === opt.key
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <div>
                <p className={cn("text-sm font-medium", value.sortBy === opt.key && "text-primary")}>{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                value.sortBy === opt.key ? "border-primary bg-primary" : "border-border"
              )}>
                {value.sortBy === opt.key && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Фильтры</p>
        </div>
        <div className="space-y-2">
          {([
            { key: "verifiedOnly" as const, icon: BadgeCheck, label: "Только проверенные", desc: "Личность подтверждена командой" },
            { key: "onlineOnly" as const, icon: Wifi, label: "Онлайн сейчас", desc: "Быстрее ответят на заявку" },
            { key: "certifiedOnly" as const, icon: Award, label: "Есть сертификат", desc: "Подтверждённая квалификация" },
          ]).map(({ key, icon: Icon, label, desc }) => (
            <button
              key={key}
              onClick={() => onChange({ ...value, [key]: !value[key] })}
              data-testid={`desktop-filter-${key}`}
              aria-pressed={value[key]}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                value[key] ? "border-primary bg-primary/5" : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-5 h-5", value[key] ? "text-primary" : "text-muted-foreground")} />
                <div className="text-left">
                  <p className={cn("text-sm font-medium", value[key] && "text-primary")}>{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full transition-all relative shrink-0",
                value[key] ? "bg-primary" : "bg-muted"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                  value[key] ? "right-1" : "left-1"
                )} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Кто исполнитель</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "all", label: "Все" },
            { key: "private", label: "Частное лицо" },
            { key: "self_employed", label: "Самозанятый" },
            { key: "company", label: "Компания" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => onChange({ ...value, executorType: opt.key })}
              data-testid={`desktop-filter-executor-${opt.key}`}
              className={cn(
                "px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all",
                value.executorType === opt.key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {hasChanges && (
        <button
          onClick={() => onChange(defaultFilterState)}
          data-testid="desktop-button-filter-reset"
          className="w-full h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover-elevate"
        >
          Сбросить фильтры
        </button>
      )}
    </div>
  );
}
