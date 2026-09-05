import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { storage } from "./storage";
import { emailDeliveryConfigured, sendWelcomeEmail } from "./email";
import { categories, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, masterSettingsSchema, clientProfileSchema, createOrderSchema, updateOrderStatusSchema, lostFoundListingInputSchema, updateLostFoundListingSchema } from "@shared/schema";
import type { AuthUser } from "@shared/schema";
import { deliverPasswordReset, isPasswordResetDeliveryConfigured, passwordResetRateLimited } from "./password-reset";

function normalizeIdentifier(value: string) {
  if (value.includes("@")) return value.trim().toLowerCase();
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return digits;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
function startAuthenticatedSession(req: Express.Request, userId: number, sessionVersion: number) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = userId;
      req.session.sessionVersion = sessionVersion;
      req.session.save((saveError) => saveError ? reject(saveError) : resolve());
    });
  });
}

async function getAuthenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

function toPublicUser(user: Awaited<ReturnType<typeof storage.getUserById>> & {}) {
  const { passwordHash: _passwordHash, sessionVersion: _sessionVersion, ...publicUser } = user;
  return publicUser;
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function queuePasswordReset(user: AuthUser) {
  setImmediate(async () => {
    try {
      const rawToken = randomBytes(32).toString("base64url");
      const recipient = user.email ?? user.phone;
      if (!recipient) return;
      await storage.createPasswordReset(user.id, hashResetToken(rawToken), Date.now() + 10 * 60 * 1000);
      const delivered = await deliverPasswordReset(
        recipient,
        `/reset-password?token=${encodeURIComponent(rawToken)}`,
        Boolean(user.email),
      );
      if (!delivered) await storage.revokePasswordResets(user.id);
    } catch {
      await storage.revokePasswordResets(user.id);
      console.error("Password reset delivery job failed");
    }
  });
}

function queueWelcomeEmail(user: AuthUser) {
  if (!user.email) return;
  setImmediate(async () => {
    const delivered = await sendWelcomeEmail({ to: user.email!, login: user.email! });
    if (!delivered) {
      console.error("Welcome email was not delivered", { userId: user.id });
    }
  });
}

async function destroyUserSessions(req: Express.Request, userId: number) {
  const store = req.sessionStore;
  const allSessions = store.all?.bind(store);
  if (!allSessions) return;
  await new Promise<void>((resolve) => {
    allSessions((error, sessions) => {
      if (error || !sessions || Array.isArray(sessions)) return resolve();
      const entries = Object.entries(sessions);
      const matchingIds = entries
        .filter(([, session]) => (session as { userId?: number } | undefined)?.userId === userId)
        .map(([sessionId]) => sessionId);
      if (matchingIds.length === 0) return resolve();
      let remaining = matchingIds.length;
      matchingIds.forEach((sessionId) => store.destroy(sessionId, () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      }));
    });
  });
}

declare module "express-session" {
  interface SessionData {
    userId: number;
    sessionVersion: number;
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
    if (role === "master") {
      return res.status(403).json({
        message: "Регистрация исполнителей временно доступна только по подтверждённому приглашению",
      });
    }
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
    let user;
    try {
      user = await storage.createUser({
        name,
        ...(isEmail ? { email: identifier } : { phone: identifier }),
        passwordHash,
        role: role ?? 'client',
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        if (uniqueConstraint(error) === "auth_users_master_id_unique") {
          return res.status(409).json({ message: "Этот профиль мастера уже привязан к аккаунту" });
        }
        return res.status(409).json({ message: "Этот телефон или email уже зарегистрирован" });
      }
      throw error;
    }

    await startAuthenticatedSession(req, user.id, user.sessionVersion);
    const publicUser = toPublicUser(user);
    if (user.email && emailDeliveryConfigured) queueWelcomeEmail(user);
    const emailDelivery = !user.email
      ? "unavailable_for_phone"
      : emailDeliveryConfigured
        ? "queued"
        : "not_configured";
    res.status(201).json({ user: publicUser, emailDelivery });
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

    await startAuthenticatedSession(req, user.id, user.sessionVersion);
    const publicUser = toPublicUser(user);
    res.json({ user: publicUser });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });
    const identifier = normalizeIdentifier(result.data.identifier);
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (passwordResetRateLimited([`identifier:${identifier}`, `ip:${ip}`])) {
      return res.status(429).json({ message: "Слишком много запросов. Попробуйте позже." });
    }

    const isEmail = identifier.includes("@");
    const genericResponse = {
      message: "Если аккаунт существует, инструкция по восстановлению будет отправлена.",
      delivery: isPasswordResetDeliveryConfigured(isEmail) ? "available" as const : "not_configured" as const,
    };
    const user = await storage.getUserByIdentifier(identifier);
    if (user && isPasswordResetDeliveryConfigured(isEmail)) queuePasswordReset(user);
    res.json(genericResponse);
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });
    const user = await storage.consumePasswordReset(hashResetToken(result.data.token), Date.now());
    if (!user) return res.status(400).json({ message: "Ссылка недействительна или срок её действия истёк" });

    const passwordHash = await bcrypt.hash(result.data.password, 10);
    await storage.updateUserPassword(user.id, passwordHash);
    await storage.revokePasswordResets(user.id);
    await destroyUserSessions(req, user.id);
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    const publicUser = toPublicUser(user);
    res.json({ user: publicUser });
  });

  app.patch("/api/auth/me", async (req, res) => {
    const authenticatedUser = await getAuthenticatedUser(req);
    if (!authenticatedUser) return res.status(401).json({ message: "Не авторизован" });
    const result = clientProfileSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });
    const user = await storage.updateUser(authenticatedUser.id, result.data);
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    const publicUser = toPublicUser(user);
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
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "master") {
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
    const user = await getAuthenticatedUser(req);
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
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите, чтобы оформить заказ" });
    if (user.role !== "client") return res.status(403).json({ message: "Заказ может оформить только клиент" });
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
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
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
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "master" || !user.masterId) {
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

  // ── Lost & found ─────────────────────────────────────────────────────────────

  app.get("/api/lost-found", async (_req, res) => {
    res.json(await storage.getLostFoundListings());
  });

  app.get("/api/lost-found/:id", async (req, res) => {
    const listing = await storage.getLostFoundListingById(Number(req.params.id));
    if (!listing) return res.status(404).json({ message: "Объявление не найдено" });
    res.json(listing);
  });

  app.post("/api/lost-found", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите, чтобы опубликовать объявление" });
    if (user.role !== "client") return res.status(403).json({ message: "Публикация доступна в профиле клиента" });
    const result = lostFoundListingInputSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });
    res.status(201).json(await storage.createLostFoundListing(user.id, result.data));
  });

  app.patch("/api/lost-found/:id", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "client") return res.status(403).json({ message: "Редактирование доступно в профиле клиента" });
    const listing = await storage.getLostFoundListingById(Number(req.params.id));
    if (!listing) return res.status(404).json({ message: "Объявление не найдено" });
    if (listing.authorId !== user.id) return res.status(403).json({ message: "Можно изменять только своё объявление" });
    const result = updateLostFoundListingSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });
    res.json(await storage.updateLostFoundListing(listing.id, result.data));
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

function uniqueConstraint(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "constraint" in error
    ? String(error.constraint)
    : undefined;
}
