import { z } from "zod";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";
import { autoPartsSuppliers } from "./auto-parts-schema";

export type AutoPartInventoryPreference = "stock_only" | "stock_or_order" | "order_only";
export type AutoPartRequestTarget = "all" | "store" | "dismantler";
export type AutoPartRequestStatus = "open" | "closed";
export type AutoPartOfferAvailability = "in_stock" | "order" | "unavailable";
export type AutoPartOfferCondition = "new" | "used";

export const autoPartRequests = pgTable("auto_part_requests", {
  id: serial("id").primaryKey(),
  clientUserId: integer("client_user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  target: text("target").$type<AutoPartRequestTarget>().notNull(),
  inventoryPreference: text("inventory_preference").$type<AutoPartInventoryPreference>().notNull(),
  partCondition: text("part_condition").$type<"any" | "new" | "used">().notNull(),
  city: text("city").notNull(),
  vehicleType: text("vehicle_type").$type<"passenger" | "truck" | "van" | "special">(),
  vehicleOrigin: text("vehicle_origin").$type<"foreign" | "domestic">(),
  brand: text("brand").notNull(),
  model: text("model"),
  year: text("year"),
  partName: text("part_name").notNull(),
  oem: text("oem"),
  notes: text("notes"),
  status: text("status").$type<AutoPartRequestStatus>().default("open").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("auto_part_requests_client_created_idx").on(table.clientUserId, table.createdAt),
  index("auto_part_requests_status_created_idx").on(table.status, table.createdAt),
]);

export const autoPartRequestRecipients = pgTable("auto_part_request_recipients", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => autoPartRequests.id, { onDelete: "cascade" }),
  supplierId: integer("supplier_id").notNull().references(() => autoPartsSuppliers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("auto_part_request_recipients_unique").on(table.requestId, table.supplierId),
  index("auto_part_request_recipients_supplier_idx").on(table.supplierId, table.createdAt),
]);

export const autoPartOffers = pgTable("auto_part_offers", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => autoPartRequests.id, { onDelete: "cascade" }),
  supplierId: integer("supplier_id").notNull().references(() => autoPartsSuppliers.id, { onDelete: "cascade" }),
  availability: text("availability").$type<AutoPartOfferAvailability>().notNull(),
  condition: text("condition").$type<AutoPartOfferCondition>(),
  priceRub: integer("price_rub"),
  etaText: text("eta_text"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("auto_part_offers_request_supplier_unique").on(table.requestId, table.supplierId),
  index("auto_part_offers_request_idx").on(table.requestId, table.updatedAt),
]);

export const createAutoPartRequestSchema = z.object({
  target: z.enum(["all", "store", "dismantler"]).default("all"),
  inventoryPreference: z.enum(["stock_only", "stock_or_order", "order_only"]),
  partCondition: z.enum(["any", "new", "used"]).default("any"),
  city: z.string().trim().min(2).max(80),
  vehicleType: z.enum(["passenger", "truck", "van", "special"]).optional(),
  vehicleOrigin: z.enum(["foreign", "domestic"]).optional(),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().max(80).optional(),
  year: z.string().trim().regex(/^\d{4}$/).optional(),
  partName: z.string().trim().min(2).max(160),
  oem: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const submitAutoPartOfferSchema = z.object({
  supplierId: z.number().int().positive(),
  availability: z.enum(["in_stock", "order", "unavailable"]),
  condition: z.enum(["new", "used"]).optional(),
  priceRub: z.number().int().min(0).max(100_000_000).optional(),
  etaText: z.string().trim().max(120).optional(),
  comment: z.string().trim().max(1000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.availability !== "unavailable" && value.priceRub === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["priceRub"], message: "Укажите цену" });
  }
  if (value.availability !== "unavailable" && !value.condition) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["condition"], message: "Укажите состояние" });
  }
});

export const autoPartsOwnerLinkSchema = z.object({
  ownerUserId: z.number().int().positive().nullable(),
}).strict();

export type CreateAutoPartRequestInput = z.infer<typeof createAutoPartRequestSchema>;
export type SubmitAutoPartOfferInput = z.infer<typeof submitAutoPartOfferSchema>;

export interface AutoPartOfferView {
  id: number;
  supplierId: number;
  supplierName: string;
  supplierType: "store" | "supplier" | "dismantler";
  availability: AutoPartOfferAvailability;
  condition?: AutoPartOfferCondition;
  priceRub?: number;
  etaText?: string;
  comment?: string;
  updatedAt: string;
}

export interface AutoPartRequestView {
  id: number;
  target: AutoPartRequestTarget;
  inventoryPreference: AutoPartInventoryPreference;
  partCondition: "any" | "new" | "used";
  city: string;
  vehicleType?: "passenger" | "truck" | "van" | "special";
  vehicleOrigin?: "foreign" | "domestic";
  brand: string;
  model?: string;
  year?: string;
  partName: string;
  oem?: string;
  notes?: string;
  status: AutoPartRequestStatus;
  recipientCount: number;
  offerCount: number;
  offers?: AutoPartOfferView[];
  createdAt: string;
}
