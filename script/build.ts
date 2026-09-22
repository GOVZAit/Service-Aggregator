import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { access, readdir, readFile, rm, writeFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const absolutePath = join(dir, entry.name);
      return entry.isDirectory() ? listFiles(absolutePath) : Promise.resolve([absolutePath]);
    }),
  );
  return nested.flat();
}

async function stampServiceWorker() {
  const publicDir = join("dist", "public");
  const swPath = join(publicDir, "sw.js");
  const files = (await listFiles(publicDir)).sort();
  const fingerprint = createHash("sha256");

  for (const file of files) {
    fingerprint.update(relative(publicDir, file));
    fingerprint.update("\0");
    fingerprint.update(await readFile(file));
    fingerprint.update("\0");
  }

  const version = `build-${fingerprint.digest("hex").slice(0, 12)}`;
  const versionToken = "__GOVZA_BUILD_VERSION__";
  const serviceWorker = await readFile(swPath, "utf-8");

  if (!serviceWorker.includes(versionToken)) {
    throw new Error(`Service worker version token ${versionToken} was not found`);
  }

  await writeFile(swPath, serviceWorker.replaceAll(versionToken, version), "utf-8");
  console.log(`service worker version: ${version}`);
}

async function buildAll() {
  try {
    await access("dist/.deploy-prebuilt");
    console.log("using prebuilt production artifacts from CI");
    return;
  } catch {
    // No CI marker: perform a normal clean build.
  }

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();
  await stampServiceWorker();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
