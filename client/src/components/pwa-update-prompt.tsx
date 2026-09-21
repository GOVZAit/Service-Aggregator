import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;

    const inspect = async () => {
      const current = await navigator.serviceWorker.getRegistration();
      if (!current || disposed) return;
      setRegistration(current);
      if (current.waiting && navigator.serviceWorker.controller) setVisible(true);
      current.addEventListener("updatefound", () => {
        const worker = current.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setVisible(true);
        });
      });
    };

    inspect().catch(() => {});
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    const interval = window.setInterval(() => {
      navigator.serviceWorker.getRegistration().then((current) => current?.update()).catch(() => {});
    }, 60 * 60 * 1000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    if (!registration?.waiting) { window.location.reload(); return; }
    registration.waiting.postMessage("SKIP_WAITING");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[90] mx-auto max-w-md">
      <div className="rounded-[1.4rem] border border-primary/20 bg-background/95 p-4 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Доступно обновление GOVZA мастера</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Обновите приложение, чтобы получить последнюю версию интерфейса и функций.</p>
            <Button size="sm" className="mt-3 rounded-xl font-bold" onClick={applyUpdate}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Обновить
            </Button>
          </div>
          <button type="button" onClick={() => setVisible(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
