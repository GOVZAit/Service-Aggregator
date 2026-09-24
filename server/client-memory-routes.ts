import type { Express, Request, Response, RequestHandler } from "express";
import type { PoolClient } from "pg";
import { pool } from "./db";
import { storage } from "./storage";
import { isProviderVisible } from "./provider-service";
import { RECENT_MASTER_DAYS, RECENT_MASTER_LIMIT, type RecentMasterView, type TodayAvailability } from "@shared/client-memory";
import { SERVICE_TIME_ZONE, isAvailableToday, serviceNow } from "@shared/service-time";
import type { AuthUser, Master } from "@shared/schema";

export async function ensureClientMemoryTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_master_views (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      master_id integer NOT NULL,
      viewed_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS user_master_views_user_master_unique ON user_master_views(user_id, master_id);
    CREATE INDEX IF NOT EXISTS user_master_views_user_date_idx ON user_master_views(user_id, viewed_at);
    CREATE INDEX IF NOT EXISTS provider_availability_date_status_idx ON provider_availability(date, status);
  `);
}

/** Serialize a user's view/clear operations so concurrent tabs cannot exceed the cap. */
async function withMemoryLock<T>(userId: number, action: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1::integer, $2::integer)", [75231, userId]);
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordMasterView(userId: number, masterId: number) {
  await withMemoryLock(userId, async (client) => {
    await client.query(`INSERT INTO user_master_views(user_id, master_id, viewed_at) VALUES ($1, $2, clock_timestamp())
      ON CONFLICT (user_id, master_id) DO UPDATE SET viewed_at = clock_timestamp()`, [userId, masterId]);
    await client.query(`DELETE FROM user_master_views WHERE user_id = $1 AND (
      viewed_at < now() - ($2::integer * interval '1 day') OR id IN (
        SELECT id FROM user_master_views WHERE user_id = $1 ORDER BY viewed_at DESC, id DESC OFFSET $3
      ))`, [userId, RECENT_MASTER_DAYS, RECENT_MASTER_LIMIT]);
  });
}

export async function clearMasterViews(userId: number) {
  await withMemoryLock(userId, (client) => client.query("DELETE FROM user_master_views WHERE user_id = $1", [userId]));
}

const handle = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { void fn(req, res).catch(next); };

// Explicit dependencies make HTTP authorization tests possible without touching real profiles.
interface MemoryDependencies {
  getUser(id: number): Promise<AuthUser | undefined>;
  getMaster(id: number): Promise<Master | undefined>;
  listMasters(): Promise<Master[]>;
  isVisible(id: number): Promise<boolean>;
}

export function registerClientMemoryRoutes(app: Express, dependencies: MemoryDependencies = {
  getUser: (id) => storage.getUserById(id), getMaster: (id) => storage.getMasterById(id),
  listMasters: () => storage.getMasters(), isVisible: isProviderVisible,
}) {
  const clientUser = async (req: Request, res: Response) => {
    const user = req.session.userId ? await dependencies.getUser(req.session.userId) : undefined;
    if (!user || user.sessionVersion !== req.session.sessionVersion) {
      res.status(401).json({ message: "Войдите в аккаунт" });
      return undefined;
    }
    if (user.role !== "client") {
      res.status(403).json({ message: "История просмотров доступна клиентам" });
      return undefined;
    }
    return user;
  };

  app.use(["/api/recent-masters", "/api/favorites"], (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });

  app.get("/api/recent-masters", handle(async (req, res) => {
    const user = await clientUser(req, res);
    if (!user) return;
    const rows = await pool.query<{ masterId: number; viewedAt: Date }>(`
      SELECT master_id AS "masterId", viewed_at AS "viewedAt" FROM user_master_views
      WHERE user_id = $1 AND viewed_at >= now() - ($2::integer * interval '1 day')
      ORDER BY viewed_at DESC, id DESC LIMIT $3`, [user.id, RECENT_MASTER_DAYS, RECENT_MASTER_LIMIT]);
    const visible = new Map((await dependencies.listMasters()).filter((master) => master.isVisible !== false).map((master) => [master.id, master]));
    const result: RecentMasterView[] = rows.rows.flatMap((row) => {
      const master = visible.get(row.masterId);
      return master ? [{ master, viewedAt: row.viewedAt.toISOString() }] : [];
    });
    res.json(result);
  }));

  app.post("/api/recent-masters/:id", handle(async (req, res) => {
    const user = await clientUser(req, res);
    if (!user) return;
    const masterId = Number(req.params.id);
    if (!Number.isSafeInteger(masterId) || masterId <= 0 || masterId > 2147483647) {
      return res.status(400).json({ message: "Некорректный мастер" });
    }
    if (!(await dependencies.getMaster(masterId)) || !(await dependencies.isVisible(masterId))) {
      return res.status(404).json({ message: "Мастер недоступен" });
    }
    await recordMasterView(user.id, masterId);
    res.status(204).end();
  }));

  app.delete("/api/recent-masters", handle(async (req, res) => {
    const user = await clientUser(req, res);
    if (!user) return;
    await clearMasterViews(user.id);
    res.status(204).end();
  }));

  // A single batch read, rather than a separate schedule request for each catalog card.
  app.get("/api/catalog/availability-today", handle(async (_req, res) => {
    const now = new Date();
    const clock = serviceNow(now);
    const rows = await pool.query<{ providerId: number; date: string; status: string; fromTime: string; toTime: string }>(`
      SELECT provider_id AS "providerId", date, status, from_time AS "fromTime", to_time AS "toTime"
      FROM provider_availability WHERE date = $1 AND status = 'available' AND to_time > $2`, [clock.date, clock.time]);
    const visibleIds = new Set((await dependencies.listMasters()).filter((master) => master.isVisible !== false).map((master) => master.id));
    const providers: TodayAvailability["providers"] = {};
    for (const row of rows.rows) {
      if (visibleIds.has(row.providerId) && isAvailableToday(row, now)) {
        providers[row.providerId] = { date: row.date, status: row.status, fromTime: row.fromTime, toTime: row.toTime };
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ date: clock.date, timeZone: SERVICE_TIME_ZONE, generatedAt: now.toISOString(), providers } satisfies TodayAvailability);
  }));
}
