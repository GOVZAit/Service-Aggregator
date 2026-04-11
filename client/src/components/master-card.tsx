import { Heart, MapPin, Clock, BadgeCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import type { Master } from "@shared/schema";
import { Link } from "wouter";

interface MasterCardProps {
  master: Master;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export function MasterCard({ master, isFavorite, onToggleFavorite }: MasterCardProps) {
  return (
    <Link href={`/master/${master.id}`}>
      <div
        data-testid={`master-card-${master.id}`}
        className="bg-card rounded-xl p-4 hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer"
      >
        <div className="flex gap-3 mb-3">
          <Avatar className="w-14 h-14 rounded-xl">
            <AvatarImage src={master.avatar} alt={master.name} className="object-cover" />
            <AvatarFallback className="rounded-xl text-lg">
              {master.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="font-semibold text-foreground truncate">
                {master.name}
              </span>
              {master.verified && (
                <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0">
                  <BadgeCheck className="w-3 h-3" />
                  Верифицирован
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1.5">{master.category}</p>
            <RatingStars rating={master.rating} reviews={master.reviews} size="sm" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFavorite}
            data-testid={`button-favorite-${master.id}`}
            className="flex-shrink-0 -mr-2 -mt-1"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isFavorite
                  ? "fill-rose-500 text-rose-500"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {master.distance}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {master.responseTime}
            </span>
          </div>
          <span className="text-sm font-semibold text-primary">{master.price}</span>
        </div>
      </div>
    </Link>
  );
}
