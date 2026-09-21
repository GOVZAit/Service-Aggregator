import type { Express } from "express";
import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { orderMessages, sendOrderMessageSchema, type OrderMessageView } from "@shared/order-chat-schema";
import { getProviderOwnerUserId } from "./provider-service";
import { sendPushToUser } from "./push-service";
import { broadcastRealtimeEvent } from "./realtime";

async function ensureOrderChatTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_messages (
      id serial PRIMARY KEY,
      order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sender_user_id integer REFERENCES auth_users(id) ON DELETE SET NULL,
      sender_role text NOT NULL,
      text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      read_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS order_messages_order_id_idx ON order_messages(order_id);
    CREATE INDEX IF NOT EXISTS order_messages_order_created_idx ON order_messages(order_id, created_at);
  `);
}

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

async function accessibleOrder(req: Express.Request, orderId: number) {
  const user = await authenticatedUser(req);
  if (!user) return { ok: false as const, status: 401, message: "Не авторизован" };

  const order = await storage.getOrderById(orderId);
  if (!order) return { ok: false as const, status: 404, message: "Заказ не найден" };

  const allowed = user.role === "client"
    ? order.clientId === user.id
    : Boolean(user.masterId && order.masterId === user.masterId);

  if (!allowed) return { ok: false as const, status: 403, message: "Нет доступа к чату этого заказа" };
  return { ok: true as const, user, order };
}

async function messageView(
  row: typeof orderMessages.$inferSelect,
  viewerId: number,
  clientName: string,
  masterName: string,
): Promise<OrderMessageView> {
  const senderName = row.senderRole === "client"
    ? clientName
    : row.senderRole === "master"
      ? masterName
      : "GOVZA";

  return {
    id: row.id,
    orderId: row.orderId,
    senderRole: row.senderRole,
    senderName,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    ...(row.readAt ? { readAt: row.readAt.toISOString() } : {}),
    mine: row.senderUserId === viewerId,
  };
}

export async function registerOrderChatRoutes(app: Express) {
  await ensureOrderChatTable();

  app.get("/api/order-chats/unread-count", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const orders = await storage.getOrders(
      user.role === "client" ? { clientId: user.id } : { masterId: user.masterId ?? -1 },
    );
    const ids = orders.map((order) => order.id);
    if (ids.length === 0) return res.json({ count: 0 });

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderMessages)
      .where(and(
        inArray(orderMessages.orderId, ids),
        isNull(orderMessages.readAt),
        ne(orderMessages.senderUserId, user.id),
      ));

    res.json({ count: Number(row?.count ?? 0) });
  });

  app.get("/api/orders/:id/messages", async (req, res) => {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Некорректный номер заказа" });
    }

    const access = await accessibleOrder(req, orderId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const { user, order } = access;
    await db.update(orderMessages)
      .set({ readAt: new Date() })
      .where(and(
        eq(orderMessages.orderId, orderId),
        isNull(orderMessages.readAt),
        ne(orderMessages.senderUserId, user.id),
      ));

    const rows = await db.select().from(orderMessages)
      .where(eq(orderMessages.orderId, orderId))
      .orderBy(asc(orderMessages.createdAt), asc(orderMessages.id));

    const client = order.clientId ? await storage.getUserById(order.clientId) : undefined;
    const master = await storage.getMasterById(order.masterId);

    res.json(await Promise.all(rows.map((row) => messageView(
      row,
      user.id,
      client?.name ?? "Клиент",
      master?.name ?? "Мастер",
    ))));
  });

  app.post("/api/orders/:id/messages", async (req, res) => {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Некорректный номер заказа" });
    }

    const access = await accessibleOrder(req, orderId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const parsed = sendOrderMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const { user, order } = access;
    const [message] = await db.insert(orderMessages).values({
      orderId,
      senderUserId: user.id,
      senderRole: user.role === "client" ? "client" : "master",
      text: parsed.data.text,
    }).returning();

    const client = order.clientId ? await storage.getUserById(order.clientId) : undefined;
    const master = await storage.getMasterById(order.masterId);

    const view = await messageView(
      message,
      user.id,
      client?.name ?? "Клиент",
      master?.name ?? "Мастер",
    );

    const recipientUserId = user.role === "client"
      ? await getProviderOwnerUserId(order.masterId)
      : order.clientId;
    broadcastRealtimeEvent(
      [user.id, recipientUserId],
      { type: "order-message", orderId: order.id },
    );

    if (recipientUserId) {
      void sendPushToUser(recipientUserId, {
        title: user.role === "client"
          ? `Сообщение от ${client?.name ?? "клиента"}`
          : `Сообщение от ${master?.name ?? "мастера"}`,
        body: parsed.data.text.length > 120
          ? `${parsed.data.text.slice(0, 117)}…`
          : parsed.data.text,
        url: user.role === "client"
          ? `/master/orders/${order.id}/chat`
          : `/orders/${order.id}/chat`,
        tag: `order-chat-${order.id}`,
      });
    }

    res.status(201).json(view);
  });
}
