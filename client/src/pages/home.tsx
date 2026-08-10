import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, SlidersHorizontal, MapPin, X, BadgeCheck, Zap, ChevronDown, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MasterCard } from "@/components/master-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { EmptyState } from "@/components/empty-state";
import FilterSheet, { FilterPanel, applyMasterFilters, type FilterState, defaultFilterState } from "@/components/filter-sheet";
import { BroadcastModal } from "@/components/broadcast-modal";
import { WelcomeOnboarding, useWelcomeOnboarding } from "@/components/welcome-onboarding";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { districts } from "@shared/schema";
import type { Category, Master } from "@shared/schema";

function MasterCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3 animate-pulse">
      <div className="flex gap-3">
        <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="w-16 h-6 shrink-0" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Skeleton className="aspect-square rounded-lg" />
        <Skeleton className="aspect-square rounded-lg" />
        <Skeleton className="aspect-square rounded-lg" />
      </div>
    </div>
  );
}

function extractMinPrice(price: string): number {
  const match = price.replace(/[^\d]/g, ' ').trim().split(/\s+/)[0];
  return parseInt(match) || 0;
}

const DEFAULT_DISTRICT: string = districts[0]; // "Все районы"

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastCategory, setBroadcastCategory] = useState<string | undefined>();
  const [district, setDistrict] = useState<string>(DEFAULT_DISTRICT);
  const [showLocation, setShowLocation] = useState(false);
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOnboarding();

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: allMasters = [], isLoading: mastersLoading } = useQuery<Master[]>({
    queryKey: ['/api/masters'],
  });

  const toggleFavorite = (masterId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(masterId) ? prev.filter((id) => id !== masterId) : [...prev, masterId]
    );
  };

  // Masters narrowed by district / category / search (before the filter sheet state)
  const baseMasters = useMemo(() => {
    let result = allMasters;

    if (district !== DEFAULT_DISTRICT) {
      result = result.filter((m) => m.district === district);
    }

    if (selectedCategory) {
      result = result.filter((m) => m.categoryId === selectedCategory);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedCategory, debouncedSearch, allMasters, district]);

  const filteredMasters = useMemo(() => {
    const result = applyMasterFilters(baseMasters, filterState);

    return [...result].sort((a, b) => {
      switch (filterState.sortBy) {
        case "rating": return b.rating - a.rating;
        case "reviews": return b.reviews - a.reviews;
        case "price_asc": return extractMinPrice(a.price) - extractMinPrice(b.price);
        case "price_desc": return extractMinPrice(b.price) - extractMinPrice(a.price);
        case "distance": return parseFloat(a.distance) - parseFloat(b.distance);
        default: return 0;
      }
    });
  }, [baseMasters, filterState]);

  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name
    : null;

  const hasActiveFilters =
    filterState.verifiedOnly || filterState.onlineOnly || filterState.certifiedOnly ||
    filterState.executorType !== "all" || filterState.sortBy !== "rating";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "АБ";

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-10">
      {showWelcome && <WelcomeOnboarding onDone={dismissWelcome} />}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border safe-area-pt">
        <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-6 pt-3 pb-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowLocation(true)}
              data-testid="button-location"
              className="flex items-center gap-1.5 -ml-1 px-2 py-1 rounded-lg hover-elevate active-elevate-2 transition-colors text-left"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-none">Грозный, ЧР</p>
                <div className="flex items-center gap-0.5 font-semibold text-sm leading-tight">
                  <span className="truncate">{district}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                </div>
              </div>
            </button>
            <Avatar className="w-10 h-10 bg-gradient-to-br from-primary to-violet-500">
              <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Какая услуга нужна?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 h-13 text-base bg-muted/60 border-0 rounded-2xl shadow-sm font-medium placeholder:text-muted-foreground/70"
                style={{ height: "52px" }}
                data-testid="input-search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Очистить поиск"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground w-11 h-11 flex items-center justify-center"
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilter(true)}
              aria-label="Фильтры и сортировка"
              data-testid="button-filter"
              className={cn(
                "rounded-2xl flex items-center justify-center transition-colors relative shrink-0 lg:hidden",
                hasActiveFilters
                  ? "bg-primary text-white"
                  : "bg-muted/60 text-foreground hover:bg-muted"
              )}
              style={{ width: "52px", height: "52px" }}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-background" />
              )}
            </button>
          </div>
        </div>

        <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-6 pb-3 pt-1">
          {categoriesLoading ? (
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-2xl shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 lg:-mx-6 lg:px-6 lg:flex-wrap lg:overflow-visible">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory((prev) => (prev === cat.id ? null : cat.id))}
                    data-testid={`category-chip-${cat.id}`}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95",
                      isSelected
                        ? "text-white shadow-md"
                        : "bg-muted/60 text-foreground hover:bg-muted"
                    )}
                    style={isSelected ? { backgroundColor: cat.color } : undefined}
                  >
                    <span className="text-base leading-none">{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto lg:max-w-6xl lg:px-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start">
        {/* Desktop sidebar with filters */}
        <aside className="hidden lg:block sticky top-[190px] self-start" data-testid="desktop-sidebar">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="font-bold text-base mb-4">Фильтры и сортировка</h2>
            <FilterPanel value={filterState} onChange={setFilterState} />
          </div>
        </aside>

        <div className="min-w-0">
        {/* Broadcast banner */}
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">Нужен мастер срочно?</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">Отправьте заявку сразу всем и примите первого</p>
          </div>
          <button
            onClick={() => { setBroadcastCategory(selectedCategoryName ?? undefined); setShowBroadcast(true); }}
            data-testid="button-broadcast"
            className="shrink-0 text-xs font-bold text-white bg-primary px-3 py-2 rounded-xl whitespace-nowrap"
          >
            Найти
          </button>
        </div>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">
              {selectedCategoryName || "Рекомендуемые"}
            </h2>
            {(selectedCategory || hasActiveFilters || district !== DEFAULT_DISTRICT) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedCategory(null); setFilterState(defaultFilterState); setDistrict(DEFAULT_DISTRICT); }}
                className="text-primary text-xs"
                data-testid="button-reset-category"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          {!mastersLoading && filteredMasters.length > 0 && (
            <div className="flex items-center gap-3 mb-4 flex-wrap" data-testid="masters-stats">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredMasters.length}</span>{" "}мастеров
              </span>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-foreground">
                  {filteredMasters.filter((m) => m.verified).length}
                </span>
                {" "}проверены
              </span>
              {district !== DEFAULT_DISTRICT && (
                <>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="text-xs text-primary font-medium">{district}</span>
                </>
              )}
            </div>
          )}

          {mastersLoading ? (
            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <MasterCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredMasters.length > 0 ? (
            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
              {filteredMasters.map((master) => (
                <MasterCard
                  key={master.id}
                  master={master}
                  isFavorite={favorites.includes(master.id)}
                  onToggleFavorite={(e) => toggleFavorite(master.id, e)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search className="w-10 h-10" />}
              title={debouncedSearch ? "Ничего не найдено" : "Мастера не найдены"}
              description={
                debouncedSearch
                  ? `По запросу «${debouncedSearch}» мастеров не найдено. Попробуйте изменить запрос или сбросить фильтры.`
                  : "В выбранной категории или районе нет мастеров. Попробуйте сбросить фильтры."
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => { setSelectedCategory(null); setSearchQuery(""); setFilterState(defaultFilterState); setDistrict(DEFAULT_DISTRICT); }}
                  className="rounded-xl"
                  data-testid="button-reset-all-filters"
                >
                  Сбросить всё
                </Button>
              }
            />
          )}
        </section>
        </div>
      </main>

      {showFilter && (
        <FilterSheet
          value={filterState}
          onChange={setFilterState}
          onClose={() => setShowFilter(false)}
          masters={baseMasters}
        />
      )}

      {showBroadcast && (
        <BroadcastModal
          initialCategory={broadcastCategory}
          onClose={() => { setShowBroadcast(false); setBroadcastCategory(undefined); }}
        />
      )}

      {/* Location selector */}
      <Sheet open={showLocation} onOpenChange={setShowLocation}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh]">
          <SheetHeader className="text-left mb-2">
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Выберите район
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mb-4">Грозный, Чеченская Республика</p>
          <div className="space-y-1.5 pb-4">
            {districts.map((d) => {
              const isActive = district === d;
              return (
                <button
                  key={d}
                  onClick={() => { setDistrict(d); setShowLocation(false); }}
                  data-testid={`option-district-${d}`}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted/40 hover-elevate active-elevate-2"
                  )}
                >
                  <span className="font-medium">{d}</span>
                  {isActive && <Check className="w-5 h-5" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}
