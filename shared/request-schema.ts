import { z } from "zod";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";

export type ServiceRequestStatus = "open" | "matched" | "cancelled";
export type RequestResponseStatus = "pending" | "selected" | "rejected";

export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  budget: text("budget").notNull(),
  location: text("location").notNull(),
  status: text("status").$type<ServiceRequestStatus>().default("open").notNull(),
  selectedMasterId: integer("selected_master_id"),
  selectedResponseId: integer("selected_response_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("service_requests_client_id_idx").on(table.clientId),
  index("service_requests_status_idx").on(table.status),
  index("service_requests_category_status_idx").on(table.category, table.status),
]);

export const requestResponses = pgTable("request_responses", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }),
  masterId: integer("master_id").notNull(),
  price: text("price").notNull(),
  message: text("message").notNull(),
  status: text("status").$type<RequestResponseStatus>().default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("request_responses_request_master_unique").on(table.requestId, table.masterId),
  index("request_responses_request_id_idx").on(table.requestId),
  index("request_responses_master_id_idx").on(table.masterId),
]);

export const createRequestResponseSchema = z.object({
  price: z.string().trim().min(1, "Укажите цену").max(40, "Цена слишком длинная"),
  message: z.string().trim().min(3, "Добавьте короткий комментарий").max(1000, "Комментарий слишком длинный"),
}).strict();

export type CreateRequestResponseInput = z.infer<typeof createRequestResponseSchema>;

export interface ServiceRequestView {
  id: number;
  title: string;
  category: string;
  description: string;
  budget: string;
  location: string;
  status: ServiceRequestStatus;
  postedAt: string;
  createdAt: string;
  responses: number;
  user: {
    name: string;
    avatar: string;
  };
  selectedMasterId?: number;
  selectedResponseId?: number;
  hasResponded?: boolean;
}

export interface RequestResponseView {
  id: number;
  requestId: number;
  masterId: number;
  masterName: string;
  avatar: string;
  price: string;
  text: string;
  rating: number;
  status: RequestResponseStatus;
  createdAt: string;
}
