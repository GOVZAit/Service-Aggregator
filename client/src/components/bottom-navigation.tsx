import { useEffect, useRef } from "react";
import { Home, Building2, Phone, User, Stethoscope, PackageSearch } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const tabs = [
  { id: 'home',     path: '/',        icon: Home,        label: 'Мастера' },
  { id: 'doctors',  path: '/doctors', icon: Stethoscope, label: 'Врачи' },
  { id: 'city',     path: '/city',    icon: Building2,   label: 'Службы' },
  { id: 'contacts', path: '/contacts',icon: Phone,       label: 'Контакты' },
  { id: 'lost-found', path: '/lost-found', icon: PackageSearch, label: 'Потеряно/Найдено' },
  { id: 'profile',  path: '/profile', icon: User,        label: 'Профиль' },
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
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-pb shadow-[0_-10px_30px_hsl(var(--foreground)/0.05)]",
        // Desktop: floating centered dock so sections stay reachable on wide screens
        "lg:bottom-5 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[min(92vw,760px)] lg:rounded-full lg:border lg:border-border/80 lg:shadow-xl"
      )}
      aria-label="Основные разделы"
    >
      <div
        ref={scrollerRef}
        className="scrollbar-none flex items-center gap-0.5 overflow-x-auto overscroll-x-contain px-2 py-1.5 lg:gap-1 lg:px-3"
      >
        {tabs.map((tab) => {
          const isActive =
            location === tab.path ||
            (tab.path === '/' && location === '') ||
            (tab.path !== '/' && location.startsWith(tab.path));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.path}
              data-testid={`nav-${tab.id}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "pressable min-w-[70px] min-h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl transition-colors lg:flex-row lg:gap-2 lg:px-4 lg:rounded-full",
                isActive
                  ? "text-primary lg:bg-primary/10"
                  : "text-muted-foreground lg:hover:bg-muted"
              )}
            >
              <Icon className="w-6 h-6 lg:w-5 lg:h-5" />
              <span className="text-center text-[11px] font-medium leading-tight lg:text-sm lg:whitespace-nowrap">
                {tab.id === "lost-found" ? (
                  <>
                    Потеряно/<br className="lg:hidden" />Найдено
                  </>
                ) : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
