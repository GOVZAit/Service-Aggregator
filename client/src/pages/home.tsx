import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck, Car, CarFront, Check, ChevronDown, ChevronRight, Droplets, GraduationCap,
  Hammer, LayoutGrid, MapPin, Palette, PlugZap, Search, SlidersHorizontal, Sparkles,
  Stethoscope, Truck, X, Zap,
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
import { UrgentNowModal } from "@/components/urgent-now-modal";
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
  const [showUrgent, setShowUrgent] = useState(false);
  const [broadcastCategory, setBroadcastCategory] = useState<string | undefined>();
  const [city, setCity] = useState<string>(DEFAULT_CITY);
  const [showLocation, setShowLocation] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOnboarding();

  const debouncedSearch = useDebounce(searchQuery, 300);

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
    ? categories.find((category) => category.id === selectedCategory)?.name
    : null;

  const hasActiveFilters =
    filterState.verifiedOnly ||
    filterState.onlineOnly ||
    filterState.certifiedOnly ||
    filterState.executorType !== "all" ||
    filterState.sortBy !== "rating";

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
                className="h-14 rounded-[1.25rem] border-border/55 bg-card pl-12 pr-11 text-base font-medium shadow-sm placeholder:text-muted-foreground/75"
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
                "pressable relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border shadow-sm lg:hidden",
                hasActiveFilters
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/55 bg-card text-foreground"
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {hasActiveFilters && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-orange-500" />}
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
                      "pressable flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-sm font-semibold",
                      active
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "border border-border/55 bg-card text-foreground shadow-sm"
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
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 lg:max-w-6xl lg:px-6">
        <section className="mb-6">
          <div className="mb-3">
            <h2 className="section-title">Разделы GOVZA pro</h2>
            <p className="mt-1 text-xs text-muted-foreground">Выберите, что вам нужно</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => { clearFilters(); setSearchQuery(""); }}
              className="premium-card pressable min-h-[126px] border-primary/25 bg-primary/[0.045] p-4 text-left"
              aria-current="page"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Hammer className="h-5 w-5" />
              </div>
              <p className="mt-4 font-extrabold">Мастера</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Услуги и специалисты</p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/auto-parts")}
              className="premium-card pressable min-h-[126px] p-4 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
                <CarFront className="h-5 w-5" />
              </div>
              <p className="mt-4 font-extrabold">Автозапчасти</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Новые, Б/У, авторазборы</p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/doctors")}
              className="premium-card pressable min-h-[126px] p-4 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Stethoscope className="h-5 w-5" />
              </div>
              <p className="mt-4 font-extrabold">Врачи</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Врачи и медицина</p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/more")}
              className="premium-card pressable min-h-[126px] p-4 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <p className="mt-4 font-extrabold">Ещё</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Город, контакты и сервисы</p>
            </button>
          </div>
        </section>

        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside className="sticky top-[185px] hidden lg:block">
            <div className="premium-card p-5">
              <h2 className="mb-4 text-base font-bold">Фильтры и сортировка</h2>
              <FilterPanel value={filterState} onChange={setFilterState} />
            </div>
          </aside>

          <div className="min-w-0">
            <section className="hero-gradient relative overflow-hidden rounded-[1.75rem] border border-primary/15 p-5 shadow-sm sm:p-6">
              <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full bg-cyan-300/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 right-20 h-36 w-36 rounded-full bg-primary/15 blur-2xl" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold tracking-[-0.03em]">Нужен мастер срочно?</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Оставьте заявку — получите предложения подходящих мастеров и выберите лучшего.
                  </p>
                </div>
              </div>
              <div className="relative z-10 mt-4 grid gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setShowUrgent(true)}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 text-sm font-extrabold text-white shadow-md sm:w-auto sm:min-w-44"
                  data-testid="button-urgent-now"
                >
                  <Zap className="h-4 w-4 fill-current" /> Нужен сейчас
                </button>
                <button
                  type="button"
                  onClick={() => { setBroadcastCategory(selectedCategoryName ?? undefined); setShowBroadcast(true); }}
                  className="accent-gradient flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-md sm:w-auto sm:min-w-44"
                  data-testid="button-broadcast"
                >
                  Обычная заявка <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            {!selectedCategory && !searchQuery && (
              <section className="mt-7">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="section-title">Все категории</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Выберите направление за пару секунд</p>
                  </div>
                </div>
                <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                  {categories.slice(0, 8).map((category) => {
                    const Icon = categoryIcons[category.iconName] ?? Zap;
                    const count = allMasters.filter((master) => (master.categoryIds ?? [master.categoryId]).includes(category.id)).length;
                    return (
                      <button
                        type="button"
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className="premium-card pressable min-w-[132px] p-4 text-left"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm font-bold">{category.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{count || "Новые"} специалистов</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    <h2 className="section-title">{selectedCategoryName || "Проверенные мастера"}</h2>
                  </div>
                  {!selectedCategoryName && <p className="mt-1 text-xs text-muted-foreground">Надёжные специалисты с рейтингом и отзывами</p>}
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

      {showUrgent && (
        <UrgentNowModal
          initialCategoryId={selectedCategory}
          onClose={() => setShowUrgent(false)}
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
