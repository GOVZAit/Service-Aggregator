import { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  Phone,
  MapPin,
  Clock,
  Globe,
  MessageCircle,
  ShieldAlert,
  Car,
  Landmark,
  HeartPulse,
  PhoneCall,
  Navigation,
  Heart,
  X,
  WifiOff,
  Building2,
  List,
  Map as MapIcon,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MapView } from "@/components/map-view";
import { cn } from "@/lib/utils";
import {
  cityOrganizations,
  getOrgDistance,
  type CityOrganization,
} from "@/lib/city-services-data";

// Only the "city services" categories (not contacts)
const SERVICE_CATEGORY_IDS = ['emergency', 'transport', 'government', 'medicine', 'important'];

const categoryMeta: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  emergency:   { label: 'Экстренные',  icon: ShieldAlert, color: '#FF3B30' },
  transport:   { label: 'Транспорт',   icon: Car,         color: '#007AFF' },
  government:  { label: 'Госуслуги',   icon: Landmark,    color: '#5856D6' },
  medicine:    { label: 'Медицина',    icon: HeartPulse,  color: '#34C759' },
  important:   { label: 'Важные №',   icon: Phone,       color: '#AF52DE' },
};

type Level = 'list' | 'detail';
type ViewMode = 'list' | 'map';

