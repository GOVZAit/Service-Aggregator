import { z } from "zod";
import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export type AutoPartsSupplierType = "store" | "supplier" | "dismantler";
export type AutoPartsCondition = "new" | "used" | "mixed";
export type AutoPartsSalesType = "retail" | "wholesale" | "both";
export type AutoPartsDataSource = "manual" | "import";

export interface AutoPartsSupplierData {
  name?: string;
  supplierType?: AutoPartsSupplierType;
  partsCondition?: AutoPartsCondition;
  salesType?: AutoPartsSalesType;
  city?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  description?: string;
  brands?: string[];
  partGroups?: string[];
  delivery?: boolean;
  pickup?: boolean;
  verified?: boolean;
  lat?: number;
  lng?: number;
}

export const autoPartsSuppliers = pgTable("auto_parts_suppliers", {
  id: serial("id").primaryKey(),
  dataSource: text("data_source").$type<AutoPartsDataSource>().default("manual").notNull(),
  sourceName: text("source_name"),
  sourceExternalId: text("source_external_id"),
  sourceUrl: text("source_url"),
  importedData: jsonb("imported_data").$type<AutoPartsSupplierData>().default({}).notNull(),
  manualOverrides: jsonb("manual_overrides").$type<AutoPartsSupplierData>().default({}).notNull(),
  isVisible: integer("is_visible").default(1).notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("auto_parts_suppliers_source_external_unique").on(table.sourceName, table.sourceExternalId),
]);

const optionalUrl = z.string().url().max(1000).optional();

export const autoPartsSupplierPatchSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  supplierType: z.enum(["store", "supplier", "dismantler"]).optional(),
  partsCondition: z.enum(["new", "used", "mixed"]).optional(),
  salesType: z.enum(["retail", "wholesale", "both"]).optional(),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(250).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  website: optionalUrl,
  description: z.string().trim().max(2000).optional(),
  brands: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  partGroups: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  delivery: z.boolean().optional(),
  pickup: z.boolean().optional(),
  verified: z.boolean().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}).strict();

export const manualAutoPartsSupplierCreateSchema = autoPartsSupplierPatchSchema.extend({
  name: z.string().trim().min(2).max(140),
  supplierType: z.enum(["store", "supplier", "dismantler"]),
  partsCondition: z.enum(["new", "used", "mixed"]),
  salesType: z.enum(["retail", "wholesale", "both"]).default("retail"),
}).strict();

export const autoPartsSupplierImportSchema = z.object({
  sourceName: z.string().trim().min(2).max(80),
  sourceExternalId: z.string().trim().min(1).max(200),
  sourceUrl: z.string().url().max(1000).optional(),
  data: manualAutoPartsSupplierCreateSchema,
}).strict();

export type ManualAutoPartsSupplierCreateInput = z.infer<typeof manualAutoPartsSupplierCreateSchema>;
export type AutoPartsSupplierPatch = z.infer<typeof autoPartsSupplierPatchSchema>;
export type AutoPartsSupplierImportInput = z.infer<typeof autoPartsSupplierImportSchema>;

export interface AutoPartsSupplierView extends Required<Pick<AutoPartsSupplierData,
  "name" | "supplierType" | "partsCondition" | "salesType">> {
  id: number;
  city?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  description?: string;
  brands: string[];
  partGroups: string[];
  delivery: boolean;
  pickup: boolean;
  verified: boolean;
  lat?: number;
  lng?: number;
  dataSource: AutoPartsDataSource;
  visible: boolean;
}
