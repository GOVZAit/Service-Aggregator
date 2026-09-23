import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck, Car, Check, ChevronDown, ChevronRight, Droplets, GraduationCap,
  Hammer, MapPin, Palette, PlugZap, Search, SlidersHorizontal, Sparkles,
  Truck, X, Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppBrandHeader } from "@/components/app-brand-header";
import { MapView } from "@/components/map-view";
import { MasterCard } from "@/components/master-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { EmptyState } from "@/components/empty-state";
import FilterSheet, {\n  FilterPanel,\n  applyMasterFilters,\n  sortMasters,\n  getActiveFilterCount,\n  getActiveFilterChips,\n  type FilterState,\n  defaultFilterState,\n} from "@/components/filter-sheet";
import { BroadcastModal } from "@/components/broadcast-modal";
import { WelcomeOnboarding, useWelcomeOnboarding } from "@/components/welcome-onboarding";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { cities } from "@shared/schema";
import type { Category, Master } from "@shared/schema";

const categoryIcons: Record<string, typeof PlugZap> = {
  Wrench: Droplets,
  Zap: PlugZap,
  Sparkles,
  Hammer,
  Palette,
  Car,
  Package: Truck,
  BookOpen: GraduationCap,
};

function MasterCardSkeleton() {
  return (
    <div className="premium-card space-y-4 p-4 animate-pulse">
      <div className="flex gap-3">
        <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="aspect-[4/3] rounded-xl" />
        <Skeleton className="aspect-[4/3] rounded-xl" />
        <Skeleton className="aspect-[4/3] rounded-xl" />
      </div>
    </div>
  );
}

function extractMinPrice(price: string): number {
  const match = price.replace(/[^\d]/g, " ").trim().split(/\s+/)[0];
  return parseInt(match) || 0;
}

