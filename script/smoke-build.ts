import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "dist", "public");

async function assertFile(filePath: string, label: string) {
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new Error(`${label} not found or unreadable: ${path.relative(root, filePath)}`);
  }
}

async function main() {
  const indexPath = path.join(publicDir, "index.html");
  const swPath = path.join(publicDir, "sw.js");
  const manifestPath = path.join(publicDir, "manifest.webmanifest");
  const offlinePath = path.join(publicDir, "offline.html");
  const serverPath = path.join(root, "dist", "index.cjs");

  await Promise.all([
    assertFile(indexPath, "Client index"),
    assertFile(swPath, "Service Worker"),
    assertFile(manifestPath, "PWA manifest"),
    assertFile(offlinePath, "Offline fallback"),
    assertFile(serverPath, "Server bundle"),
  ]);

  const [indexHtml, serviceWorker, manifestText, offlineHtml] = await Promise.all([
    readFile(indexPath, "utf8"),
    readFile(swPath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(offlinePath, "utf8"),
  ]);

  if (indexHtml.includes("/src/main.tsx")) {
    throw new Error("Production index still references the Vite source entry");
  }

  if (!indexHtml.includes("viewport-fit=cover")) {
    throw new Error("Production index is missing viewport-fit=cover for safe-area PWA layouts");
  }
  if (!indexHtml.includes('rel="manifest"') || !indexHtml.includes('name="theme-color"')) {
    throw new Error("Production index is missing required PWA metadata");
  }
  if (!indexHtml.includes("govza-initial-boot")) {
    throw new Error("Production index is missing branded pre-React boot UI");
  }

  const assetRefs = [...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)]
    .map((match) => match[1]);

  if (!assetRefs.some((ref) => ref.endsWith(".js"))) {
    throw new Error("No hashed JavaScript asset found in production index");
  }

  for (const ref of new Set(assetRefs)) {
    await assertFile(path.join(publicDir, ref.replace(/^\//, "")), `Referenced asset ${ref}`);
  }

  if (serviceWorker.includes("__GOVZA_BUILD_VERSION__")) {
    throw new Error("Service Worker build version token was not replaced");
  }
  if (!/const CACHE_VERSION = "build-[a-f0-9]{12}";/.test(serviceWorker)) {
    throw new Error("Service Worker does not contain a valid production build version");
  }

  for (const required of ['"/offline.html"', '"SKIP_WAITING"', 'caches.match("/")']) {
    if (!serviceWorker.includes(required)) {
      throw new Error(`Service Worker is missing required PWA behavior: ${required}`);
    }
  }
  if (!offlineHtml.includes("Сейчас нет сети") || !offlineHtml.includes("location.reload()")) {
    throw new Error("Offline fallback does not contain the expected recovery UI");
  }

  const manifest = JSON.parse(manifestText) as {
    name?: string;
    short_name?: string;
    start_url?: string;
    scope?: string;
    display?: string;
    theme_color?: string;
    background_color?: string;
    icons?: Array<{ src?: string; purpose?: string }>;
  };

  if (manifest.name !== "GOVZA мастера" || manifest.short_name !== "GOVZA мастера") {
    throw new Error("PWA manifest has an unexpected application name");
  }
  if (!manifest.start_url?.startsWith("/")) {
    throw new Error("PWA manifest start_url is missing or invalid");
  }
  if (manifest.scope !== "/" || manifest.display !== "standalone") {
    throw new Error("PWA manifest scope/display configuration is invalid");
  }
  if (!manifest.theme_color || !manifest.background_color) {
    throw new Error("PWA manifest colors are missing");
  }
  if (!manifest.icons?.length) {
    throw new Error("PWA manifest has no icons");
  }
  if (!manifest.icons.some((icon) => icon.purpose?.split(/\s+/).includes("maskable"))) {
    throw new Error("PWA manifest has no maskable icon");
  }

  for (const icon of manifest.icons) {
    if (!icon.src?.startsWith("/")) throw new Error("PWA icon path is invalid");
    await assertFile(path.join(publicDir, icon.src.replace(/^\//, "")), `PWA icon ${icon.src}`);
  }

  console.log(
    `Production smoke check passed: ${new Set(assetRefs).size} referenced assets, ${manifest.icons.length} manifest icons.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
