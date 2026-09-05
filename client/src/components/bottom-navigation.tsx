import { Home, Building2, Phone, User, Stethoscope } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const tabs = [
  { id: 'home',     path: '/',        icon: Home,        label: 'Мастера' },
  { id: 'city',     path: '/city',    icon: Building2,   label: 'Службы' },
  { id: 'doctors',  path: '/doctors', icon: Stethoscope, label: 'Врачи' },
  { id: 'contacts', path: '/contacts',icon: Phone,       label: 'Контакты' },
  { id: 'profile',  path: '/profile', icon: User,        label: 'Профиль' },
] as const;

export function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav
      className={cn(
        // Mobile: full-width bottom bar
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-pb shadow-[0_-10px_30px_hsl(var(--foreground)/0.05)]",
        // Desktop: floating centered dock so sections stay reachable on wide screens
        "lg:bottom-5 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-auto lg:rounded-full lg:border lg:border-border/80 lg:shadow-xl lg:px-3"
      )}
    >
        <div className="max-w-lg mx-auto flex justify-around items-center py-1.5 lg:gap-1">
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
                "pressable min-w-[60px] min-h-[52px] flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl transition-colors lg:flex-row lg:gap-2 lg:px-4 lg:rounded-full",
                isActive
                  ? "text-primary lg:bg-primary/10"
                  : "text-muted-foreground lg:hover:bg-muted"
              )}
            >
              <Icon className="w-6 h-6 lg:w-5 lg:h-5" />
              <span className="text-xs font-medium lg:text-sm">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
