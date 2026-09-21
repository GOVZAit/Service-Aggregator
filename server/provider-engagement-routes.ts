import type { Express } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { getEffectiveCategory } from "./category-service";
import { getProviderOwnerUserId, isProviderVisible } from "./provider-service";
import { sendPushToUser } from "./push-service";
import { authUsers } from "@shared/schema";
import { requestResponses, serviceRequests } from "@shared/request-schema";
import {
  availabilityBulkSchema,
  createInvitationSchema,
  createInvitedRequestSchema,
  providerAvailability,
  requestInvitations,
  type AvailabilityDayView,
  type InvitationView,
} from "@shared/provider-engagement-schema";

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

function providerCategoryNames(provider: { category: string; categoryId: number; categoryIds?: number[] }) {
  const ids = provider.categoryIds ?? [provider.categoryId];
  const names = ids
    .map((id) => getEffectiveCategory(id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names : [provider.category];
}

function dateRange(from: string, days: number) {
  const start = new Date(`${from}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return undefined;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days - 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function availabilityView(row: typeof providerAvailability.$inferSelect): AvailabilityDayView {
  return {
    date: row.date,
    status: row.status,
    ...(row.fromTime ? { fromTime: row.fromTime } : {}),
    ...(row.toTime ? { toTime: row.toTime } : {}),
    ...(row.note ? { note: row.note } : {}),
  };
}

function relativeTime(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "только что";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

export async function ensureProviderEngagementTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provider_availability (
      id serial PRIMARY KEY,
      provider_id integer NOT NULL,
      date text NOT NULL,
      status text NOT NULL,
      from_time text,
      to_time text,
      note text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS provider_availability_provider_date_unique
      ON provider_availability(provider_id, date);
    CREATE INDEX IF NOT EXISTS provider_availability_provider_date_idx
      ON provider_availability(provider_id, date);

    CREATE TABLE IF NOT EXISTS request_invitations (
      id serial PRIMARY KEY,
      request_id integer NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      master_id integer NOT NULL,
      client_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      responded_at timestamptz
    );
    CREATE UNIQUE INDEX IF NOT EXISTS request_invitations_request_master_unique
      ON request_invitations(request_id, master_id);
    CREATE INDEX IF NOT EXISTS request_invitations_master_status_idx
      ON request_invitations(master_id, status);
    CREATE INDEX IF NOT EXISTS request_invitations_client_id_idx
      ON request_invitations(client_id);
  `);
}

async function readAvailability(providerId: number, from: string, days: number) {
  const range = dateRange(from, days);
  if (!range) return undefined;
  const result = await pool.query<typeof providerAvailability.$inferSelect>(`
    SELECT
      id,
      provider_id AS "providerId",
      date,
      status,
      from_time AS "fromTime",
      to_time AS "toTime",
      note,
      updated_at AS "updatedAt"
    FROM provider_availability
    WHERE provider_id = $1 AND date >= $2 AND date <= $3
    ORDER BY date ASC
  `, [providerId, range.from, range.to]);
  return result.rows.map(availabilityView);
}

async function invitationView(row: typeof requestInvitations.$inferSelect): Promise<InvitationView | undefined> {
  const [request] = await db.select().from(serviceRequests)
    .where(eq(serviceRequests.id, row.requestId)).limit(1);
  if (!request) return undefined;
  const client = await storage.getUserById(row.clientId);
  return {
    id: row.id,
    requestId: row.requestId,
    masterId: row.masterId,
    status: row.status,
    title: request.title,
    category: request.category,
    description: request.description,
    budget: request.budget,
    location: request.selectedMasterId === row.masterId ? request.location : "Адрес откроется после выбора исполнителя",
    postedAt: relativeTime(request.createdAt),
    clientName: client?.name ?? "Клиент",
    createdAt: row.createdAt.toISOString(),
  };
}

async function createInvitation(requestId: number, masterId: number, clientId: number) {
  const [created] = await db.insert(requestInvitations).values({
    requestId,
    masterId,
    clientId,
    status: "pending",
  }).returning();

  const ownerUserId = await getProviderOwnerUserId(masterId);
  if (ownerUserId) {
    void sendPushToUser(ownerUserId, {
      title: "Персональное приглашение в GOVZA",
      body: "Клиент предлагает вам посмотреть свою заявку",
      url: "/master/orders",
      tag: `request-invitation-${created.id}`,
    });
  }

  return created;
}

export async function registerProviderEngagementRoutes(app: Express) {
  app.get("/api/providers/:id/availability", async (req, res) => {
    const providerId = Number(req.params.id);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({ message: "Некорректный исполнитель" });
    }
    const provider = await storage.getMasterById(providerId);
    if (!provider || !(await isProviderVisible(providerId))) {
      return res.status(404).json({ message: "Исполнитель не найден" });
    }

    const from = typeof req.query.from === "string" ? req.query.from : new Date().toISOString().slice(0, 10);
    const requestedDays = Number(req.query.days ?? 14);
    const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 1), 31) : 14;
    const rows = await readAvailability(providerId, from, days);
    if (!rows) return res.status(400).json({ message: "Некорректная дата" });
    res.json(rows);
  });

  app.get("/api/providers/me/availability", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Доступно только исполнителю" });
    }

    const from = typeof req.query.from === "string" ? req.query.from : new Date().toISOString().slice(0, 10);
    const requestedDays = Number(req.query.days ?? 14);
    const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 1), 31) : 14;
    const rows = await readAvailability(user.masterId, from, days);
    if (!rows) return res.status(400).json({ message: "Некорректная дата" });
    res.json(rows);
  });

  app.put("/api/providers/me/availability", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Доступно только исполнителю" });
    }

    const parsed = availabilityBulkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    const uniqueDates = new Set(parsed.data.days.map((day) => day.date));
    if (uniqueDates.size !== parsed.data.days.length) {
      return res.status(400).json({ message: "Дата не должна повторяться" });
    }

    await db.transaction(async (tx) => {
      for (const day of parsed.data.days) {
        await tx.insert(providerAvailability).values({
          providerId: user.masterId!,
          date: day.date,
          status: day.status,
          fromTime: day.status === "available" ? day.fromTime! : null,
          toTime: day.status === "available" ? day.toTime! : null,
          note: day.note || null,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [providerAvailability.providerId, providerAvailability.date],
          set: {
            status: day.status,
            fromTime: day.status === "available" ? day.fromTime! : null,
            toTime: day.status === "available" ? day.toTime! : null,
            note: day.note || null,
            updatedAt: new Date(),
          },
        });
      }
    });

    res.json({ ok: true });
  });

  app.delete("/api/providers/me/availability/:date", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Доступно только исполнителю" });
    }

    const date = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Некорректная дата" });
    }
    await db.delete(providerAvailability).where(and(
      eq(providerAvailability.providerId, user.masterId),
      eq(providerAvailability.date, date),
    ));
    res.json({ ok: true });
  });

  app.get("/api/masters/:id/invitation-options", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите как клиент" });
    if (user.role !== "client") return res.status(403).json({ message: "Доступно клиенту" });

    const masterId = Number(req.params.id);
    const master = await storage.getMasterById(masterId);
    if (!master || !(await isProviderVisible(masterId))) {
      return res.status(404).json({ message: "Исполнитель не найден" });
    }
    const categoryNames = providerCategoryNames(master);

    const requests = await db.select().from(serviceRequests)
      .where(and(eq(serviceRequests.clientId, user.id), eq(serviceRequests.status, "open")))
      .orderBy(desc(serviceRequests.createdAt));
    const compatible = requests.filter((request) => categoryNames.includes(request.category));

    const requestIds = compatible.map((request) => request.id);
    const existing = requestIds.length > 0
      ? await db.select().from(requestInvitations).where(and(
          inArray(requestInvitations.requestId, requestIds),
          eq(requestInvitations.masterId, masterId),
        ))
      : [];
    const existingResponses = requestIds.length > 0
      ? await db.select({ requestId: requestResponses.requestId }).from(requestResponses).where(and(
          inArray(requestResponses.requestId, requestIds),
          eq(requestResponses.masterId, masterId),
        ))
      : [];
    const existingByRequest = new Map(existing.map((invitation) => [invitation.requestId, invitation.status]));
    existingResponses.forEach((response) => {
      if (!existingByRequest.has(response.requestId)) existingByRequest.set(response.requestId, "responded");
    });

    res.json(compatible.map((request) => ({
      id: request.id,
      title: request.title,
      category: request.category,
      budget: request.budget,
      createdAt: request.createdAt.toISOString(),
      invitationStatus: existingByRequest.get(request.id) ?? null,
    })));
  });

  app.post("/api/masters/:id/invitations", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите как клиент" });
    if (user.role !== "client") return res.status(403).json({ message: "Доступно клиенту" });

    const masterId = Number(req.params.id);
    const parsed = createInvitationSchema.safeParse(req.body);
    if (!Number.isInteger(masterId) || masterId <= 0) return res.status(400).json({ message: "Некорректный исполнитель" });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const master = await storage.getMasterById(masterId);
    if (!master || !(await isProviderVisible(masterId))) return res.status(404).json({ message: "Исполнитель не найден" });

    const [request] = await db.select().from(serviceRequests)
      .where(eq(serviceRequests.id, parsed.data.requestId)).limit(1);
    if (!request) return res.status(404).json({ message: "Заявка не найдена" });
    if (request.clientId !== user.id) return res.status(403).json({ message: "Можно приглашать только к своей заявке" });
    if (request.status !== "open") return res.status(409).json({ message: "Заявка уже закрыта" });
    if (!providerCategoryNames(master).includes(request.category)) {
      return res.status(400).json({ message: "Заявка не соответствует категории исполнителя" });
    }

    const [response] = await db.select({ id: requestResponses.id }).from(requestResponses)
      .where(and(eq(requestResponses.requestId, request.id), eq(requestResponses.masterId, masterId))).limit(1);
    if (response) return res.status(409).json({ message: "Исполнитель уже откликнулся на эту заявку" });

    try {
      const invitation = await createInvitation(request.id, masterId, user.id);
      res.status(201).json(await invitationView(invitation));
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return res.status(409).json({ message: "Приглашение уже отправлено" });
      }
      throw error;
    }
  });

  app.post("/api/masters/:id/invitations/new", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите как клиент" });
    if (user.role !== "client") return res.status(403).json({ message: "Доступно клиенту" });

    const masterId = Number(req.params.id);
    const parsed = createInvitedRequestSchema.safeParse(req.body);
    if (!Number.isInteger(masterId) || masterId <= 0) return res.status(400).json({ message: "Некорректный исполнитель" });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const master = await storage.getMasterById(masterId);
    if (!master || !(await isProviderVisible(masterId))) return res.status(404).json({ message: "Исполнитель не найден" });
    if (!providerCategoryNames(master).includes(parsed.data.category)) {
      return res.status(400).json({ message: "Категория не соответствует исполнителю" });
    }

    const result = await db.transaction(async (tx) => {
      const [request] = await tx.insert(serviceRequests).values({
        clientId: user.id,
        title: parsed.data.title,
        category: parsed.data.category,
        description: parsed.data.description,
        budget: parsed.data.budget,
        location: parsed.data.location,
        status: "open",
      }).returning();
      const [invitation] = await tx.insert(requestInvitations).values({
        requestId: request.id,
        masterId,
        clientId: user.id,
        status: "pending",
      }).returning();
      return { request, invitation };
    });

    const ownerUserId = await getProviderOwnerUserId(masterId);
    if (ownerUserId) {
      void sendPushToUser(ownerUserId, {
        title: "Персональное приглашение в GOVZA",
        body: parsed.data.title,
        url: "/master/orders",
        tag: `request-invitation-${result.invitation.id}`,
      });
    }

    res.status(201).json({
      requestId: result.request.id,
      invitation: await invitationView(result.invitation),
    });
  });

  app.get("/api/provider-invitations", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Доступно исполнителю" });
    }

    const rows = await db.select().from(requestInvitations)
      .where(eq(requestInvitations.masterId, user.masterId))
      .orderBy(desc(requestInvitations.createdAt))
      .limit(50);
    const views = await Promise.all(rows.map(invitationView));
    res.json(views.filter((view): view is InvitationView => Boolean(view)));
  });

  app.post("/api/provider-invitations/:id/decline", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Доступно исполнителю" });
    }

    const id = Number(req.params.id);
    const [invitation] = await db.select().from(requestInvitations)
      .where(and(eq(requestInvitations.id, id), eq(requestInvitations.masterId, user.masterId))).limit(1);
    if (!invitation) return res.status(404).json({ message: "Приглашение не найдено" });
    if (invitation.status !== "pending") return res.status(409).json({ message: "Приглашение уже обработано" });

    await db.update(requestInvitations).set({
      status: "declined",
      respondedAt: new Date(),
    }).where(eq(requestInvitations.id, invitation.id));

    void sendPushToUser(invitation.clientId, {
      title: "Исполнитель ответил на приглашение",
      body: "Исполнитель пока не готов взять эту заявку.",
      url: "/requests",
      tag: `request-invitation-declined-${invitation.id}`,
    });

    res.json({ ok: true });
  });
}
