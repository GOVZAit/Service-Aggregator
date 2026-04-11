import { Home, Building2, Phone, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const tabs = [
  { id: 'home',     path: '/',        icon: Home,      label: 'Мастера' },
  { id: 'city',     path: '/city',    icon: Building2, label: 'Службы' },
  { id: 'contacts', path: '/contacts',icon: Phone,     label: 'Контакты' },
  { id: 'profile',  path: '/profile', icon: User,      label: 'Профиль' },
] as const;

export function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="max-w-lg mx-auto flex justify-around items-center py-2">
        {tabs.map((tab) => {
          const isActive =
            location === tab.path ||
            (tab.path === '/' && location === '') ||
            (tab.path !== '/' && location.startsWith(tab.path));
          const Icon = tab.icon;

          return (
            <Link key={tab.id} href={tab.path}>
              <button
                data-testid={`nav-${tab.id}`}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
