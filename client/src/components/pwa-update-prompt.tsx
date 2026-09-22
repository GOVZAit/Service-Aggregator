import { useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [visible, setVisible] = useState(false);
  const reloadAfterUpdate = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

    let disposed = false;
    let observedRegistration: ServiceWorkerRegistration | null = null;
    let removeUpdateListener: (() => void) | null = null;

    const showWaitingUpdate = (current: ServiceWorkerRegistration) => {
      if (current.waiting && navigator.serviceWorker.controller) {
        setVisible(true);
      }
    };

    const observeRegistration = (current: ServiceWorkerRegistration) => {
      if (disposed) return;

      setRegistration(current);
      showWaitingUpdate(current);

      if (observedRegistration === current) return;
      removeUpdateListener?.();
      observedRegistration = current;

      const onUpdateFound = () => {
        const worker = current.installing;
        if (!worker) return;

        const onStateChange = () => {
          if (disposed || worker.state !== "installed" || !navigator.serviceWorker.controller) return;
          window.setTimeout(() => {
            if (!disposed) showWaitingUpdate(current);
          }, 0);
        };

        worker.addEventListener("statechange", onStateChange);
      };

      current.addEventListener("updatefound", onUpdateFound);
      removeUpdateListener = () => current.removeEventListener("updatefound", onUpdateFound);
    };

    const inspectRegistration = async (checkForUpdate = false) => {
      const current = await navigator.serviceWorker.getRegistration();
      if (!current || disposed) return;

      observeRegistration(current);

      if (checkForUpdate) {
        try {
          await current.update();
        } catch {
          // A transient network failure should not affect the running app.
        }
      }

      showWaitingUpdate(current);
    };

    inspectRegistration().catch(() => {});

    navigator.serviceWorker.ready
      .then((current) => {
        if (disposed) return;
        observeRegistration(current);
        return current.update();
      })
      .catch(() => {});

    const onControllerChange = () => {
      if (!reloadAfterUpdate.current) return;
      reloadAfterUpdate.current = false;
      window.location.reload();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        inspectRegistration(true).catch(() => {});
      }
    };

    const onFocus = () => {
      inspectRegistration(true).catch(() => {});
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    const interval = window.setInterval(() => {
      inspectRegistration(true).catch(() => {});
    }, 60 * 60 * 1000);

    return () => {
      disposed = true;
      removeUpdateListener?.();
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const applyUpdate = async () => {
    const current = registration ?? await navigator.serviceWorker.getRegistration();
    if (!current) return;

    setRegistration(current);

    if (!current.waiting) {
      try {
        await current.update();
      } catch {
        return;
      }
    }

    if (!current.waiting) return;

    reloadAfterUpdate.current = true;
    current.waiting.postMessage("SKIP_WAITING");
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
            <p className="text-sm font-extrabold">Доступно обновление GOVZA pro</p>
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
