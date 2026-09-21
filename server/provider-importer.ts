import { desc, eq } from "drizzle-orm";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { db, pool } from "./db";
import {
  providerImportRuns,
  providerImportSourcesSchema,
  type ProviderImportSource,
  type ProviderImportTrigger,
} from "@shared/import-schema";
import type { OrganizationKind, ProviderImportInput, ProviderProfileData, ProviderType } from "@shared/provider-schema";
import { importProvider } from "./provider-service";
import { categoryIdsExist, getEffectiveCategories } from "./category-service";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_RECORDED_ERRORS = 100;
const runningSources = new Set<string>();

let configuredSources: ProviderImportSource[] = [];
let configurationError: string | null = null;
let schedulerTimer: NodeJS.Timeout | null = null;
let startupTimer: NodeJS.Timeout | null = null;

export interface ProviderImportRunResult {
  runId: number;
  sourceName: string;
  status: "success" | "partial" | "failed";
  fetched: number;
  parsed: number;
  imported: number;
  skipped: number;
  errors: string[];
}

interface ImportCandidate {
  sourceExternalId: string;
  sourceUrl?: string;
  providerType: ProviderType;
  organizationKind?: OrganizationKind;
  externalCategory?: string;
  data: Omit<ProviderProfileData, "categoryIds"> & { name: string };
}

export async function ensureProviderImportTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provider_import_runs (
      id serial PRIMARY KEY,
      source_name text NOT NULL,
      trigger text NOT NULL,
      status text NOT NULL,
      fetched integer NOT NULL DEFAULT 0,
      parsed integer NOT NULL DEFAULT 0,
      imported integer NOT NULL DEFAULT 0,
      skipped integer NOT NULL DEFAULT 0,
      errors jsonb NOT NULL DEFAULT '[]'::jsonb,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      started_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS provider_import_runs_source_started_idx
      ON provider_import_runs(source_name, started_at DESC);
  `);

  reloadProviderImportSources();
}

export function reloadProviderImportSources() {
  const raw = process.env.PROVIDER_IMPORT_SOURCES_JSON?.trim();
  if (!raw) {
    configuredSources = [];
    configurationError = null;
    return configuredSources;
  }

  try {
    const parsedJson = JSON.parse(raw);
    const parsed = providerImportSourcesSchema.safeParse(parsedJson);
    if (!parsed.success) {
      configurationError = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "sources"}: ${issue.message}`)
        .join("; ");
      configuredSources = [];
      return configuredSources;
    }
    configuredSources = parsed.data;
    configurationError = null;
  } catch (error) {
    configuredSources = [];
    configurationError = error instanceof Error ? error.message : "Invalid import source configuration";
  }

  return configuredSources;
}

export function getProviderImportConfiguration() {
  return {
    enabled: process.env.PROVIDER_IMPORT_ENABLED === "true",
    configurationError,
    intervalMinutes: importIntervalMinutes(),
    runOnStartup: process.env.PROVIDER_IMPORT_RUN_ON_STARTUP === "true",
    sources: configuredSources.map((source) => ({
      name: source.name,
      url: redactUrl(source.url),
      adapter: source.adapter,
      enabled: source.enabled,
      providerType: source.providerType ?? null,
      organizationKind: source.organizationKind ?? null,
      defaultCategoryIds: source.defaultCategoryIds ?? null,
      categoryMappings: Object.keys(source.categoryMap).length,
      hasCustomHeaders: Boolean(source.headers && Object.keys(source.headers).length > 0),
      timeoutMs: source.timeoutMs,
      maxItems: source.maxItems,
    })),
  };
}

function importIntervalMinutes() {
  const raw = Number(process.env.PROVIDER_IMPORT_INTERVAL_MINUTES ?? "360");
  if (!Number.isFinite(raw)) return 360;
  return Math.min(Math.max(Math.floor(raw), 15), 24 * 60);
}

