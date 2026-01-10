import { Plus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestCard } from "@/components/request-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import type { ServiceRequest } from "@shared/schema";

export default function RequestsPage() {
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/requests'],
  });

  const handleRespond = () => {
    toast({
      title: "Отклик отправлен",
      description: "Заказчик получит уведомление о вашем отклике",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4 safe-area-pt">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Заявки</h1>
          <Button size="icon" data-testid="button-create-request">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onRespond={handleRespond}
              />
            ))}
          </div>
        )}

        {!isLoading && requests.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Нет активных заявок</p>
            <Button>Создать заявку</Button>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
