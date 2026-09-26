import { useMemo, useState } from "react";
import { BadgeCheck, Building2, ChevronRight, MapPin, PackageSearch, Phone, Search, Warehouse, ArrowUpRight, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DirectoryFrame, DirectorySearch, DirectoryChip, DirectoryResults } from "@/components/directory-layout";
import { ResponsivePanel } from "@/components/responsive-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { cities } from "@shared/schema";
import type { AutoPartsCondition, AutoPartsSupplierType, AutoPartsSupplierView, AutoPartsVehicleOrigin, AutoPartsVehicleType } from "@shared/auto-parts-schema";
type ConditionFilter = "all" | AutoPartsCondition;
type SupplierSection = "store" | "dismantler";
type VehicleTypeFilter = "all" | AutoPartsVehicleType;
type VehicleOriginFilter = "all" | AutoPartsVehicleOrigin;

const conditionOptions: Array<{ value: ConditionFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "used", label: "Б/У" },
];

const supplierTypeOptions: Array<{ value: SupplierSection; label: string }> = [
  { value: "store", label: "Автомагазины" },
  { value: "dismantler", label: "Авторазборы" },
];

const vehicleTypeOptions: Array<{ value: VehicleTypeFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "passenger", label: "Легковые" },
  { value: "truck", label: "Грузовые" },
  { value: "van", label: "Микроавтобусы" },
  { value: "special", label: "Спецтехника" },
];

const vehicleOriginOptions: Array<{ value: VehicleOriginFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "foreign", label: "Иномарки" },
  { value: "domestic", label: "Отечественные" },
];

const vehicleTypeLabel: Record<AutoPartsVehicleType, string> = {
  passenger: "Легковые",
  truck: "Грузовые",
  van: "Микроавтобусы",
  special: "Спецтехника",
};

const vehicleOriginLabel: Record<AutoPartsVehicleOrigin, string> = {
  foreign: "Иномарки",
  domestic: "Отечественные",
};

const conditionLabel: Record<AutoPartsCondition, string> = {
  new: "Новые",
  used: "Б/У",
  mixed: "Новые и Б/У",
};

const supplierTypeLabel: Record<AutoPartsSupplierType, string> = {
  store: "Автомагазин",
  supplier: "Автомагазин",
  dismantler: "Авторазбор",
};

function supplierIcon(type: AutoPartsSupplierType) {
  if (type === "dismantler") return Warehouse;
  return Building2;
}

function normalizePhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}

type Filters = { brand: string; city: string; condition: ConditionFilter; vehicleType: VehicleTypeFilter; vehicleOrigin: VehicleOriginFilter };
const defaults: Filters = { brand: "", city: "Все города", condition: "all", vehicleType: "all", vehicleOrigin: "all" };

