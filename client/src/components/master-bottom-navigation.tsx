import { useLocation, Link } from "wouter";
import { Home, ClipboardList, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/master", label: "Главная", icon: Home },
  { href: "/master/orders", label: "Заявки", icon: ClipboardList },
  { href: "/master/profile", label: "Профиль", icon: UserCircle },
];

export default function MasterBottomNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = location === href || (href !== "/master" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <button
                data-testid={`nav-master-${label.toLowerCase()}`}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
