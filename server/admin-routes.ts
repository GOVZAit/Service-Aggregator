import type { Express, Request, Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import {
  createManualProvider,
  getProviderProfileRow,
  setProviderVisibility,
  updatePersistentProvider,
} from "./provider-service";
import { authUsers } from "@shared/schema";
import { providerProfiles, providerVisibility, providerProfilePatchSchema, manualProviderCreateSchema } from "@shared/provider-schema";
import { categoryIdsExist } from "./category-service";
import {
  adminAuditLog,
  adminVerificationPatchSchema,
  adminVisibilityPatchSchema,
  providerVerifications,
} from "@shared/admin-schema";

export async function authenticatedAdmin(req: Express.Request, res: Response) {
  if (!req.session.userId || req.session.sessionVersion === undefined) {
    res.status(401).json({ message: "Не авторизован" });
    return undefined;
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) {
    res.status(401).json({ message: "Сессия недействительна" });
    return undefined;
  }

  if (user.role !== "admin") {
    res.status(403).json({ message: "Доступно только администратору" });
    return undefined;
  }

  return user;
}

function validInternalKey(req: Request) {
  const configured = process.env.IMPORT_API_KEY;
  if (!configured) return false;
  const raw = req.headers["x-import-key"];
  const supplied = Array.isArray(raw) ? raw[0] : raw;
  return Boolean(supplied && supplied === configured);
}

function normalizeIdentifier(value: string) {
  if (value.includes("@")) return value.trim().toLowerCase();
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return digits;
}

export async function logAdminAction(
  adminUserId: number | null,
  action: string,
  entityType: string,
  entityId: string | number,
  details: Record<string, unknown> = {},
) {
  await db.insert(adminAuditLog).values({
    adminUserId,
    action,
    entityType,
    entityId: String(entityId),
    details,
  });
}

export async function ensureAdminTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provider_verifications (
      provider_id integer PRIMARY KEY,
      status text NOT NULL DEFAULT 'unverified',
      note text,
      updated_by integer REFERENCES auth_users(id) ON DELETE SET NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id serial PRIMARY KEY,
      admin_user_id integer REFERENCES auth_users(id) ON DELETE SET NULL,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id text NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
      ON admin_audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx
      ON admin_audit_log(entity_type, entity_id);
  `);
}

function serializeProviderRow(row: {
  profile: typeof providerProfiles.$inferSelect;
  visibility: typeof providerVisibility.$inferSelect | null;
  verification: typeof providerVerifications.$inferSelect | null;
}) {
  const effectiveData = {
    ...(row.profile.importedData ?? {}),
    ...(row.profile.manualOverrides ?? {}),
  };

  return {
    id: row.profile.id,
    ownerUserId: row.profile.ownerUserId,
    providerType: row.profile.providerType,
    organizationKind: row.profile.organizationKind,
    dataSource: row.profile.dataSource,
    sourceName: row.profile.sourceName,
    sourceExternalId: row.profile.sourceExternalId,
    sourceUrl: row.profile.sourceUrl,
    importedAt: row.profile.importedAt?.toISOString() ?? null,
    createdAt: row.profile.createdAt.toISOString(),
    updatedAt: row.profile.updatedAt.toISOString(),
    importedData: row.profile.importedData ?? {},
    manualOverrides: row.profile.manualOverrides ?? {},
    effectiveData,
    visible: !row.visibility || row.visibility.isVisible === 1,
    visibilityReason: row.visibility?.reason ?? null,
    verification: {
      status: row.verification?.status ?? "unverified",
      note: row.verification?.note ?? null,
      updatedAt: row.verification?.updatedAt?.toISOString() ?? null,
    },
  };
}

export async function registerAdminRoutes(app: Express) {
  app.get("/api/admin/summary", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const result = await pool.query<{
      total_providers: string;
      imported_providers: string;
      hidden_providers: string;
      pending_verifications: string;
      users: string;
    }>(`
      SELECT
        (SELECT count(*) FROM provider_profiles)::text AS total_providers,
        (SELECT count(*) FROM provider_profiles WHERE data_source = 'import')::text AS imported_providers,
        (SELECT count(*) FROM provider_visibility WHERE is_visible = 0)::text AS hidden_providers,
        (SELECT count(*) FROM provider_verifications WHERE status = 'pending')::text AS pending_verifications,
        (SELECT count(*) FROM auth_users)::text AS users
    `);

    const row = result.rows[0];
    res.json({
      totalProviders: Number(row.total_providers),
      importedProviders: Number(row.imported_providers),
      hiddenProviders: Number(row.hidden_providers),
      pendingVerifications: Number(row.pending_verifications),
      users: Number(row.users),
    });
  });

  app.get("/api/admin/providers", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const rows = await db.select({
      profile: providerProfiles,
      visibility: providerVisibility,
      verification: providerVerifications,
    })
      .from(providerProfiles)
      .leftJoin(providerVisibility, eq(providerVisibility.providerId, providerProfiles.id))
      .leftJoin(providerVerifications, eq(providerVerifications.providerId, providerProfiles.id))
      .orderBy(desc(providerProfiles.updatedAt));

    const query = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const type = typeof req.query.type === "string" ? req.query.type : "";
    const source = typeof req.query.source === "string" ? req.query.source : "";
    const visibility = typeof req.query.visibility === "string" ? req.query.visibility : "";
    const verification = typeof req.query.verification === "string" ? req.query.verification : "";

    const providers = rows.map(serializeProviderRow).filter((provider) => {
      const data = provider.effectiveData as Record<string, unknown>;
      const haystack = [
        data.name,
        data.companyName,
        data.phone,
        data.city,
        provider.sourceName,
        provider.sourceExternalId,
      ].filter(Boolean).join(" ").toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (type && provider.providerType !== type) return false;
      if (source && provider.dataSource !== source) return false;
      if (visibility === "visible" && !provider.visible) return false;
      if (visibility === "hidden" && provider.visible) return false;
      if (verification && provider.verification.status !== verification) return false;
      return true;
    });

    res.json(providers);
  });

  app.get("/api/admin/providers/:id", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });

    const [row] = await db.select({
      profile: providerProfiles,
      visibility: providerVisibility,
      verification: providerVerifications,
    })
      .from(providerProfiles)
      .leftJoin(providerVisibility, eq(providerVisibility.providerId, providerProfiles.id))
      .leftJoin(providerVerifications, eq(providerVerifications.providerId, providerProfiles.id))
      .where(eq(providerProfiles.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ message: "Профиль не найден" });
    res.json(serializeProviderRow(row));
  });

  app.post("/api/admin/providers", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const parsed = manualProviderCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    if (!categoryIdsExist(parsed.data.data.categoryIds)) {
      return res.status(400).json({ message: "Выбрана несуществующая категория" });
    }

    const provider = await createManualProvider(parsed.data);
    await logAdminAction(admin.id, "provider.create", "provider", provider.id, {
      providerType: provider.providerType,
      name: provider.name,
    });
    res.status(201).json(provider);
  });

  app.patch("/api/admin/providers/:id", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });

    const parsed = providerProfilePatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (parsed.data.categoryIds && !categoryIdsExist(parsed.data.categoryIds)) {
      return res.status(400).json({ message: "Выбрана несуществующая категория" });
    }

    const provider = await updatePersistentProvider(id, parsed.data);
    if (!provider) return res.status(404).json({ message: "Профиль не найден" });

    await logAdminAction(admin.id, "provider.update", "provider", id, {
      fields: Object.keys(parsed.data),
    });
    res.json(provider);
  });

  app.post("/api/admin/providers/:id/visibility", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const id = Number(req.params.id);
    const parsed = adminVisibilityPatchSchema.safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (!(await getProviderProfileRow(id))) return res.status(404).json({ message: "Профиль не найден" });

    await setProviderVisibility(id, parsed.data.visible, "manual");
    await logAdminAction(admin.id, parsed.data.visible ? "provider.show" : "provider.hide", "provider", id);
    res.json({ visible: parsed.data.visible });
  });

  app.post("/api/admin/providers/:id/verification", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const id = Number(req.params.id);
    const parsed = adminVerificationPatchSchema.safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (!(await getProviderProfileRow(id))) return res.status(404).json({ message: "Профиль не найден" });

    await db.insert(providerVerifications).values({
      providerId: id,
      status: parsed.data.status,
      note: parsed.data.note || null,
      updatedBy: admin.id,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: providerVerifications.providerId,
      set: {
        status: parsed.data.status,
        note: parsed.data.note || null,
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });

    await updatePersistentProvider(id, { verified: parsed.data.status === "verified" });
    await logAdminAction(admin.id, "provider.verification", "provider", id, {
      status: parsed.data.status,
      note: parsed.data.note || "",
    });

    res.json({ status: parsed.data.status, note: parsed.data.note || null });
  });

  app.get("/api/admin/audit", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const requested = Number(req.query.limit);
    const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 200) : 50;

    const result = await pool.query<{
      id: number;
      admin_user_id: number | null;
      admin_name: string | null;
      action: string;
      entity_type: string;
      entity_id: string;
      details: Record<string, unknown>;
      created_at: Date;
    }>(`
      SELECT
        l.id,
        l.admin_user_id,
        u.name AS admin_name,
        l.action,
        l.entity_type,
        l.entity_id,
        l.details,
        l.created_at
      FROM admin_audit_log l
      LEFT JOIN auth_users u ON u.id = l.admin_user_id
      ORDER BY l.created_at DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows.map((row) => ({
      id: row.id,
      adminUserId: row.admin_user_id,
      adminName: row.admin_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      createdAt: row.created_at.toISOString(),
    })));
  });

  // Bootstrap is intentionally not public: it reuses the existing internal import key.
  // Only a client account can be promoted, avoiding accidental loss of a provider account role.
  app.post("/api/internal/admin/promote", async (req, res) => {
    if (!validInternalKey(req)) {
      return res.status(process.env.IMPORT_API_KEY ? 403 : 503).json({ message: "Internal API недоступен" });
    }

    const rawIdentifier = typeof req.body?.identifier === "string" ? req.body.identifier : "";
    if (!rawIdentifier) return res.status(400).json({ message: "Укажите identifier" });

    const user = await storage.getUserByIdentifier(normalizeIdentifier(rawIdentifier));
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    if (user.role !== "client") {
      return res.status(400).json({ message: "Повысить до администратора можно только клиентский аккаунт" });
    }

    const [updated] = await db.update(authUsers).set({
      role: "admin",
      sessionVersion: sql`${authUsers.sessionVersion} + 1`,
    }).where(eq(authUsers.id, user.id)).returning();

    await logAdminAction(null, "admin.bootstrap", "user", user.id, { name: user.name });
    res.json({
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      role: updated.role,
    });
  });
}