export default function AutoPartsPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [supplierType, setSupplierType] = useState<SupplierSection>("store");
  const [filters, setFilters] = useState<Filters>(defaults);
  const [draft, setDraft] = useState<Filters>(defaults);
  const [showFilters, setShowFilters] = useState(false);
  const filterCount = [filters.brand.trim(), filters.city !== "Все города", filters.condition !== "all", filters.vehicleType !== "all", filters.vehicleOrigin !== "all"].filter(Boolean).length;
  const params = useMemo(() => {
    const search = new URLSearchParams({ type: supplierType });
    if (debouncedQuery.trim()) search.set("q", debouncedQuery.trim());
    if (filters.brand.trim()) search.set("brand", filters.brand.trim());
    if (filters.city !== "Все города") search.set("city", filters.city);
    if (filters.condition !== "all") search.set("condition", filters.condition);
    if (filters.vehicleType !== "all") search.set("vehicleType", filters.vehicleType);
    if (filters.vehicleOrigin !== "all") search.set("vehicleOrigin", filters.vehicleOrigin);
    return search.toString();
  }, [supplierType, debouncedQuery, filters]);
  const { data: suppliers = [], isLoading, isError, refetch } = useQuery<AutoPartsSupplierView[]>({
    queryKey: ["/api/auto-parts/suppliers", params],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/auto-parts/suppliers?${params}`, { signal });
      if (!response.ok) throw new Error("Не удалось загрузить каталог");
      return response.json();
    },
  });
  const openFilters = () => { setDraft({ ...filters }); setShowFilters(true); };
  const reset = () => setFilters({ ...defaults, city: filters.city });
  return <DirectoryFrame title="Автозапчасти" description="Магазины и авторазборы в одном каталоге." city={filters.city} onCityClick={openFilters}>
    <DirectorySearch value={query} onChange={setQuery} placeholder="Деталь, артикул или магазин" onFilters={openFilters} filterCount={filterCount}
      filtersOpen={showFilters} testId="auto-parts-search" filterTestId="auto-parts-filters" />
    <main className="directory-container">
      <div className="directory-rail" aria-label="Раздел автозапчастей">{supplierTypeOptions.map((item) => <DirectoryChip key={item.value} active={supplierType === item.value}
        onClick={() => setSupplierType(item.value)} testId={`auto-parts-section-${item.value}`}>{item.label}</DirectoryChip>)}</div>
      <button type="button" className="directory-request-link" onClick={() => navigate(`/auto-parts/requests?section=${supplierType}`)} data-testid="auto-parts-request">
        <PackageSearch size={21} aria-hidden="true" /><span><strong>Запросить запчасть</strong><small>Сравните цены и наличие в одной заявке</small></span><ChevronRight size={18} aria-hidden="true" />
      </button>
      <DirectoryResults label={supplierType === "store" ? "Автомагазины" : "Авторазборы"} count={suppliers.length} loading={isLoading} />
      {isError ? <div className="directory-empty" role="alert"><PackageSearch size={28} /><h3>Каталог не загрузился</h3><p>Проверьте соединение и повторите попытку.</p><button type="button" className="directory-secondary" onClick={() => void refetch()}>Повторить</button></div>
      : isLoading ? <div className="directory-grid" aria-label="Загрузка каталога">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="directory-card space-y-4" aria-hidden="true"><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-8 w-4/5" /><Skeleton className="h-12 w-full rounded-xl" /></div>)}</div>
      : suppliers.length === 0 ? <div className="directory-empty"><Search size={28} /><h3>Ничего не найдено</h3><p>Измените запрос или параметры автомобиля. Можно также отправить запрос на запчасть.</p><button type="button" className="directory-secondary" onClick={() => { reset(); setQuery(""); }}>Сбросить поиск и фильтры</button></div>
      : <div className="directory-grid">{suppliers.map((supplier) => {
        const Icon = supplierIcon(supplier.supplierType);
        return <article key={supplier.id} className="directory-card" data-testid={`supplier-card-${supplier.id}`}>
          <div className="directory-card-header"><div className="directory-avatar grid place-items-center"><Icon size={24} aria-hidden="true" /></div>
            <div className="directory-person"><h3>{supplier.name}{supplier.verified && <BadgeCheck size={16} aria-label="Профиль проверен" />}</h3><p>{supplierTypeLabel[supplier.supplierType]}</p></div>
          </div>
          <div className="directory-tags"><span className="directory-tag">{conditionLabel[supplier.partsCondition]}</span>{supplier.delivery && <span className="directory-tag">Доставка</span>}{supplier.pickup && <span className="directory-tag">Самовывоз</span>}</div>
          {(supplier.city || supplier.address) && <div className="directory-location"><MapPin size={16} aria-hidden="true" /><p>{[supplier.city, supplier.address].filter(Boolean).join(" · ")}</p></div>}
          {(supplier.vehicleTypes.length > 0 || supplier.vehicleOrigins.length > 0) && <p className="directory-service-list">{[...supplier.vehicleTypes.map((v) => vehicleTypeLabel[v]), ...supplier.vehicleOrigins.map((v) => vehicleOriginLabel[v])].join(" · ")}</p>}
          {(supplier.description || supplier.brands.length > 0 || supplier.salesType === "wholesale" || supplier.salesType === "both") && <details><summary>Подробнее о магазине</summary>
            {supplier.description && <p className="directory-metadata mt-2">{supplier.description}</p>}
            {supplier.brands.length > 0 && <p className="directory-metadata mt-2">Марки: {supplier.brands.join(", ")}</p>}
            {(supplier.salesType === "wholesale" || supplier.salesType === "both") && <p className="directory-metadata mt-2">Оптовая продажа</p>}
          </details>}
          <div className="directory-card-actions">
            {supplier.phone && <a className="directory-primary" href={`tel:${normalizePhone(supplier.phone)}`}><Phone size={16} aria-hidden="true" />Позвонить</a>}
            {supplier.website ? <a className="directory-secondary" href={supplier.website} target="_blank" rel="noopener noreferrer">Сайт<ArrowUpRight size={16} aria-hidden="true" /></a>
              : supplier.whatsapp ? <a className="directory-secondary" href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" />WhatsApp</a> : null}
            {!supplier.phone && !supplier.website && !supplier.whatsapp && <span className="directory-metadata">Контакты не указаны</span>}
          </div>
        </article>;
      })}</div>}
      {filterCount > 0 && <button type="button" className="directory-clear mt-3" onClick={reset}>Сбросить фильтры, сохранив город</button>}
    </main>
    <ResponsivePanel open={showFilters} onOpenChange={setShowFilters} title="Фильтры запчастей" description="Настройте поиск под свой автомобиль."
      footer={<><button type="button" className="directory-secondary" onClick={() => setDraft({ ...defaults })}>Сбросить</button><button type="button" className="directory-primary" onClick={() => { setFilters(draft); setShowFilters(false); }} data-testid="auto-parts-filter-apply">Применить</button></>}>
      <label className="govza-field"><span>Марка автомобиля</span><input value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} placeholder="Например, Toyota" maxLength={100} data-testid="auto-parts-brand" /></label>
      <label className="govza-field"><span>Город</span><select value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })}>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
      <fieldset className="govza-options"><legend>Состояние запчасти</legend><div>{conditionOptions.map((item) => <DirectoryChip key={item.value} active={draft.condition === item.value} onClick={() => setDraft({ ...draft, condition: item.value })}>{item.label}</DirectoryChip>)}</div></fieldset>
      <fieldset className="govza-options"><legend>Тип автомобиля</legend><div>{vehicleTypeOptions.map((item) => <DirectoryChip key={item.value} active={draft.vehicleType === item.value} onClick={() => setDraft({ ...draft, vehicleType: item.value })}>{item.label}</DirectoryChip>)}</div></fieldset>
      <fieldset className="govza-options"><legend>Производитель</legend><div>{vehicleOriginOptions.map((item) => <DirectoryChip key={item.value} active={draft.vehicleOrigin === item.value} onClick={() => setDraft({ ...draft, vehicleOrigin: item.value })}>{item.label}</DirectoryChip>)}</div></fieldset>
    </ResponsivePanel>
  </DirectoryFrame>;
}
