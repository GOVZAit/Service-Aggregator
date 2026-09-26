import { z } from "zod";

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  role: z.enum(["", "client", "master", "organization", "admin"]).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export interface AdminUserView {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: "client" | "master" | "organization" | "admin";
  createdAt: string;
}
export interface AdminUsersPage {
  items: AdminUserView[];
  total: number;
  page: number;
  pageSize: number;
}

export const adminRoleLabels = {
  client: "Клиент", master: "Мастер", organization: "Организация", admin: "Администратор",
} as const;
