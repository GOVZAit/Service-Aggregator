import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { notificationPreferencesSchema } from "@shared/push-schema";
import {
  getNotificationPreferences,
  getPushPublicKey,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removePushSubscription,
  saveNotificationPreferences,
  storePushSubscription,
  unreadNotificationCount,
} from "./push-service";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4000),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(10).max(1000),
    auth: z.string().min(5).max(500),
  }).strict(),
}).strict();

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

export async function registerPushRoutes(app: Express) {
  app.get("/api/push/config", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    res.json({
      publicKey: await getPushPublicKey(),
      supported: true,
    });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Некорректная push-подписка" });
    await storePushSubscription(user.id, parsed.data);
    res.status(201).json({ ok: true });
  });

  app.delete("/api/push/subscribe", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
    if (!endpoint) return res.status(400).json({ message: "endpoint обязателен" });
    await removePushSubscription(user.id, endpoint);
    res.json({ ok: true });
  });

  app.get("/api/push/notifications", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const requested = Number(req.query.limit);
    const limit = Number.isInteger(requested) ? requested : 100;
    res.json(await listNotifications(user.id, limit));
  });

  app.get("/api/push/notifications/unread-count", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    res.json({ count: await unreadNotificationCount(user.id) });
  });

  app.post("/api/push/notifications/:id/read", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Некорректный id уведомления" });
    }

    const notification = await markNotificationRead(user.id, id);
    if (!notification) return res.status(404).json({ message: "Уведомление не найдено" });
    res.json(notification);
  });

  app.post("/api/push/notifications/read-all", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    await markAllNotificationsRead(user.id);
    res.json({ ok: true });
  });

  app.get("/api/push/preferences", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    res.json(await getNotificationPreferences(user.id));
  });

  app.put("/api/push/preferences", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const parsed = notificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    try {
      res.json(await saveNotificationPreferences(user.id, parsed.data));
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Не удалось сохранить настройки",
      });
    }
  });
}
