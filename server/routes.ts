import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { categories, registerSchema, loginSchema, masterSettingsSchema, clientProfileSchema, createOrderSchema, updateOrderStatusSchema } from "@shared/schema";

function normalizeIdentifier(value: string) {
  if (value.includes("@")) return value.trim().toLowerCase();
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return digits;
}

function startAuthenticatedSession(req: Express.Request, userId: number) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = userId;
      req.session.save((saveError) => saveError ? reject(saveError) : resolve());
    });
  });
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth ────────────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.issues[0].message });
    }
    const { name, identifier: rawIdentifier, password, role } = result.data;
    const isEmail = rawIdentifier.includes("@");
    const identifier = normalizeIdentifier(rawIdentifier);
    if (isEmail ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) : identifier.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ message: isEmail ? "Введите корректный email" : "Введите корректный номер телефона" });
    }

    const existing = await storage.getUserByIdentifier(identifier);
    if (existing) {
      return res.status(409).json({ message: "Этот телефон или email уже зарегистрирован" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      name,
      ...(isEmail ? { email: identifier } : { phone: identifier }),
      passwordHash,
      role: role ?? 'client',
    });

    await startAuthenticatedSession(req, user.id);
    const { passwordHash: _, ...publicUser } = user;
    res.status(201).json({ user: publicUser });
  });

  app.post("/api/auth/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.issues[0].message });
    }
    const { identifier: rawIdentifier, password } = result.data;
    const identifier = normalizeIdentifier(rawIdentifier);

    const user = await storage.getUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ message: "Неверный телефон, email или пароль" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Неверный телефон, email или пароль" });
    }

    await startAuthenticatedSession(req, user.id);
    const { passwordHash: _, ...publicUser } = user;
    res.json({ user: publicUser });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    const { passwordHash: _, ...publicUser } = user;
    res.json({ user: publicUser });
  });

  app.patch("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Не авторизован" });
    const result = clientProfileSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });
    const user = await storage.updateUser(req.session.userId, result.data);
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    const { passwordHash: _, ...publicUser } = user;
    res.json({ user: publicUser });
  });

  // ── Categories ──────────────────────────────────────────────────────────────

  app.get("/api/categories", async (_req, res) => {
    res.json(categories);
  });

  // ── Masters ─────────────────────────────────────────────────────────────────

  app.get("/api/masters", async (req, res) => {
    const { categoryId, search } = req.query;
    if (search && typeof search === "string") {
      return res.json(await storage.searchMasters(search));
    }
    if (categoryId) {
      return res.json(await storage.getMastersByCategory(Number(categoryId)));
    }
    res.json(await storage.getMasters());
  });

  app.get("/api/masters/:id", async (req, res) => {
    const master = await storage.getMasterById(Number(req.params.id));
    if (!master) return res.status(404).json({ error: "Master not found" });
    res.json(master);
  });

  app.patch("/api/masters/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user || user.role !== "master") {
      return res.status(403).json({ message: "Доступно только исполнителям" });
    }
    // A master may only edit their own profile
    if (user.masterId !== Number(req.params.id)) {
      return res.status(403).json({ message: "Можно изменять только свой профиль" });
    }
    const result = masterSettingsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.issues[0].message });
    }
    const updated = await storage.updateMaster(Number(req.params.id), result.data);
    if (!updated) return res.status(404).json({ error: "Master not found" });
    res.json(updated);
  });

  // ── Service Requests ────────────────────────────────────────────────────────

  app.get("/api/requests", async (_req, res) => {
    res.json(await storage.getRequests());
  });

  app.get("/api/requests/:id", async (req, res) => {
    const request = await storage.getRequestById(Number(req.params.id));
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json(request);
  });

  app.post("/api/requests", async (req, res) => {
    const { insertRequestSchema } = await import("@shared/schema");
    const result = insertRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.issues[0].message });
    }
    const { userName = 'Клиент', userAvatar = '' } = req.body;
    const request = await storage.createRequest({ ...result.data, userName, userAvatar });
    res.status(201).json(request);
  });

  // ── Orders ──────────────────────────────────────────────────────────────────

  app.get("/api/orders", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Не авторизован" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    const orders = await storage.getOrders(
      user.role === "client" ? { clientId: user.id } : { masterId: user.masterId ?? -1 },
    );
    if (user.role === "master") {
      const enriched = await Promise.all(orders.map(async (order) => {
        const client = order.clientId ? await storage.getUserById(order.clientId) : undefined;
        return {
          ...order,
          clientName: client?.name ?? "Клиент",
          clientContact: client?.phone ?? client?.email ?? "",
        };
      }));
      return res.json(enriched);
    }
    res.json(orders);
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Войдите, чтобы оформить заказ" });
    const user = await storage.getUserById(req.session.userId);
    if (!user || user.role !== "client") return res.status(403).json({ message: "Заказ может оформить только клиент" });
    const result = createOrderSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });
    const master = await storage.getMasterById(result.data.masterId);
    if (!master) return res.status(404).json({ message: "Мастер не найден" });
    const service = master.services.find((item) => item.name === result.data.service);
    if (!service) return res.status(400).json({ message: "Выберите услугу этого мастера" });
    const order = await storage.createOrder({
      title: service.name,
      masterId: master.id,
      clientId: user.id,
      status: "pending",
      date: result.data.scheduledAt,
      price: service.price,
      address: result.data.address,
      comment: result.data.comment,
    });
    res.status(201).json(order);
  });

  app.get("/api/orders/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Не авторизован" });
    const user = await storage.getUserById(req.session.userId);
    const order = await storage.getOrderById(Number(req.params.id));
    if (!order) return res.status(404).json({ error: "Order not found" });
    const canRead = user?.role === "client"
      ? order.clientId === user.id
      : user?.role === "master" && order.masterId === user.masterId;
    if (!canRead) {
      return res.status(403).json({ message: "Нет доступа к этому заказу" });
    }
    res.json(order);
  });

  app.patch("/api/orders/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Не авторизован" });
    const user = await storage.getUserById(req.session.userId);
    if (!user || user.role !== "master" || !user.masterId) {
      return res.status(403).json({ message: "Доступно только исполнителю" });
    }
    const order = await storage.getOrderById(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    if (order.masterId !== user.masterId) return res.status(403).json({ message: "Это не ваш заказ" });
    const result = updateOrderStatusSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });
    const allowed =
      (order.status === "pending" && ["in_progress", "rejected"].includes(result.data.status)) ||
      (order.status === "in_progress" && result.data.status === "completed");
    if (!allowed) return res.status(409).json({ message: "Недопустимое изменение статуса" });
    res.json(await storage.updateOrder(order.id, result.data));
  });

  // ── Messages ─────────────────────────────────────────────────────────────────

  app.get("/api/messages/:masterId", async (req, res) => {
    res.json(await storage.getMessages(Number(req.params.masterId)));
  });

  app.post("/api/messages/:masterId", async (req, res) => {
    const { text, sender } = req.body;
    if (!text || !sender) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const message = {
      id: Date.now(),
      text,
      sender,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
    res.json(await storage.addMessage(Number(req.params.masterId), message));
  });

  return httpServer;
}
