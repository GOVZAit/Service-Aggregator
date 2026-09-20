import type { Express } from "express";
import { asc, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import {
  createOrderReviewSchema,
  orderReviews,
  type MasterReviewSummary,
  type OrderReviewView,
} from "@shared/order-review-schema";

async function ensureOrderReviewTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_reviews (
      id serial PRIMARY KEY,
      order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      client_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      master_id integer NOT NULL,
      rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
      quality integer NOT NULL CHECK (quality BETWEEN 1 AND 5),
      punctuality integer NOT NULL CHECK (punctuality BETWEEN 1 AND 5),
      price_match integer NOT NULL CHECK (price_match BETWEEN 1 AND 5),
      courtesy integer NOT NULL CHECK (courtesy BETWEEN 1 AND 5),
      comment text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS order_reviews_order_unique ON order_reviews(order_id);
    CREATE INDEX IF NOT EXISTS order_reviews_master_id_idx ON order_reviews(master_id);
    CREATE INDEX IF NOT EXISTS order_reviews_client_id_idx ON order_reviews(client_id);
  `);
}

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

function publicClientName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "Клиент";
  return `${parts[0]} ${parts[1][0]}.`;
}

async function reviewView(row: typeof orderReviews.$inferSelect): Promise<OrderReviewView> {
  const client = await storage.getUserById(row.clientId);
  const order = await storage.getOrderById(row.orderId);
  return {
    id: row.id,
    orderId: row.orderId,
    masterId: row.masterId,
    clientName: publicClientName(client?.name ?? "Клиент"),
    service: order?.title ?? "Заказ",
    rating: row.rating,
    quality: row.quality,
    punctuality: row.punctuality,
    priceMatch: row.priceMatch,
    courtesy: row.courtesy,
    comment: row.comment ?? "",
    createdAt: row.createdAt.toISOString(),
    verifiedOrder: true,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export async function registerOrderReviewRoutes(app: Express) {
  await ensureOrderReviewTable();

  app.get("/api/order-reviews/mine", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });
    if (user.role !== "client") return res.json({ orderIds: [] });

    const rows = await db.select({ orderId: orderReviews.orderId })
      .from(orderReviews)
      .where(eq(orderReviews.clientId, user.id));
    res.json({ orderIds: rows.map((row) => row.orderId) });
  });

  app.get("/api/masters/:id/reviews", async (req, res) => {
    const masterId = Number(req.params.id);
    if (!Number.isInteger(masterId) || masterId <= 0) {
      return res.status(400).json({ message: "Некорректный мастер" });
    }

    const rows = await db.select().from(orderReviews)
      .where(eq(orderReviews.masterId, masterId))
      .orderBy(asc(orderReviews.createdAt));
    const reviews = await Promise.all(rows.map(reviewView));

    const summary: MasterReviewSummary = {
      count: reviews.length,
      average: average(reviews.map((review) => review.rating)),
      quality: average(reviews.map((review) => review.quality)),
      punctuality: average(reviews.map((review) => review.punctuality)),
      priceMatch: average(reviews.map((review) => review.priceMatch)),
      courtesy: average(reviews.map((review) => review.courtesy)),
      reviews: reviews.reverse(),
    };

    res.json(summary);
  });

  app.get("/api/orders/:id/review", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const orderId = Number(req.params.id);
    const order = await storage.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: "Заказ не найден" });

    const allowed = user.role === "client"
      ? order.clientId === user.id
      : Boolean(user.masterId && order.masterId === user.masterId);
    if (!allowed) return res.status(403).json({ message: "Нет доступа к отзыву" });

    const [review] = await db.select().from(orderReviews)
      .where(eq(orderReviews.orderId, orderId))
      .limit(1);
    if (!review) return res.json(null);

    res.json(await reviewView(review));
  });

  app.post("/api/orders/:id/review", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите, чтобы оставить отзыв" });
    if (user.role !== "client") {
      return res.status(403).json({ message: "Отзыв о мастере оставляет клиент" });
    }

    const orderId = Number(req.params.id);
    const order = await storage.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    if (order.clientId !== user.id) return res.status(403).json({ message: "Это не ваш заказ" });
    if (order.status !== "completed") {
      return res.status(409).json({ message: "Отзыв можно оставить только после завершения заказа" });
    }

    const parsed = createOrderReviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    try {
      const [review] = await db.insert(orderReviews).values({
        orderId,
        clientId: user.id,
        masterId: order.masterId,
        ...parsed.data,
        comment: parsed.data.comment || null,
      }).returning();

      res.status(201).json(await reviewView(review));
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return res.status(409).json({ message: "Вы уже оставили отзыв по этому заказу" });
      }
      throw error;
    }
  });
}