function getPath(input: unknown, path: string | undefined): unknown {
  if (!path) return input;
  return path.split(".").filter(Boolean).reduce<unknown>((value, part) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[part];
  }, input);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function stringAt(item: unknown, path: string | undefined) {
  if (!path) return undefined;
  return asString(getPath(item, path));
}

function cleanUrl(value: string | undefined, baseUrl: string) {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function exactCategoryIds(source: ProviderImportSource, externalCategory?: string) {
  if (externalCategory) {
    const normalized = externalCategory.trim().toLocaleLowerCase("ru-RU");
    const configuredEntry = Object.entries(source.categoryMap).find(
      ([key]) => key.trim().toLocaleLowerCase("ru-RU") === normalized,
    );
    if (configuredEntry) {
      const target = configuredEntry[1];
      const ids = Array.isArray(target) ? target : [target];
      return categoryIdsExist(ids) ? ids : undefined;
    }

    const exactInternal = getEffectiveCategories().find(
      (category) => category.name.trim().toLocaleLowerCase("ru-RU") === normalized,
    );
    if (exactInternal) return [exactInternal.id];
  }

  if (source.defaultCategoryIds) {
    return categoryIdsExist(source.defaultCategoryIds) ? source.defaultCategoryIds : undefined;
  }
  return undefined;
}

function redactUrl(value: string) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "[invalid-url]";
  }
}

function isPublicIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function isPublicIp(address: string) {
  const family = isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family !== 6) return false;

  const normalized = address.toLocaleLowerCase("en-US");
  if (normalized === "::" || normalized === "::1") return false;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
  if (/^fe[89ab]/.test(normalized)) return false;
  if (normalized.startsWith("ff")) return false;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isIP(mapped) === 4 ? isPublicIpv4(mapped) : false;
  }
  return true;
}

async function resolvePublicAddress(url: URL) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLocaleLowerCase("en-US");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Import source hostname is not public");
  }

  if (isIP(hostname)) {
    if (!isPublicIp(hostname)) throw new Error("Import source IP is not public");
    return { address: hostname, family: isIP(hostname) };
  }

  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  const publicAddress = addresses.find((entry) => isPublicIp(entry.address));
  if (!publicAddress) throw new Error("Import source did not resolve to a public IP");
  return publicAddress;
}

function safeSourceHeaders(source: ProviderImportSource, includeCustomHeaders: boolean) {
  const headers: Record<string, string> = {
    Accept: source.adapter === "json"
      ? "application/json, text/json;q=0.9, */*;q=0.5"
      : "text/html, application/xhtml+xml;q=0.9, */*;q=0.5",
    "User-Agent": "GOVZA-Provider-Importer/1.0 (+https://govza.pro)",
    "Accept-Encoding": "identity",
  };

  if (!includeCustomHeaders) return headers;

  const forbidden = new Set([
    "host", "content-length", "connection", "transfer-encoding", "accept-encoding",
  ]);
  for (const [key, value] of Object.entries(source.headers ?? {})) {
    if (!forbidden.has(key.toLocaleLowerCase("en-US"))) headers[key] = value;
  }
  return headers;
}

