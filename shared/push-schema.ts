import { z } from "zod";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";

export interface StoredPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type NotificationType =
  | "request"
  | "order"
  | "message"
  | "review"
  | "verification"
  | "system";

export const notificationTypes: NotificationType[] = [
  "request",
  "order",
  "message",
  "review",
  "verification",
  "system",
];

export const notificationTypeLabels: Record<NotificationType, string> = {
  request: "Заявки и отклики",
  order: "Заказы и статусы",
  message: "Сообщения",
  review: "Отзывы",
  verification: "Верификация",
  system: "Системные",
};

export interface NotificationPreferences {
  enabledTypes: NotificationType[];
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  timezone: string;
}

export interface InAppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export const notificationPreferencesSchema = z.object({
  enabledTypes: z.array(z.enum([
    "request",
    "order",
    "message",
    "review",
    "verification",
    "system",
  ])).max(6),
  quietHoursEnabled: z.boolean(),
  quietStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietEnd: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().trim().min(1).max(100),
}).strict();

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  subscription: jsonb("subscription").$type<StoredPushSubscription>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
]);

export const inAppNotifications = pgTable("in_app_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  type: text("type").$type<NotificationType>().notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  tag: text("tag"),
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("in_app_notifications_user_created_idx").on(table.userId, table.createdAt),
  index("in_app_notifications_user_read_idx").on(table.userId, table.readAt),
]);

export const pushPreferences = pgTable("push_preferences", {
  userId: integer("user_id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  enabledTypes: jsonb("enabled_types").$type<NotificationType[]>().default(notificationTypes).notNull(),
  quietHoursEnabled: integer("quiet_hours_enabled").default(0).notNull(),
  quietStart: text("quiet_start").default("22:00").notNull(),
  quietEnd: text("quiet_end").default("08:00").notNull(),
  timezone: text("timezone").default("Europe/Moscow").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
