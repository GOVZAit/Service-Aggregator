import { and, eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "./db";
import type { AuthUser, Master } from "@shared/schema";
import { getEffectiveCategories, getEffectiveCategory } from "./category-service";
import {
  providerActivity,
  providerProfiles,
  providerVisibility,
  type ManualProviderCreateInput,
  type OrganizationKind,
  type ProviderImportInput,
  type ProviderProfileData,
  type ProviderProfilePatch,
  type ProviderType,
} from "@shared/provider-schema";

const DEFAULT_CITY = "Грозный";
const DEFAULT_LOCATION = { lat: 43.317, lng: 45.6992 };

export async function ensureProviderTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provider_profiles (
      id serial PRIMARY KEY,
      owner_user_id integer REFERENCES auth_users(id) ON DELETE SET NULL,
      provider_type text NOT NULL,
      organization_kind text,
      data_source text NOT NULL DEFAULT 'manual',
      source_name text,
      source_external_id text,
      source_url text,
      imported_data jsonb NOT NULL DEFAULT '{}'::jsonb,
      manual_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
      imported_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS provider_profiles_owner_user_unique
      ON provider_profiles(owner_user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS provider_profiles_source_external_unique
      ON provider_profiles(source_name, source_external_id);
    CREATE INDEX IF NOT EXISTS provider_profiles_type_idx ON provider_profiles(provider_type);

    CREATE TABLE IF NOT EXISTS provider_visibility (
      provider_id integer PRIMARY KEY,
      is_visible integer NOT NULL DEFAULT 1,
      reason text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS provider_activity (
      user_id integer PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
      last_active_at timestamptz NOT NULL DEFAULT now(),
      reminder_sent_at timestamptz,
      hidden_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('provider_profiles', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 9999) FROM provider_profiles), 9999),
      true
    );
  `);
}

function primaryCategory(categoryIds?: number[]) {
  const id = categoryIds?.[0] ?? 1;
  return getEffectiveCategory(id) ?? getEffectiveCategories()[0];
}

function effectiveData(row: typeof providerProfiles.$inferSelect): ProviderProfileData {
  return {
    ...(row.importedData ?? {}),
    ...(row.manualOverrides ?? {}),
  };
}

export function providerRowToMaster(row: typeof providerProfiles.$inferSelect): Master {
  const data = effectiveData(row);
  const categoryIds = data.categoryIds?.length ? data.categoryIds : [1];
  const category = primaryCategory(categoryIds);
  const isOrganization = row.providerType === "organization";
  return {
    id: row.id,
    name: data.name ?? (isOrganization ? "Новая организация" : "Новый мастер"),
    category: category.name,
    categoryId: category.id,
    categoryIds,
    rating: 0,
    reviews: 0,
    price: data.price ?? "Цена по договорённости",
    avatar: data.avatar ?? "",
    verified: data.verified ?? false,
    distance: "",
    responseTime: "~30 мин",
    completedOrders: 0,
    description: data.description ?? (isOrganization
      ? "Организация в каталоге GOVZA"
      : "Исполнитель в каталоге GOVZA"),
    portfolio: data.portfolio ?? [],
    services: data.services ?? [],
    phone: data.phone,
    callMode: data.callMode ?? "always",
    workingHours: data.workingHours ?? { from: "09:00", to: "18:00" },
    isOnline: data.isOnline ?? false,
    district: data.district,
    city: data.city ?? DEFAULT_CITY,
    lat: data.lat ?? DEFAULT_LOCATION.lat,
    lng: data.lng ?? DEFAULT_LOCATION.lng,
    companyName: data.companyName ?? (isOrganization ? data.name : undefined),
    hasCertificate: data.hasCertificate ?? false,
    executorType: isOrganization ? "company" : (data.executorType ?? "private"),
    showPortfolio: data.showPortfolio ?? true,
    showReviews: data.showReviews ?? true,
    showPrices: data.showPrices ?? true,
    showCertificates: data.showCertificates ?? true,
    certificates: data.certificates ?? [],
    providerType: row.providerType,
    organizationKind: row.organizationKind ?? undefined,
    isVisible: true,
    dataSource: row.dataSource,
  };
}

export async function createProviderProfile(
  ownerUserId: number,
  providerType: ProviderType,
  name: string,
  phone?: string,
) {
  const [row] = await db.insert(providerProfiles).values({
    ownerUserId,
    providerType,
    organizationKind: providerType === "organization" ? "service_company" : null,
    dataSource: "manual",
    manualOverrides: {
      name,
      ...(phone ? { phone } : {}),
      city: DEFAULT_CITY,
      categoryIds: [1],
      services: [],
      portfolio: [],
    },
  }).returning();
  return row;
}

export async function listPersistentProviders(): Promise<Master[]> {
  const rows = await db.select().from(providerProfiles);
  const hiddenRows = await db.select().from(providerVisibility)
    .where(eq(providerVisibility.isVisible, 0));
  const hidden = new Set(hiddenRows.map((row) => row.providerId));
  return rows.filter((row) => !hidden.has(row.id)).map(providerRowToMaster);
}

export async function getPersistentProvider(id: number): Promise<Master | undefined> {
  const [row] = await db.select().from(providerProfiles)
    .where(eq(providerProfiles.id, id)).limit(1);
  return row ? providerRowToMaster(row) : undefined;
}

export async function getProviderProfileRow(id: number) {
  const [row] = await db.select().from(providerProfiles)
    .where(eq(providerProfiles.id, id)).limit(1);
  return row;
}

export async function updatePersistentProvider(
  id: number,
  patch: ProviderProfilePatch | Partial<Master>,
): Promise<Master | undefined> {
  const row = await getProviderProfileRow(id);
  if (!row) return undefined;

  const raw = { ...patch } as Record<string, unknown>;
  const organizationKind = raw.organizationKind as OrganizationKind | undefined;
  delete raw.organizationKind;
  delete raw.id;
  delete raw.providerType;
  delete raw.dataSource;
  delete raw.isVisible;
  delete raw.rating;
  delete raw.reviews;
  delete raw.completedOrders;
  delete raw.distance;
  delete raw.responseTime;
  const legacyCategoryId = typeof raw.categoryId === "number" ? raw.categoryId : undefined;
  delete raw.category;
  delete raw.categoryId;
  if (legacyCategoryId) raw.categoryIds = [legacyCategoryId];

  const manualOverrides = {
    ...(row.manualOverrides ?? {}),
    ...raw,
  } as ProviderProfileData;

  const [updated] = await db.update(providerProfiles).set({
    manualOverrides,
    ...(organizationKind ? { organizationKind } : {}),
    updatedAt: new Date(),
  }).where(eq(providerProfiles.id, id)).returning();

  return updated ? providerRowToMaster(updated) : undefined;
}

export async function createManualProvider(input: ManualProviderCreateInput) {
  const [created] = await db.insert(providerProfiles).values({
    providerType: input.providerType,
    organizationKind: input.providerType === "organization"
      ? (input.organizationKind ?? "other")
      : null,
    dataSource: "manual",
    manualOverrides: input.data,
  }).returning();
  return providerRowToMaster(created);
}

export async function importProvider(input: ProviderImportInput) {
  const values = {
    providerType: input.providerType,
    organizationKind: input.providerType === "organization"
      ? (input.organizationKind ?? "other")
      : null,
    dataSource: "import" as const,
    sourceName: input.sourceName,
    sourceExternalId: input.sourceExternalId,
    sourceUrl: input.sourceUrl ?? null,
    importedData: input.data,
    importedAt: new Date(),
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(providerProfiles)
    .where(and(
      eq(providerProfiles.sourceName, input.sourceName),
      eq(providerProfiles.sourceExternalId, input.sourceExternalId),
    )).limit(1);

  if (existing) {
    const [updated] = await db.update(providerProfiles).set(values)
      .where(eq(providerProfiles.id, existing.id)).returning();
    return providerRowToMaster(updated);
  }

  const [created] = await db.insert(providerProfiles).values(values).returning();
  return providerRowToMaster(created);
}

export async function getProviderOwnerUserId(providerId: number) {
  const [profile] = await db.select({ ownerUserId: providerProfiles.ownerUserId })
    .from(providerProfiles)
    .where(eq(providerProfiles.id, providerId))
    .limit(1);
  if (profile?.ownerUserId) return profile.ownerUserId;

  const result = await pool.query<{ id: number }>(
    "SELECT id FROM auth_users WHERE master_id = $1 LIMIT 1",
    [providerId],
  );
  return result.rows[0]?.id;
}

export async function getProviderOwnerUserIds(providerIds: number[]) {
  const ids = [...new Set(providerIds)];
  if (ids.length === 0) return new Map<number, number>();
  const result = new Map<number, number>();

  const profiles = await db.select({
    id: providerProfiles.id,
    ownerUserId: providerProfiles.ownerUserId,
  }).from(providerProfiles).where(inArray(providerProfiles.id, ids));
  profiles.forEach((profile) => {
    if (profile.ownerUserId) result.set(profile.id, profile.ownerUserId);
  });

  const rows = await pool.query<{ id: number; master_id: number }>(
    "SELECT id, master_id FROM auth_users WHERE master_id = ANY($1::int[])",
    [ids],
  );
  rows.rows.forEach((row) => {
    if (!result.has(row.master_id)) result.set(row.master_id, row.id);
  });
  return result;
}

export async function isProviderVisible(providerId: number) {
  const [row] = await db.select().from(providerVisibility)
    .where(eq(providerVisibility.providerId, providerId)).limit(1);
  return !row || row.isVisible === 1;
}

export async function hiddenProviderIds() {
  const rows = await db.select({ providerId: providerVisibility.providerId })
    .from(providerVisibility)
    .where(eq(providerVisibility.isVisible, 0));
  return new Set(rows.map((row) => row.providerId));
}

export async function setProviderVisibility(
  providerId: number,
  visible: boolean,
  reason?: "inactivity" | "manual",
) {
  await db.insert(providerVisibility).values({
    providerId,
    isVisible: visible ? 1 : 0,
    reason: visible ? null : (reason ?? "manual"),
  }).onConflictDoUpdate({
    target: providerVisibility.providerId,
    set: {
      isVisible: visible ? 1 : 0,
      reason: visible ? null : (reason ?? "manual"),
      updatedAt: new Date(),
    },
  });
}

export async function recordProviderActivity(user: Pick<AuthUser, "id" | "role" | "masterId">) {
  if (user.role !== "master" && user.role !== "organization") return;
  const now = new Date();
  await db.insert(providerActivity).values({
    userId: user.id,
    lastActiveAt: now,
    reminderSentAt: null,
    hiddenAt: null,
  }).onConflictDoUpdate({
    target: providerActivity.userId,
    set: {
      lastActiveAt: now,
      reminderSentAt: null,
      hiddenAt: null,
      updatedAt: now,
    },
  });

  if (user.masterId) {
    const [visibility] = await db.select().from(providerVisibility)
      .where(eq(providerVisibility.providerId, user.masterId)).limit(1);
    if (visibility?.reason === "inactivity") {
      await setProviderVisibility(user.masterId, true);
    }
  }
}

export async function seedProviderActivity() {
  await pool.query(`
    INSERT INTO provider_activity (user_id, last_active_at, updated_at)
    SELECT id, now(), now()
    FROM auth_users
    WHERE role IN ('master', 'organization')
    ON CONFLICT (user_id) DO NOTHING
  `);
}

export async function providerIdsMatchingCategory(categoryName: string) {
  const category = getEffectiveCategories().find((item) => item.name === categoryName);
  if (!category) return [] as number[];

  const persistent = await db.select().from(providerProfiles);
  const ids = persistent
    .filter((row) => {
      const data = effectiveData(row);
      return (data.categoryIds ?? [1]).includes(category.id);
    })
    .map((row) => row.id);
  return ids;
}

export async function getInactiveProviderCandidates() {
  const result = await pool.query<{
    user_id: number;
    master_id: number | null;
    role: "master" | "organization";
    last_active_at: Date;
    reminder_sent_at: Date | null;
    hidden_at: Date | null;
  }>(`
    SELECT
      a.user_id,
      u.master_id,
      u.role,
      a.last_active_at,
      a.reminder_sent_at,
      a.hidden_at
    FROM provider_activity a
    JOIN auth_users u ON u.id = a.user_id
    WHERE u.role IN ('master', 'organization')
  `);
  return result.rows;
}

export async function markInactivityReminder(userId: number) {
  await db.update(providerActivity).set({
    reminderSentAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(providerActivity.userId, userId));
}

export async function markInactivityHidden(userId: number) {
  await db.update(providerActivity).set({
    hiddenAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(providerActivity.userId, userId));
}