async function requestText(
  source: ProviderImportSource,
  targetUrl: URL,
  originalOrigin: string,
  redirectsRemaining: number,
): Promise<string> {
  if (targetUrl.protocol !== "https:") {
    throw new Error("Import source and redirects must use HTTPS");
  }

  if (targetUrl.username || targetUrl.password) {
    throw new Error("Credentials in import source redirects are not allowed");
  }

  const resolved = await resolvePublicAddress(targetUrl);
  const headers = safeSourceHeaders(source, targetUrl.origin === originalOrigin);

  return new Promise<string>((resolve, reject) => {
    const request = httpsRequest(targetUrl, {
      method: "GET",
      headers,
      lookup: ((_hostname: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
        callback(null, resolved.address, resolved.family);
      }) as any,
    }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;

      if (status >= 300 && status < 400 && location) {
        response.resume();
        if (redirectsRemaining <= 0) {
          reject(new Error("Import source exceeded redirect limit"));
          return;
        }
        let redirected: URL;
        try {
          redirected = new URL(location, targetUrl);
        } catch {
          reject(new Error("Import source returned an invalid redirect URL"));
          return;
        }
        requestText(source, redirected, originalOrigin, redirectsRemaining - 1).then(resolve, reject);
        return;
      }

      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error(`HTTP ${status} from import source`));
        return;
      }

      const declaredLength = Number(response.headers["content-length"]);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
        response.resume();
        reject(new Error(`Source response exceeds ${MAX_RESPONSE_BYTES} bytes`));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buffer.byteLength;
        if (total > MAX_RESPONSE_BYTES) {
          request.destroy(new Error(`Source response exceeds ${MAX_RESPONSE_BYTES} bytes`));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", reject);
    });

    request.setTimeout(source.timeoutMs, () => {
      request.destroy(new Error("Import source request timed out"));
    });
    request.on("error", reject);
    request.end();
  });
}

async function fetchSource(source: ProviderImportSource) {
  const sourceUrl = new URL(source.url);
  if (sourceUrl.protocol !== "https:") {
    throw new Error("Only HTTPS import sources are supported");
  }
  return requestText(source, sourceUrl, sourceUrl.origin, 5);
}

function parseJsonCandidates(source: ProviderImportSource, text: string): { rawCount: number; candidates: ImportCandidate[]; errors: string[] } {
  const errors: string[] = [];
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    return { rawCount: 0, candidates: [], errors: ["Source returned invalid JSON"] };
  }

  const selected = Array.isArray(document) ? document : getPath(document, source.itemPath);
  if (!Array.isArray(selected)) {
    return {
      rawCount: 0,
      candidates: [],
      errors: [source.itemPath ? `itemPath "${source.itemPath}" is not an array` : "JSON root is not an array; configure itemPath"],
    };
  }

  const fields = source.fields!;
  const candidates: ImportCandidate[] = [];

  for (const [index, item] of selected.slice(0, source.maxItems).entries()) {
    const sourceExternalId = stringAt(item, fields.id);
    const name = stringAt(item, fields.name);
    if (!sourceExternalId || !name) {
      errors.push(`item ${index + 1}: missing id or name`);
      continue;
    }

    candidates.push({
      sourceExternalId,
      sourceUrl: cleanUrl(stringAt(item, fields.sourceUrl), source.url),
      providerType: source.providerType!,
      organizationKind: source.organizationKind,
      externalCategory: stringAt(item, fields.category),
      data: {
        name,
        ...(stringAt(item, fields.description) ? { description: stringAt(item, fields.description)! } : {}),
        ...(stringAt(item, fields.phone) ? { phone: stringAt(item, fields.phone)! } : {}),
        ...(stringAt(item, fields.city) ? { city: stringAt(item, fields.city)! } : {}),
        ...(stringAt(item, fields.companyName) ? { companyName: stringAt(item, fields.companyName)! } : {}),
      },
    });
  }

  return { rawCount: Math.min(selected.length, source.maxItems), candidates, errors };
}

function collectJsonLdNodes(value: unknown, output: Record<string, unknown>[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdNodes(item, output));
    return;
  }
  if (!value || typeof value !== "object") return;

  const object = value as Record<string, unknown>;
  if (Array.isArray(object["@graph"])) {
    collectJsonLdNodes(object["@graph"], output);
  }
  if (object["@type"] || object.name) output.push(object);
}

function jsonLdTypes(node: Record<string, unknown>) {
  const value = node["@type"];
  return Array.isArray(value)
    ? value.map(asString).filter((item): item is string => Boolean(item))
    : asString(value)
      ? [asString(value)!]
      : [];
}

function jsonLdProviderType(source: ProviderImportSource, node: Record<string, unknown>): ProviderType | undefined {
  if (source.providerType) return source.providerType;
  const types = jsonLdTypes(node).map((type) => type.toLocaleLowerCase("en-US"));
  if (types.some((type) => type === "person" || type === "physician")) return "master";
  if (types.some((type) => type === "organization" || type.endsWith("business") || type.endsWith("organization"))) {
    return "organization";
  }
  return undefined;
}