export default function CityServicesPage() {
  const [level, setLevel] = useState<Level>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<CityOrganization | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);

  const goToDetail = (org: CityOrganization) => {
    setSelectedOrg(org);
    setLevel('detail');
    setViewMode('list');
  };

  const goBack = () => {
    setLevel('list');
    setSelectedOrg(null);
  };

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const allServiceOrgs = useMemo(
    () => cityOrganizations.filter((o) => SERVICE_CATEGORY_IDS.includes(o.categoryId)),
    []
  );

  const emergencyOrgs = useMemo(
    () => cityOrganizations.filter((o) => o.isEmergency && o.importantNumber),
    []
  );

  const filteredOrgs = useMemo(() => {
    let result = selectedCategoryId
      ? allServiceOrgs.filter((o) => o.categoryId === selectedCategoryId)
      : allServiceOrgs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.subcategory.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q) ||
          o.phone.includes(q)
      );
    }

    return result;
  }, [allServiceOrgs, selectedCategoryId, searchQuery]);

  const verifiedCount = filteredOrgs.filter((o) => o.isEmergency).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border safe-area-pt">
        <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 pt-4 pb-3">
          {level === 'detail' ? (
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
                <h1 className="text-base font-bold truncate">{selectedOrg?.name}</h1>
                <p className="text-xs text-muted-foreground truncate">{selectedOrg?.subcategory}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Грозный, Чечня</p>
                  <div className="flex items-center gap-1 font-semibold">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>Городские службы</span>
                  </div>
                </div>
                <div className="flex items-center rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    data-testid="button-view-list"
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                      viewMode === 'list'
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <List className="w-3.5 h-3.5" />
                    Список
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    data-testid="button-view-map"
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                      viewMode === 'map'
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    Карта
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск служб и организаций..."
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

              {/* Category pills */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  data-testid="pill-all"
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                    selectedCategoryId === null
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  Все
                </button>
                {SERVICE_CATEGORY_IDS.map((id) => {
                  const meta = categoryMeta[id];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedCategoryId(id === selectedCategoryId ? null : id)}
                      data-testid={`pill-${id}`}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                        selectedCategoryId === id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </header>

      {/* MAP VIEW */}
      {level === 'list' && viewMode === 'map' && (
        <MapView
          organizations={filteredOrgs}
          onSelect={(org) => goToDetail(org)}
        />
      )}

      {/* LIST LEVEL */}
      {level === 'list' && viewMode === 'list' && (
        <main className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 pt-4 space-y-3">
          {/* Stats bar */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <span className="font-semibold text-foreground">{filteredOrgs.length}</span>
            <span>{filteredOrgs.length === 1 ? 'служба' : filteredOrgs.length < 5 ? 'службы' : 'служб'}</span>
            {verifiedCount > 0 && (
              <>
                <span className="text-border">·</span>
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                <span className="font-semibold text-red-500">{verifiedCount}</span>
                <span>экстренных</span>
              </>
            )}
          </div>

          {/* Emergency banner (when all or emergency selected) */}
          {(!selectedCategoryId || selectedCategoryId === 'emergency' || selectedCategoryId === 'important') && !searchQuery && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-semibold text-red-600 dark:text-red-400 text-sm">
                  Экстренные номера
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
          )}

          {/* Organization cards */}
          {filteredOrgs.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-muted-foreground mb-2">Ничего не найдено</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryId(null);
                }}
              >
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
              {filteredOrgs.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  isFavorite={favorites.includes(org.id)}
                  onToggleFavorite={(e) => toggleFavorite(org.id, e)}
                  onClick={() => goToDetail(org)}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* DETAIL LEVEL */}
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

// ── Organization card ─────────────────────────────────────────────────────────

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
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      data-testid={`card-org-${org.id}`}
      className="w-full flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98] hover:shadow-md hover:border-primary/20 cursor-pointer"
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
        <div className="flex items-center gap-1.5" data-testid={`text-location-${org.id}`}>
          <Navigation className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {org.district !== 'Все районы' ? `${org.district} · ` : ''}~{getOrgDistance(org)}
          </span>
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
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`tel:${org.phone}`); }}
            data-testid={`button-call-${org.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"
          >
            <PhoneCall className="w-3 h-3" />
            Позвонить
          </button>
          {org.address && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(org.address)}`, '_blank');
              }}
              data-testid={`button-route-${org.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-medium"
            >
              <Navigation className="w-3 h-3" />
              Маршрут
            </button>
          )}
        </div>
        <ChevronRightIcon />
      </div>
    </div>
  );
}

// ── Organization detail ───────────────────────────────────────────────────────

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

      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        <InfoRow icon={<PhoneCall className="w-4 h-4 text-primary" />} label="Телефон" value={org.phone} highlight />
        {org.address && (
          <InfoRow icon={<MapPin className="w-4 h-4 text-muted-foreground" />} label="Адрес" value={org.address} />
        )}
        <InfoRow icon={<Clock className="w-4 h-4 text-muted-foreground" />} label="Режим работы" value={org.hours} />
        {org.district && (
          <InfoRow icon={<Navigation className="w-4 h-4 text-muted-foreground" />} label="Район" value={org.district} />
        )}
        {org.website && (
          <InfoRow icon={<Globe className="w-4 h-4 text-muted-foreground" />} label="Сайт" value={org.website} link={org.website} />
        )}
        {org.whatsapp && (
          <InfoRow icon={<MessageCircle className="w-4 h-4 text-green-500" />} label="WhatsApp" value={org.whatsapp} link={`https://wa.me/${org.whatsapp.replace(/\D/g, '')}`} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="h-12 text-sm rounded-xl" onClick={() => window.open(`tel:${org.phone}`)} data-testid="button-call-detail">
          <PhoneCall className="w-4 h-4 mr-2" />
          Позвонить
        </Button>
        {org.address ? (
          <Button variant="outline" className="h-12 text-sm rounded-xl" onClick={() => window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(org.address)}`, '_blank')} data-testid="button-route-detail">
            <Navigation className="w-4 h-4 mr-2" />
            Маршрут
          </Button>
        ) : (
          <Button variant="outline" className="h-12 text-sm rounded-xl" onClick={() => window.open('https://yandex.ru/maps/', '_blank')} data-testid="button-map-detail">
            <MapPin className="w-4 h-4 mr-2" />
            На карте
          </Button>
        )}
      </div>

      {org.website && (
        <Button variant="ghost" className="w-full h-11 rounded-xl text-sm" onClick={() => window.open(org.website, '_blank')} data-testid="button-website-detail">
          <Globe className="w-4 h-4 mr-2" />
          Открыть сайт
        </Button>
      )}

      {org.whatsapp && (
        <Button variant="ghost" className="w-full h-11 rounded-xl text-sm text-green-600" onClick={() => window.open(`https://wa.me/${org.whatsapp!.replace(/\D/g, '')}`, '_blank')} data-testid="button-whatsapp-detail">
          <MessageCircle className="w-4 h-4 mr-2" />
          Написать в WhatsApp
        </Button>
      )}

      {org.isEmergency && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Этот номер доступен без интернета и работает при нулевом балансе.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, highlight, link }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean; link?: string;
}) {
  const inner = (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={cn("text-sm font-medium break-all", highlight && "text-primary", link && "text-primary underline underline-offset-2")}>
          {value}
        </p>
      </div>
    </div>
  );
  if (link) {
    return <a href={link} target="_blank" rel="noopener noreferrer" className="block hover:bg-muted/30 transition-colors">{inner}</a>;
  }
  return <div>{inner}</div>;
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
