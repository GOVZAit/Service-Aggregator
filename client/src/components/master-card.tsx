import { BadgeCheck, Building2, Clock, Heart, MapPin, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Master } from "@shared/schema";
import type { AvailabilityWindow } from "@shared/service-time";
import { Link } from "wouter";

interface MasterCardProps {
  master: Master;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  favoritePending?: boolean;
  availableToday?: AvailabilityWindow;
}

export function MasterCard({ master, isFavorite, onToggleFavorite, favoritePending, availableToday }: MasterCardProps) {
  const previewPhoto = master.showPortfolio !== false ? master.portfolio?.[0] : undefined;
  const isOrganization = master.providerType === "organization";

  return (
    <article
      data-testid={`master-card-${master.id}`}
      className="premium-card content-auto pressable group relative cursor-pointer overflow-hidden p-4 active:scale-[.995] sm:p-5"
    >
      <div className="flex gap-3.5">
        <Avatar className="h-[68px] w-[68px] shrink-0 rounded-[1.15rem] border border-border/50 sm:h-[76px] sm:w-[76px]">
          <AvatarImage src={master.avatar} alt={master.name} className="object-cover" />
          <AvatarFallback className="rounded-[1.15rem] bg-primary/10 text-lg font-extrabold text-primary">
            {master.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {(isOrganization || master.companyName) && (
                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.07em] text-primary/80">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{isOrganization ? "Организация" : master.companyName}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-[1.02rem] font-extrabold tracking-[-0.025em]" data-testid={`text-name-${master.id}`}>
                  <Link href={`/master/${master.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:underline">
                    {master.name}
                  </Link>
                </h3>
                {master.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Проверен" />}
              </div>
              <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">{master.category}</p>
            </div>

            <button
              type="button"
              onClick={onToggleFavorite}
              disabled={favoritePending}
              aria-pressed={isFavorite}
              data-testid={`favorite-master-${master.id}`}
              className="pressable relative z-10 -mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/65"
              aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
            >
              <Heart className={`h-[18px] w-[18px] ${isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
            </button>
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              {master.rating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">{master.reviews} отзывов</span>
            {master.showPrices !== false && (
              <span className="ml-auto whitespace-nowrap text-sm font-extrabold text-foreground">{master.price}</span>
            )}
          </div>
        </div>
      </div>

      {availableToday && (
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
          data-testid={`available-today-${master.id}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Сегодня {availableToday.fromTime}–{availableToday.toTime}
        </div>
      )}

      {previewPhoto && (
        <div className="mt-4 overflow-hidden rounded-[1rem] bg-muted">
          <img
            src={previewPhoto}
            alt={`Пример работы ${master.name}`}
            className="aspect-[16/7] w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            loading="lazy"
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{[master.city, master.district].filter(Boolean).join(" · ") || "Рядом"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {master.responseTime}
        </span>
        {master.isOnline && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Онлайн
          </span>
        )}
      </div>
    </article>
  );
}
