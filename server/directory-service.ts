import { and, eq } from "drizzle-orm";
import { pool, db } from "./db";
import { directoryRecords, type DirectoryKind } from "@shared/directory-schema";
import { doctors as doctorSeeds, type Doctor } from "../client/src/lib/doctors-data";
import { cityOrganizations as cityServiceSeeds, type CityOrganization } from "../client/src/lib/city-services-data";

export interface AdminDirectoryItem<T> {
  id: number;
  visible: boolean;
  origin: "seed" | "manual" | "override";
  record: T;
  updatedAt: string | null;
}

export async function ensureDirectoryTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS directory_records (
      id serial PRIMARY KEY,
      kind text NOT NULL,
      external_id text NOT NULL,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      is_visible integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS directory_records_kind_external_unique
      ON directory_records(kind, external_id);
    CREATE INDEX IF NOT EXISTS directory_records_kind_visible_idx
      ON directory_records(kind, is_visible);
  `);
}

async function rowsFor(kind: DirectoryKind) {
  return db.select().from(directoryRecords).where(eq(directoryRecords.kind, kind));
}

function mergeDirectory<T extends { id: number }>(
  seeds: T[],
  rows: Awaited<ReturnType<typeof rowsFor>>,
  includeHidden: boolean,
): AdminDirectoryItem<T>[] {
  const rowMap = new Map(rows.map((row) => [row.externalId, row]));
  const seededIds = new Set(seeds.map((seed) => String(seed.id)));
  const output: AdminDirectoryItem<T>[] = [];

  for (const seed of seeds) {
    const row = rowMap.get(String(seed.id));
    const visible = !row || row.isVisible === 1;
    if (!includeHidden && !visible) continue;
    const payload = row?.payload ?? {};
    output.push({
      id: seed.id,
      visible,
      origin: row ? "override" : "seed",
      record: { ...seed, ...payload, id: seed.id } as T,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    });
  }

  for (const row of rows) {
    if (seededIds.has(row.externalId)) continue;
    if (!includeHidden && row.isVisible !== 1) continue;
    const numericId = Number(row.externalId);
    if (!Number.isInteger(numericId) || numericId <= 0) continue;
    output.push({
      id: numericId,
      visible: row.isVisible === 1,
      origin: "manual",
      record: { ...(row.payload as object), id: numericId } as T,
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  return output.sort((a, b) => a.id - b.id);
}

export async function listDoctors(includeHidden = false): Promise<AdminDirectoryItem<Doctor>[]> {
  return mergeDirectory(doctorSeeds, await rowsFor("doctor"), includeHidden);
}

export async function listCityServices(includeHidden = false): Promise<AdminDirectoryItem<CityOrganization>[]> {
  return mergeDirectory(cityServiceSeeds, await rowsFor("city_service"), includeHidden);
}

export async function getPublicDoctors() {
  return (await listDoctors(false)).map((item) => item.record);
}

export async function getPublicCityServices() {
  return (await listCityServices(false)).map((item) => item.record);
}

function seedsFor(kind: DirectoryKind) {
  return kind === "doctor" ? doctorSeeds : cityServiceSeeds;
}

export async function nextDirectoryExternalId(kind: DirectoryKind) {
  const rows = await rowsFor(kind);
  const seedIds = seedsFor(kind).map((item) => item.id);
  const rowIds = rows
    .map((row) => Number(row.externalId))
    .filter((id) => Number.isInteger(id) && id > 0);
  return Math.max(0, ...seedIds, ...rowIds) + 1;
}

export async function upsertDirectoryRecord(
  kind: DirectoryKind,
  externalId: number,
  payload: Record<string, unknown>,
) {
  const externalIdText = String(externalId);
  const [existing] = await db.select().from(directoryRecords).where(and(
    eq(directoryRecords.kind, kind),
    eq(directoryRecords.externalId, externalIdText),
  )).limit(1);

  const mergedPayload = {
    ...(existing?.payload ?? {}),
    ...payload,
  };

  const [row] = await db.insert(directoryRecords).values({
    kind,
    externalId: externalIdText,
    payload: mergedPayload,
    isVisible: existing?.isVisible ?? 1,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [directoryRecords.kind, directoryRecords.externalId],
    set: {
      payload: mergedPayload,
      updatedAt: new Date(),
    },
  }).returning();

  return row;
}

export async function setDirectoryVisibility(kind: DirectoryKind, externalId: number, visible: boolean) {
  const externalIdText = String(externalId);
  const [existing] = await db.select().from(directoryRecords).where(and(
    eq(directoryRecords.kind, kind),
    eq(directoryRecords.externalId, externalIdText),
  )).limit(1);

  const seedExists = seedsFor(kind).some((item) => item.id === externalId);
  if (!existing && !seedExists) return false;

  await db.insert(directoryRecords).values({
    kind,
    externalId: externalIdText,
    payload: existing?.payload ?? {},
    isVisible: visible ? 1 : 0,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [directoryRecords.kind, directoryRecords.externalId],
    set: {
      isVisible: visible ? 1 : 0,
      updatedAt: new Date(),
    },
  });

  return true;
}
