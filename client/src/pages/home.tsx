import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, MapPin, X, BadgeCheck, Wrench, Zap, Sparkles, Hammer, Palette, Car, Package, BookOpen, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterCard } from "@/components/master-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { cn } from "@/lib/utils";
import type { Category, Master } from "@shared/schema";

const iconMap: Record<string, LucideIcon> = { Wrench, Zap, Sparkles, Hammer, Palette, Car, Package, BookOpen };

const currentUser = {
  initials: 'ИК',
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);

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
      prev.includes(masterId)
        ? prev.filter((id) => id !== masterId)
        : [...prev, masterId]
    );
  };

  const filteredMasters = useMemo(() => {
    let result = allMasters;

    if (selectedCategory) {
      result = result.filter((m) => m.categoryId === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [selectedCategory, searchQuery, allMasters]);

  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border safe-area-pt">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Ваше местоположение</p>
              <div className="flex items-center gap-1 font-semibold">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Москва, Россия</span>
              </div>
            </div>
            <Avatar className="w-11 h-11 bg-gradient-to-br from-primary to-violet-500">
              <AvatarFallback className="bg-transparent text-white font-semibold">
                {currentUser.initials}
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
            </div>
            <Button variant="ghost" size="icon" data-testid="button-filter">
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Sticky categories strip — lives inside the same sticky header */}
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
                      isSelected
                        ? "text-white shadow-sm"
                        : "bg-muted/60 text-foreground hover:bg-muted"
                    )}
                    style={isSelected ? { backgroundColor: cat.color } : undefined}
                  >
                    <Icon
                      className="w-3.5 h-3.5 shrink-0"
                      style={isSelected ? { color: 'white' } : { color: cat.color }}
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
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">
              {selectedCategoryName || "Рекомендуемые"}
            </h2>
            {selectedCategory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="text-primary"
                data-testid="button-reset-category"
              >
                <X className="w-4 h-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          {/* Stats row */}
          {!mastersLoading && (
            <div className="flex items-center gap-3 mb-4" data-testid="masters-stats">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredMasters.length}</span>
                {" "}мастеров
              </span>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-foreground">
                  {filteredMasters.filter((m) => m.verified).length}
                </span>
                {" "}верифицированы
              </span>
            </div>
          )}

          {mastersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMasters.length > 0 ? (
                filteredMasters.map((master) => (
                  <MasterCard
                    key={master.id}
                    master={master}
                    isFavorite={favorites.includes(master.id)}
                    onToggleFavorite={(e) => toggleFavorite(master.id, e)}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Мастера не найдены
                  </p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchQuery("");
                    }}
                    className="mt-2"
                  >
                    Сбросить фильтры
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}
