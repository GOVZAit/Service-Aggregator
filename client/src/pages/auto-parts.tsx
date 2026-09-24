import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Box,
  Building2,
  ChevronRight,
  MapPin,
  PackageSearch,
  Phone,
  Search,
  Warehouse,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppBrandHeader } from "@/components/app-brand-header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cities } from "@shared/schema";
import type {
  AutoPartsCondition,
  AutoPartsSupplierType,
  AutoPartsSupplierView,
  AutoPartsVehicleOrigin,
  AutoPartsVehicleType,
} from "@shared/auto-parts-schema";

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

export default function AutoPartsPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState<ConditionFilter>("all");
  const [supplierType, setSupplierType] = useState<SupplierSection>("store");
  const [vehicleType, setVehicleType] = useState<VehicleTypeFilter>("all");
  const [vehicleOrigin, setVehicleOrigin] = useState<VehicleOriginFilter>("all");
  const [city, setCity] = useState<string>("Все города");
  const extraFilterCount = [brand.trim(), condition !== "all", vehicleType !== "all", vehicleOrigin !== "all", city !== "Все города"].filter(Boolean).length;

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (query.trim()) search.set("q", query.trim());
    if (brand.trim()) search.set("brand", brand.trim());
    if (condition !== "all") search.set("condition", condition);
    search.set("type", supplierType);
    if (vehicleType !== "all") search.set("vehicleType", vehicleType);
    if (vehicleOrigin !== "all") search.set("vehicleOrigin", vehicleOrigin);
    if (city !== "Все города") search.set("city", city);
    return search.toString();
  }, [query, brand, condition, supplierType, vehicleType, vehicleOrigin, city]);

  const { data: suppliers = [], isLoading, isError } = useQuery<AutoPartsSupplierView[]>({
    queryKey: ["/api/auto-parts/suppliers", params],
    queryFn: async () => {
      const response = await fetch(`/api/auto-parts/suppliers${params ? `?${params}` : ""}`);
      if (!response.ok) throw new Error("Не удалось загрузить каталог автозапчастей");
      return response.json();
    },
  });

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="mx-auto max-w-6xl px-4 pb-4 pt-3 lg:px-6">
          <AppBrandHeader compact />
          <div className="-mt-10 pr-28">
            <h1 className="text-xl font-extrabold tracking-[-0.03em] sm:text-2xl">Автозапчасти</h1>
            <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">Магазины и авторазборы</p>
          </div>

          <div className="mt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Деталь, OEM, магазин…"
                className="h-12 rounded-[1rem] bg-card pl-12"
                data-testid="auto-parts-search"
              />
            </div>

            <div className="scrollbar-none -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 lg:-mx-6 lg:px-6">
              {supplierTypeOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSupplierType(item.value)}
                  className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold transition ${
                    supplierType === item.value
                      ? "bg-foreground text-background"
                      : "bg-muted/75 text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <details className="relative sm:hidden">
                <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-full bg-primary/10 px-4 text-sm font-bold text-primary">
                  Фильтры{extraFilterCount > 0 ? ` · ${extraFilterCount}` : ""}
                </summary>
                <div className="fixed inset-x-3 top-[8.5rem] z-[60] max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-[1.25rem] border border-border bg-background p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-extrabold">Фильтры</p>
                    <span className="text-xs text-muted-foreground">Нажмите вне панели, чтобы закрыть</span>
                  </div>
                  <div className="grid gap-2">
                    <Input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Марка авто" className="h-11 rounded-xl" />
                    <select value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold">
                      {cities.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  <p className="mb-1.5 mt-4 text-[11px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">Состояние</p>
                  <div className="flex flex-wrap gap-2">
                    {conditionOptions.map((item) => <button key={item.value} type="button" onClick={() => setCondition(item.value)} className={`min-h-9 rounded-full px-3 text-xs font-bold ${condition === item.value ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{item.label}</button>)}
                  </div>
                  <p className="mb-1.5 mt-4 text-[11px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">Для какого авто</p>
                  <div className="flex flex-wrap gap-2">
                    {vehicleTypeOptions.map((item) => <button key={item.value} type="button" onClick={() => setVehicleType(item.value)} className={`min-h-9 rounded-full px-3 text-xs font-bold ${vehicleType === item.value ? "bg-primary/12 text-primary ring-1 ring-primary/25" : "bg-muted"}`}>{item.label}</button>)}
                  </div>
                  <p className="mb-1.5 mt-4 text-[11px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">Производитель</p>
                  <div className="flex flex-wrap gap-2">
                    {vehicleOriginOptions.map((item) => <button key={item.value} type="button" onClick={() => setVehicleOrigin(item.value)} className={`min-h-9 rounded-full px-3 text-xs font-bold ${vehicleOrigin === item.value ? "bg-primary/12 text-primary ring-1 ring-primary/25" : "bg-muted"}`}>{item.label}</button>)}
                  </div>
                </div>
              </details>
            </div>

            <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_180px]">
              <Input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Марка авто" className="h-11 rounded-xl" />
              <select value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold">
                {cities.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div className="mt-3 hidden space-y-3 sm:block">
              <div className="flex flex-wrap gap-2">
                {conditionOptions.map((item) => <button key={item.value} type="button" onClick={() => setCondition(item.value)} className={`min-h-9 rounded-full px-3.5 text-xs font-bold ${condition === item.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{item.label}</button>)}
                {vehicleTypeOptions.map((item) => <button key={item.value} type="button" onClick={() => setVehicleType(item.value)} className={`min-h-9 rounded-full px-3.5 text-xs font-bold ${vehicleType === item.value ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"}`}>{item.label}</button>)}
                {vehicleOriginOptions.map((item) => <button key={item.value} type="button" onClick={() => setVehicleOrigin(item.value)} className={`min-h-9 rounded-full px-3.5 text-xs font-bold ${vehicleOrigin === item.value ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"}`}>{item.label}</button>)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 pb-28 lg:px-6">
        <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="contents">
            <div>
              <p className="text-xs font-semibold text-primary">Цены и наличие</p>
              <h2 className="mt-1 text-base font-bold">Не нашли нужную запчасть?</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Отправьте один запрос — подходящие автомагазины и авторазборы ответят ценой, наличием и сроком.
              </p>
            </div>
            <Button
              className="min-h-11 shrink-0 rounded-xl px-4 font-bold"
              onClick={() => navigate(`/auto-parts/requests?section=${supplierType}`)}
            >
              <PackageSearch className="mr-2 h-5 w-5" />
              Запросить запчасть
            </Button>
          </div>
        </section>

        <div className="mb-3 mt-7 flex items-end justify-between gap-3">
          <div>
            <h2 className="section-title">{supplierType === "store" ? "Автомагазины" : "Авторазборы"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading ? "Загружаем каталог…" : `${suppliers.length} найдено`}
            </p>
          </div>
          {(query || brand || condition !== "all" || vehicleType !== "all" || vehicleOrigin !== "all" || city !== "Все города") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setBrand("");
                setCondition("all");
                setSupplierType("store");
                setVehicleType("all");
                setVehicleOrigin("all");
                setCity("Все города");
              }}
            >
              Сбросить
            </Button>
          )}
        </div>

        {isError ? (
          <EmptyState
            icon={<PackageSearch className="h-10 w-10" />}
            title="Не удалось загрузить каталог"
            description="Обновите страницу и попробуйте ещё раз."
          />
        ) : !isLoading && suppliers.length === 0 ? (
          <EmptyState
            icon={<Box className="h-10 w-10" />}
            title={supplierType === "store" ? "Пока нет подходящих автомагазинов" : "Пока нет подходящих авторазборов"}
            description={supplierType === "store"
              ? "Автомагазины появятся после импорта реальных данных или добавления администратором."
              : "Авторазборы появятся после импорта реальных данных или добавления администратором."}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {suppliers.map((supplier) => {
              const Icon = supplierIcon(supplier.supplierType);
              return (
                <article key={supplier.id} className="premium-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-extrabold">{supplier.name}</h3>
                        {supplier.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {supplierTypeLabel[supplier.supplierType]} · {conditionLabel[supplier.partsCondition]}
                      </p>
                      {(supplier.city || supplier.address) && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {[supplier.city, supplier.address].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {supplier.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {supplier.description}
                    </p>
                  )}

                  {(supplier.vehicleTypes.length > 0 || supplier.vehicleOrigins.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {supplier.vehicleTypes.map((item) => (
                        <span key={item} className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          {vehicleTypeLabel[item]}
                        </span>
                      ))}
                      {supplier.vehicleOrigins.map((item) => (
                        <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          {vehicleOriginLabel[item]}
                        </span>
                      ))}
                    </div>
                  )}

                  {supplier.brands.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {supplier.brands.slice(0, 6).map((item) => (
                        <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    {supplier.delivery && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Доставка</span>}
                    {supplier.pickup && <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Самовывоз</span>}
                    {(supplier.salesType === "wholesale" || supplier.salesType === "both") && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Опт</span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {supplier.phone ? (
                      <a
                        href={`tel:${normalizePhone(supplier.phone)}`}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/25 text-sm font-bold text-primary"
                      >
                        <Phone className="h-4 w-4" />
                        Позвонить
                      </a>
                    ) : <div />}
                    {supplier.website ? (
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground"
                      >
                        Сайт <ChevronRight className="h-4 w-4" />
                      </a>
                    ) : supplier.whatsapp ? (
                      <a
                        href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground"
                      >
                        WhatsApp <ChevronRight className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
