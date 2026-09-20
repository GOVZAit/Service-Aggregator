import { z } from "zod";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";

export type ProviderType = "master" | "organization";
export type OrganizationKind =
  | "service_company"
  | "medical"
  | "education"
  | "auto_service"
  | "beauty"
  | "delivery"
  | "public_service"
  | "other";
export type ProviderDataSource = "manual" | "import";

export const organizationKindLabels: Record<OrganizationKind, string> = {
  service_company: "Сервисная компания",
  medical: "Медицина",
  education: "Образование",
  auto_service: "Автосервис",
  beauty: "Красота и уход",
  delivery: "Доставка и логистика",
  public_service: "Организация / служба",
  other: "Другое",
};

export interface ProviderProfileData {
  name?: string;
  description?: string;
  phone?: string;
  city?: string;
  categoryIds?: number[];
  avatar?: string;
  price?: string;
  services?: Array<{ name: string; price: string }>;
  portfolio?: string[];
  companyName?: string;
  callMode?: "always" | "schedule" | "online_only" | "disabled";
  workingHours?: { from: string; to: string };
  isOnline?: boolean;
  hasCertificate?: boolean;
  executorType?: "private" | "self_employed" | "company";
  showPortfolio?: boolean;
  showReviews?: boolean;
  showPrices?: boolean;
  showCertificates?: boolean;
  certificates?: Array<{ id: number; title: string; issuer?: string; year?: string; image?: string }>;
  district?: string;
  lat?: number;
  lng?: number;
}

export const providerProfiles = pgTable("provider_profiles", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").references(() => authUsers.id, { onDelete: "set null" }),
  providerType: text("provider_type").$type<ProviderType>().notNull(),
  organizationKind: text("organization_kind").$type<OrganizationKind>(),
  dataSource: text("data_source").$type<ProviderDataSource>().default("manual").notNull(),
  sourceName: text("source_name"),
  sourceExternalId: text("source_external_id"),
  sourceUrl: text("source_url"),
  importedData: jsonb("imported_data").$type<ProviderProfileData>().default({}).notNull(),
  manualOverrides: jsonb("manual_overrides").$type<ProviderProfileData>().default({}).notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("provider_profiles_owner_user_unique").on(table.ownerUserId),
  uniqueIndex("provider_profiles_source_external_unique").on(table.sourceName, table.sourceExternalId),
  index("provider_profiles_type_idx").on(table.providerType),
]);

export const providerVisibility = pgTable("provider_visibility", {
  providerId: integer("provider_id").primaryKey(),
  isVisible: integer("is_visible").default(1).notNull(),
  reason: text("reason"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const providerActivity = pgTable("provider_activity", {
  userId: integer("user_id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

const categoryIdsSchema = z.array(z.number().int().positive()).min(1, "Выберите хотя бы одну категорию").max(8);

export const providerProfilePatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(80).optional(),
  categoryIds: categoryIdsSchema.optional(),
  avatar: z.string().max(1_000_000).optional(),
  price: z.string().trim().max(60).optional(),
  companyName: z.string().trim().max(120).optional(),
  companyName: z.string().trim().max(120).optional(),
  services: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    price: z.string().trim().min(1).max(60),
  }).strict()).max(50).optional(),
  portfolio: z.array(z.string().max(1_000_000)).max(24).optional(),
  callMode: z.enum(["always", "schedule", "online_only", "disabled"]).optional(),
  workingHours: z.object({
    from: z.string().regex(/^\d{2}:\d{2}$/),
    to: z.string().regex(/^\d{2}:\d{2}$/),
  }).strict().optional(),
  isOnline: z.boolean().optional(),
  hasCertificate: z.boolean().optional(),
  executorType: z.enum(["private", "self_employed", "company"]).optional(),
  showPortfolio: z.boolean().optional(),
  showReviews: z.boolean().optional(),
  showPrices: z.boolean().optional(),
  showCertificates: z.boolean().optional(),
  organizationKind: z.enum([
    "service_company", "medical", "education", "auto_service",
    "beauty", "delivery", "public_service", "other",
  ]).optional(),
}).strict();

export const providerImportSchema = z.object({
  sourceName: z.string().trim().min(2).max(80),
  sourceExternalId: z.string().trim().min(1).max(200),
  sourceUrl: z.string().url().max(1000).optional(),
  providerType: z.enum(["master", "organization"]),
  organizationKind: z.enum([
    "service_company", "medical", "education", "auto_service",
    "beauty", "delivery", "public_service", "other",
  ]).optional(),
  data: providerProfilePatchSchema.omit({ organizationKind: true }).extend({
    name: z.string().trim().min(2).max(120),
    categoryIds: categoryIdsSchema,
  }),
}).strict();

export type ProviderProfilePatch = z.infer<typeof providerProfilePatchSchema>;
export type ProviderImportInput = z.infer<typeof providerImportSchema>;
