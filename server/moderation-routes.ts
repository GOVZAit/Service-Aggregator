import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { orderReviews } from "@shared/order-review-schema";
import {
  createModerationReportSchema,
  moderationReports,
} from "@shared/moderation-schema";

export async function ensureModerationTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_reports (
      id serial PRIMARY KEY,
      reporter_user_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      target_type text NOT NULL,
      target_id integer NOT NULL,
      reason text NOT NULL,
      details text,
      status text NOT NULL DEFAULT 'open',
      resolution_note text,
      resolved_by integer REFERENCES auth_users(id) ON DELETE SET NULL,
      resolved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS moderation_reports_status_idx
      ON moderation_reports(status);
    CREATE INDEX IF NOT EXISTS moderation_reports_target_idx
      ON moderation_reports(target_type, target_id);
    CREATE INDEX IF NOT EXISTS moderation_reports_reporter_idx
      ON moderation_reports(reporter_user_id);
  `);
}

async function authenticatedUser(req: Express.Request) {
  if (!req.session.userId || req.session.sessionVersion === undefined) return undefined;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.sessionVersion !== req.session.sessionVersion) return undefined;
  return user;
}

export async function registerModerationRoutes(app: Express) {
  app.post("/api/moderation/reports", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Войдите, чтобы отправить жалобу" });

    const parsed = createModerationReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const { targetType, targetId, reason, details } = parsed.data;

    if (targetType === "provider") {
      const provider = await storage.getMasterById(targetId);
      if (!provider) return res.status(404).json({ message: "Профиль не найден" });
    } else {
      const [review] = await db.select({ id: orderReviews.id })
        .from(orderReviews)
        .where(eq(orderReviews.id, targetId))
        .limit(1);
      if (!review) return res.status(404).json({ message: "Отзыв не найден" });
    }

    const [existing] = await db.select({ id: moderationReports.id })
      .from(moderationReports)
      .where(and(
        eq(moderationReports.reporterUserId, user.id),
        eq(moderationReports.targetType, targetType),
        eq(moderationReports.targetId, targetId),
        eq(moderationReports.status, "open"),
      ))
      .limit(1);

    if (existing) {
      return res.status(409).json({ message: "Ваша жалоба уже находится на рассмотрении" });
    }

    const [report] = await db.insert(moderationReports).values({
      reporterUserId: user.id,
      targetType,
      targetId,
      reason,
      details: details || null,
    }).returning();

    res.status(201).json({
      id: report.id,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    });
  });
}
