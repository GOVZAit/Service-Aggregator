import { z } from "zod";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers, persistedOrders } from "./schema";

export const orderReviews = pgTable("order_reviews", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => persistedOrders.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  masterId: integer("master_id").notNull(),
  rating: integer("rating").notNull(),
  quality: integer("quality").notNull(),
  punctuality: integer("punctuality").notNull(),
  priceMatch: integer("price_match").notNull(),
  courtesy: integer("courtesy").notNull(),
  comment: text("comment"),
  providerReply: text("provider_reply"),
  providerReplyAt: timestamp("provider_reply_at", { withTimezone: true }),
  moderationStatus: text("moderation_status").$type<"visible" | "hidden">().default("visible").notNull(),
  moderationNote: text("moderation_note"),
  moderatedBy: integer("moderated_by").references(() => authUsers.id, { onDelete: "set null" }),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("order_reviews_order_unique").on(table.orderId),
  index("order_reviews_master_id_idx").on(table.masterId),
  index("order_reviews_client_id_idx").on(table.clientId),
]);

const score = z.number().int().min(1).max(5);

export const createOrderReviewSchema = z.object({
  rating: score,
  quality: score,
  punctuality: score,
  priceMatch: score,
  courtesy: score,
  comment: z.string().trim().max(2000, "Отзыв слишком длинный").optional(),
}).strict();

export type CreateOrderReviewInput = z.infer<typeof createOrderReviewSchema>;

export const providerReviewReplySchema = z.object({
  text: z.string().trim().min(2, "Ответ слишком короткий").max(2000, "Ответ слишком длинный"),
}).strict();

export type ProviderReviewReplyInput = z.infer<typeof providerReviewReplySchema>;

export interface OrderReviewView {
  id: number;
  orderId: number;
  masterId: number;
  clientName: string;
  service: string;
  rating: number;
  quality: number;
  punctuality: number;
  priceMatch: number;
  courtesy: number;
  comment: string;
  providerReply?: string;
  providerReplyAt?: string;
  createdAt: string;
  verifiedOrder: true;
}

export interface MasterReviewSummary {
  count: number;
  average: number;
  quality: number;
  punctuality: number;
  priceMatch: number;
  courtesy: number;
  reviews: OrderReviewView[];
}
