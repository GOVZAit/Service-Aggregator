import { z } from "zod";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";

export type ModerationReportTarget = "provider" | "review";
export type ModerationReportStatus = "open" | "resolved" | "dismissed";
export type ModerationReportReason = "spam" | "abuse" | "misleading" | "privacy" | "other";

export const moderationReports = pgTable("moderation_reports", {
  id: serial("id").primaryKey(),
  reporterUserId: integer("reporter_user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  targetType: text("target_type").$type<ModerationReportTarget>().notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").$type<ModerationReportReason>().notNull(),
  details: text("details"),
  status: text("status").$type<ModerationReportStatus>().default("open").notNull(),
  resolutionNote: text("resolution_note"),
  resolvedBy: integer("resolved_by").references(() => authUsers.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("moderation_reports_status_idx").on(table.status),
  index("moderation_reports_target_idx").on(table.targetType, table.targetId),
  index("moderation_reports_reporter_idx").on(table.reporterUserId),
]);

export const createModerationReportSchema = z.object({
  targetType: z.enum(["provider", "review"]),
  targetId: z.number().int().positive(),
  reason: z.enum(["spam", "abuse", "misleading", "privacy", "other"]),
  details: z.string().trim().max(2000, "Комментарий слишком длинный").optional(),
}).strict();

export const adminReportResolutionSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  note: z.string().trim().max(2000, "Комментарий слишком длинный").optional(),
}).strict();

export const adminReviewModerationSchema = z.object({
  status: z.enum(["visible", "hidden"]),
  note: z.string().trim().max(2000, "Комментарий слишком длинный").optional(),
}).strict();

export type CreateModerationReportInput = z.infer<typeof createModerationReportSchema>;
