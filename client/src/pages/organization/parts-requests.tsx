import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, PackageSearch, Save, Store, XCircle } from "lucide-react";
import OrganizationBottomNavigation from "@/components/organization-bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import type { AutoPartsSupplierView } from "@shared/auto-parts-schema";

interface StoreRequestRow {
  requestId: number;
  supplierId: number;
  supplierName: string;
  target: "all" | "store" | "dismantler";
  inventoryPreference: "stock_only" | "stock_or_order" | "order_only";
  partCondition: "any" | "new" | "used";
  city: string;
  vehicleType: "passenger" | "truck" | "van" | "special" | null;
  vehicleOrigin: "foreign" | "domestic" | null;
  brand: string;
  model: string | null;
  year: string | null;
  partName: string;
  oem: string | null;
  notes: string | null;
  status: "open" | "closed";
  createdAt: string;
  offer: {
    id: number;
    availability: "in_stock" | "order" | "unavailable";
    condition: "new" | "used" | null;
    priceRub: number | null;
    etaText: string | null;
    comment: string | null;
  } | null;
}

const inventoryLabels = {
  stock_only: "Только в наличии",
  stock_or_order: "В наличии или под заказ",
  order_only: "Только под заказ",
} as const;

function OfferEditor({ row }: { row: StoreRequestRow }) {
  const queryClient = useQueryClient();
  const allowedAvailability = useMemo(() => {
    if (row.inventoryPreference === "stock_only") return ["in_stock", "unavailable"] as const;
    if (row.inventoryPreference === "order_only") return ["order", "unavailable"] as const;
    return ["in_stock", "order", "unavailable"] as const;
  }, [row.inventoryPreference]);

  const [availability, setAvailability] = useState<"in_stock" | "order" | "unavailable">(
    row.offer?.availability ?? allowedAvailability[0],
  );
  const [condition, setCondition] = useState<"new" | "used">(
    row.offer?.condition ?? (row.partCondition === "used" ? "used" : "new"),
  );
  const [price, setPrice] = useState(row.offer?.priceRub?.toString() ?? "");
  const [etaText, setEtaText] = useState(row.offer?.etaText ?? "");
  const [comment, setComment] = useState(row.offer?.comment ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/auto-parts/store/requests/${row.requestId}/offer`, {
        supplierId: row.supplierId,
        availability,
        ...(availability !== "unavailable" ? {
          condition,
          priceRub: Number(price),
        } : {}),
        ...(etaText.trim() ? { etaText: etaText.trim() } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auto-parts/store/requests"] });
    },
  });

  const canSave = availability === "unavailable" || (Number.isFinite(Number(price)) && Number(price) >= 0 && price !== "");

  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-muted/[.18] p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-bold text-muted-foreground">
          Ответ
          <select value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
            {allowedAvailability.includes("in_stock") && <option value="in_stock">В наличии</option>}
            {allowedAvailability.includes("order") && <option value="order">Под заказ</option>}
            <option value="unavailable">Нет в наличии</option>
          </select>
        </label>

        {availability !== "unavailable" && (
          <label className="text-xs font-bold text-muted-foreground">
            Состояние
            <select value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
              {row.partCondition !== "used" && <option value="new">Новая</option>}
              {row.partCondition !== "new" && <option value="used">Б/У</option>}
            </select>
          </label>
        )}

        {availability !== "unavailable" && (
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="Цена, ₽"
            inputMode="numeric"
          />
        )}
        <Input value={etaText} onChange={(e) => setEtaText(e.target.value)} placeholder={availability === "order" ? "Срок, например 2 дня" : "Срок / уточнение"} />
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий клиенту" className="sm:col-span-2" />
      </div>

      {mutation.error && <p className="mt-2 text-sm text-destructive">{mutation.error.message}</p>}

      <Button className="mt-3 w-full" disabled={!canSave || mutation.isPending || row.status !== "open"} onClick={() => mutation.mutate()}>
        <Save className="mr-2 h-4 w-4" />
        {row.offer ? "Обновить предложение" : "Отправить предложение"}
      </Button>
    </div>
  );
}

export default function OrganizationPartsRequestsPage() {
  const { data: profiles = [], isLoading: profileLoading } = useQuery<AutoPartsSupplierView[]>({
    queryKey: ["/api/auto-parts/store/profile"],
  });
  const { data: requests = [], isLoading } = useQuery<StoreRequestRow[]>({
    queryKey: ["/api/auto-parts/store/requests"],
  });

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <div className="mt-6">
            <div className="flex items-center gap-2 text-primary">
              <PackageSearch className="h-5 w-5" />
              <span className="text-xs font-extrabold uppercase tracking-[.14em]">Автозапчасти</span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em]">Запросы на запчасти</h1>
            <p className="mt-1 text-sm text-muted-foreground">Отвечайте ценой, наличием и сроком прямо в заявке.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5 pb-28">
        {profileLoading ? (
          <div className="premium-card p-6 text-center text-sm text-muted-foreground">Проверяем привязку магазина…</div>
        ) : profiles.length === 0 ? (
          <div className="premium-card p-6 text-center">
            <Store className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 text-xl font-extrabold">Автомагазин не привязан</h2>
            <p className="mt-2 text-sm text-muted-foreground">Администратор GOVZA должен привязать карточку автомагазина или авторазбора к вашему аккаунту организации.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/15 bg-primary/[.04] p-4">
            <p className="text-xs font-bold text-muted-foreground">Ваши карточки</p>
            <p className="mt-1 font-extrabold">{profiles.map((profile) => profile.name).join(" · ")}</p>
          </div>
        )}

        {!profileLoading && profiles.length > 0 && (
          isLoading ? (
            <div className="premium-card p-6 text-center text-sm text-muted-foreground">Загрузка запросов…</div>
          ) : requests.length === 0 ? (
            <div className="premium-card p-8 text-center">
              <Clock3 className="mx-auto h-9 w-9 text-primary" />
              <p className="mt-3 font-extrabold">Новых запросов пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">Здесь появятся запросы, которые подходят вашему магазину по фильтрам.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((row) => (
                <article key={`${row.requestId}-${row.supplierId}`} className="premium-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">{row.supplierName}</p>
                      <h2 className="mt-1 text-xl font-extrabold">{row.partName}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{[row.brand, row.model, row.year].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className={row.status === "open"
                      ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                      : "rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground"
                    }>
                      {row.status === "open" ? "Открыт" : "Закрыт"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2.5 py-1 font-bold">{inventoryLabels[row.inventoryPreference]}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 font-bold">{row.partCondition === "any" ? "Новое или Б/У" : row.partCondition === "new" ? "Новое" : "Б/У"}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 font-bold">{row.city}</span>
                  </div>

                  {row.oem && <p className="mt-3 text-sm"><span className="font-bold">OEM:</span> {row.oem}</p>}
                  {row.notes && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{row.notes}</p>}

                  {row.offer && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/[.05] p-3 text-sm">
                      {row.offer.availability === "in_stock" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                        row.offer.availability === "order" ? <PackageSearch className="h-4 w-4 text-primary" /> :
                        <XCircle className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-bold">Ваш ответ уже отправлен. Его можно обновить ниже.</span>
                    </div>
                  )}

                  <OfferEditor row={row} />
                </article>
              ))}
            </div>
          )
        )}
      </main>

      <OrganizationBottomNavigation />
    </div>
  );
}
