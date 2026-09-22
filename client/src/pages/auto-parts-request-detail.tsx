import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock3, PackageCheck, Store, XCircle } from "lucide-react";
import { AppBrandHeader } from "@/components/app-brand-header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { AutoPartRequestView } from "@shared/auto-parts-request-schema";

const inventoryLabels = {
  stock_only: "Только в наличии",
  stock_or_order: "В наличии или под заказ",
  order_only: "Только под заказ",
} as const;

const availabilityLabels = {
  in_stock: "В наличии",
  order: "Под заказ",
  unavailable: "Нет в наличии",
} as const;

export default function AutoPartsRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = Number(params.id);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AutoPartRequestView>({
    queryKey: ["/api/auto-parts/requests", requestId],
    queryFn: async () => {
      const response = await fetch(\`/api/auto-parts/requests/\${requestId}\`, { credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Не удалось загрузить запрос");
      return body;
    },
    enabled: Number.isInteger(requestId) && requestId > 0,
    refetchInterval: 15_000,
  });

  const closeMutation = useMutation({
    mutationFn: () => apiRequest("POST", \`/api/auto-parts/requests/\${requestId}/close\`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/auto-parts/requests", requestId] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auto-parts/requests"] }),
      ]);
    },
  });

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <button type="button" onClick={() => navigate("/auto-parts/requests")} className="mt-4 flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Мои запросы
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5 pb-28">
        {isLoading ? (
          <div className="premium-card p-8 text-center text-sm text-muted-foreground">Загрузка запроса…</div>
        ) : error || !data ? (
          <div className="premium-card p-8 text-center">
            <p className="font-bold">Запрос не найден</p>
            <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Проверьте ссылку."}</p>
          </div>
        ) : (
          <>
            <section className="premium-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.12em] text-primary">Запрос #{data.id}</p>
                  <h1 className="mt-1 text-2xl font-extrabold">{data.partName}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[data.brand, data.model, data.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={data.status === "open"
                  ? "rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                  : "rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground"
                }>
                  {data.status === "open" ? "Идёт поиск" : "Закрыт"}
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground">Наличие</span>
                  <p className="mt-1 font-bold">{inventoryLabels[data.inventoryPreference]}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground">Состояние</span>
                  <p className="mt-1 font-bold">{data.partCondition === "any" ? "Новое или Б/У" : data.partCondition === "new" ? "Новое" : "Б/У"}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground">Город</span>
                  <p className="mt-1 font-bold">{data.city}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground">Получатели</span>
                  <p className="mt-1 font-bold">{data.recipientCount} точек</p>
                </div>
              </div>

              {data.oem && <p className="mt-4 text-sm"><span className="font-bold">OEM:</span> {data.oem}</p>}
              {data.notes && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.notes}</p>}

              {data.status === "open" && (
                <Button variant="outline" className="mt-4" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate()}>
                  Закрыть запрос
                </Button>
              )}
            </section>

            <section>
              <div className="mb-3">
                <h2 className="section-title">Цены и наличие</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Получено {data.offers?.length ?? 0} предложений. В наличии показывается первым, затем под заказ.
                </p>
              </div>

              {!data.offers?.length ? (
                <div className="premium-card p-8 text-center">
                  <Clock3 className="mx-auto h-9 w-9 text-primary" />
                  <p className="mt-3 font-extrabold">Ждём ответы магазинов</p>
                  <p className="mt-1 text-sm text-muted-foreground">Предложения появятся здесь автоматически.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.offers.map((offer) => {
                    const Icon = offer.availability === "in_stock"
                      ? CheckCircle2
                      : offer.availability === "order"
                        ? PackageCheck
                        : XCircle;
                    return (
                      <article key={offer.id} className="premium-card p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Store className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h3 className="font-extrabold">{offer.supplierName}</h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {offer.supplierType === "dismantler" ? "Авторазбор" : "Автомагазин"}
                                </p>
                              </div>
                              {offer.priceRub !== undefined && (
                                <div className="text-right">
                                  <p className="text-xl font-extrabold">{offer.priceRub.toLocaleString("ru-RU")} ₽</p>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                                <Icon className="h-3.5 w-3.5" />
                                {availabilityLabels[offer.availability]}
                              </span>
                              {offer.condition && (
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                                  {offer.condition === "new" ? "Новая" : "Б/У"}
                                </span>
                              )}
                              {offer.etaText && (
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{offer.etaText}</span>
                              )}
                            </div>

                            {offer.comment && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{offer.comment}</p>}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
