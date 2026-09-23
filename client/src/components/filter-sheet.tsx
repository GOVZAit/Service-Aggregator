import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronDown,
  ListChecks,
  MapPin,
  Medal,
  SlidersHorizontal,
  Star,
  UserRound,
  Wifi,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutorType, Master } from "@shared/schema";

export type SortBy =
  | "rating"
  | "price_asc"
  | "price_desc"
  | "reviews"
  | "distance"
  | "completed_orders";

export type ProviderTypeFilter = "all" | "master" | "organization";

export interface FilterState {
  sortBy: SortBy;
  verifiedOnly: boolean;
  onlineOnly: boolean;
  certifiedOnly: boolean;
  topMasterOnly: boolean;
  executorType: ExecutorType | "all";
  providerType: ProviderTypeFilter;
  minRating: number;
  minPrice: number | null;
  maxPrice: number | null;
  maxDistance: number | null;
  minReviews: number;
  minCompletedOrders: number;
}

export const defaultFilterState: FilterState = {
  sortBy: "rating",
  verifiedOnly: false,
  onlineOnly: false,
  certifiedOnly: false,
  topMasterOnly: false,
  executorType: "all",
  providerType: "all",
  minRating: 0,
  minPrice: null,
  maxPrice: null,
  maxDistance: null,
  minReviews: 0,
  minCompletedOrders: 0,
};

export function extractMinPrice(price: string): number {
  const matches = price.replace(/\s/g, "").match(/\d+/g);
  if (!matches?.length) return 0;
  return Number(matches[0]) || 0;
}

