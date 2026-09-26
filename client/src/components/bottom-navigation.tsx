import { CarFront, Wrench, LayoutGrid, Stethoscope, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUnreadCounts } from "@/hooks/use-unread-counts";

const tabs = [
  { id: "home", path: "/", icon: Wrench, label: "Мастера" },
  { id: "auto-parts", path: "/auto-parts", icon: CarFront, label: "Запчасти" },
  { id: "doctors", path: "/doctors", icon: Stethoscope, label: "Врачи" },
  { id: "more", path: "/more", icon: LayoutGrid, label: "Ещё" },
  { id: "profile", path: "/profile", icon: User, label: "Профиль" },
] as const;

export function PrimaryNavLinks({ desktop = false }: { desktop?: boolean }) {
  const [location] = useLocation();
  const { totalCount } = useUnreadCounts();
  const active = (id: string) => {
    if (id === "home") return location === "/" || /^\/master\/\d+/.test(location);
    if (id === "auto-parts") return location.startsWith("/auto-parts");
    if (id === "doctors") return location.startsWith("/doctors");
    if (id === "profile") return location.startsWith("/profile") || location.startsWith("/saved");
    return ["/more", "/contacts", "/city", "/lost-found", "/orders", "/requests", "/messages"].some((path) => location === path || location.startsWith(`${path}/`));
  };
  return <>{tabs.filter((tab) => !desktop || tab.id !== "profile").map(({ id, path, icon: Icon, label }) => <Link key={id} href={path}
    className={cn("primary-nav-link", active(id) && "is-active")} aria-current={active(id) ? "page" : undefined}
    data-testid={`${desktop ? "desktop-" : ""}nav-${id}`}>
    <span className="primary-nav-icon"><Icon size={21} aria-hidden="true" />
      {id === "more" && totalCount > 0 && <span className="primary-nav-count" aria-label={`${totalCount} непрочитанных`}>{totalCount > 99 ? "99+" : totalCount}</span>}
    </span><span>{label}</span>
  </Link>)}</>;
}

export function BottomNavigation({ desktopHidden = false }: { desktopHidden?: boolean }) {
  return <nav className={cn("primary-bottom-nav", desktopHidden && "primary-bottom-nav-mobile")} aria-label="Основные разделы">
    <div className="primary-bottom-nav-inner"><PrimaryNavLinks /></div>
  </nav>;
}
