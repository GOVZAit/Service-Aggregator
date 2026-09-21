import { useLocation, Link } from "wouter";
import { Home, ClipboardList, MessageCircle, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCounts } from "@/hooks/use-unread-counts";

const tabs = [
  { href: "/master", label: "Главная", icon: Home },
  { href: "/master/orders", label: "Заявки", icon: ClipboardList },
  { href: "/master/messages", label: "Сообщения", icon: MessageCircle },
  { href: "/master/profile", label: "Профиль", icon: UserCircle },
];

export default function MasterBottomNavigation() {
  const [location] = useLocation();
  const { directCount, orderCount } = useUnreadCounts();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/92 backdrop-blur-2xl safe-area-bottom shadow-[0_-18px_50px_-34px_hsl(var(--foreground)/0.34)] lg:bottom-5 lg:left-1/2 lg:right-auto lg:w-auto lg:-translate-x-1/2 lg:rounded-full lg:border">
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = location === href || (href !== "/master" && location.startsWith(href));
          return (
            <Link key={href} href={href}
                data-testid={`nav-master-${label.toLowerCase()}`}
                className={cn(
                  "pressable min-w-[76px] min-h-[52px] flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all lg:flex-row",
                  isActive
                    ? "text-primary bg-primary/[0.07]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
                  {((href === "/master/messages" ? directCount : href === "/master/orders" ? orderCount : 0) > 0) && (
                    <span className="absolute -right-2.5 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">
                      {(href === "/master/messages" ? directCount : orderCount) > 99 ? "99+" : (href === "/master/messages" ? directCount : orderCount)}
                    </span>
                  )}
                </span>
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                  {label}
                </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
