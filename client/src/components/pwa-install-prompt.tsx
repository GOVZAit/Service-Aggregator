import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "govza-install-dismissed-at";
const DISMISS_TTL = 5 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function recentlyDismissed() {
  const value = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return value > 0 && Date.now() - value < DISMISS_TTL;
}

export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    setIos(isIos());

    const installListener = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as BeforeInstallPromptEvent);
      if (!recentlyDismissed()) setVisible(true);
    };

    const openListener = () => {
      setManualOpen(true);
      setVisible(true);
    };

    const installedListener = () => {
      localStorage.removeItem(DISMISS_KEY);
      setVisible(false);
      setEvent(null);
    };

    window.addEventListener("beforeinstallprompt", installListener);
    window.addEventListener("govza:install", openListener);
    window.addEventListener("appinstalled", installedListener);

    let timer: number | undefined;
    if (isIos() && !recentlyDismissed()) {
      timer = window.setTimeout(() => setVisible(true), 2200);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", installListener);
      window.removeEventListener("govza:install", openListener);
      window.removeEventListener("appinstalled", installedListener);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setManualOpen(false);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.removeItem(DISMISS_KEY);
      setVisible(false);
    }
    setEvent(null);
    setManualOpen(false);
  };

  if (!visible || isStandalone()) return null;

  const androidFallback = !ios && !event && manualOpen;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[70] mx-auto max-w-md rounded-[1.5rem] border border-primary/15 bg-background/95 p-4 shadow-2xl backdrop-blur-2xl lg:bottom-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {ios ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">Установить GOVZA мастера</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {ios
              ? "В Safari нажмите «Поделиться» → «На экран Домой»."
              : androidFallback
                ? "Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран»."
                : "Добавьте GOVZA мастера на главный экран для быстрого доступа."}
          </p>
          {!ios && event && (
            <Button size="sm" className="mt-3 rounded-xl font-bold" onClick={install}>
              <Download className="mr-1.5 h-4 w-4" /> Установить
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
