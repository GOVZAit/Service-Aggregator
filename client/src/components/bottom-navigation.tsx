import { CarFront, Home, LayoutGrid, Stethoscope, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUnreadCounts } from "@/hooks/use-unread-counts";

const tabs = [
  { id: "home", path: "/", icon: Home, label: "Главная" },
  { id: "auto-parts", path: "/auto-parts", icon: CarFront, label: "Запчасти" },
  { id: "doctors", path: "/doctors", icon: Stethoscope, label: "Врачи" },
  { id: "more", path: "/more", icon: LayoutGrid, label: "Ещё" },
  { id: "profile", path: "/profile", icon: User, label: "Профиль" },
] as const;

export function BottomNavigation() {
  const [location] = useLocation();
  const { totalCount } = useUnreadCounts();

  const isActive = (id: (typeof tabs)[number]["id"], path: string) => {
    if (id === "home") return location === "/" || location === "";
    if (id === "auto-parts") return location.startsWith("/auto-parts");
    if (id === "doctors") return location.startsWith("/doctors");
    if (id === "more") {
      return location.startsWith("/more") ||
        location.startsWith("/lost-found") ||
        location.startsWith("/contacts") ||
        location.startsWith("/city");
    }
    if (id === "profile") return location.startsWith("/profile") || location.startsWith("/saved");
    return location === path;
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:bottom-5 lg:left-1/2 lg:right-auto lg:w-[min(760px,calc(100vw-2rem))] lg:-translate-x-1/2 lg:p-0"
      aria-label="Основные разделы"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 rounded-[1.35rem] border border-border/70 bg-background/94 p-1.5 shadow-[0_10px_40px_-18px_hsl(var(--foreground)/.24)] backdrop-blur-2xl lg:max-w-none lg:rounded-full lg:px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.id, tab.path);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.path}
              data-testid={`nav-${tab.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "pressable relative flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 text-[10px] font-semibold leading-none transition-all lg:min-h-12 lg:flex-row lg:gap-2 lg:rounded-full lg:px-4 lg:text-sm",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative flex h-6 items-center justify-center">
                <Icon className={cn("h-[21px] w-[21px] lg:h-5 lg:w-5", active && "stroke-[2.3]")} />
                {tab.id === "more" && totalCount > 0 && (
                  <span className="absolute -right-3 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-extrabold text-primary-foreground ring-2 ring-background">
                    {totalCount > 99 ? "99+" : totalCount}
                  </span>
                )}
              </span>
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
