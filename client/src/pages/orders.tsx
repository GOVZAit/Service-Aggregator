import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ShoppingBag } from "lucide-react";
import { OrderCard } from "@/components/order-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Order, Master } from "@shared/schema";

function OrderSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-9 rounded-xl w-full" />
    </div>
  );
}

export default function OrdersPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: masters = [] } = useQuery<Master[]>({
    queryKey: ['/api/masters'],
  });

  const handleLeaveReview = () => {
    toast({
      title: "Форма отзыва",
      description: "Функция отзывов будет добавлена в ближайшее время",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4 safe-area-pt">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">Мои заказы</h1>
          <p className="text-xs text-muted-foreground mt-0.5">История и текущие заказы</p>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        {ordersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                master={masters.find((m) => m.id === order.masterId)}
                onLeaveReview={handleLeaveReview}
                onOpenChat={() => navigate(`/orders/${order.id}/chat`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingBag className="w-10 h-10" />}
            title="Нет заказов"
            description="Вы ещё не делали заказов. Найдите нужного мастера и запишитесь — это займёт меньше минуты."
            action={
              <Button
                className="rounded-xl"
                onClick={() => navigate("/")}
                data-testid="button-find-master"
              >
                Найти мастера
              </Button>
            }
          />
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
