import { Clock, Star } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, Master, OrderStatus } from "@shared/schema";

interface OrderCardProps {
  order: Order;
  master: Master | undefined;
  onLeaveReview?: () => void;
}

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  completed: { label: 'Выполнен', variant: 'default' },
  in_progress: { label: 'В работе', variant: 'secondary' },
  pending: { label: 'Ожидает', variant: 'outline' },
  rejected: { label: 'Отклонён', variant: 'outline' },
};

export function OrderCard({ order, master, onLeaveReview }: OrderCardProps) {
  const status = statusConfig[order.status];

  return (
    <div
      data-testid={`order-card-${order.id}`}
      className="bg-card rounded-xl p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-12 h-12 rounded-xl">
          <AvatarImage src={master?.avatar} alt={master?.name} className="object-cover" />
          <AvatarFallback className="rounded-xl">
            {master?.name?.slice(0, 2) || '??'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{order.title}</p>
          <p className="text-sm text-muted-foreground truncate">{master?.name}</p>
        </div>
        <Badge
          variant={status.variant}
          className={
            order.status === 'completed'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : order.status === 'in_progress'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : ''
          }
        >
          {status.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {order.date}
        </span>
        <span className="font-bold">{order.price}</span>
      </div>

      {order.status === 'completed' && onLeaveReview && (
        <Button
          variant="outline"
          onClick={onLeaveReview}
          className="w-full mt-4 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20"
          data-testid={`button-review-${order.id}`}
        >
          <Star className="w-4 h-4 mr-2 fill-amber-400 text-amber-400" />
          Оставить отзыв
        </Button>
      )}
    </div>
  );
}
