import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { ShoppingBag } from "lucide-react";
import { OrderCard } from "@/components/order-card";
import { ReviewModal } from "@/components/review-modal";
import { BookingModal } from "@/components/booking-modal";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { Order, Master } from "@shared/schema";

function OrderSkeleton() {
  return (
    <div className="premium-card space-y-3 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

export default function OrdersPage() {
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [repeatOrder, setRepeatOrder] = useState<Order | null>(null);
  const [, navigate] = useLocation();

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 15_000,
  });
  const { data: masters = [] } = useQuery<Master[]>({ queryKey: ["/api/masters"] });
  const { data: reviewed = { orderIds: [] } } = useQuery<{ orderIds: number[] }>({ queryKey: ["/api/order-reviews/mine"] });

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <div className="mt-6">
            <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Мои заказы</h1>
            <p className="mt-1 text-sm text-muted-foreground">Текущие работы, история и переписка по заказам.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">
        {ordersLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => <OrderSkeleton key={index} />)}
          </div>
        ) : orders.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((order) => {
              const master = masters.find((item) => item.id === order.masterId);
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  master={master}
                  onLeaveReview={order.status === "completed" && !reviewed.orderIds.includes(order.id) ? () => setReviewOrder(order) : undefined}
                  onOpenChat={() => navigate(`/orders/${order.id}/chat`)}
                  onRepeatOrder={order.status === "completed" && master ? () => setRepeatOrder(order) : undefined}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingBag className="h-10 w-10" />}
            title="Нет заказов"
            description="Вы ещё не делали заказов. Найдите нужного мастера и оформите первый заказ."
            action={<Button className="rounded-2xl" onClick={() => navigate("/")}>Найти мастера</Button>}
          />
        )}
      </main>

      {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} />}
      {repeatOrder && (() => {
        const master = masters.find((item) => item.id === repeatOrder.masterId);
        return master ? (
          <BookingModal
            master={master}
            initialService={repeatOrder.title}
            initialAddress={repeatOrder.address ?? ""}
            initialComment={repeatOrder.comment ?? ""}
            heading="Повторить заказ"
            onClose={() => setRepeatOrder(null)}
          />
        ) : null;
      })()}
      <BottomNavigation />
    </div>
  );
}
