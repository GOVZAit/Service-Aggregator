import { useState } from "react";
import { X, Star, BadgeCheck, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortBy = "rating" | "price_asc" | "price_desc" | "reviews" | "distance";

export interface FilterState {
  sortBy: SortBy;
  verifiedOnly: boolean;
}

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

export default function FilterSheet({ value, onChange, onClose, totalCount }: FilterSheetProps) {
  const [draft, setDraft] = useState<FilterState>(value);

  const apply = () => {
    onChange(draft);
    onClose();
  };

  const reset = () => {
    const defaults: FilterState = { sortBy: "rating", verifiedOnly: false };
    setDraft(defaults);
    onChange(defaults);
    onClose();
  };

  const hasChanges =
    draft.sortBy !== "rating" || draft.verifiedOnly;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mt-auto w-full bg-background rounded-t-3xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-border/60">
          <h2 className="font-bold text-lg">Фильтры и сортировка</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
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
            <button
              onClick={() => setDraft((d) => ({ ...d, verifiedOnly: !d.verifiedOnly }))}
              data-testid="filter-verified-only"
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                draft.verifiedOnly ? "border-primary bg-primary/5" : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                <BadgeCheck className={cn("w-5 h-5", draft.verifiedOnly ? "text-primary" : "text-muted-foreground")} />
                <div className="text-left">
                  <p className={cn("text-sm font-medium", draft.verifiedOnly && "text-primary")}>Только проверенные</p>
                  <p className="text-xs text-muted-foreground">Мастера с верификацией</p>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                draft.verifiedOnly ? "bg-primary" : "bg-muted"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                  draft.verifiedOnly ? "right-1" : "left-1"
                )} />
              </div>
            </button>
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
