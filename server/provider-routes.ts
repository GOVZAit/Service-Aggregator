import type { Express, Request } from "express";
import { categoryIdsExist } from "./category-service";
import { storage } from "./storage";
import {
  createManualProvider,
  importProvider,
  isProviderVisible,
  setProviderVisibility,
  updatePersistentProvider,
} from "./provider-service";
import {
  manualProviderCreateSchema,
  providerImportSchema,
  providerProfilePatchSchema,
} from "@shared/provider-schema";

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

function validImportKey(req: Request) {
  const configured = process.env.IMPORT_API_KEY;
  if (!configured) return false;
  const raw = req.headers["x-import-key"];
  const supplied = Array.isArray(raw) ? raw[0] : raw;
  return Boolean(supplied && supplied === configured);
}

export async function registerProviderRoutes(app: Express) {
  app.get("/api/providers/me", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Профиль исполнителя недоступен" });
    }
    const provider = await storage.getMasterById(user.masterId);
    if (!provider) return res.status(404).json({ message: "Профиль не найден" });
    res.json({
      provider,
      visible: await isProviderVisible(user.masterId),
    });
  });

  app.patch("/api/providers/me", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Редактирование доступно исполнителям" });
    }
    const parsed = providerProfilePatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    if (parsed.data.categoryIds && !categoryIdsExist(parsed.data.categoryIds)) {
      return res.status(400).json({ message: "Выбрана несуществующая категория" });
    }

    const provider = await updatePersistentProvider(user.masterId, parsed.data);
    if (!provider) {
      const fallback = await storage.updateMaster(user.masterId, parsed.data);
      if (!fallback) return res.status(404).json({ message: "Профиль не найден" });
      return res.json(fallback);
    }
    res.json(provider);
  });

  app.post("/api/providers/me/visibility", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if ((user.role !== "master" && user.role !== "organization") || !user.masterId) {
      return res.status(403).json({ message: "Недоступно" });
    }
    const visible = req.body?.visible;
    if (typeof visible !== "boolean") return res.status(400).json({ message: "visible должен быть boolean" });
    await setProviderVisibility(user.masterId, visible, "manual");
    res.json({ visible });
  });

  app.post("/api/internal/providers/manual", async (req, res) => {
    if (!validImportKey(req)) {
      return res.status(process.env.IMPORT_API_KEY ? 403 : 503).json({ message: "Internal API недоступен" });
    }
    const parsed = manualProviderCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (!categoryIdsExist(parsed.data.data.categoryIds)) {
      return res.status(400).json({ message: "Выбрана несуществующая категория" });
    }
    res.status(201).json(await createManualProvider(parsed.data));
  });

  app.post("/api/internal/providers/import", async (req, res) => {
    if (!validImportKey(req)) {
      return res.status(process.env.IMPORT_API_KEY ? 403 : 503).json({
        message: process.env.IMPORT_API_KEY
          ? "Неверный ключ импорта"
          : "IMPORT_API_KEY не настроен",
      });
    }
    const parsed = providerImportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (!categoryIdsExist(parsed.data.data.categoryIds)) {
      return res.status(400).json({ message: "Импорт содержит неизвестную категорию" });
    }
    const provider = await importProvider(parsed.data);
    res.status(201).json(provider);
  });

  app.patch("/api/internal/providers/:id", async (req, res) => {
    if (!validImportKey(req)) {
      return res.status(process.env.IMPORT_API_KEY ? 403 : 503).json({ message: "Импорт API недоступен" });
    }
    const id = Number(req.params.id);
    const parsed = providerProfilePatchSchema.safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (parsed.data.categoryIds && !categoryIdsExist(parsed.data.categoryIds)) {
      return res.status(400).json({ message: "Выбрана несуществующая категория" });
    }
    const provider = await updatePersistentProvider(id, parsed.data);
    if (!provider) return res.status(404).json({ message: "Профиль не найден" });
    res.json(provider);
  });
}
