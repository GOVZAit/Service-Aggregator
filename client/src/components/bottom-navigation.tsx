import { useEffect, useRef } from "react";
import { Home, Phone, User, Stethoscope, LayoutGrid } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const tabs = [
  { id: 'home',     path: '/',        icon: Home,        label: 'Мастера' },
  { id: 'doctors',  path: '/doctors', icon: Stethoscope, label: 'Врачи' },
  { id: 'contacts', path: '/contacts', icon: Phone,       label: 'Контакты' },
  { id: 'more',     path: '/more',     icon: LayoutGrid,  label: 'Ещё' },
] as const;

export function BottomNavigation() {
  const [location] = useLocation();
  const scrollerRef = useRef<HTMLDivElement>(null);

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
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/92 safe-area-pb shadow-[0_-18px_50px_-34px_hsl(var(--foreground)/0.34)] backdrop-blur-2xl",
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
          const isActive = tab.id === "contacts"
            ? location.startsWith("/contacts") || location.startsWith("/city")
            : tab.id === "more"
              ? location.startsWith("/more") || location.startsWith("/lost-found")
              : location === tab.path || (tab.path === "/" && location === "");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.path}
              data-testid={`nav-${tab.id}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "pressable min-w-[70px] min-h-[54px] shrink-0 flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-2xl transition-all lg:flex-row lg:gap-2 lg:px-4 lg:rounded-full",
                isActive
                  ? "text-primary bg-primary/[0.07] lg:bg-primary/10"
                  : "text-muted-foreground lg:hover:bg-muted"
              )}
            >
              <Icon className="w-6 h-6 lg:w-5 lg:h-5" />
              <span className="text-center text-[11px] font-medium leading-tight lg:text-sm lg:whitespace-nowrap">
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
            "pressable relative z-10 my-1.5 mr-2 flex min-h-[54px] min-w-[70px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-background/95 px-2 py-1.5 transition-all lg:mr-3 lg:flex-row lg:gap-2 lg:rounded-full lg:px-4",
            "before:absolute before:-left-1 before:top-2 before:bottom-2 before:border-l before:border-border/70",
            location.startsWith("/profile")
              ? "text-primary bg-primary/[0.07] lg:bg-primary/10"
              : "text-muted-foreground lg:hover:bg-muted"
          )}
        >
          <User className="h-6 w-6 lg:h-5 lg:w-5" />
          <span className="text-center text-[11px] font-medium leading-tight lg:text-sm lg:whitespace-nowrap">
            Профиль
          </span>
        </Link>
      </div>
    </nav>
  );
}
