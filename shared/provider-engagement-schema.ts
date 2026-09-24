import { isCalendarDate } from "./service-time";
import { z } from "zod";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";
import { serviceRequests } from "./request-schema";

export type AvailabilityStatus = "available" | "busy" | "off";
export type InvitationStatus = "pending" | "responded" | "declined";

export const providerAvailability = pgTable("provider_availability", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  date: text("date").notNull(),
  status: text("status").$type<AvailabilityStatus>().notNull(),
  fromTime: text("from_time"),
  toTime: text("to_time"),
  note: text("note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("provider_availability_provider_date_unique").on(table.providerId, table.date),
  index("provider_availability_provider_date_idx").on(table.providerId, table.date),
]);

export const requestInvitations = pgTable("request_invitations", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }),
  masterId: integer("master_id").notNull(),
  clientId: integer("client_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  status: text("status").$type<InvitationStatus>().default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("request_invitations_request_master_unique").on(table.requestId, table.masterId),
  index("request_invitations_master_status_idx").on(table.masterId, table.status),
  index("request_invitations_client_id_idx").on(table.clientId),
]);

const isoDateSchema = z.string().refine(isCalendarDate, "Укажите существующую дату в формате YYYY-MM-DD");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время должно быть в формате HH:MM");

export const availabilityDaySchema = z.object({
  date: isoDateSchema,
  status: z.enum(["available", "busy", "off"]),
  fromTime: timeSchema.optional(),
  toTime: timeSchema.optional(),
  note: z.string().trim().max(160).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.status === "available") {
    if (!value.fromTime || !value.toTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Для доступного дня укажите время начала и окончания",
      });
      return;
    }
    if (value.fromTime >= value.toTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Время окончания должно быть позже времени начала",
      });
    }
  }
});

export const availabilityBulkSchema = z.object({
  days: z.array(availabilityDaySchema).min(1).max(31),
}).strict();

export const createInvitationSchema = z.object({
  requestId: z.number().int().positive(),
}).strict();

export const createInvitedRequestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(5).max(2000),
  budget: z.string().trim().min(1).max(80),
  location: z.string().trim().min(3).max(250),
}).strict();

export interface AvailabilityDayView {
  date: string;
  status: AvailabilityStatus;
  fromTime?: string;
  toTime?: string;
  note?: string;
}

export interface InvitationView {
  id: number;
  requestId: number;
  masterId: number;
  status: InvitationStatus;
  title: string;
  category: string;
  description: string;
  budget: string;
  location: string;
  postedAt: string;
  clientName: string;
  createdAt: string;
}
