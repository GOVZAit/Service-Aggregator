import { useEffect, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "govza-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasRecentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;

    const dismissedAt = Number(raw);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable in strict/private browsing modes.
  }
}

export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const iosDevice = isIos();
    const allowAutomaticPrompt = !wasRecentlyDismissed();
    setIos(iosDevice);

    let autoShowTimer: number | null = null;

    const scheduleShow = (delayMs: number) => {
      if (!allowAutomaticPrompt || autoShowTimer !== null) return;
      autoShowTimer = window.setTimeout(() => {
        setVisible(true);
        autoShowTimer = null;
      }, delayMs);
    };

    const listener = (raw: Event) => {
      raw.preventDefault();
      const installEvent = raw as BeforeInstallPromptEvent;
      promptRef.current = installEvent;
      setEvent(installEvent);
      scheduleShow(3200);
    };

    const openListener = () => {
      if (isStandalone()) return;

      if (iosDevice) {
        setVisible(true);
        return;
      }

      if (promptRef.current) {
        setEvent(promptRef.current);
        setVisible(true);
      }
    };

    const installedListener = () => {
      promptRef.current = null;
      setEvent(null);
      setVisible(false);
      try {
        localStorage.removeItem(DISMISS_KEY);
        localStorage.setItem("govza-pwa-installed-at", String(Date.now()));
      } catch {
        // Storage is optional.
      }
    };

    window.addEventListener("beforeinstallprompt", listener);
    window.addEventListener("appinstalled", installedListener);
    window.addEventListener("govza:install", openListener);

    if (iosDevice) scheduleShow(6500);

    return () => {
      if (autoShowTimer !== null) window.clearTimeout(autoShowTimer);
      window.removeEventListener("beforeinstallprompt", listener);
      window.removeEventListener("appinstalled", installedListener);
      window.removeEventListener("govza:install", openListener);
    };
  }, []);

  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
  };

  const install = async () => {
    const installEvent = event ?? promptRef.current;
    if (!installEvent) return;

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      setVisible(false);
    } else {
      rememberDismissal();
      setVisible(false);
    }

    promptRef.current = null;
    setEvent(null);
  };

  if (!visible || isStandalone()) return null;

  return (
    <div
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[70] mx-auto max-w-md rounded-[1.5rem] border border-primary/15 bg-background/95 p-4 shadow-2xl backdrop-blur-2xl lg:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {ios ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Установить GOVZA pro</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {ios
              ? "Нажмите «Поделиться» → «На экран Домой», чтобы открывать GOVZA как приложение."
              : "Добавьте GOVZA pro на главный экран для быстрого доступа и полноэкранного режима."}
          </p>
          {!ios && event && (
            <Button size="sm" className="mt-3 rounded-xl font-bold" onClick={install}>
              Установить
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
          aria-label="Не предлагать установку сейчас"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
