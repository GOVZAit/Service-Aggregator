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
  const serverPath = path.join(root, "dist", "index.cjs");

  await Promise.all([
    assertFile(indexPath, "Client index"),
    assertFile(swPath, "Service Worker"),
    assertFile(manifestPath, "PWA manifest"),
    assertFile(serverPath, "Server bundle"),
  ]);

  const [indexHtml, serviceWorker, manifestText] = await Promise.all([
    readFile(indexPath, "utf8"),
    readFile(swPath, "utf8"),
    readFile(manifestPath, "utf8"),
  ]);

  if (indexHtml.includes("/src/main.tsx")) {
    throw new Error("Production index still references the Vite source entry");
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

  const manifest = JSON.parse(manifestText) as {
    name?: string;
    short_name?: string;
    start_url?: string;
    icons?: Array<{ src?: string }>;
  };

  if (manifest.name !== "GOVZA pro" || manifest.short_name !== "GOVZA pro") {
    throw new Error("PWA manifest has an unexpected application name");
  }
  if (!manifest.start_url?.startsWith("/")) {
    throw new Error("PWA manifest start_url is missing or invalid");
  }
  if (!manifest.icons?.length) {
    throw new Error("PWA manifest has no icons");
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
