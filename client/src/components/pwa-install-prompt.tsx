import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem("govza-install-dismissed") === "1") return;
    setIos(isIos());

    const listener = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const openListener = () => setVisible(true);
    window.addEventListener("beforeinstallprompt", listener);
    window.addEventListener("govza:install", openListener);

    if (isIos()) {
      const timer = window.setTimeout(() => setVisible(true), 1800);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", listener);
        window.removeEventListener("govza:install", openListener);
      };
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", listener);
      window.removeEventListener("govza:install", openListener);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("govza-install-dismissed", "1");
    setVisible(false);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setEvent(null);
  };

  if (!visible || isStandalone()) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[70] mx-auto max-w-md rounded-[1.5rem] border border-primary/15 bg-background/95 p-4 shadow-2xl backdrop-blur-2xl lg:bottom-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {ios ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Установить GOVZA мастера</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ios
              ? "В Safari нажмите «Поделиться» → «На экран Домой»."
              : "Добавьте GOVZA мастера на главный экран для быстрого доступа."}
          </p>
          {!ios && event && (
            <Button size="sm" className="mt-3" onClick={install}>Установить</Button>
          )}
        </div>
        <button onClick={dismiss} className="flex h-10 w-10 items-center justify-center text-muted-foreground" aria-label="Закрыть">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
