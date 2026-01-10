import { MapPin, Clock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceRequest } from "@shared/schema";

interface RequestCardProps {
  request: ServiceRequest;
  onRespond?: () => void;
}

export function RequestCard({ request, onRespond }: RequestCardProps) {
  return (
    <div
      data-testid={`request-card-${request.id}`}
      className="bg-card rounded-xl p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Avatar className="w-10 h-10">
            <AvatarImage src={request.user.avatar} alt={request.user.name} />
            <AvatarFallback>{request.user.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <span className="text-sm font-medium">{request.user.name}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {request.postedAt}
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {request.category}
        </Badge>
      </div>

      <h3 className="font-semibold text-foreground mb-2">{request.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        {request.description}
      </p>

      <div className="flex items-center gap-3 pt-3 border-t border-border mb-3">
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          {request.location}
        </span>
        <span className="ml-auto font-bold text-green-600 dark:text-green-400">
          {request.budget}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {request.responses} откликов
        </span>
        <Button onClick={onRespond} data-testid={`button-respond-${request.id}`}>
          Откликнуться
        </Button>
      </div>
    </div>
  );
}
