import type { Express } from "express";
import { storage } from "./storage";
import { sendPushToUser } from "./push-service";
import { listOwnedAutoPartsSuppliers } from "./auto-parts-service";
import {
  createAutoPartRequestSchema,
  submitAutoPartOfferSchema,
} from "@shared/auto-parts-request-schema";
import {
  closeAutoPartRequest,
  createAutoPartRequest,
  getAutoPartRequestForClient,
  listClientAutoPartRequests,
  listStoreAutoPartRequests,
  submitStoreAutoPartOffer,
} from "./auto-parts-request-service";

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

export async function registerAutoPartsRequestRoutes(app: Express) {
  app.post("/api/auto-parts/requests", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите, чтобы запросить запчасть" });
    if (user.role !== "client") return res.status(403).json({ message: "Запрос запчасти доступен клиентскому аккаунту" });

    const parsed = createAutoPartRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const result = await createAutoPartRequest(user.id, parsed.data);

    const ownerIds = [...new Set(
      result.matchedSuppliers
        .map((supplier) => supplier.ownerUserId)
        .filter((id): id is number => typeof id === "number" && id > 0),
    )];

    await Promise.all(ownerIds.map((ownerUserId) =>
      sendPushToUser(ownerUserId, {
        title: "Новый запрос на запчасть",
        body: \`\${parsed.data.brand}\${parsed.data.model ? \` \${parsed.data.model}\` : ""}: \${parsed.data.partName}\`,
        url: "/organization/parts-requests",
        tag: \`auto-parts-request-\${result.request.id}\`,
        type: "request",
        data: { requestId: result.request.id },
      }).catch(() => undefined)
    ));

    res.status(201).json(result.request);
  });

  app.get("/api/auto-parts/requests", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "client") return res.status(403).json({ message: "Недоступно" });
    res.json(await listClientAutoPartRequests(user.id));
  });

  app.get("/api/auto-parts/requests/:id", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "client") return res.status(403).json({ message: "Недоступно" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });

    const request = await getAutoPartRequestForClient(user.id, id);
    if (!request) return res.status(404).json({ message: "Запрос не найден" });
    res.json(request);
  });

  app.post("/api/auto-parts/requests/:id/close", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "client") return res.status(403).json({ message: "Недоступно" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });

    const updated = await closeAutoPartRequest(user.id, id);
    if (!updated) return res.status(404).json({ message: "Запрос не найден" });
    res.json({ status: "closed" });
  });

  app.get("/api/auto-parts/store/profile", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "organization") {
      return res.status(403).json({ message: "Недоступно" });
    }
    res.json(await listOwnedAutoPartsSuppliers(user.id));
  });

  app.get("/api/auto-parts/store/requests", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "organization") {
      return res.status(403).json({ message: "Входящие запросы доступны аккаунтам организаций" });
    }
    res.json(await listStoreAutoPartRequests(user.id));
  });

  app.post("/api/auto-parts/store/requests/:id/offer", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "organization") {
      return res.status(403).json({ message: "Отвечать могут только привязанные автомагазины и авторазборы" });
    }

    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Некорректный id" });
    }

    const parsed = submitAutoPartOfferSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const result = await submitStoreAutoPartOffer(user.id, requestId, parsed.data);
    if ("error" in result) {
      if (result.error === "supplier") return res.status(403).json({ message: "Карточка магазина не привязана к вашему аккаунту" });
      if (result.error === "recipient") return res.status(403).json({ message: "Этот запрос не был направлен вашему магазину" });
      if (result.error === "request") return res.status(409).json({ message: "Запрос закрыт или недоступен" });
      if (result.error === "inventory") return res.status(400).json({ message: "Ответ не соответствует условию наличия в запросе" });
      if (result.error === "condition") return res.status(400).json({ message: "Состояние запчасти не соответствует запросу" });
    }

    await sendPushToUser(result.clientUserId, {
      title: "Новое предложение по запчасти",
      body: \`\${result.supplierName} ответил на ваш запрос\`,
      url: \`/auto-parts/requests/\${requestId}\`,
      tag: \`auto-parts-offer-\${requestId}-\${parsed.data.supplierId}\`,
      type: "request",
      data: { requestId, supplierId: parsed.data.supplierId },
    }).catch(() => undefined);

    res.json(result.offer);
  });
}
