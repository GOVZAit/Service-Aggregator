import type { Express } from "express";
import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import {
  directConversations,
  directMessages,
  sendDirectMessageSchema,
  type DirectConversationView,
  type DirectMessageView,
} from "@shared/direct-chat-schema";
import { getProviderOwnerUserId, isProviderVisible } from "./provider-service";
import { sendPushToUser } from "./push-service";

async function ensureDirectChatTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS direct_conversations (
      id serial PRIMARY KEY,
      client_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      provider_id integer NOT NULL,
      provider_user_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS direct_conversations_client_provider_unique
      ON direct_conversations(client_id, provider_id);
    CREATE INDEX IF NOT EXISTS direct_conversations_client_idx
      ON direct_conversations(client_id);
    CREATE INDEX IF NOT EXISTS direct_conversations_provider_user_idx
      ON direct_conversations(provider_user_id);
    CREATE INDEX IF NOT EXISTS direct_conversations_updated_idx
      ON direct_conversations(updated_at);

    CREATE TABLE IF NOT EXISTS direct_messages (
      id serial PRIMARY KEY,
      conversation_id integer NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
      sender_user_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      read_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS direct_messages_conversation_idx
      ON direct_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS direct_messages_conversation_created_idx
      ON direct_messages(conversation_id, created_at);
  `);
}

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

async function conversationAccess(req: Express.Request, conversationId: number) {
  const user = await authenticatedUser(req);
  if (!user) return { ok: false as const, status: 401, message: "Не авторизован" };

  const [conversation] = await db.select().from(directConversations)
    .where(eq(directConversations.id, conversationId))
    .limit(1);
  if (!conversation) return { ok: false as const, status: 404, message: "Диалог не найден" };

  if (conversation.clientId !== user.id && conversation.providerUserId !== user.id) {
    return { ok: false as const, status: 403, message: "Нет доступа к этому диалогу" };
  }

  return { ok: true as const, user, conversation };
}

async function messageView(
  row: typeof directMessages.$inferSelect,
  viewerId: number,
  clientName: string,
  providerName: string,
  clientId: number,
): Promise<DirectMessageView> {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderName: row.senderUserId === clientId ? clientName : providerName,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    ...(row.readAt ? { readAt: row.readAt.toISOString() } : {}),
    mine: row.senderUserId === viewerId,
  };
}

async function conversationView(
  conversation: typeof directConversations.$inferSelect,
  viewerId: number,
): Promise<DirectConversationView> {
  const viewerIsClient = conversation.clientId === viewerId;
  const [client, provider, lastMessage, unread] = await Promise.all([
    storage.getUserById(conversation.clientId),
    storage.getMasterById(conversation.providerId),
    db.select().from(directMessages)
      .where(eq(directMessages.conversationId, conversation.id))
      .orderBy(desc(directMessages.createdAt), desc(directMessages.id))
      .limit(1)
      .then((rows) => rows[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(directMessages)
      .where(and(
        eq(directMessages.conversationId, conversation.id),
        isNull(directMessages.readAt),
        ne(directMessages.senderUserId, viewerId),
      ))
      .then((rows) => Number(rows[0]?.count ?? 0)),
  ]);

  return {
    id: conversation.id,
    providerId: conversation.providerId,
    counterpartName: viewerIsClient
      ? (provider?.name ?? "Исполнитель")
      : (client?.name ?? "Клиент"),
    ...(viewerIsClient && provider?.avatar ? { counterpartAvatar: provider.avatar } : {}),
    lastMessage: lastMessage?.text ?? "",
    ...(lastMessage ? { lastMessageAt: lastMessage.createdAt.toISOString() } : {}),
    unreadCount: unread,
  };
}

export async function registerDirectChatRoutes(app: Express) {
  await ensureDirectChatTables();

  app.get("/api/direct-chats", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const rows = await db.select().from(directConversations)
      .where(or(
        eq(directConversations.clientId, user.id),
        eq(directConversations.providerUserId, user.id),
      ))
      .orderBy(desc(directConversations.updatedAt), desc(directConversations.id));

    res.json(await Promise.all(rows.map((row) => conversationView(row, user.id))));
  });

  app.get("/api/direct-chats/unread-count", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const conversations = await db.select({ id: directConversations.id })
      .from(directConversations)
      .where(or(
        eq(directConversations.clientId, user.id),
        eq(directConversations.providerUserId, user.id),
      ));
    const ids = conversations.map((row) => row.id);
    if (ids.length === 0) return res.json({ count: 0 });

    const [row] = await db.select({ count: sql<number>`count(*)::int` })
      .from(directMessages)
      .where(and(
        inArray(directMessages.conversationId, ids),
        isNull(directMessages.readAt),
        ne(directMessages.senderUserId, user.id),
      ));

    res.json({ count: Number(row?.count ?? 0) });
  });

  app.post("/api/providers/:providerId/direct-chat", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите, чтобы написать исполнителю" });
    if (user.role !== "client") {
      return res.status(403).json({ message: "Прямой чат с исполнителем доступен клиентам" });
    }

    const providerId = Number(req.params.providerId);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({ message: "Некорректный исполнитель" });
    }

    const [provider, visible, providerUserId] = await Promise.all([
      storage.getMasterById(providerId),
      isProviderVisible(providerId),
      getProviderOwnerUserId(providerId),
    ]);
    if (!provider || !visible) return res.status(404).json({ message: "Исполнитель не найден" });
    if (!providerUserId) {
      return res.status(409).json({ message: "Этот исполнитель пока не подключил чат GOVZA" });
    }

    const [conversation] = await db.insert(directConversations).values({
      clientId: user.id,
      providerId,
      providerUserId,
    }).onConflictDoUpdate({
      target: [directConversations.clientId, directConversations.providerId],
      set: { providerUserId },
    }).returning();

    res.status(201).json(await conversationView(conversation, user.id));
  });

  app.get("/api/direct-chats/:id/messages", async (req, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: "Некорректный диалог" });
    }

    const access = await conversationAccess(req, conversationId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { user, conversation } = access;

    await db.update(directMessages)
      .set({ readAt: new Date() })
      .where(and(
        eq(directMessages.conversationId, conversationId),
        isNull(directMessages.readAt),
        ne(directMessages.senderUserId, user.id),
      ));

    const [rows, client, provider] = await Promise.all([
      db.select().from(directMessages)
        .where(eq(directMessages.conversationId, conversationId))
        .orderBy(asc(directMessages.createdAt), asc(directMessages.id)),
      storage.getUserById(conversation.clientId),
      storage.getMasterById(conversation.providerId),
    ]);

    res.json(await Promise.all(rows.map((row) => messageView(
      row,
      user.id,
      client?.name ?? "Клиент",
      provider?.name ?? "Исполнитель",
      conversation.clientId,
    ))));
  });

  app.post("/api/direct-chats/:id/messages", async (req, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: "Некорректный диалог" });
    }

    const access = await conversationAccess(req, conversationId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const parsed = sendDirectMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const { user, conversation } = access;
    const [message] = await db.insert(directMessages).values({
      conversationId,
      senderUserId: user.id,
      text: parsed.data.text,
    }).returning();

    await db.update(directConversations)
      .set({ updatedAt: new Date() })
      .where(eq(directConversations.id, conversationId));

    const [client, provider] = await Promise.all([
      storage.getUserById(conversation.clientId),
      storage.getMasterById(conversation.providerId),
    ]);

    const view = await messageView(
      message,
      user.id,
      client?.name ?? "Клиент",
      provider?.name ?? "Исполнитель",
      conversation.clientId,
    );

    const senderIsClient = user.id === conversation.clientId;
    const recipientUserId = senderIsClient ? conversation.providerUserId : conversation.clientId;
    const recipient = await storage.getUserById(recipientUserId);
    const targetUrl = senderIsClient
      ? recipient?.role === "organization"
        ? `/organization/messages/${conversation.id}`
        : `/master/messages/${conversation.id}`
      : `/messages/${conversation.id}`;

    void sendPushToUser(recipientUserId, {
      title: senderIsClient
        ? `Сообщение от ${client?.name ?? "клиента"}`
        : `Сообщение от ${provider?.name ?? "исполнителя"}`,
      body: parsed.data.text.length > 120
        ? `${parsed.data.text.slice(0, 117)}…`
        : parsed.data.text,
      url: targetUrl,
      tag: `direct-chat-${conversation.id}`,
    });

    res.status(201).json(view);
  });
}
