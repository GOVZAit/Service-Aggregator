import { z } from "zod";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";

export const directConversations = pgTable("direct_conversations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  providerId: integer("provider_id").notNull(),
  providerUserId: integer("provider_user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("direct_conversations_client_provider_unique").on(table.clientId, table.providerId),
  index("direct_conversations_client_idx").on(table.clientId),
  index("direct_conversations_provider_user_idx").on(table.providerUserId),
  index("direct_conversations_updated_idx").on(table.updatedAt),
]);

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => directConversations.id, { onDelete: "cascade" }),
  senderUserId: integer("sender_user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (table) => [
  index("direct_messages_conversation_idx").on(table.conversationId),
  index("direct_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
]);

export const sendDirectMessageSchema = z.object({
  text: z.string().trim().min(1, "Введите сообщение").max(2000, "Сообщение слишком длинное"),
}).strict();

export interface DirectMessageView {
  id: number;
  conversationId: number;
  senderName: string;
  text: string;
  createdAt: string;
  readAt?: string;
  mine: boolean;
}

export interface DirectConversationView {
  id: number;
  providerId: number;
  counterpartName: string;
  counterpartAvatar?: string;
  lastMessage: string;
  lastMessageAt?: string;
  unreadCount: number;
}
