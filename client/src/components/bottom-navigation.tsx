import { useEffect, useRef } from "react";
import { CarFront, Home, User, Stethoscope, LayoutGrid } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUnreadCounts } from "@/hooks/use-unread-counts";

const tabs = [
  { id: 'home',       path: '/',           icon: Home,        label: 'Мастера' },
  { id: 'auto-parts', path: '/auto-parts', icon: CarFront,    label: 'Запчасти' },
  { id: 'doctors',    path: '/doctors',    icon: Stethoscope, label: 'Врачи' },
  { id: 'more',       path: '/more',       icon: LayoutGrid,  label: 'Ещё' },
] as const;

export function BottomNavigation() {
  const [location] = useLocation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { totalCount } = useUnreadCounts();

  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeItem = scrollerRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !activeItem) return;
    const frame = requestAnimationFrame(() => {
      activeItem.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location]);

  return (
    <nav
      className={cn(
        // Mobile: full-width bottom bar
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/98 safe-area-pb backdrop-blur-xl",
        // Desktop: floating centered dock so sections stay reachable on wide screens
        "lg:bottom-5 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[min(92vw,760px)] lg:rounded-full lg:border lg:border-border/80 lg:shadow-xl"
      )}
      aria-label="Основные разделы"
    >
      <div className="flex items-stretch">
        <div
          ref={scrollerRef}
          className="scrollbar-none flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain py-1.5 pl-2 pr-1 lg:gap-1 lg:pl-3"
        >
          {tabs.map((tab) => {
          const isActive = tab.id === "more"
            ? location.startsWith("/more") ||
              location.startsWith("/lost-found") ||
              location.startsWith("/contacts") ||
              location.startsWith("/city")
            : tab.id === "auto-parts"
              ? location.startsWith("/auto-parts")
              : location === tab.path || (tab.path === "/" && location === "");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.path}
              data-testid={`nav-${tab.id}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "pressable min-w-[66px] min-h-[52px] shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all lg:flex-row lg:gap-2 lg:px-4 lg:rounded-full",
                isActive
                  ? "nav-active-pill text-primary"
                  : "text-muted-foreground lg:hover:text-foreground"
              )}
            >
              <span className={cn("relative flex h-8 w-10 items-center justify-center rounded-xl transition-transform", isActive && "scale-[1.03]")}>
                <Icon className="w-6 h-6 lg:w-5 lg:h-5" />
                {tab.id === "more" && totalCount > 0 && (
                  <span className="absolute -right-2.5 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">
                    {totalCount > 99 ? "99+" : totalCount}
                  </span>
                )}
              </span>
              <span className={cn("text-center text-[11px] leading-tight lg:text-sm lg:whitespace-nowrap", isActive ? "font-extrabold" : "font-medium")}>
                {tab.label}
              </span>
            </Link>
          );
          })}
        </div>
        <Link
          href="/profile"
          data-testid="nav-profile"
          aria-current={location.startsWith("/profile") ? "page" : undefined}
          className={cn(
            "pressable relative z-10 my-1 mr-2 flex min-h-[52px] min-w-[66px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 transition-all lg:mr-3 lg:flex-row lg:gap-2 lg:rounded-full lg:px-4",
            location.startsWith("/profile")
              ? "nav-active-pill text-primary"
              : "text-muted-foreground lg:hover:text-foreground"
          )}
        >
          <span className={cn("flex h-8 w-10 items-center justify-center rounded-xl", location.startsWith("/profile") && "scale-[1.03]")}>
            <User className="h-6 w-6 lg:h-5 lg:w-5" />
          </span>
          <span className={cn("text-center text-[11px] leading-tight lg:text-sm lg:whitespace-nowrap", location.startsWith("/profile") ? "font-extrabold" : "font-medium")}>
            Профиль
          </span>
        </Link>
      </div>
    </nav>
  );
}
