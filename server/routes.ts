import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { categories, registerSchema, loginSchema } from "@shared/schema";

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
    const { name, phone, password, role } = result.data;

    const existing = await storage.getUserByPhone(phone);
    if (existing) {
      return res.status(409).json({ message: "Этот номер уже зарегистрирован" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({ name, phone, passwordHash, role: role ?? 'client' });

    req.session.userId = user.id;
    const { passwordHash: _, ...publicUser } = user;
    res.status(201).json({ user: publicUser });
  });

  app.post("/api/auth/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.issues[0].message });
    }
    const { phone, password } = result.data;

    const user = await storage.getUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ message: "Неверный номер или пароль" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Неверный номер или пароль" });
    }

    req.session.userId = user.id;
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

  app.get("/api/orders", async (_req, res) => {
    res.json(await storage.getOrders());
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrderById(Number(req.params.id));
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
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
