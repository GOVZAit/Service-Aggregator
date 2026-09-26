import type { Express } from "express";
import { pool } from "./db";
import { authenticatedAdmin } from "./admin-routes";
import { adminUserQuerySchema, type AdminUserView } from "@shared/admin-users";

/** Read only. Role changes, password hashes, tokens and session internals are not exposed. */
export function registerAdminUserRoutes(app: Express) {
  app.get("/api/admin/users", async (req, res) => {
    if (!await authenticatedAdmin(req, res)) return;
    const parsed = adminUserQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Некорректные параметры поиска" });
    const { q, role, page, pageSize } = parsed.data;
    // Escape LIKE wildcards so %, _ and backslash remain literal search text.
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const where = `($1::text = '' OR role = $1) AND ($2::text = '%%' OR name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2 OR id::text ILIKE $2)`;
    try {
      // One SQL statement gives the list and count the same MVCC snapshot.
      const result = await pool.query<{ items: AdminUserView[]; total: number }>(`
        WITH filtered AS (
          SELECT id, name, email, phone, role, created_at FROM auth_users WHERE ${where}
        ), paged AS (
          SELECT id, name, email, phone, role, created_at AS "createdAt"
          FROM filtered ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4
        )
        SELECT COALESCE((SELECT json_agg(paged) FROM paged), '[]'::json) AS items,
               (SELECT count(*)::int FROM filtered) AS total
      `, [role, pattern, pageSize, (page - 1) * pageSize]);
      res.json({ ...result.rows[0], page, pageSize });
    } catch {
      res.status(503).json({ message: "Не удалось загрузить пользователей. Повторите позже." });
    }
  });
}
