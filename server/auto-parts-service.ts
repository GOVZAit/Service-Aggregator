import { desc, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { curatedChechnyaAutoPartsSeeds } from "./auto-parts-curated-data";
import {
  autoPartsSuppliers,
  type AutoPartsSupplierData,
  type AutoPartsSupplierImportInput,
  type AutoPartsSupplierPatch,
  type AutoPartsSupplierView,
  type ManualAutoPartsSupplierCreateInput,
} from "@shared/auto-parts-schema";

function effectiveData(row: typeof autoPartsSuppliers.$inferSelect): AutoPartsSupplierData {
  return {
    ...(row.importedData ?? {}),
    ...(row.manualOverrides ?? {}),
  };
}

function normalizeList(values?: string[]) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

export function autoPartsRowToView(row: typeof autoPartsSuppliers.$inferSelect): AutoPartsSupplierView {
  const data = effectiveData(row);
  return {
    id: row.id,
    name: data.name ?? `Автомагазин #${row.id}`,
    supplierType: data.supplierType ?? "store",
    partsCondition: data.partsCondition ?? "mixed",
    salesType: data.salesType ?? "retail",
    city: data.city,
    address: data.address,
    phone: data.phone,
    whatsapp: data.whatsapp,
    website: data.website,
    description: data.description,
    brands: normalizeList(data.brands),
    partGroups: normalizeList(data.partGroups),
    vehicleTypes: data.vehicleTypes ?? [],
    vehicleOrigins: data.vehicleOrigins ?? [],
    delivery: data.delivery ?? false,
    pickup: data.pickup ?? true,
    verified: data.verified ?? false,
    lat: data.lat,
    lng: data.lng,
    dataSource: row.dataSource,
    visible: row.isVisible === 1,
  };
}

export async function ensureAutoPartsTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auto_parts_suppliers (
      id serial PRIMARY KEY,
      data_source text NOT NULL DEFAULT 'manual',
      source_name text,
      source_external_id text,
      source_url text,
      imported_data jsonb NOT NULL DEFAULT '{}'::jsonb,
      manual_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
      is_visible integer NOT NULL DEFAULT 1,
      imported_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS auto_parts_suppliers_source_external_unique
      ON auto_parts_suppliers(source_name, source_external_id);

    CREATE INDEX IF NOT EXISTS auto_parts_suppliers_visible_updated_idx
      ON auto_parts_suppliers(is_visible, updated_at DESC);
  `);
}

export async function seedCuratedAutoPartsSuppliers() {
  for (const seed of curatedChechnyaAutoPartsSeeds) {
    await importAutoPartsSupplier(seed);
  }
}

export async function listAutoPartsSuppliers(includeHidden = false) {
  const rows = includeHidden
    ? await db.select().from(autoPartsSuppliers).orderBy(desc(autoPartsSuppliers.updatedAt))
    : await db.select().from(autoPartsSuppliers)
        .where(eq(autoPartsSuppliers.isVisible, 1))
        .orderBy(desc(autoPartsSuppliers.updatedAt));
  return rows.map(autoPartsRowToView);
}

export async function getAutoPartsSupplierRow(id: number) {
  const [row] = await db.select().from(autoPartsSuppliers)
    .where(eq(autoPartsSuppliers.id, id))
    .limit(1);
  return row;
}

export async function createManualAutoPartsSupplier(input: ManualAutoPartsSupplierCreateInput) {
  const [created] = await db.insert(autoPartsSuppliers).values({
    dataSource: "manual",
    manualOverrides: input,
  }).returning();
  return autoPartsRowToView(created);
}

export async function updateAutoPartsSupplier(id: number, patch: AutoPartsSupplierPatch) {
  const row = await getAutoPartsSupplierRow(id);
  if (!row) return undefined;

  const [updated] = await db.update(autoPartsSuppliers).set({
    manualOverrides: {
      ...(row.manualOverrides ?? {}),
      ...patch,
    },
    updatedAt: new Date(),
  }).where(eq(autoPartsSuppliers.id, id)).returning();

  return updated ? autoPartsRowToView(updated) : undefined;
}

export async function setAutoPartsSupplierVisibility(id: number, visible: boolean) {
  const [updated] = await db.update(autoPartsSuppliers).set({
    isVisible: visible ? 1 : 0,
    updatedAt: new Date(),
  }).where(eq(autoPartsSuppliers.id, id)).returning();
  return updated ? autoPartsRowToView(updated) : undefined;
}

export async function importAutoPartsSupplier(input: AutoPartsSupplierImportInput) {
  const existing = await db.select().from(autoPartsSuppliers)
    .where(eq(autoPartsSuppliers.sourceName, input.sourceName))
    .orderBy(desc(autoPartsSuppliers.updatedAt));

  const matched = existing.find((row) => row.sourceExternalId === input.sourceExternalId);
  const values = {
    dataSource: "import" as const,
    sourceName: input.sourceName,
    sourceExternalId: input.sourceExternalId,
    sourceUrl: input.sourceUrl ?? null,
    importedData: input.data,
    importedAt: new Date(),
    updatedAt: new Date(),
  };

  if (matched) {
    const [updated] = await db.update(autoPartsSuppliers).set(values)
      .where(eq(autoPartsSuppliers.id, matched.id))
      .returning();
    return autoPartsRowToView(updated);
  }

  const [created] = await db.insert(autoPartsSuppliers).values(values).returning();
  return autoPartsRowToView(created);
}
