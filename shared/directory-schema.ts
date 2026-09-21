import { z } from "zod";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export type DirectoryKind = "doctor" | "city_service";

export const directoryRecords = pgTable("directory_records", {
  id: serial("id").primaryKey(),
  kind: text("kind").$type<DirectoryKind>().notNull(),
  externalId: text("external_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  isVisible: integer("is_visible").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("directory_records_kind_external_unique").on(table.kind, table.externalId),
  index("directory_records_kind_visible_idx").on(table.kind, table.isVisible),
]);

const doctorLocationSchema = z.object({
  clinic: z.string().trim().min(2).max(160),
  address: z.string().trim().min(2).max(250),
  city: z.string().trim().min(2).max(80),
  schedule: z.string().trim().min(2).max(160),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}).strict();

export const doctorDirectoryPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  specialty: z.string().trim().min(2).max(100),
  specialtyId: z.string().trim().min(2).max(80),
  locations: z.array(doctorLocationSchema).min(1).max(12),
  experienceYears: z.number().int().min(0).max(80),
  rating: z.number().min(0).max(5).default(0),
  reviews: z.number().int().min(0).default(0),
  price: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(2).max(40),
  acceptsChildren: z.boolean().optional(),
  homeVisits: z.boolean().optional(),
  avatar: z.string().max(1_000_000).default(""),
}).strict();

export const cityServiceDirectoryPayloadSchema = z.object({
  categoryId: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(160),
  subcategory: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(1).max(60),
  address: z.string().trim().max(300).default(""),
  hours: z.string().trim().max(160).default(""),
  website: z.string().url().max(1000).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(60).optional(),
  district: z.string().trim().max(120).default(""),
  isEmergency: z.boolean().optional(),
  importantNumber: z.boolean().optional(),
  description: z.string().trim().max(2000).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}).strict();

export const directoryVisibilitySchema = z.object({
  visible: z.boolean(),
}).strict();

export type DoctorDirectoryPayload = z.infer<typeof doctorDirectoryPayloadSchema>;
export type CityServiceDirectoryPayload = z.infer<typeof cityServiceDirectoryPayloadSchema>;