function jsonLdExternalCategory(node: Record<string, unknown>) {
  const category = node.category;
  if (Array.isArray(category)) {
    const first = category.map(asString).find(Boolean);
    if (first) return first;
  }
  const categoryString = asString(category);
  if (categoryString) return categoryString;

  const additionalType = asString(node.additionalType);
  if (additionalType) return additionalType;

  return jsonLdTypes(node)[0];
}

function jsonLdCity(node: Record<string, unknown>) {
  const address = node.address;
  if (address && typeof address === "object" && !Array.isArray(address)) {
    return asString((address as Record<string, unknown>).addressLocality);
  }
  return undefined;
}

function parseJsonLdCandidates(source: ProviderImportSource, html: string): { rawCount: number; candidates: ImportCandidate[]; errors: string[] } {
  const errors: string[] = [];
  const nodes: Record<string, unknown>[] = [];
  const scripts = html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const [scriptIndex, match] of Array.from(scripts).entries()) {
    try {
      collectJsonLdNodes(JSON.parse(match[1].trim()), nodes);
    } catch {
      errors.push(`JSON-LD script ${scriptIndex + 1}: invalid JSON`);
    }
  }

  const candidates: ImportCandidate[] = [];
  for (const [index, node] of nodes.slice(0, source.maxItems).entries()) {
    const name = asString(node.name);
    const sourceExternalId = asString(node["@id"]) ?? asString(node.url);
    const providerType = jsonLdProviderType(source, node);
    if (!name || !sourceExternalId || !providerType) {
      errors.push(`JSON-LD item ${index + 1}: missing stable id/url, name or supported @type`);
      continue;
    }

    const sourceUrl = cleanUrl(asString(node.url) ?? sourceExternalId, source.url);
    candidates.push({
      sourceExternalId,
      sourceUrl,
      providerType,
      organizationKind: source.organizationKind,
      externalCategory: jsonLdExternalCategory(node),
      data: {
        name,
        ...(asString(node.description) ? { description: asString(node.description)! } : {}),
        ...(asString(node.telephone) ? { phone: asString(node.telephone)! } : {}),
        ...(jsonLdCity(node) ? { city: jsonLdCity(node)! } : {}),
        ...(providerType === "organization" ? { companyName: name } : {}),
      },
    });
  }

  return { rawCount: Math.min(nodes.length, source.maxItems), candidates, errors };
}

async function parseSource(source: ProviderImportSource) {
  const text = await fetchSource(source);
  return source.adapter === "json"
    ? parseJsonCandidates(source, text)
    : parseJsonLdCandidates(source, text);
}

function pushError(errors: string[], message: string) {
  if (errors.length < MAX_RECORDED_ERRORS) errors.push(message);
}

async function createRun(source: ProviderImportSource, trigger: ProviderImportTrigger) {
  const [run] = await db.insert(providerImportRuns).values({
    sourceName: source.name,
    trigger,
    status: "running",
    details: {
      adapter: source.adapter,
      url: redactUrl(source.url),
    },
  }).returning();
  return run;
}

async function finishRun(
  runId: number,
  result: Omit<ProviderImportRunResult, "runId" | "sourceName">,
  details: Record<string, unknown>,
) {
  await db.update(providerImportRuns).set({
    status: result.status,
    fetched: result.fetched,
    parsed: result.parsed,
    imported: result.imported,
    skipped: result.skipped,
    errors: result.errors,
    details,
    finishedAt: new Date(),
  }).where(eq(providerImportRuns.id, runId));
}

