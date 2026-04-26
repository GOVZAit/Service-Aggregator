import { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  Phone,
  MapPin,
  Clock,
  Globe,
  MessageCircle,
  PhoneCall,
  Navigation,
  Heart,
  X,
  BookMarked,
  List,
  Map as MapIcon,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MapView } from "@/components/map-view";
import { cn } from "@/lib/utils";
import { cityOrganizations, getOrgDistance, type CityOrganization } from "@/lib/city-services-data";

// Only the "contacts" category
const CONTACTS_CATEGORY_ID = 'contacts';

// Subcategory pill definitions
const subcategoryMeta: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'Отели',       label: 'Отели',       icon: BookMarked },
  { id: 'Банки',       label: 'Банки',       icon: BookMarked },
  { id: 'АЗС',        label: 'АЗС',         icon: BookMarked },
  { id: 'Нотариусы',  label: 'Нотариусы',   icon: BookMarked },
  { id: 'Эвакуаторы', label: 'Эвакуаторы',  icon: BookMarked },
  { id: 'Банкоматы',  label: 'Банкоматы',   icon: BookMarked },
];

// Unique pill icons by type
import {
  Hotel,
  Banknote,
  Fuel,
  FileText,
  Truck,
  CreditCard,
} from "lucide-react";

const pillIcons: Record<string, LucideIcon> = {
  'Отели':       Hotel,
  'Банки':       Banknote,
  'АЗС':         Fuel,
  'Нотариусы':   FileText,
  'Эвакуаторы':  Truck,
  'Банкоматы':   CreditCard,
};

type Level = 'list' | 'detail';
type ViewMode = 'list' | 'map';

export default function ContactsPage() {
  const [level, setLevel] = useState<Level>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
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

  const allContacts = useMemo(
    () => cityOrganizations.filter((o) => o.categoryId === CONTACTS_CATEGORY_ID),
    []
  );

  // Derive subcategories from data
  const subcategories = useMemo(
    () => [...new Set(allContacts.map((o) => o.subcategory))],
    [allContacts]
  );

  const filteredContacts = useMemo(() => {
    let result = selectedSubcategory
      ? allContacts.filter((o) => o.subcategory === selectedSubcategory)
      : allContacts;

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
  }, [allContacts, selectedSubcategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border safe-area-pt">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          {level === 'detail' ? (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="shrink-0"
                data-testid="button-back-contacts"
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
                    <Phone className="w-4 h-4 text-primary" />
                    <span>Полезные контакты</span>
                  </div>
                </div>
                <div className="flex items-center rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    data-testid="button-contacts-view-list"
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
                    data-testid="button-contacts-view-map"
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
                  placeholder="Банки, отели, АЗС, нотариусы..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-muted/50"
                  data-testid="input-contacts-search"
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

              {/* Subcategory pills */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  data-testid="pill-contacts-all"
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                    selectedSubcategory === null
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  Все
                </button>
                {subcategories.map((sub) => {
                  const Icon = pillIcons[sub] ?? BookMarked;
                  return (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubcategory(sub === selectedSubcategory ? null : sub)}
                      data-testid={`pill-contacts-${sub}`}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                        selectedSubcategory === sub
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {sub}
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
          organizations={filteredContacts}
          onSelect={(org) => goToDetail(org)}
        />
      )}

      {/* LIST LEVEL */}
      {level === 'list' && viewMode === 'list' && (
        <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
          {/* Stats bar */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <span className="font-semibold text-foreground">{filteredContacts.length}</span>
            <span>
              {filteredContacts.length === 1 ? 'контакт' : filteredContacts.length < 5 ? 'контакта' : 'контактов'}
            </span>
            {selectedSubcategory && (
              <>
                <span className="text-border">·</span>
                <span>{selectedSubcategory}</span>
              </>
            )}
          </div>

          {filteredContacts.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-muted-foreground mb-2">Ничего не найдено</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubcategory(null);
                }}
              >
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            filteredContacts.map((org) => (
              <ContactCard
                key={org.id}
                org={org}
                isFavorite={favorites.includes(org.id)}
                onToggleFavorite={(e) => toggleFavorite(org.id, e)}
                onClick={() => goToDetail(org)}
              />
            ))
          )}
        </main>
      )}

      {/* DETAIL LEVEL */}
      {level === 'detail' && selectedOrg && (
        <main className="px-4 py-5 max-w-lg mx-auto">
          <ContactDetail
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

// ── Contact card ──────────────────────────────────────────────────────────────

function ContactCard({
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
  const Icon = pillIcons[org.subcategory] ?? BookMarked;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      data-testid={`card-contact-${org.id}`}
      className="w-full flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98] hover:shadow-md hover:border-primary/20 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">{org.subcategory}</span>
            <h3 className="font-semibold text-sm leading-tight">{org.name}</h3>
          </div>
        </div>
        <button
          onClick={onToggleFavorite}
          data-testid={`button-favorite-contact-${org.id}`}
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
        <div className="flex items-center gap-1.5" data-testid={`text-location-contact-${org.id}`}>
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

      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); window.open(`tel:${org.phone}`); }}
          data-testid={`button-call-contact-${org.id}`}
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
            data-testid={`button-route-contact-${org.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-medium"
          >
            <Navigation className="w-3 h-3" />
            Маршрут
          </button>
        )}
        {org.website && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(org.website, '_blank'); }}
            data-testid={`button-site-contact-${org.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-medium"
          >
            <Globe className="w-3 h-3" />
            Сайт
          </button>
        )}
      </div>
    </div>
  );
}

// ── Contact detail ────────────────────────────────────────────────────────────

function ContactDetail({
  org,
  isFavorite,
  onToggleFavorite,
}: {
  org: CityOrganization;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const Icon = pillIcons[org.subcategory] ?? BookMarked;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">{org.subcategory}</p>
              <h2 className="text-lg font-bold leading-tight">{org.name}</h2>
            </div>
          </div>
          <button
            onClick={onToggleFavorite}
            data-testid="button-favorite-contact-detail"
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
    </div>
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

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
