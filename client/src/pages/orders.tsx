import { useQuery } from "@tanstack/react-query";
import { OrderCard } from "@/components/order-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Order, Master } from "@shared/schema";

export default function OrdersPage() {
  const { toast } = useToast();

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
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        {ordersLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                master={masters.find((m) => m.id === order.masterId)}
                onLeaveReview={handleLeaveReview}
              />
            ))}
          </div>
        )}

        {!ordersLoading && orders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">У вас пока нет заказов</p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
