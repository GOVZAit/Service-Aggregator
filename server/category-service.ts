import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { categories as seedCategories, type Category } from "@shared/schema";
import { categoryRecords, type CategoryPayload } from "@shared/category-schema";

let effectiveCategories: Category[] = seedCategories.map((category) => ({ ...category }));

export async function ensureCategoryTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS category_records (
      category_id integer PRIMARY KEY,
      name text NOT NULL,
      icon_name text NOT NULL,
      emoji text NOT NULL,
      color text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS category_records_name_unique
      ON category_records(name);
  `);

  await refreshCategoryCache();
}

export async function refreshCategoryCache() {
  const rows = await db.select().from(categoryRecords);
  const overrides = new Map(rows.map((row) => [row.categoryId, row]));
  const seedIds = new Set(seedCategories.map((category) => category.id));

  effectiveCategories = seedCategories.map((seed) => {
    const row = overrides.get(seed.id);
    return row
      ? {
          id: seed.id,
          name: row.name,
          iconName: row.iconName,
          emoji: row.emoji,
          color: row.color,
        }
      : { ...seed };
  });

  for (const row of rows) {
    if (seedIds.has(row.categoryId)) continue;
    effectiveCategories.push({
      id: row.categoryId,
      name: row.name,
      iconName: row.iconName,
      emoji: row.emoji,
      color: row.color,
    });
  }

  effectiveCategories.sort((a, b) => a.id - b.id);
  return effectiveCategories;
}

export function getEffectiveCategories(): Category[] {
  return effectiveCategories.map((category) => ({ ...category }));
}

export function getEffectiveCategory(id: number) {
  return effectiveCategories.find((category) => category.id === id);
}

export async function nextCategoryId() {
  const rows = await db.select({ categoryId: categoryRecords.categoryId }).from(categoryRecords);
  return Math.max(0, ...seedCategories.map((category) => category.id), ...rows.map((row) => row.categoryId)) + 1;
}

export async function createCategory(payload: CategoryPayload) {
  const categoryId = await nextCategoryId();
  await db.insert(categoryRecords).values({
    categoryId,
    ...payload,
    updatedAt: new Date(),
  });
  await refreshCategoryCache();
  return getEffectiveCategory(categoryId);
}

async function renameDenormalizedReferences(previousName: string, nextName: string) {
  if (previousName === nextName) return;

  await pool.query(
    `UPDATE service_requests SET category = $2, updated_at = now() WHERE category = $1`,
    [previousName, nextName],
  );

  await pool.query(
    `
      UPDATE master_settings
      SET
        settings = jsonb_set(settings, '{category}', to_jsonb($2::text), true),
        updated_at = now()
      WHERE settings->>'category' = $1
    `,
    [previousName, nextName],
  );
}

export async function updateCategory(categoryId: number, payload: CategoryPayload) {
  const current = getEffectiveCategory(categoryId);
  if (!current) return undefined;

  await db.insert(categoryRecords).values({
    categoryId,
    ...payload,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: categoryRecords.categoryId,
    set: {
      name: payload.name,
      iconName: payload.iconName,
      emoji: payload.emoji,
      color: payload.color,
      updatedAt: new Date(),
    },
  });

  await renameDenormalizedReferences(current.name, payload.name);
  await refreshCategoryCache();
  return getEffectiveCategory(categoryId);
}

export async function categoryNameExists(name: string, exceptId?: number) {
  return effectiveCategories.some((category) =>
    category.name.toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU") &&
    category.id !== exceptId
  );
}
