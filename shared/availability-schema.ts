import { z } from "zod";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { providerProfiles } from "./provider-schema";

export const availabilityDayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type AvailabilityDayKey = typeof availabilityDayKeys[number];

export interface AvailabilityDayRule {
  enabled: boolean;
  from: string;
  to: string;
}

export type WeeklyAvailability = Record<AvailabilityDayKey, AvailabilityDayRule>;

export const providerAvailabilityRules = pgTable("provider_availability_rules", {
  providerId: integer("provider_id").primaryKey().references(() => providerProfiles.id, { onDelete: "cascade" }),
  weekly: jsonb("weekly").$type<WeeklyAvailability>().notNull(),
  slotMinutes: integer("slot_minutes").default(60).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const providerAvailabilityExceptions = pgTable("provider_availability_exceptions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providerProfiles.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  mode: text("mode").$type<"off" | "custom">().notNull(),
  from: text("from"),
  to: text("to"),
  note: text("note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("provider_availability_exceptions_provider_date_unique").on(table.providerId, table.date),
  index("provider_availability_exceptions_provider_idx").on(table.providerId),
]);

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Время должно быть в формате HH:MM");

const dayRuleSchema = z.object({
  enabled: z.boolean(),
  from: timeSchema,
  to: timeSchema,
}).strict().superRefine((value, ctx) => {
  if (value.enabled && value.from >= value.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["to"],
      message: "Время окончания должно быть позже начала",
    });
  }
});

export const weeklyAvailabilitySchema = z.object({
  mon: dayRuleSchema,
  tue: dayRuleSchema,
  wed: dayRuleSchema,
  thu: dayRuleSchema,
  fri: dayRuleSchema,
  sat: dayRuleSchema,
  sun: dayRuleSchema,
}).strict();

export const providerAvailabilityPatchSchema = z.object({
  weekly: weeklyAvailabilitySchema,
  slotMinutes: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
}).strict();

export const availabilityExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате YYYY-MM-DD"),
  mode: z.enum(["off", "custom"]),
  from: timeSchema.optional(),
  to: timeSchema.optional(),
  note: z.string().trim().max(250).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.mode === "custom") {
    if (!value.from || !value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "Для особого дня укажите время",
      });
    } else if (value.from >= value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "Время окончания должно быть позже начала",
      });
    }
  }
});

export type ProviderAvailabilityPatch = z.infer<typeof providerAvailabilityPatchSchema>;
export type AvailabilityExceptionInput = z.infer<typeof availabilityExceptionSchema>;
