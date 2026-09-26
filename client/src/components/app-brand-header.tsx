import { Bell, ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationsPanel } from "@/components/notifications-panel";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface AppBrandHeaderProps {
  city?: string;
  onLocationClick?: () => void;
  className?: string;
  subtitle?: string;
  compact?: boolean;
  hideLocation?: boolean;
}

export function AppBrandHeader({
  city = "Все города",
  onLocationClick,
  className,
  subtitle = "Надёжные специалисты рядом",
  compact = false,
  hideLocation = false,
}: AppBrandHeaderProps) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ["/api/push/notifications/unread-count"],
    enabled: Boolean(user),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const initials = user?.name
    ? user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
    : "G";

  const locationContent = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <MapPin className="h-4 w-4" />
      </span>
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-medium leading-none text-muted-foreground">Чеченская Республика</p>
        <div className="mt-1 flex items-center gap-0.5">
          <span className="truncate text-sm font-bold leading-none text-foreground">{city}</span>
          {onLocationClick && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className={cn(compact ? "flex items-center justify-end gap-2" : "flex items-center justify-between gap-3", className)}>
        {!compact && (
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="display-face text-[1.45rem] font-bold text-foreground sm:text-[1.7rem]">GOVZA</span>
              <span className="text-[1rem] font-extrabold tracking-[-0.04em] text-primary sm:text-[1.1rem]">мастера</span>
            </div>
            {onLocationClick ? (
              <button
                type="button"
                onClick={onLocationClick}
                className="pressable mt-1 flex max-w-[13rem] items-center gap-1 text-[11px] font-semibold text-muted-foreground sm:hidden"
                data-testid="brand-location-mobile"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{city}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
            ) : (
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground sm:hidden">{subtitle}</p>
            )}
            <p className="mt-0.5 hidden truncate text-xs font-medium text-muted-foreground sm:block">{subtitle}</p>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {!hideLocation && (onLocationClick ? (
            <button
              type="button"
              onClick={onLocationClick}
              className="pressable hidden min-h-11 items-center gap-2 rounded-2xl px-2 sm:flex"
              data-testid="brand-location"
            >
              {locationContent}
            </button>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">{locationContent}</div>
          ))}

          {user && (
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              aria-label="Открыть уведомления"
              className="pressable relative flex h-11 w-11 items-center justify-center rounded-full bg-muted/80 text-foreground sm:h-11 sm:w-11"
              data-testid="brand-notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {(unread?.count ?? 0) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-extrabold text-primary-foreground ring-2 ring-background">
                  {(unread?.count ?? 0) > 99 ? "99+" : unread?.count}
                </span>
              )}
            </button>
          )}

          <Link href="/profile" aria-label={user ? "Мой профиль" : "Войти или зарегистрироваться"} className="rounded-full">
          <Avatar className="h-11 w-11 border border-border/60 bg-primary/10 sm:h-11 sm:w-11">
            <AvatarFallback className="bg-transparent text-xs font-extrabold text-primary">{initials}</AvatarFallback>
          </Avatar>
          </Link>
        </div>
      </div>

      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </>
  );
}
