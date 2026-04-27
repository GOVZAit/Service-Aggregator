import { Heart, MapPin, Clock, BadgeCheck, Crown, Star, Building2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Master } from "@shared/schema";
import { Link } from "wouter";

interface MasterCardProps {
  master: Master;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export function MasterCard({ master, isFavorite, onToggleFavorite }: MasterCardProps) {
  const previewPhotos = master.portfolio?.slice(0, 3) ?? [];

  return (
    <Link href={`/master/${master.id}`}>
      <div
        data-testid={`master-card-${master.id}`}
        className="bg-card rounded-2xl p-4 hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer border border-border/40"
      >
        <div className="flex gap-3 mb-3">
          <div className="relative shrink-0">
            <Avatar className="w-16 h-16 rounded-2xl">
              <AvatarImage src={master.avatar} alt={master.name} className="object-cover" />
              <AvatarFallback className="rounded-2xl text-lg">
                {master.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {master.isOnline && (
              <span
                data-testid={`status-online-${master.id}`}
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-card shadow-sm"
                title="Сейчас онлайн"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {master.companyName && (
              <div
                className="flex items-center gap-1 text-[11px] font-semibold text-primary/90 uppercase tracking-wide mb-0.5 truncate"
                data-testid={`text-company-${master.id}`}
              >
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{master.companyName}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="font-semibold text-foreground truncate" data-testid={`text-name-${master.id}`}>
                {master.name}
              </span>
              {master.topMaster && (
                <span
                  data-testid={`badge-top-${master.id}`}
                  className="inline-flex items-center gap-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full px-1.5 py-0.5 text-[10px] font-bold flex-shrink-0"
                >
                  <Crown className="w-3 h-3" />
                  ТОП
                </span>
              )}
              {master.verified && (
                <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0">
                  <BadgeCheck className="w-3 h-3" />
                  Проверен
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1.5">{master.category}</p>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 rounded-md px-1.5 py-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span className="text-sm font-bold text-foreground" data-testid={`text-rating-${master.id}`}>
                  {master.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground" data-testid={`text-reviews-${master.id}`}>
                ({master.reviews} отз.)
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFavorite}
              data-testid={`button-favorite-${master.id}`}
              className="-mr-2 -mt-1 w-9 h-9"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                }`}
              />
            </Button>
            <span
              className="text-sm font-bold text-primary whitespace-nowrap"
              data-testid={`text-price-${master.id}`}
            >
              {master.price}
            </span>
          </div>
        </div>

        {previewPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {previewPhotos.map((src, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <img
                  src={src}
                  alt={`Работа ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-3 text-xs text-muted-foreground min-w-0">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {master.district ? `${master.district} · ` : ""}{master.distance}
              </span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {master.responseTime}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
