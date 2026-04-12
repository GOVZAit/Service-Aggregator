import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, SlidersHorizontal, MapPin, X, BadgeCheck,
  Wrench, Zap, Sparkles, Hammer, Palette, Car, Package, BookOpen,
  type LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterCard } from "@/components/master-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { EmptyState } from "@/components/empty-state";
import FilterSheet, { type FilterState } from "@/components/filter-sheet";
import { BroadcastModal } from "@/components/broadcast-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { Category, Master } from "@shared/schema";

const iconMap: Record<string, LucideIcon> = { Wrench, Zap, Sparkles, Hammer, Palette, Car, Package, BookOpen };

function MasterCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3 animate-pulse">
      <div className="flex gap-3">
        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="w-6 h-6 rounded-full shrink-0" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

function extractMinPrice(price: string): number {
  const match = price.replace(/[^\d]/g, ' ').trim().split(/\s+/)[0];
  return parseInt(match) || 0;
}

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({ sortBy: "rating", verifiedOnly: false });
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastCategory, setBroadcastCategory] = useState<string | undefined>();

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

  const filteredMasters = useMemo(() => {
    let result = allMasters;

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

    if (filterState.verifiedOnly) {
      result = result.filter((m) => m.verified);
    }

    result = [...result].sort((a, b) => {
      switch (filterState.sortBy) {
        case "rating": return b.rating - a.rating;
        case "reviews": return b.reviews - a.reviews;
        case "price_asc": return extractMinPrice(a.price) - extractMinPrice(b.price);
        case "price_desc": return extractMinPrice(b.price) - extractMinPrice(a.price);
        case "distance": return parseFloat(a.distance) - parseFloat(b.distance);
        default: return 0;
      }
    });

    return result;
  }, [selectedCategory, debouncedSearch, allMasters, filterState]);

  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name
    : null;

  const hasActiveFilters = filterState.verifiedOnly || filterState.sortBy !== "rating";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "АБ";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border safe-area-pt">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Ваше местоположение</p>
              <div className="flex items-center gap-1 font-semibold">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Грозный, Чечня</span>
              </div>
            </div>
            <Avatar className="w-11 h-11 bg-gradient-to-br from-primary to-violet-500">
              <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск услуг или мастеров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-11 bg-muted/50"
                data-testid="input-search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilter(true)}
              data-testid="button-filter"
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-colors relative",
                hasActiveFilters
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-background" />
              )}
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-2 pt-1">
          {categoriesLoading ? (
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {categories.map((cat) => {
                const Icon = iconMap[cat.iconName] || Wrench;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory((prev) => (prev === cat.id ? null : cat.id))}
                    data-testid={`category-chip-${cat.id}`}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-95",
                      isSelected ? "text-white shadow-sm" : "bg-muted/60 text-foreground hover:bg-muted"
                    )}
                    style={isSelected ? { backgroundColor: cat.color } : undefined}
                  >
                    <Icon
                      className="w-3.5 h-3.5 shrink-0"
                      style={isSelected ? { color: "white" } : { color: cat.color }}
                    />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {/* Broadcast banner */}
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 px-4 py-3 flex items-center gap-3">
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
            {(selectedCategory || hasActiveFilters) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedCategory(null); setFilterState({ sortBy: "rating", verifiedOnly: false }); }}
                className="text-primary text-xs"
                data-testid="button-reset-category"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          {!mastersLoading && filteredMasters.length > 0 && (
            <div className="flex items-center gap-3 mb-4" data-testid="masters-stats">
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
              {hasActiveFilters && (
                <>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="text-xs text-primary font-medium">
                    {filterState.sortBy === "rating" ? "по рейтингу" :
                      filterState.sortBy === "reviews" ? "по отзывам" :
                      filterState.sortBy === "price_asc" ? "цена ↑" :
                      filterState.sortBy === "price_desc" ? "цена ↓" : "по расстоянию"}
                  </span>
                </>
              )}
            </div>
          )}

          {mastersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <MasterCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredMasters.length > 0 ? (
            <div className="space-y-3">
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
                  : "В выбранной категории нет мастеров. Попробуйте другую категорию."
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => { setSelectedCategory(null); setSearchQuery(""); setFilterState({ sortBy: "rating", verifiedOnly: false }); }}
                  className="rounded-xl"
                  data-testid="button-reset-all-filters"
                >
                  Сбросить всё
                </Button>
              }
            />
          )}
        </section>
      </main>

      {showFilter && (
        <FilterSheet
          value={filterState}
          onChange={setFilterState}
          onClose={() => setShowFilter(false)}
          totalCount={filteredMasters.length}
        />
      )}

      {showBroadcast && (
        <BroadcastModal
          initialCategory={broadcastCategory}
          onClose={() => { setShowBroadcast(false); setBroadcastCategory(undefined); }}
        />
      )}

      <BottomNavigation />
    </div>
  );
}