export async function runProviderImportSource(
  source: ProviderImportSource,
  trigger: ProviderImportTrigger,
): Promise<ProviderImportRunResult> {
  if (runningSources.has(source.name)) {
    throw new Error(`Import source "${source.name}" is already running`);
  }
  runningSources.add(source.name);

  const started = Date.now();
  const run = await createRun(source, trigger);
  let fetched = 0;
  let parsed = 0;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const parsedSource = await parseSource(source);
    fetched = parsedSource.rawCount;
    parsed = parsedSource.candidates.length;
    parsedSource.errors.forEach((error) => pushError(errors, error));

    for (const candidate of parsedSource.candidates) {
      const categoryIds = exactCategoryIds(source, candidate.externalCategory);
      if (!categoryIds) {
        skipped += 1;
        pushError(errors, `${candidate.sourceExternalId}: category is not mapped`);
        continue;
      }

      const input: ProviderImportInput = {
        sourceName: source.name,
        sourceExternalId: candidate.sourceExternalId,
        ...(candidate.sourceUrl ? { sourceUrl: candidate.sourceUrl } : {}),
        providerType: candidate.providerType,
        ...(candidate.providerType === "organization" && candidate.organizationKind
          ? { organizationKind: candidate.organizationKind }
          : {}),
        data: {
          ...candidate.data,
          categoryIds,
        },
      };

      try {
        await importProvider(input);
        imported += 1;
      } catch (error) {
        skipped += 1;
        pushError(
          errors,
          `${candidate.sourceExternalId}: ${error instanceof Error ? error.message : "database import failed"}`,
        );
      }
    }

    const status: ProviderImportRunResult["status"] =
      errors.length === 0 && skipped === 0
        ? "success"
        : imported > 0
          ? "partial"
          : "failed";

    const result: ProviderImportRunResult = {
      runId: run.id,
      sourceName: source.name,
      status,
      fetched,
      parsed,
      imported,
      skipped,
      errors,
    };
    await finishRun(run.id, result, {
      adapter: source.adapter,
      url: redactUrl(source.url),
      durationMs: Date.now() - started,
    });
    return result;
  } catch (error) {
    pushError(errors, error instanceof Error ? error.message : "Import failed");
    const result: ProviderImportRunResult = {
      runId: run.id,
      sourceName: source.name,
      status: "failed",
      fetched,
      parsed,
      imported,
      skipped,
      errors,
    };
    await finishRun(run.id, result, {
      adapter: source.adapter,
      url: redactUrl(source.url),
      durationMs: Date.now() - started,
    });
    return result;
  } finally {
    runningSources.delete(source.name);
  }
}

export async function runConfiguredProviderImports(
  trigger: ProviderImportTrigger,
  sourceName?: string,
) {
  const sources = configuredSources.filter((source) =>
    source.enabled && (!sourceName || source.name === sourceName),
  );

  if (sourceName && sources.length === 0) {
    throw new Error(`Configured import source "${sourceName}" was not found or is disabled`);
  }

  return Promise.all(sources.map((source) => runProviderImportSource(source, trigger)));
}

export async function listProviderImportRuns(limit = 50) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  const rows = await db.select().from(providerImportRuns)
    .orderBy(desc(providerImportRuns.startedAt))
    .limit(safeLimit);

  return rows.map((row) => ({
    ...row,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  }));
}

export function startProviderImportScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  if (startupTimer) clearTimeout(startupTimer);
  schedulerTimer = null;
  startupTimer = null;

  const configuration = getProviderImportConfiguration();
  if (!configuration.enabled || configuration.sources.filter((source) => source.enabled).length === 0) {
    return;
  }

  const runAll = () => {
    void runConfiguredProviderImports("scheduler").catch((error) => {
      console.error("Provider import scheduler failed", error);
    });
  };

  if (configuration.runOnStartup) {
    startupTimer = setTimeout(() => {
      void runConfiguredProviderImports("startup").catch((error) => {
        console.error("Provider startup import failed", error);
      });
    }, 15_000);
    startupTimer.unref?.();
  }

  schedulerTimer = setInterval(runAll, configuration.intervalMinutes * 60_000);
  schedulerTimer.unref?.();
}
