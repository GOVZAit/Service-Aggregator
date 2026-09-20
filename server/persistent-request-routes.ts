import type { Express } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { authUsers, categories, insertRequestSchema, persistedOrders } from "@shared/schema";
import { getProviderOwnerUserId, getProviderOwnerUserIds } from "./provider-service";
import { sendPushToUser } from "./push-service";
import {
  createRequestResponseSchema,
  requestResponses,
  serviceRequests,
  type RequestResponseView,
  type ServiceRequestView,
} from "@shared/request-schema";

class RequestApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function ensureRequestTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_requests (
      id serial PRIMARY KEY,
      client_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      title text NOT NULL,
      category text NOT NULL,
      description text NOT NULL,
      budget text NOT NULL,
      location text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      selected_master_id integer,
      selected_response_id integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS service_requests_client_id_idx ON service_requests(client_id);
    CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests(status);
    CREATE INDEX IF NOT EXISTS service_requests_category_status_idx ON service_requests(category, status);

    CREATE TABLE IF NOT EXISTS request_responses (
      id serial PRIMARY KEY,
      request_id integer NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      master_id integer NOT NULL,
      price text NOT NULL,
      message text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS request_responses_request_master_unique
      ON request_responses(request_id, master_id);
    CREATE INDEX IF NOT EXISTS request_responses_request_id_idx ON request_responses(request_id);
    CREATE INDEX IF NOT EXISTS request_responses_master_id_idx ON request_responses(master_id);
  `);
}

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

function providerCategoryNames(provider: { category: string; categoryId: number; categoryIds?: number[] }) {
  const ids = provider.categoryIds ?? [provider.categoryId];
  const names = ids
    .map((id) => categories.find((category) => category.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names : [provider.category];
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

async function responseCounts(requestIds: number[]) {
  const result = new Map<number, number>();
  if (requestIds.length === 0) return result;
  const rows = await db
    .select({ requestId: requestResponses.requestId, count: sql<number>`count(*)::int` })
    .from(requestResponses)
    .where(inArray(requestResponses.requestId, requestIds))
    .groupBy(requestResponses.requestId);
  rows.forEach((row) => result.set(row.requestId, Number(row.count)));
  return result;
}

async function clientNames(clientIds: number[]) {
  const result = new Map<number, string>();
  const ids = [...new Set(clientIds)];
  if (ids.length === 0) return result;
  const rows = await db.select({ id: authUsers.id, name: authUsers.name })
    .from(authUsers)
    .where(inArray(authUsers.id, ids));
  rows.forEach((row) => result.set(row.id, row.name));
  return result;
}

function toRequestView(
  row: typeof serviceRequests.$inferSelect,
  name: string,
  count: number,
  hasResponded?: boolean,
  exposeLocation = true,
): ServiceRequestView {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    budget: row.budget,
    location: exposeLocation ? row.location : "Адрес откроется после выбора мастера",
    status: row.status,
    postedAt: relativeTime(row.createdAt),
    createdAt: row.createdAt.toISOString(),
    responses: count,
    user: { name, avatar: "" },
    ...(row.selectedMasterId !== null ? { selectedMasterId: row.selectedMasterId } : {}),
    ...(row.selectedResponseId !== null ? { selectedResponseId: row.selectedResponseId } : {}),
    ...(hasResponded !== undefined ? { hasResponded } : {}),
  };
}

async function toResponseView(row: typeof requestResponses.$inferSelect): Promise<RequestResponseView> {
  const master = await storage.getMasterById(row.masterId);
  return {
    id: row.id,
    requestId: row.requestId,
    masterId: row.masterId,
    masterName: master?.name ?? "Мастер",
    avatar: master?.avatar ?? "",
    price: row.price,
    text: row.message,
    rating: master?.rating ?? 0,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function registerPersistentRequestRoutes(app: Express) {
  await ensureRequestTables();

  app.get("/api/requests", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите, чтобы просматривать заявки" });

    let rows: Array<typeof serviceRequests.$inferSelect> = [];
    if (user.role === "client") {
      rows = await db.select().from(serviceRequests)
        .where(eq(serviceRequests.clientId, user.id))
        .orderBy(desc(serviceRequests.createdAt));
    } else {
      if (!user.masterId) return res.status(403).json({ message: "Профиль исполнителя не привязан" });
      const master = await storage.getMasterById(user.masterId);
      if (!master) return res.status(404).json({ message: "Профиль мастера не найден" });
      const categoryNames = providerCategoryNames(master);
      rows = await db.select().from(serviceRequests)
        .where(and(eq(serviceRequests.status, "open"), inArray(serviceRequests.category, categoryNames)))
        .orderBy(desc(serviceRequests.createdAt));
    }

    const ids = rows.map((row) => row.id);
    const counts = await responseCounts(ids);
    const names = await clientNames(rows.map((row) => row.clientId));
    let responded = new Set<number>();
    if (user.role === "master" && user.masterId && ids.length > 0) {
      const ownResponses = await db.select({ requestId: requestResponses.requestId })
        .from(requestResponses)
        .where(and(inArray(requestResponses.requestId, ids), eq(requestResponses.masterId, user.masterId)));
      responded = new Set(ownResponses.map((row) => row.requestId));
    }

    res.json(rows.map((row) => toRequestView(
      row,
      names.get(row.clientId) ?? "Клиент",
      counts.get(row.id) ?? 0,
      user.role === "master" ? responded.has(row.id) : undefined,
      user.role !== "master",
    )));
  });

  app.get("/api/requests/:id", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    const id = Number(req.params.id);
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
    if (!request) return res.status(404).json({ message: "Заявка не найдена" });

    if (user.role === "client" && request.clientId !== user.id) {
      return res.status(403).json({ message: "Нет доступа к этой заявке" });
    }
    if (user.role === "master") {
      if (!user.masterId) return res.status(403).json({ message: "Профиль исполнителя не привязан" });
      const master = await storage.getMasterById(user.masterId);
      if (!master || !providerCategoryNames(master).includes(request.category)) {
        return res.status(403).json({ message: "Заявка относится к другой категории" });
      }
    }

    const counts = await responseCounts([id]);
    const names = await clientNames([request.clientId]);
    const exposeLocation = user.role === "client" || request.selectedMasterId === user.masterId;
    res.json(toRequestView(request, names.get(request.clientId) ?? "Клиент", counts.get(id) ?? 0, undefined, exposeLocation));
  });

  app.post("/api/requests", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите, чтобы создать заявку" });
    if (user.role !== "client") return res.status(403).json({ message: "Заявку может создать только клиент" });

    const parsed = insertRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    const [request] = await db.insert(serviceRequests).values({
      ...parsed.data,
      clientId: user.id,
    }).returning();

    const matchingProviders = (await storage.getMasters())
      .filter((provider) => providerCategoryNames(provider).includes(request.category))
      .map((provider) => provider.id);
    const owners = await getProviderOwnerUserIds(matchingProviders);
    for (const ownerUserId of new Set(owners.values())) {
      void sendPushToUser(ownerUserId, {
        title: "Новая заявка в вашей категории",
        body: request.title,
        url: "/master/orders",
        tag: `request-${request.id}`,
      });
    }

    res.status(201).json(toRequestView(request, user.name, 0));
  });

  app.get("/api/requests/:id/responses", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    const requestId = Number(req.params.id);
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).limit(1);
    if (!request) return res.status(404).json({ message: "Заявка не найдена" });

    let rows: Array<typeof requestResponses.$inferSelect> = [];
    if (user.role === "client") {
      if (request.clientId !== user.id) return res.status(403).json({ message: "Нет доступа к откликам" });
      rows = await db.select().from(requestResponses)
        .where(eq(requestResponses.requestId, requestId))
        .orderBy(desc(requestResponses.createdAt));
    } else {
      if (!user.masterId) return res.status(403).json({ message: "Профиль исполнителя не привязан" });
      rows = await db.select().from(requestResponses)
        .where(and(eq(requestResponses.requestId, requestId), eq(requestResponses.masterId, user.masterId)))
        .orderBy(desc(requestResponses.createdAt));
    }

    res.json(await Promise.all(rows.map(toResponseView)));
  });

  app.post("/api/requests/:id/responses", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите как исполнитель" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Отклик доступен только исполнителю" });
    }
    const parsed = createRequestResponseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const requestId = Number(req.params.id);
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).limit(1);
    if (!request) return res.status(404).json({ message: "Заявка не найдена" });
    if (request.status !== "open") return res.status(409).json({ message: "Заявка уже закрыта" });
    const master = await storage.getMasterById(user.masterId);
    if (!master) return res.status(404).json({ message: "Профиль мастера не найден" });
    if (!providerCategoryNames(master).includes(request.category)) {
      return res.status(403).json({ message: "Можно откликаться только на заявки своей категории" });
    }

    try {
      const [response] = await db.insert(requestResponses).values({
        requestId,
        masterId: user.masterId,
        price: parsed.data.price,
        message: parsed.data.message,
      }).returning();
      void sendPushToUser(request.clientId, {
        title: "Новый отклик на заявку",
        body: `${master.name}: ${parsed.data.price}`,
        url: "/requests",
        tag: `request-response-${requestId}`,
      });
      res.status(201).json(await toResponseView(response));
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return res.status(409).json({ message: "Вы уже откликнулись на эту заявку" });
      }
      throw error;
    }
  });

  app.post("/api/requests/:id/responses/:responseId/select", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "client") return res.status(403).json({ message: "Мастера выбирает клиент" });

    const requestId = Number(req.params.id);
    const responseId = Number(req.params.responseId);

    try {
      const order = await db.transaction(async (tx) => {
        const [request] = await tx.select().from(serviceRequests)
          .where(eq(serviceRequests.id, requestId)).limit(1);
        if (!request) throw new RequestApiError(404, "Заявка не найдена");
        if (request.clientId !== user.id) throw new RequestApiError(403, "Это не ваша заявка");
        if (request.status !== "open") throw new RequestApiError(409, "Мастер для этой заявки уже выбран");

        const [response] = await tx.select().from(requestResponses)
          .where(and(eq(requestResponses.id, responseId), eq(requestResponses.requestId, requestId)))
          .limit(1);
        if (!response) throw new RequestApiError(404, "Отклик не найден");

        const [claimed] = await tx.update(serviceRequests).set({
          status: "matched",
          selectedMasterId: response.masterId,
          selectedResponseId: response.id,
          updatedAt: new Date(),
        }).where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.status, "open")))
          .returning({ id: serviceRequests.id });
        if (!claimed) throw new RequestApiError(409, "Мастер для этой заявки уже выбран");

        await tx.update(requestResponses).set({ status: "rejected" })
          .where(eq(requestResponses.requestId, requestId));
        await tx.update(requestResponses).set({ status: "selected" })
          .where(eq(requestResponses.id, response.id));

        const [createdOrder] = await tx.insert(persistedOrders).values({
          title: request.title,
          masterId: response.masterId,
          clientId: user.id,
          status: "pending",
          date: "Согласовать с мастером",
          price: response.price,
          address: request.location,
          comment: request.description,
        }).returning();
        return createdOrder;
      });

      const selectedOwnerId = await getProviderOwnerUserId(order.masterId);
      if (selectedOwnerId) {
        void sendPushToUser(selectedOwnerId, {
          title: "Клиент выбрал ваше предложение",
          body: order.title,
          url: "/master/orders",
          tag: `selected-order-${order.id}`,
        });
      }
      res.status(201).json({ order });
    } catch (error) {
      if (error instanceof RequestApiError) {
        return res.status(error.status).json({ message: error.message });
      }
      throw error;
    }
  });
}