export function extractDistanceKm(distance: string): number {
  const normalized = distance.replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

export function applyMasterFilters(masters: Master[], state: FilterState): Master[] {
  let result = masters;

  if (state.verifiedOnly) result = result.filter((m) => m.verified);
  if (state.onlineOnly) result = result.filter((m) => m.isOnline);
  if (state.certifiedOnly) result = result.filter((m) => m.hasCertificate);
  if (state.topMasterOnly) result = result.filter((m) => m.topMaster);
  if (state.executorType !== "all") {
    result = result.filter((m) => (m.executorType ?? "private") === state.executorType);
  }
  if (state.providerType !== "all") {
    result = result.filter((m) => (m.providerType ?? "master") === state.providerType);
  }
  if (state.minRating > 0) result = result.filter((m) => m.rating >= state.minRating);
  if (state.minPrice !== null) result = result.filter((m) => extractMinPrice(m.price) >= state.minPrice!);
  if (state.maxPrice !== null) result = result.filter((m) => extractMinPrice(m.price) <= state.maxPrice!);
  if (state.maxDistance !== null) {
    result = result.filter((m) => extractDistanceKm(m.distance) <= state.maxDistance!);
  }
  if (state.minReviews > 0) result = result.filter((m) => m.reviews >= state.minReviews);
  if (state.minCompletedOrders > 0) {
    result = result.filter((m) => m.completedOrders >= state.minCompletedOrders);
  }

  return result;
}

export function sortMasters(masters: Master[], state: FilterState): Master[] {
  return [...masters].sort((a, b) => {
    switch (state.sortBy) {
      case "reviews":
        return b.reviews - a.reviews;
      case "price_asc":
        return extractMinPrice(a.price) - extractMinPrice(b.price);
      case "price_desc":
        return extractMinPrice(b.price) - extractMinPrice(a.price);
      case "distance":
        return extractDistanceKm(a.distance) - extractDistanceKm(b.distance);
      case "completed_orders":
        return b.completedOrders - a.completedOrders;
      case "rating":
      default:
        return b.rating - a.rating || b.reviews - a.reviews;
    }
  });
}

export function getActiveFilterCount(state: FilterState): number {
  return [
    state.sortBy !== defaultFilterState.sortBy,
    state.verifiedOnly,
    state.onlineOnly,
    state.certifiedOnly,
    state.topMasterOnly,
    state.executorType !== "all",
    state.providerType !== "all",
    state.minRating > 0,
    state.minPrice !== null,
    state.maxPrice !== null,
    state.maxDistance !== null,
    state.minReviews > 0,
    state.minCompletedOrders > 0,
  ].filter(Boolean).length;
}

export function getActiveFilterChips(state: FilterState): Array<{
  key: keyof FilterState | "price";
  label: string;
  clear: (current: FilterState) => FilterState;
}> {
  const chips: Array<{
    key: keyof FilterState | "price";
    label: string;
    clear: (current: FilterState) => FilterState;
  }> = [];

  if (state.verifiedOnly) chips.push({ key: "verifiedOnly", label: "Проверенные", clear: (s) => ({ ...s, verifiedOnly: false }) });
  if (state.onlineOnly) chips.push({ key: "onlineOnly", label: "Онлайн", clear: (s) => ({ ...s, onlineOnly: false }) });
  if (state.certifiedOnly) chips.push({ key: "certifiedOnly", label: "С сертификатом", clear: (s) => ({ ...s, certifiedOnly: false }) });
  if (state.topMasterOnly) chips.push({ key: "topMasterOnly", label: "Топ-мастера", clear: (s) => ({ ...s, topMasterOnly: false }) });
  if (state.minRating > 0) chips.push({ key: "minRating", label: `Рейтинг от ${state.minRating}`, clear: (s) => ({ ...s, minRating: 0 }) });
  if (state.maxDistance !== null) chips.push({ key: "maxDistance", label: `До ${state.maxDistance} км`, clear: (s) => ({ ...s, maxDistance: null }) });
  if (state.minPrice !== null || state.maxPrice !== null) {
    const from = state.minPrice !== null ? `от ${state.minPrice.toLocaleString("ru-RU")} ₽` : "";
    const to = state.maxPrice !== null ? `до ${state.maxPrice.toLocaleString("ru-RU")} ₽` : "";
    chips.push({
      key: "price",
      label: [from, to].filter(Boolean).join(" "),
      clear: (s) => ({ ...s, minPrice: null, maxPrice: null }),
    });
  }
  if (state.minReviews > 0) chips.push({ key: "minReviews", label: `Отзывов от ${state.minReviews}`, clear: (s) => ({ ...s, minReviews: 0 }) });
  if (state.minCompletedOrders > 0) chips.push({ key: "minCompletedOrders", label: `Заказов от ${state.minCompletedOrders}`, clear: (s) => ({ ...s, minCompletedOrders: 0 }) });
  if (state.executorType !== "all") {
    const label = state.executorType === "private" ? "Частное лицо" : state.executorType === "self_employed" ? "Самозанятый" : "Компания";
    chips.push({ key: "executorType", label, clear: (s) => ({ ...s, executorType: "all" }) });
  }
  if (state.providerType !== "all") {
    chips.push({
      key: "providerType",
      label: state.providerType === "master" ? "Мастер" : "Организация",
      clear: (s) => ({ ...s, providerType: "all" }),
    });
  }
  if (state.sortBy !== "rating") {
    const sortLabel: Record<SortBy, string> = {
      rating: "По рейтингу",
      reviews: "По отзывам",
      price_asc: "Сначала дешевле",
      price_desc: "Сначала дороже",
      distance: "Сначала ближе",
      completed_orders: "По заказам",
    };
    chips.push({ key: "sortBy", label: sortLabel[state.sortBy], clear: (s) => ({ ...s, sortBy: "rating" }) });
  }

  return chips;
}

interface FilterSheetProps {
  value: FilterState;
  onChange: (v: FilterState) => void;
  onClose: () => void;
  masters: Master[];
}

interface FilterPanelProps {
  value: FilterState;
  onChange: (v: FilterState) => void;
}

const sortOptions: { key: SortBy; label: string }[] = [
  { key: "rating", label: "Рейтинг" },
  { key: "reviews", label: "Отзывы" },
  { key: "completed_orders", label: "Выполненные заказы" },
  { key: "price_asc", label: "Цена: сначала ниже" },
  { key: "price_desc", label: "Цена: сначала выше" },
  { key: "distance", label: "Расстояние" },
];

const ratingOptions = [0, 4, 4.5, 4.8] as const;
const distanceOptions = [null, 1, 3, 5, 10] as const;
const reviewOptions = [0, 5, 10, 25, 50] as const;
const orderOptions = [0, 5, 10, 25, 50] as const;

function SectionTitle({ icon: Icon, children }: { icon: typeof Star; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <p className="text-sm font-bold">{children}</p>
    </div>
  );
}

function ChoiceChips<T extends string | number | null>({
  options,
  value,
  onChange,
  renderLabel,
  ariaLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  renderLabel: (value: T) => string;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option, index) => {
        const active = value === option;
        return (
          <button
            key={String(option ?? `all-${index}`)}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={cn(
              "pressable min-h-11 rounded-full border px-3.5 text-sm font-semibold",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/75 bg-background text-foreground"
            )}
          >
            {renderLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

function SwitchRow({
  active,
  onClick,
  icon: Icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Star;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="pressable flex min-h-12 w-full items-center gap-3 rounded-2xl px-1 text-left"
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", active ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground")}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", active ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all", active ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

function FilterControls({
  value,
  onChange,
  compact = false,
}: {
  value: FilterState;
  onChange: (v: FilterState) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-6", compact && "space-y-5")}>
      <section>
        <SectionTitle icon={ArrowUpDown}>Сортировка</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {sortOptions.map((option) => {
            const active = value.sortBy === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onChange({ ...value, sortBy: option.key })}
                aria-pressed={active}
                className={cn(
                  "pressable min-h-11 rounded-xl border px-3 text-left text-xs font-semibold",
                  active ? "border-primary bg-primary/10 text-primary" : "border-border/75 bg-background"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle icon={Star}>Минимальный рейтинг</SectionTitle>
        <ChoiceChips
          options={ratingOptions}
          value={value.minRating}
          onChange={(minRating) => onChange({ ...value, minRating })}
          renderLabel={(option) => option === 0 ? "Любой" : `${option}+`}
          ariaLabel="Минимальный рейтинг"
        />
      </section>

      <section>
        <SectionTitle icon={MapPin}>Расстояние</SectionTitle>
        <ChoiceChips
          options={distanceOptions}
          value={value.maxDistance}
          onChange={(maxDistance) => onChange({ ...value, maxDistance })}
          renderLabel={(option) => option === null ? "Любое" : `до ${option} км`}
          ariaLabel="Максимальное расстояние"
        />
      </section>

      <section>
        <SectionTitle icon={SlidersHorizontal}>Цена</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">От, ₽</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={value.minPrice ?? ""}
              onChange={(event) => onChange({ ...value, minPrice: event.target.value === "" ? null : Math.max(0, Number(event.target.value)) })}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">До, ₽</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={value.maxPrice ?? ""}
              onChange={(event) => onChange({ ...value, maxPrice: event.target.value === "" ? null : Math.max(0, Number(event.target.value)) })}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="Без лимита"
            />
          </label>
        </div>
      </section>

      <section>
        <SectionTitle icon={ListChecks}>Опыт</SectionTitle>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Минимум отзывов</p>
        <ChoiceChips
          options={reviewOptions}
          value={value.minReviews}
          onChange={(minReviews) => onChange({ ...value, minReviews })}
          renderLabel={(option) => option === 0 ? "Любое" : `${option}+`}
          ariaLabel="Минимальное количество отзывов"
        />
        <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Выполненных заказов</p>
        <ChoiceChips
          options={orderOptions}
          value={value.minCompletedOrders}
          onChange={(minCompletedOrders) => onChange({ ...value, minCompletedOrders })}
          renderLabel={(option) => option === 0 ? "Любое" : `${option}+`}
          ariaLabel="Минимальное количество выполненных заказов"
        />
      </section>

      <section>
        <SectionTitle icon={BadgeCheck}>Качество и доступность</SectionTitle>
        <div className="divide-y divide-border/60">
          <SwitchRow active={value.verifiedOnly} onClick={() => onChange({ ...value, verifiedOnly: !value.verifiedOnly })} icon={BadgeCheck} label="Проверенные" />
          <SwitchRow active={value.onlineOnly} onClick={() => onChange({ ...value, onlineOnly: !value.onlineOnly })} icon={Wifi} label="Онлайн сейчас" />
          <SwitchRow active={value.certifiedOnly} onClick={() => onChange({ ...value, certifiedOnly: !value.certifiedOnly })} icon={Award} label="Есть сертификат" />
          <SwitchRow active={value.topMasterOnly} onClick={() => onChange({ ...value, topMasterOnly: !value.topMasterOnly })} icon={Medal} label="Топ-мастер" />
        </div>
      </section>

      <section>
        <SectionTitle icon={Briefcase}>Статус исполнителя</SectionTitle>
        <ChoiceChips
          options={["all", "private", "self_employed", "company"] as const}
          value={value.executorType}
          onChange={(executorType) => onChange({ ...value, executorType })}
          renderLabel={(option) =>
            option === "all" ? "Все" :
            option === "private" ? "Частное лицо" :
            option === "self_employed" ? "Самозанятый" : "Компания"
          }
          ariaLabel="Статус исполнителя"
        />
      </section>

      <section>
        <SectionTitle icon={Building2}>Тип профиля</SectionTitle>
        <ChoiceChips
          options={["all", "master", "organization"] as const}
          value={value.providerType}
          onChange={(providerType) => onChange({ ...value, providerType })}
          renderLabel={(option) => option === "all" ? "Все" : option === "master" ? "Мастер" : "Организация"}
          ariaLabel="Тип профиля"
        />
      </section>
    </div>
  );
}

export default function FilterSheet({ value, onChange, onClose, masters }: FilterSheetProps) {
  const [draft, setDraft] = useState<FilterState>(value);
  const resultCount = useMemo(() => sortMasters(applyMasterFilters(masters, draft), draft).length, [masters, draft]);
  const activeCount = getActiveFilterCount(draft);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть фильтры"
        className="absolute inset-0 h-full w-full bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Фильтры и сортировка"
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[1.75rem] bg-background shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[430px] md:rounded-none md:border-l md:border-border"
      >
        <div className="shrink-0 md:hidden">
          <div className="flex justify-center pb-1 pt-3">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        </div>

        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/96 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div>
            <h2 className="text-lg font-extrabold">Фильтры</h2>
            <p className="text-xs text-muted-foreground">
              {activeCount > 0 ? `Активно: ${activeCount}` : "Точная настройка выдачи"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть фильтры"
            className="pressable flex h-11 w-11 items-center justify-center rounded-full bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          <FilterControls value={draft} onChange={setDraft} />
        </div>

        <footer className="safe-area-pb shrink-0 border-t border-border/60 bg-background/96 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(defaultFilterState)}
              disabled={activeCount === 0}
              className="pressable h-12 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground disabled:opacity-40"
            >
              Сбросить
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(draft);
                onClose();
              }}
              className="pressable h-12 flex-1 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              Показать {resultCount}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function DesktopSection({
  title,
  icon: Icon,
  children,
  open = false,
}: {
  title: string;
  icon: typeof Star;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group border-b border-border/60 pb-4 last:border-0 last:pb-0" open={open}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        <span className="flex-1">{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

export function FilterPanel({ value, onChange }: FilterPanelProps) {
  const activeCount = getActiveFilterCount(value);

  return (
    <div className="space-y-4" data-testid="filter-panel-desktop">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold">Фильтры</p>
          <p className="text-xs text-muted-foreground">
            {activeCount > 0 ? `Активно: ${activeCount}` : "Без ограничений"}
          </p>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange(defaultFilterState)}
            className="min-h-11 px-2 text-xs font-bold text-primary"
          >
            Сбросить
          </button>
        )}
      </div>

      <DesktopSection title="Сортировка" icon={ArrowUpDown} open>
        <div className="grid grid-cols-1 gap-2">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange({ ...value, sortBy: option.key })}
              aria-pressed={value.sortBy === option.key}
              className={cn(
                "min-h-11 rounded-xl border px-3 text-left text-xs font-semibold",
                value.sortBy === option.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/75 bg-background"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </DesktopSection>

      <DesktopSection title="Рейтинг и расстояние" icon={MapPin} open>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Рейтинг</p>
        <ChoiceChips
          options={ratingOptions}
          value={value.minRating}
          onChange={(minRating) => onChange({ ...value, minRating })}
          renderLabel={(option) => option === 0 ? "Любой" : `${option}+`}
          ariaLabel="Минимальный рейтинг"
        />
        <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Расстояние</p>
        <ChoiceChips
          options={distanceOptions}
          value={value.maxDistance}
          onChange={(maxDistance) => onChange({ ...value, maxDistance })}
          renderLabel={(option) => option === null ? "Любое" : `${option} км`}
          ariaLabel="Максимальное расстояние"
        />
      </DesktopSection>

      <DesktopSection title="Цена и опыт" icon={SlidersHorizontal}>
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="Минимальная цена"
            type="number"
            min={0}
            value={value.minPrice ?? ""}
            onChange={(e) => onChange({ ...value, minPrice: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
            placeholder="От ₽"
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            aria-label="Максимальная цена"
            type="number"
            min={0}
            value={value.maxPrice ?? ""}
            onChange={(e) => onChange({ ...value, maxPrice: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
            placeholder="До ₽"
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Отзывы</p>
        <ChoiceChips
          options={reviewOptions}
          value={value.minReviews}
          onChange={(minReviews) => onChange({ ...value, minReviews })}
          renderLabel={(option) => option === 0 ? "Любое" : `${option}+`}
          ariaLabel="Минимальное количество отзывов"
        />
        <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Заказы</p>
        <ChoiceChips
          options={orderOptions}
          value={value.minCompletedOrders}
          onChange={(minCompletedOrders) => onChange({ ...value, minCompletedOrders })}
          renderLabel={(option) => option === 0 ? "Любое" : `${option}+`}
          ariaLabel="Минимальное количество выполненных заказов"
        />
      </DesktopSection>

      <DesktopSection title="Качество" icon={BadgeCheck} open>
        <div className="divide-y divide-border/60">
          <SwitchRow active={value.verifiedOnly} onClick={() => onChange({ ...value, verifiedOnly: !value.verifiedOnly })} icon={BadgeCheck} label="Проверенные" />
          <SwitchRow active={value.onlineOnly} onClick={() => onChange({ ...value, onlineOnly: !value.onlineOnly })} icon={Wifi} label="Онлайн" />
          <SwitchRow active={value.certifiedOnly} onClick={() => onChange({ ...value, certifiedOnly: !value.certifiedOnly })} icon={Award} label="С сертификатом" />
          <SwitchRow active={value.topMasterOnly} onClick={() => onChange({ ...value, topMasterOnly: !value.topMasterOnly })} icon={Medal} label="Топ-мастер" />
        </div>
      </DesktopSection>

      <DesktopSection title="Тип исполнителя" icon={UserRound}>
        <ChoiceChips
          options={["all", "private", "self_employed", "company"] as const}
          value={value.executorType}
          onChange={(executorType) => onChange({ ...value, executorType })}
          renderLabel={(option) =>
            option === "all" ? "Все" :
            option === "private" ? "Частное лицо" :
            option === "self_employed" ? "Самозанятый" : "Компания"
          }
          ariaLabel="Статус исполнителя"
        />
        <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Профиль</p>
        <ChoiceChips
          options={["all", "master", "organization"] as const}
          value={value.providerType}
          onChange={(providerType) => onChange({ ...value, providerType })}
          renderLabel={(option) => option === "all" ? "Все" : option === "master" ? "Мастер" : "Организация"}
          ariaLabel="Тип профиля"
        />
      </DesktopSection>
    </div>
  );
}
