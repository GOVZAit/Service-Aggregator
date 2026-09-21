import { z } from "zod";
import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const categoryRecords = pgTable("category_records", {
  categoryId: integer("category_id").primaryKey(),
  name: text("name").notNull(),
  iconName: text("icon_name").notNull(),
  emoji: text("emoji").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("category_records_name_unique").on(table.name),
]);

export const categoryPayloadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  iconName: z.enum(["Wrench", "Zap", "Sparkles", "Hammer", "Palette", "Car", "Package", "BookOpen"]),
  emoji: z.string().trim().min(1).max(16),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Цвет должен быть в формате #RRGGBB"),
}).strict();

export type CategoryPayload = z.infer<typeof categoryPayloadSchema>;