const DEFAULT_CITY: string = cities[0];

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastCategory, setBroadcastCategory] = useState<string | undefined>();
  const [city, setCity] = useState<string>(DEFAULT_CITY);
  const [showLocation, setShowLocation] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOnboarding();

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ searchQuery, selectedCategory, filterState, city, viewMode }),
      );
    } catch {
      // Browsing still works if storage is unavailable.
    }
  }, [searchQuery, selectedCategory, filterState, city, viewMode]);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const { data: allMasters = [], isLoading: mastersLoading } = useQuery<Master[]>({
    queryKey: ["/api/masters"],
  });

  const { data: favorites = [] } = useQuery<number[]>({
    queryKey: ["/api/favorites"],
    enabled: user?.role === "client",
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ masterId, remove }: { masterId: number; remove: boolean }) => {
      await apiRequest(remove ? "DELETE" : "POST", `/api/favorites/${masterId}`);
      return { masterId, remove };
    },
    onMutate: async ({ masterId, remove }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/favorites"] });
      const previous = queryClient.getQueryData<number[]>(["/api/favorites"]) ?? [];
      queryClient.setQueryData<number[]>(
        ["/api/favorites"],
        remove ? previous.filter((id) => id !== masterId) : [...new Set([...previous, masterId])],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["/api/favorites"], context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const toggleFavorite = (masterId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (user?.role !== "client") {
      navigate("/auth");
      return;
    }

    favoriteMutation.mutate({
      masterId,
      remove: favorites.includes(masterId),
    });
  };

  const baseMasters = useMemo(() => {
    let result = allMasters;
    if (city !== DEFAULT_CITY) result = result.filter((master) => master.city === city);
    if (selectedCategory) {
      result = result.filter((master) => (master.categoryIds ?? [master.categoryId]).includes(selectedCategory));
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((master) =>
        master.name.toLowerCase().includes(q) ||
        master.category.toLowerCase().includes(q) ||
        master.description.toLowerCase().includes(q) ||
        (master.companyName?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [selectedCategory, debouncedSearch, allMasters, city]);

  const filteredMasters = useMemo(
    () => sortMasters(applyMasterFilters(baseMasters, filterState), filterState),
    [baseMasters, filterState],
  );

  const selectedCategoryName = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)?.name
    : null;

  const activeFilterCount = getActiveFilterCount(filterState);
  const hasActiveFilters = activeFilterCount > 0;
  const activeFilterChips = getActiveFilterChips(filterState);

  const clearFilters = () => {
    setSelectedCategory(null);
    setFilterState(defaultFilterState);
    setCity(DEFAULT_CITY);
  };

  return (
    <div className="app-page bg-background">
      {showWelcome && <WelcomeOnboarding onDone={dismissWelcome} />}

      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="mx-auto max-w-lg px-4 pb-4 pt-3 lg:max-w-6xl lg:px-6">
          <AppBrandHeader
            city={city}
            onLocationClick={() => setShowLocation(true)}
            subtitle="Надёжные мастера рядом"
          />

          <button
            type="button"
            onClick={() => setShowLocation(true)}
            className="pressable mt-3 flex min-h-11 items-center gap-2 rounded-2xl bg-primary/[0.055] px-3 text-left sm:hidden"
            data-testid="button-location"
          >
            <MapPin className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium leading-none text-muted-foreground">Чеченская Республика</p>
              <p className="mt-1 truncate text-sm font-bold">{city}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Какая услуга нужна?"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-10 text-base font-medium placeholder:text-muted-foreground/75"
                data-testid="input-search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Очистить поиск"
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFilter(true)}
              aria-label="Фильтры и сортировка"
              data-testid="button-filter"
              className={cn(
                "pressable relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border lg:hidden",
                hasActiveFilters
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/55 bg-card text-foreground"
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-orange-500 px-1 text-[9px] font-extrabold leading-none text-white">
                  {activeFilterCount > 9 ? "9+" : activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:-mx-6 lg:px-6">
            {categoriesLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-11 w-28 shrink-0 rounded-2xl" />)
            ) : (
              categories.slice(0, 8).map((category) => {
                const Icon = categoryIcons[category.iconName] ?? Zap;
                const active = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory((current) => current === category.id ? null : category.id)}
                    className={cn(
                      "pressable flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 bg-background text-foreground"
                    )}
                    data-testid={`category-chip-${category.id}`}
                  >
                    <Icon className={cn("h-4 w-4", !active && "text-primary")} />
                    {category.name}
                  </button>
                );
              })
            )}
          </div>

          <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 lg:-mx-6 lg:px-6" aria-label="Быстрые фильтры">
            {[
              {
                key: "verified",
                label: "Проверенные",
                active: filterState.verifiedOnly,
                onClick: () => setFilterState((state) => ({ ...state, verifiedOnly: !state.verifiedOnly })),
              },
              {
                key: "online",
                label: "Онлайн",
                active: filterState.onlineOnly,
                onClick: () => setFilterState((state) => ({ ...state, onlineOnly: !state.onlineOnly })),
              },
              {
                key: "certificate",
                label: "С сертификатом",
                active: filterState.certifiedOnly,
                onClick: () => setFilterState((state) => ({ ...state, certifiedOnly: !state.certifiedOnly })),
              },
              {
                key: "near",
                label: "Ближе",
                active: filterState.sortBy === "distance",
                onClick: () => setFilterState((state) => ({ ...state, sortBy: state.sortBy === "distance" ? "rating" : "distance" })),
              },
              {
                key: "rating",
                label: "Рейтинг 4.5+",
                active: filterState.minRating === 4.5,
                onClick: () => setFilterState((state) => ({ ...state, minRating: state.minRating === 4.5 ? 0 : 4.5 })),
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-pressed={item.active}
                className={cn(
                  "pressable min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-bold",
                  item.active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {activeFilterChips.length > 0 && (
            <div className="scrollbar-none -mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4 lg:-mx-6 lg:px-6">
              {activeFilterChips.map((chip) => (
                <button
                  key={String(chip.key)}
                  type="button"
                  onClick={() => setFilterState((state) => chip.clear(state))}
                  aria-label={`Убрать фильтр: ${chip.label}`}
                  className="pressable flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-semibold text-foreground"
                >
                  <span>{chip.label}</span>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilterState(defaultFilterState)}
                className="min-h-10 shrink-0 px-2 text-xs font-bold text-primary"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 lg:max-w-6xl lg:px-6">
        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside className="sticky top-[185px] hidden lg:block">
            <div className="premium-card max-h-[calc(100dvh-220px)] overflow-y-auto p-4">
              <FilterPanel value={filterState} onChange={setFilterState} />
            </div>
          </aside>

          <div className="min-w-0">
            <section className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Нужен мастер?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Оставьте заявку и сравните предложения.</p>
              </div>
              <button
                type="button"
                onClick={() => { setBroadcastCategory(selectedCategoryName ?? undefined); setShowBroadcast(true); }}
                className="min-h-10 shrink-0 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground"
                data-testid="button-broadcast"
              >
                Создать
              </button>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    <h2 className="section-title">{selectedCategoryName || "Мастера"}</h2>
                  </div>
                  {!selectedCategoryName && <p className="mt-1 text-xs text-muted-foreground">Проверенные специалисты рядом</p>}
                </div>
                {(selectedCategory || hasActiveFilters || city !== DEFAULT_CITY) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-xs text-primary">
                    <X className="mr-1 h-3.5 w-3.5" /> Сбросить
                  </Button>
                )}
              </div>

              {!mastersLoading && filteredMasters.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex rounded-2xl bg-muted/70 p-1">
                    {(["list", "map"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={cn(
                          "min-h-10 rounded-xl px-3 text-xs font-bold transition-all",
                          viewMode === mode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        {mode === "list" ? "Список" : "Карта"}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{filteredMasters.length}</span> специалистов
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    {filteredMasters.filter((master) => master.verified).length} проверены
                  </span>
                </div>
              )}

              {mastersLoading ? (
                <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {Array.from({ length: 4 }).map((_, index) => <MasterCardSkeleton key={index} />)}
                </div>
              ) : filteredMasters.length > 0 ? (
                viewMode === "map" ? (
                  <div className="overflow-hidden rounded-[1.75rem] border border-border/70 shadow-sm h-[440px] lg:h-[560px]">
                    <MapView
                      organizations={filteredMasters.map((master) => ({
                        id: master.id,
                        name: master.name,
                        subcategory: master.category,
                        address: [master.city, master.district].filter(Boolean).join(", "),
                        phone: master.phone,
                        hours: `${master.workingHours.from}–${master.workingHours.to}`,
                        lat: master.lat,
                        lng: master.lng,
                      }))}
                      onSelect={(point) => navigate(`/master/${point.id}`)}
                    />
                  </div>
                ) : (
                  <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                    {filteredMasters.map((master) => (
                      <MasterCard
                        key={master.id}
                        master={master}
                        isFavorite={favorites.includes(master.id)}
                        onToggleFavorite={(event) => toggleFavorite(master.id, event)}
                      />
                    ))}
                  </div>
                )
              ) : (
                <EmptyState
                  icon={<Search className="h-10 w-10" />}
                  title={debouncedSearch ? "Ничего не найдено" : "Специалисты не найдены"}
                  description={debouncedSearch
                    ? `По запросу «${debouncedSearch}» ничего не найдено. Измените запрос или сбросьте фильтры.`
                    : "В выбранной категории или городе пока нет специалистов."}
                  action={<Button variant="outline" onClick={() => { clearFilters(); setSearchQuery(""); }}>Сбросить всё</Button>}
                />
              )}
            </section>
          </div>
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

      <Sheet open={showLocation} onOpenChange={setShowLocation}>
        <SheetContent side="bottom" className="rounded-t-[2rem]">
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Выберите город
            </SheetTitle>
          </SheetHeader>
          <p className="mb-4 text-xs text-muted-foreground">Чеченская Республика</p>
          <div className="space-y-2 pb-4">
            {cities.map((item) => {
              const active = city === item;
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => { setCity(item); setShowLocation(false); }}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left font-semibold",
                    active ? "bg-primary/10 text-primary" : "bg-muted/50"
                  )}
                >
                  {item}
                  {active && <Check className="h-5 w-5" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <BottomNavigation />
    </div>
  );
}
