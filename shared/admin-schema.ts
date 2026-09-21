import { z } from "zod";
import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";

export type ProviderVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export const providerVerifications = pgTable("provider_verifications", {
  providerId: integer("provider_id").primaryKey(),
  status: text("status").$type<ProviderVerificationStatus>().default("unverified").notNull(),
  note: text("note"),
  updatedBy: integer("updated_by").references(() => authUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => authUsers.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("admin_audit_log_created_at_idx").on(table.createdAt),
  index("admin_audit_log_entity_idx").on(table.entityType, table.entityId),
]);

export const adminVerificationPatchSchema = z.object({
  status: z.enum(["unverified", "pending", "verified", "rejected"]),
  note: z.string().trim().max(1000).optional(),
}).strict();

export const adminVisibilityPatchSchema = z.object({
  visible: z.boolean(),
}).strict();

export const adminProviderCreateSchema = z.object({
  providerType: z.enum(["master", "organization"]),
  organizationKind: z.enum([
    "service_company", "medical", "education", "auto_service",
    "beauty", "delivery", "public_service", "other",
  ]).optional(),
  data: z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(10).max(2000).optional(),
    phone: z.string().trim().max(30).optional(),
    city: z.string().trim().max(80).optional(),
    categoryIds: z.array(z.number().int().positive()).min(1).max(8),
    companyName: z.string().trim().max(120).optional(),
    price: z.string().trim().max(60).optional(),
  }).strict(),
}).strict();
