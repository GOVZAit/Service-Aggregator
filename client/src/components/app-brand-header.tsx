import { Bell, ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
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
}

export function AppBrandHeader({
  city = "Все города",
  onLocationClick,
  className,
  subtitle = "Надёжные специалисты рядом",
  compact = false,
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
      <MapPin className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-medium leading-none text-muted-foreground sm:text-[11px]">
          Чеченская Республика
        </p>
        <div className="mt-1 flex items-center gap-0.5">
          <span className="truncate text-sm font-bold leading-none text-foreground">{city}</span>
          {onLocationClick && <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className={cn(compact ? "flex items-center justify-end gap-2" : "flex items-center justify-between gap-3", className)}>
        <div className="min-w-0">
          {!compact && (
            <>
              <div className="flex items-baseline gap-1.5 whitespace-nowrap text-[1.6rem] sm:text-3xl">
                <span className="display-face font-bold text-[#07132f] dark:text-white">GOVZA</span>
                <span className="font-extrabold tracking-[-0.04em] text-primary">мастера</span>
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground sm:text-sm">{subtitle}</p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {onLocationClick ? (
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
          )}

          {user && (
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              aria-label="Открыть уведомления"
              className="pressable relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground shadow-sm sm:h-12 sm:w-12"
              data-testid="brand-notifications"
            >
              <Bell className="h-5 w-5" />
              {(unread?.count ?? 0) > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground ring-2 ring-background">
                  {(unread?.count ?? 0) > 99 ? "99+" : unread?.count}
                </span>
              )}
            </button>
          )}

          <Avatar className="h-11 w-11 border border-white/60 bg-gradient-to-br from-primary to-cyan-500 shadow-sm sm:h-12 sm:w-12">
            <AvatarFallback className="bg-transparent text-sm font-bold text-white">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </>
  );
}
