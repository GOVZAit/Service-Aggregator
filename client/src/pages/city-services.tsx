import { useState, useMemo } from "react";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Phone,
  MapPin,
  Clock,
  Globe,
  MessageCircle,
  Star,
  ShieldAlert,
  Car,
  Landmark,
  HeartPulse,
  BookMarked,
  PhoneCall,
  Navigation,
  Heart,
  X,
  Filter,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/bottom-navigation";
import { cn } from "@/lib/utils";
import {
  cityCategories,
  cityOrganizations,
  districts,
  type CityCategory,
  type CityOrganization,
} from "@/lib/city-services-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  ShieldAlert,
  Car,
  Landmark,
  HeartPulse,
  BookMarked,
  Phone: PhoneCall,
};

type Level = 'categories' | 'list' | 'detail';

export default function CityServicesPage() {
  const [level, setLevel] = useState<Level>('categories');
  const [selectedCategory, setSelectedCategory] = useState<CityCategory | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<CityOrganization | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Все районы');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const goToCategory = (cat: CityCategory) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    setSelectedDistrict('Все районы');
    setShowFavoritesOnly(false);
    setLevel('list');
  };

  const goToDetail = (org: CityOrganization) => {
    setSelectedOrg(org);
    setLevel('detail');
  };

  const goBack = () => {
    if (level === 'detail') {
      setLevel('list');
      setSelectedOrg(null);
    } else if (level === 'list') {
      setLevel('categories');
      setSelectedCategory(null);
      setSearchQuery('');
    }
  };

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const orgsInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    let result = cityOrganizations.filter((o) => o.categoryId === selectedCategory.id);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.subcategory.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q)
      );
    }

    if (selectedDistrict && selectedDistrict !== 'Все районы') {
      result = result.filter(
        (o) => o.district === selectedDistrict || o.district === 'Все районы'
      );
    }

    if (showFavoritesOnly) {
      result = result.filter((o) => favorites.includes(o.id));
    }

    return result;
  }, [selectedCategory, searchQuery, selectedDistrict, showFavoritesOnly, favorites]);

  const emergencyOrgs = useMemo(
    () => cityOrganizations.filter((o) => o.isEmergency && o.importantNumber),
    []
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          {level === 'categories' ? (
            <div>
              <h1 className="text-xl font-bold mb-1">Городские службы</h1>
              <p className="text-sm text-muted-foreground">
                Организации, контакты и экстренные номера
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="shrink-0"
                data-testid="button-back"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base font-bold truncate">
                  {level === 'detail'
                    ? selectedOrg?.name
                    : selectedCategory?.name}
                </h1>
                {level === 'detail' && selectedOrg && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedOrg.subcategory}
                  </p>
                )}
                {level === 'list' && selectedCategory && (
                  <p className="text-xs text-muted-foreground">
                    {orgsInCategory.length} объектов
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* LEVEL 1 — Category grid */}
      {level === 'categories' && (
        <main className="px-4 py-5 max-w-lg mx-auto">
          {/* Emergency banner */}
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <span className="font-semibold text-red-600 dark:text-red-400 text-sm">
                Экстренные номера (работают без интернета)
              </span>
              <WifiOff className="w-4 h-4 text-red-400 ml-auto shrink-0" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {emergencyOrgs.slice(0, 4).map((org) => (
                <button
                  key={org.id}
                  onClick={() => window.open(`tel:${org.phone}`)}
                  data-testid={`button-emergency-${org.id}`}
                  className="flex items-center gap-2 bg-white dark:bg-red-950/60 rounded-xl px-3 py-2.5 border border-red-100 dark:border-red-900 active:scale-95 transition-transform text-left"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-muted-foreground truncate leading-tight">
                      {org.name}
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400 text-base leading-tight">
                      {org.phone}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category cards */}
          <h2 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">
            Разделы
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {cityCategories.map((cat) => {
              const Icon = iconMap[cat.iconName] || PhoneCall;
              return (
                <button
                  key={cat.id}
                  onClick={() => goToCategory(cat)}
                  data-testid={`card-category-${cat.id}`}
                  className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-95 hover:shadow-md hover:border-primary/30"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: cat.color } as React.CSSProperties}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight mb-1">
                      {cat.name}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {cat.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <Badge variant="secondary" className="text-xs">
                      {cat.count} объектов
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      )}

      {/* LEVEL 2 — Organization list */}
      {level === 'list' && selectedCategory && (
        <main className="max-w-lg mx-auto">
          {/* Filters */}
          <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Поиск в «${selectedCategory.name}»...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-muted/50"
                data-testid="input-city-search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger
                  className="h-9 text-sm flex-1"
                  data-testid="select-district"
                >
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Район" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={showFavoritesOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFavoritesOnly((v) => !v)}
                className="h-9 gap-1.5"
                data-testid="button-favorites-filter"
              >
                <Heart className={cn("w-4 h-4", showFavoritesOnly && "fill-current")} />
                Избранное
              </Button>
            </div>
          </div>

          <div className="px-4 py-3 space-y-3">
            {orgsInCategory.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-muted-foreground mb-2">Ничего не найдено</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDistrict('Все районы');
                    setShowFavoritesOnly(false);
                  }}
                >
                  Сбросить фильтры
                </Button>
              </div>
            ) : (
              orgsInCategory.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  isFavorite={favorites.includes(org.id)}
                  onToggleFavorite={(e) => toggleFavorite(org.id, e)}
                  onClick={() => goToDetail(org)}
                />
              ))
            )}
          </div>
        </main>
      )}

      {/* LEVEL 3 — Organization detail */}
      {level === 'detail' && selectedOrg && (
        <main className="px-4 py-5 max-w-lg mx-auto">
          <OrgDetail
            org={selectedOrg}
            isFavorite={favorites.includes(selectedOrg.id)}
            onToggleFavorite={(e) => toggleFavorite(selectedOrg.id, e)}
          />
        </main>
      )}

      <BottomNavigation />
    </div>
  );
}

// ── Organization card (list level) ──────────────────────────────────────────

function OrgCard({
  org,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  org: CityOrganization;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`card-org-${org.id}`}
      className="w-full flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98] hover:shadow-md hover:border-primary/20"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {org.isEmergency && (
              <Badge className="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 border-0 text-xs px-1.5 py-0">
                Экстренная
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{org.subcategory}</span>
          </div>
          <h3 className="font-semibold text-sm leading-tight">{org.name}</h3>
        </div>
        <button
          onClick={onToggleFavorite}
          data-testid={`button-favorite-${org.id}`}
          className="shrink-0 p-1 -m-1"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            )}
          />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-sm font-medium text-primary">{org.phone}</span>
        </div>
        {org.address && (
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-xs text-muted-foreground truncate">{org.address}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{org.hours}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <ActionButton
            icon={<PhoneCall className="w-3.5 h-3.5" />}
            label="Позвонить"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${org.phone}`);
            }}
            variant="primary"
            testId={`button-call-${org.id}`}
          />
          {org.address && (
            <ActionButton
              icon={<Navigation className="w-3.5 h-3.5" />}
              label="Маршрут"
              onClick={(e) => {
                e.stopPropagation();
                const query = encodeURIComponent(org.address);
                window.open(`https://yandex.ru/maps/?text=${query}`, '_blank');
              }}
              testId={`button-route-${org.id}`}
            />
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}

// ── Organization detail ──────────────────────────────────────────────────────

function OrgDetail({
  org,
  isFavorite,
  onToggleFavorite,
}: {
  org: CityOrganization;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {org.isEmergency && (
              <Badge className="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 border-0 text-xs mb-2">
                Экстренная служба
              </Badge>
            )}
            <h2 className="text-lg font-bold leading-tight">{org.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{org.subcategory}</p>
          </div>
          <button
            onClick={onToggleFavorite}
            data-testid="button-favorite-detail"
            className="p-2 rounded-xl bg-muted/50"
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-colors",
                isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )}
            />
          </button>
        </div>

        {org.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{org.description}</p>
        )}
      </div>

      {/* Contact info */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        <InfoRow
          icon={<PhoneCall className="w-4 h-4 text-primary" />}
          label="Телефон"
          value={org.phone}
          highlight
        />
        {org.address && (
          <InfoRow
            icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
            label="Адрес"
            value={org.address}
          />
        )}
        <InfoRow
          icon={<Clock className="w-4 h-4 text-muted-foreground" />}
          label="Режим работы"
          value={org.hours}
        />
        {org.district && (
          <InfoRow
            icon={<Navigation className="w-4 h-4 text-muted-foreground" />}
            label="Район"
            value={org.district}
          />
        )}
        {org.website && (
          <InfoRow
            icon={<Globe className="w-4 h-4 text-muted-foreground" />}
            label="Сайт"
            value={org.website}
            link={org.website}
          />
        )}
        {org.whatsapp && (
          <InfoRow
            icon={<MessageCircle className="w-4 h-4 text-green-500" />}
            label="WhatsApp"
            value={org.whatsapp}
            link={`https://wa.me/${org.whatsapp.replace(/\D/g, '')}`}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-12 text-sm rounded-xl"
          onClick={() => window.open(`tel:${org.phone}`)}
          data-testid="button-call-detail"
        >
          <PhoneCall className="w-4 h-4 mr-2" />
          Позвонить
        </Button>
        {org.address ? (
          <Button
            variant="outline"
            className="h-12 text-sm rounded-xl"
            onClick={() => {
              const query = encodeURIComponent(org.address);
              window.open(`https://yandex.ru/maps/?text=${query}`, '_blank');
            }}
            data-testid="button-route-detail"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Маршрут
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-12 text-sm rounded-xl"
            onClick={() => window.open(`https://yandex.ru/maps/`, '_blank')}
            data-testid="button-map-detail"
          >
            <MapPin className="w-4 h-4 mr-2" />
            На карте
          </Button>
        )}
      </div>

      {org.website && (
        <Button
          variant="ghost"
          className="w-full h-11 rounded-xl text-sm"
          onClick={() => window.open(org.website, '_blank')}
          data-testid="button-website-detail"
        >
          <Globe className="w-4 h-4 mr-2" />
          Открыть сайт
        </Button>
      )}

      {org.whatsapp && (
        <Button
          variant="ghost"
          className="w-full h-11 rounded-xl text-sm text-green-600"
          onClick={() =>
            window.open(`https://wa.me/${org.whatsapp!.replace(/\D/g, '')}`, '_blank')
          }
          data-testid="button-whatsapp-detail"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Написать в WhatsApp
        </Button>
      )}

      {/* Offline note for emergency */}
      {org.isEmergency && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Этот номер доступен без подключения к интернету и работает при нулевом балансе.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  highlight,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  link?: string;
}) {
  const inner = (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p
          className={cn(
            "text-sm font-medium break-all",
            highlight && "text-primary",
            link && "text-primary underline underline-offset-2"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="block hover:bg-muted/30 transition-colors">
        {inner}
      </a>
    );
  }

  return <div>{inner}</div>;
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = 'outline',
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'outline';
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors active:scale-95",
        variant === 'primary'
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border bg-muted/30 hover:bg-muted"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

