import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, PackageSearch, Plus, Search } from "lucide-react";
import { AppBrandHeader } from "@/components/app-brand-header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { cities } from "@shared/schema";
import type { AutoPartRequestView } from "@shared/auto-parts-request-schema";

const inventoryLabels = {
  stock_only: "Только в наличии",
  stock_or_order: "В наличии или под заказ",
  order_only: "Только под заказ",
} as const;

const vehicleTypeLabels = {
  passenger: "Легковые",
  truck: "Грузовые",
  van: "Микроавтобусы",
  special: "Спецтехника",
} as const;

export default function AutoPartsRequestsPage() {
  const { user } = useAuth();
  const search = useSearch();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const initialTarget = useMemo(() => {
    const value = new URLSearchParams(search).get("section");
    return value === "dismantler" || value === "store" ? value : "all";
  }, [search]);

  const [target, setTarget] = useState<"all" | "store" | "dismantler">(initialTarget);
  const [inventoryPreference, setInventoryPreference] = useState<"stock_only" | "stock_or_order" | "order_only">("stock_or_order");
  const [partCondition, setPartCondition] = useState<"any" | "new" | "used">("any");
  const [city, setCity] = useState("Грозный");
  const [vehicleType, setVehicleType] = useState<"" | "passenger" | "truck" | "van" | "special">("");
  const [vehicleOrigin, setVehicleOrigin] = useState<"" | "foreign" | "domestic">("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [partName, setPartName] = useState("");
  const [oem, setOem] = useState("");
  const [notes, setNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery<AutoPartRequestView[]>({
    queryKey: ["/api/auto-parts/requests"],
    enabled: user?.role === "client",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auto-parts/requests", {
        target,
        inventoryPreference,
        partCondition,
        city,
        ...(vehicleType ? { vehicleType } : {}),
        ...(vehicleOrigin ? { vehicleOrigin } : {}),
        brand: brand.trim(),
        ...(model.trim() ? { model: model.trim() } : {}),
        ...(year.trim() ? { year: year.trim() } : {}),
        partName: partName.trim(),
        ...(oem.trim() ? { oem: oem.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      return response.json() as Promise<AutoPartRequestView>;
    },
    onSuccess: async (request) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auto-parts/requests"] });
      navigate(`/auto-parts/requests/${request.id}`);
    },
  });

  if (!user) {
    return (
      <div className="app-page bg-background">
        <header className="app-header-shell safe-area-pt">
          <div className="mx-auto max-w-3xl px-4 py-4"><AppBrandHeader compact /></div>
        </header>
        <main className="mx-auto max-w-xl px-4 py-10 text-center">
          <div className="premium-card p-6">
            <PackageSearch className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-2xl font-extrabold">Запросить запчасть</h1>
            <p className="mt-2 text-sm text-muted-foreground">Войдите в клиентский аккаунт, чтобы магазины могли ответить ценой и наличием.</p>
            <Button className="mt-5" onClick={() => navigate("/auth")}>Войти</Button>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (user.role !== "client") {
    return (
      <div className="app-page bg-background">
        <main className="mx-auto max-w-xl px-4 py-10 text-center">
          <div className="premium-card p-6">
            <h1 className="text-xl font-extrabold">Запрос доступен клиентскому аккаунту</h1>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/auto-parts")}>Вернуться к автозапчастям</Button>
          </div>
        </main>
      </div>
    );
  }

  const canSubmit = brand.trim().length > 0 && partName.trim().length >= 2 && /^\d{4}$/.test(year.trim() || "2000");

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <button type="button" onClick={() => navigate("/auto-parts")} className="mt-4 flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Автозапчасти
          </button>
          <div className="mt-3">
            <div className="flex items-center gap-2 text-primary">
              <Search className="h-5 w-5" />
              <span className="text-xs font-extrabold uppercase tracking-[.14em]">Цены и наличие</span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em]">Запросить запчасть</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Один запрос — несколько ответов от автомагазинов и авторазборов.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-5 pb-28">
        <section className="premium-card p-5">
          <h2 className="font-extrabold">Что нужно найти</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Марка, например Toyota" />
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Модель, например Camry" />
            <Input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Год" inputMode="numeric" />
            <Input value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="Название детали" />
            <Input value={oem} onChange={(e) => setOem(e.target.value)} placeholder="OEM / артикул, если знаете" className="sm:col-span-2" />
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Комментарий: сторона, цвет, двигатель, комплектация и т. п." className="sm:col-span-2" />
          </div>
        </section>

        <section className="premium-card p-5">
          <h2 className="font-extrabold">Условия поиска</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-muted-foreground">
              Где искать
              <select value={target} onChange={(e) => setTarget(e.target.value as typeof target)} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                <option value="all">Автомагазины и авторазборы</option>
                <option value="store">Только автомагазины</option>
                <option value="dismantler">Только авторазборы</option>
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Наличие
              <select value={inventoryPreference} onChange={(e) => setInventoryPreference(e.target.value as typeof inventoryPreference)} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                {Object.entries(inventoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Состояние
              <select value={partCondition} onChange={(e) => setPartCondition(e.target.value as typeof partCondition)} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                <option value="any">Новое или Б/У</option>
                <option value="new">Только новое</option>
                <option value="used">Только Б/У</option>
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Город
              <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                {cities.filter((item) => item !== "Все города").map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Тип автомобиля
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                <option value="">Любой</option>
                {Object.entries(vehicleTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Производитель
              <select value={vehicleOrigin} onChange={(e) => setVehicleOrigin(e.target.value as typeof vehicleOrigin)} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                <option value="">Любой</option>
                <option value="foreign">Иномарки</option>
                <option value="domestic">Отечественные</option>
              </select>
            </label>
          </div>

          {createMutation.error && (
            <p className="mt-3 rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{createMutation.error.message}</p>
          )}

          <Button
            className="accent-gradient mt-5 h-12 w-full rounded-2xl font-extrabold text-white"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <PackageSearch className="mr-2 h-5 w-5" />
            {createMutation.isPending ? "Отправляем запрос…" : "Запросить запчасть"}
          </Button>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="section-title">Мои запросы</h2>
              <p className="mt-1 text-xs text-muted-foreground">Все цены и наличие собираются внутри одной заявки.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="premium-card p-6 text-center text-sm text-muted-foreground">Загрузка…</div>
          ) : requests.length === 0 ? (
            <div className="premium-card p-6 text-center text-sm text-muted-foreground">Запросов пока нет.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => navigate(`/auto-parts/requests/${request.id}`)}
                  className="premium-card pressable flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{request.partName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[request.brand, request.model, request.year].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-2 text-xs">
                      <span className="font-bold text-primary">{request.offerCount} предложений</span>
                      <span className="text-muted-foreground"> · отправлено в {request.recipientCount} точек</span>
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}
