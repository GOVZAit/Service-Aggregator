import { useMemo, useState, type SetStateAction } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck, Car, Check, ChevronRight, Droplets, GraduationCap,
  Hammer, MapPin, Palette, PlugZap, Search, SlidersHorizontal, Sparkles,
  Truck, X, Zap, Heart, History, CalendarCheck,
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
import FilterSheet, { FilterPanel, applyMasterFilters, type FilterState, defaultFilterState } from "@/components/filter-sheet";
import { BroadcastModal } from "@/components/broadcast-modal";
import { WelcomeOnboarding, useWelcomeOnboarding } from "@/components/welcome-onboarding";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/auth-context";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentMasters, useTodayAvailability } from "@/hooks/use-master-memory";
import { useCatalogState } from "@/hooks/use-catalog-state";
import { activeFilterEntries, normalizeSearch, searchMasters, sortMasters } from "@shared/catalog";
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

const DEFAULT_CITY: string = cities[0];
const quickProblemExamples = [
  "Течёт кран",
  "Выбивает автомат",
  "Нужна уборка",
  "Не заводится авто",
  "Повесить телевизор",
];

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [catalog, setCatalog] = useCatalogState(user?.id, !authLoading);
  const { query: searchQuery, category: selectedCategory, city, view: viewMode, filters: filterState } = catalog;
  const setSearchQuery = (query: string) => setCatalog((current) => ({ ...current, query }));
  const setSelectedCategory = (next: SetStateAction<number | null>) => setCatalog((current) => ({
    ...current, category: typeof next === "function" ? next(current.category) : next,
  }));
  const setFilterState = (filters: FilterState) => setCatalog((current) => ({ ...current, filters }));
  const setCity = (city: string) => setCatalog((current) => ({ ...current, city, filters: { ...current.filters, district: "all" } }));
  const setViewMode = (view: "list" | "map") => setCatalog((current) => ({ ...current, view }));
  const [showFilter, setShowFilter] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastCategory, setBroadcastCategory] = useState<string | undefined>();
  const [showLocation, setShowLocation] = useState(false);
  const [, navigate] = useLocation();
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOnboarding();

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const { data: allMasters = [], isLoading: mastersLoading, isError: mastersError, refetch: reloadMasters } = useQuery<Master[]>({
    queryKey: ["/api/masters"], staleTime: 30_000, refetchOnWindowFocus: true,
  });

  const { favorites, toggle: toggleFavorite, isPending: favoritePending } = useFavorites();
  const recent = useRecentMasters();
  const availability = useTodayAvailability();
  const { availableIds } = availability;

  const contextMasters = useMemo(() => allMasters.filter((master) =>
    (city === DEFAULT_CITY || master.city === city) &&
    (!selectedCategory || (master.categoryIds ?? [master.categoryId]).includes(selectedCategory)),
  ), [allMasters, city, selectedCategory]);
  const baseMasters = useMemo(() => searchMasters(contextMasters, debouncedSearch), [contextMasters, debouncedSearch]);
  const filteredMasters = useMemo(() => sortMasters(
    applyMasterFilters(baseMasters, filterState, availableIds), filterState.sortBy, Boolean(normalizeSearch(debouncedSearch)),
  ), [baseMasters, filterState, availableIds, debouncedSearch]);
  const districts = useMemo(() => Array.from(new Set(contextMasters.flatMap((master) => master.district ? [master.district] : []))), [contextMasters]);
  const suggestions = useMemo(() => {
    const query = normalizeSearch(debouncedSearch);
    if (query.length < 2) return [];
    return Array.from(new Set(baseMasters.flatMap((master) => [master.name, master.category, ...master.services.map((service) => service.name)])))
      .filter((label) => normalizeSearch(label).includes(query)).slice(0, 6);
  }, [baseMasters, debouncedSearch]);

  const selectedCategoryName = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)?.name
    : null;

  const activeFilters = activeFilterEntries(filterState);
  const hasActiveFilters = activeFilters.length > 0 || filterState.sortBy !== defaultFilterState.sortBy;
  const clearFilters = () => setCatalog((current) => ({ ...current, category: null, city: DEFAULT_CITY, filters: { ...defaultFilterState } }));

  return (
    <div className="app-page bg-background">
      {showWelcome && <WelcomeOnboarding onDone={dismissWelcome} />}

      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="section-shell pb-3 pt-3 sm:pb-4">
          <AppBrandHeader
            city={city}
            onLocationClick={() => setShowLocation(true)}
            subtitle="Надёжные мастера рядом"
          />

          <div className="mt-3 sm:hidden">
            <h1 className="text-[1.35rem] font-extrabold tracking-[-0.035em]">Что случилось?</h1>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Опишите проблему своими словами — поиск подберёт подходящих специалистов.</p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Опишите проблему, услугу или мастера"
                maxLength={120}
                list="catalog-search-suggestions"
                placeholder="Опишите проблему или услугу"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-13 rounded-[1.05rem] border-border/60 bg-card pl-11 pr-10 text-base font-medium shadow-[0_8px_24px_-22px_hsl(var(--foreground)/.34)] placeholder:text-muted-foreground/70"
                data-testid="input-search"
              />
              <datalist id="catalog-search-suggestions">{suggestions.map((label) => <option key={label} value={label} />)}</datalist>
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
                "pressable relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.05rem] border lg:hidden",
                hasActiveFilters
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/55 bg-card text-foreground"
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {hasActiveFilters && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-orange-500" />}
            </button>
          </div>

        </div>
      </header>

      <main className="section-shell py-4 sm:py-6">
        <div className="scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden" aria-label="Примеры запросов">
          {quickProblemExamples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setSearchQuery(example)}
              className={cn(
                "pressable min-h-11 shrink-0 rounded-full px-3.5 text-xs font-semibold",
                searchQuery === example ? "bg-primary text-primary-foreground" : "bg-primary/8 text-primary"
              )}
            >
              {example}
            </button>
          ))}
        </div>

        <div className="scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-0 sm:px-0">
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

        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside className="sticky top-[185px] hidden max-h-[calc(100dvh-205px)] overflow-y-auto overscroll-contain lg:block">
            <div className="premium-card p-5">
              <h2 className="mb-4 text-base font-bold">Фильтры и сортировка</h2>
              <FilterPanel value={filterState} onChange={setFilterState} districts={districts} />
            </div>
          </aside>

          <div className="min-w-0">
            <section className="flex items-center gap-3 rounded-[1.15rem] bg-primary/[0.07] px-4 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Не знаете, кого выбрать?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Опишите задачу — подходящие мастера смогут предложить цену.</p>
              </div>
              <button
                type="button"
                onClick={() => { setBroadcastCategory(selectedCategoryName ?? undefined); setShowBroadcast(true); }}
                className="min-h-11 shrink-0 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground"
                data-testid="button-broadcast"
              >
                Описать
              </button>
            </section>

            {user?.role === "client" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/saved" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-muted/70 px-3 text-sm font-semibold"><Heart className="h-4 w-4 text-primary" /> Избранное <span className="text-muted-foreground">{favorites.length}</span></Link>
                <Link href="/saved?tab=recent" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-muted/70 px-3 text-sm font-semibold"><History className="h-4 w-4 text-primary" /> Вы смотрели</Link>
              </div>
            )}
            {user?.role === "client" && recent.data.length > 0 && !searchQuery && !selectedCategory && !hasActiveFilters && (
              <section className="mt-4" aria-label="Недавно просмотренные мастера">
                <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Недавно смотрели</h2><Link href="/saved?tab=recent" className="flex min-h-11 items-center text-xs font-semibold text-primary">Вся история</Link></div>
                <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                  {recent.data.slice(0, 6).map(({ master }) => <Link key={master.id} href={`/master/${master.id}`} className="min-h-16 w-44 shrink-0 rounded-xl border border-border bg-card px-3 py-2">
                    <span className="block truncate text-sm font-semibold">{master.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{master.category}</span>
                  </Link>)}
                </div>
              </section>
            )}

            <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto scrollbar-none pb-1" aria-label="Быстрые фильтры">
              {([
                ["availableTodayOnly", "Свободен сегодня", filterState.availableTodayOnly],
                ["verifiedOnly", "Проверенные", filterState.verifiedOnly],
                ["minRating", "Рейтинг 4.5+", filterState.minRating >= 4.5],
              ] as const).map(([key, label, selected]) => <button key={key} type="button" aria-pressed={selected}
                onClick={() => setFilterState({ ...filterState, [key]: key === "minRating" ? (selected ? 0 : 4.5) : !selected })}
                className={cn("min-h-11 shrink-0 rounded-full border px-3 text-xs font-semibold", selected ? "border-primary/30 bg-primary/10 text-primary" : "border-border/60 bg-card")}>
                {key === "availableTodayOnly" && <CalendarCheck className="mr-1.5 inline h-4 w-4" />}{label}
              </button>)}
            </div>
            {(activeFilters.length > 0 || city !== DEFAULT_CITY || selectedCategory) && <div className="mt-3 flex flex-wrap gap-2" aria-label="Выбранные фильтры">
              {city !== DEFAULT_CITY && <button type="button" className="min-h-11 rounded-xl bg-muted px-3 text-xs" onClick={() => setCity(DEFAULT_CITY)} aria-label={`Убрать город ${city}`}>{city}<X className="ml-2 inline h-3 w-3" /></button>}
              {selectedCategory && <button type="button" className="min-h-11 rounded-xl bg-muted px-3 text-xs" onClick={() => setSelectedCategory(null)} aria-label="Убрать категорию">{selectedCategoryName ?? "Категория"}<X className="ml-2 inline h-3 w-3" /></button>}
              {activeFilters.map(([key, label]) => <button key={key} type="button" className="min-h-11 rounded-xl bg-muted px-3 text-xs" aria-label={`Убрать фильтр: ${label}`} onClick={() => setFilterState({ ...filterState, [key]: defaultFilterState[key] })}>{label}<X className="ml-2 inline h-3 w-3" /></button>)}
            </div>}

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    <h2 className="section-title">{selectedCategoryName || "Мастера"}</h2>
                  </div>
                  {!selectedCategoryName && <p className="mt-1 text-xs text-muted-foreground">Выберите по услуге, цене и реальным условиям.</p>}
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

              {mastersError || (filterState.availableTodayOnly && availability.isError) ? (
                <EmptyState icon={<Search className="h-10 w-10" />} title="Не удалось обновить данные"
                  description={mastersError ? "Каталог временно недоступен. Ваши фильтры сохранены." : "Не удалось проверить расписание. Мы не заменяем свободное время онлайн-статусом."}
                  action={<Button variant="outline" onClick={() => { void reloadMasters(); void availability.refetch(); }}>Повторить</Button>} />
              ) : mastersLoading || (filterState.availableTodayOnly && availability.isPending) ? (
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
                        favoritePending={favoritePending(master.id)}
                        availableToday={availableIds.has(master.id) ? availability.data?.providers[master.id] : undefined}
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
          districts={districts}
          availableIds={availableIds}
          availabilityLoading={availability.isPending}
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
