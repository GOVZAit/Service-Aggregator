import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const onOffline = () => { setOnline(false); setShowRestored(false); };
    const onOnline = () => {
      setOnline(true);
      setShowRestored(true);
      window.setTimeout(() => setShowRestored(false), 2200);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (online && !showRestored) return null;

  return (
    <div className="pointer-events-none fixed left-3 right-3 top-[calc(.75rem+env(safe-area-inset-top,0px))] z-[100] mx-auto max-w-md" aria-live="polite">
      <div className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-white shadow-xl backdrop-blur-2xl",
        online ? "border-emerald-500/20 bg-emerald-600/95" : "border-amber-500/20 bg-slate-950/92",
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
          {online ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-extrabold">{online ? "Соединение восстановлено" : "Вы офлайн"}</p>
          <p className="mt-0.5 text-[11px] text-white/75">
            {online ? "GOVZA снова получает свежие данные." : "Открытые экраны доступны, новые данные загрузятся после подключения."}
          </p>
        </div>
      </div>
    </div>
  );
}
