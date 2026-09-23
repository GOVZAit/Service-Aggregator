import { BadgeCheck, Building2, Clock, Heart, MapPin, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Master } from "@shared/schema";
import { Link } from "wouter";

interface MasterCardProps {
  master: Master;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export function MasterCard({ master, isFavorite, onToggleFavorite }: MasterCardProps) {
  const previewPhotos = master.showPortfolio !== false ? (master.portfolio?.slice(0, 3) ?? []) : [];
  const isOrganization = master.providerType === "organization";

  return (
    <Link href={`/master/${master.id}`}>
      <article
        data-testid={`master-card-${master.id}`}
        className="premium-card content-auto pressable group cursor-pointer overflow-hidden p-4 transition-transform duration-200 active:scale-[.995]"
      >
        <div className="flex gap-3.5">
          <div className="relative shrink-0">
            <Avatar className="h-[78px] w-[78px] rounded-[1.35rem] border border-border/50 shadow-sm">
              <AvatarImage src={master.avatar} alt={master.name} className="object-cover" />
              <AvatarFallback className="rounded-[1.35rem] bg-primary/10 text-lg font-extrabold text-primary">
                {master.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {master.verified && (
              <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-primary/10 bg-background px-2 py-1 text-[10px] font-bold text-primary shadow-sm">
                <BadgeCheck className="h-3 w-3" /> Проверен
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {(isOrganization || master.companyName) && (
              <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.08em] text-primary/80">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{isOrganization ? "Организация" : master.companyName}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[1.02rem] font-extrabold tracking-[-0.03em]" data-testid={`text-name-${master.id}`}>
                  {master.name}
                </h3>
                <p className="mt-0.5 text-sm font-medium text-muted-foreground">{master.category}</p>
              </div>
              <button
                type="button"
                onClick={onToggleFavorite}
                className="pressable -mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/10 px-2 py-1 text-sm font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {master.rating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">({master.reviews} отзывов)</span>
              {master.showPrices !== false && (
                <span className="ml-auto whitespace-nowrap text-sm font-extrabold text-primary">{master.price}</span>
              )}
            </div>
          </div>
        </div>

        {previewPhotos.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {previewPhotos.map((src, index) => (
              <div key={index} className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                <img
                  src={src}
                  alt={`Работа ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{[master.city, master.district].filter(Boolean).join(" · ") || "Рядом"}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {master.responseTime}
            </span>
          </div>
          {master.isOnline && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Онлайн
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
