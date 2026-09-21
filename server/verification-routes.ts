import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { authenticatedAdmin, logAdminAction } from "./admin-routes";
import { getProviderOwnerUserId, updatePersistentProvider } from "./provider-service";
import {
  getVerificationState,
  listVerificationQueue,
  reviewVerification,
  submitVerification,
} from "./verification-service";
import {
  providerVerificationReviewSchema,
  providerVerificationSubmitSchema,
} from "@shared/verification-schema";
import { authUsers } from "@shared/schema";
import { sendPushToUser } from "./push-service";

async function authenticatedProvider(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  if ((user.role !== "master" && user.role !== "organization") || !user.masterId) return undefined;
  return user;
}

async function notifyAdmins(providerName: string, providerId: number) {
  const admins = await db.select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.role, "admin"));

  for (const admin of admins) {
    void sendPushToUser(admin.id, {
      title: "Новая заявка на верификацию",
      body: providerName,
      url: "/admin",
      tag: `verification-${providerId}`,
    });
  }
}

export async function registerVerificationRoutes(app: Express) {
  app.get("/api/providers/me/verification", async (req, res) => {
    const user = await authenticatedProvider(req);
    if (!user || !user.masterId) {
      return res.status(401).json({ message: "Доступно авторизованному исполнителю" });
    }
    res.json(await getVerificationState(user.masterId));
  });

  app.post("/api/providers/me/verification", async (req, res) => {
    const user = await authenticatedProvider(req);
    if (!user || !user.masterId) {
      return res.status(401).json({ message: "Доступно авторизованному исполнителю" });
    }

    const parsed = providerVerificationSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const provider = await storage.getMasterById(user.masterId);
    if (!provider) return res.status(404).json({ message: "Профиль не найден" });

    const state = await submitVerification(user.masterId, user.id, parsed.data);
    await updatePersistentProvider(user.masterId, { verified: false });
    await notifyAdmins(provider.name, user.masterId);

    res.json(state);
  });

  app.get("/api/admin/verifications", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    res.json(await listVerificationQueue());
  });

  app.get("/api/admin/verifications/:providerId", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const providerId = Number(req.params.providerId);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({ message: "Некорректный id" });
    }

    const state = await getVerificationState(providerId);
    if (!state.submission) return res.status(404).json({ message: "Заявка на верификацию не найдена" });
    res.json(state);
  });

  app.post("/api/admin/verifications/:providerId/review", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const providerId = Number(req.params.providerId);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({ message: "Некорректный id" });
    }

    const parsed = providerVerificationReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const state = await reviewVerification(
      providerId,
      admin.id,
      parsed.data.status,
      parsed.data.note,
    );
    if (!state) return res.status(404).json({ message: "Документы для проверки не найдены" });

    await updatePersistentProvider(providerId, { verified: parsed.data.status === "verified" });
    await logAdminAction(admin.id, "provider.verification_review", "provider", providerId, {
      status: parsed.data.status,
      note: parsed.data.note ?? "",
    });

    const ownerUserId = await getProviderOwnerUserId(providerId);
    if (ownerUserId) {
      const verified = parsed.data.status === "verified";
      void sendPushToUser(ownerUserId, {
        title: verified ? "Профиль GOVZA подтверждён" : "Верификация требует изменений",
        body: verified
          ? "Статус «Проверен» активирован."
          : (parsed.data.note || "Откройте профиль и проверьте комментарий администратора."),
        url: "/master/profile",
        tag: `verification-result-${providerId}`,
      });
    }

    res.json(state);
  });
}
