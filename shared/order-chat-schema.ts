import { z } from "zod";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { authUsers, persistedOrders } from "./schema";

export type OrderMessageRole = "client" | "master" | "system";

export const orderMessages = pgTable("order_messages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => persistedOrders.id, { onDelete: "cascade" }),
  senderUserId: integer("sender_user_id").references(() => authUsers.id, { onDelete: "set null" }),
  senderRole: text("sender_role").$type<OrderMessageRole>().notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (table) => [
  index("order_messages_order_id_idx").on(table.orderId),
  index("order_messages_order_created_idx").on(table.orderId, table.createdAt),
]);

export const sendOrderMessageSchema = z.object({
  text: z.string().trim().min(1, "Введите сообщение").max(2000, "Сообщение слишком длинное"),
}).strict();

export type SendOrderMessageInput = z.infer<typeof sendOrderMessageSchema>;

export interface OrderMessageView {
  id: number;
  orderId: number;
  senderRole: OrderMessageRole;
  senderName: string;
  text: string;
  createdAt: string;
  readAt?: string;
  mine: boolean;
}
