const RELOAD_MARKER = "govza:stale-asset-reload-at";
const RELOAD_GUARD_MS = 30_000;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function isStaleAssetError(error: unknown) {
  const message = errorMessage(error);
  return [
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
    /error loading dynamically imported module/i,
    /ChunkLoadError/i,
    /Loading chunk .* failed/i,
    /Unable to preload CSS/i,
    /Failed to load module script/i,
  ].some((pattern) => pattern.test(message));
}

async function activateWaitingServiceWorker(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) return;

  await new Promise<void>((resolve) => {
    let settled = false;
    let timeoutId = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener("controllerchange", finish);
      resolve();
    };

    navigator.serviceWorker.addEventListener("controllerchange", finish, { once: true });
    timeoutId = window.setTimeout(finish, 1500);
    registration.waiting?.postMessage("SKIP_WAITING");
  });
}

export async function refreshToLatestApplication() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        try {
          await registration.update();
        } catch {
          // Reload can still recover through the network even if this check fails.
        }
        await activateWaitingServiceWorker(registration);
      }
    } catch {
      // Service Worker recovery is best-effort; the navigation reload is the fallback.
    }
  }

  window.location.reload();
}

export function attemptAutomaticStaleAssetRecovery(error: unknown) {
  if (!isStaleAssetError(error)) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  const now = Date.now();
  try {
    const previous = Number(window.sessionStorage.getItem(RELOAD_MARKER) || "0");
    if (Number.isFinite(previous) && now - previous < RELOAD_GUARD_MS) return false;
    window.sessionStorage.setItem(RELOAD_MARKER, String(now));
  } catch {
    // sessionStorage can be unavailable in restricted browsing modes.
  }

  void refreshToLatestApplication();
  return true;
}
