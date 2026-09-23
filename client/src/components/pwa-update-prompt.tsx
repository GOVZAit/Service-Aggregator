import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;
    let currentRegistration: ServiceWorkerRegistration | null = null;

    const bindRegistration = (current: ServiceWorkerRegistration) => {
      if (disposed || currentRegistration === current) return;
      currentRegistration = current;
      setRegistration(current);

      if (current.waiting && navigator.serviceWorker.controller) {
        setVisible(true);
      }

      current.addEventListener("updatefound", () => {
        const worker = current.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setVisible(true);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration()
      .then((current) => { if (current) bindRegistration(current); })
      .catch(() => {});

    const onRegistration = (event: Event) => {
      const custom = event as CustomEvent<ServiceWorkerRegistration>;
      if (custom.detail) bindRegistration(custom.detail);
    };

    const onControllerChange = () => window.location.reload();

    window.addEventListener("govza:sw-registration", onRegistration);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      disposed = true;
      window.removeEventListener("govza:sw-registration", onRegistration);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    if (!registration?.waiting) {
      void registration?.update().finally(() => window.location.reload());
      return;
    }
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
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Обновите приложение, чтобы получить последнюю версию интерфейса и функций.
            </p>
            <Button size="sm" className="mt-3 rounded-xl font-bold" onClick={applyUpdate}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Обновить
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
