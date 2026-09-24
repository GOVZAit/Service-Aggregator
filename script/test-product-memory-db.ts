/** Disposable PostgreSQL integration tests. Never accepts a production DB URL. */
import assert from "node:assert/strict";
import pg from "pg";
import express from "express";
import { createServer } from "node:http";
import { once } from "node:events";
import { serviceNow, upcomingDates, formatBookingSlot, isAvailableToday } from "../shared/service-time";
import type { AuthUser, Master, Order } from "../shared/schema";

const url = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/missing");
if (process.env.NODE_ENV !== "test" || !["localhost", "127.0.0.1", "::1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Use NODE_ENV=test and a localhost PostgreSQL database whose name ends in _test.");
}
const admin = new pg.Pool({ connectionString: url.toString() });
const schema = `govza_product_${process.pid}_${Date.now()}`;
await admin.query(`CREATE SCHEMA "${schema}"`);
url.searchParams.set("options", `-c search_path=${schema}`);
process.env.DATABASE_URL = url.toString();
const { pool } = await import("../server/db");
const { storage } = await import("../server/storage");
const { ensureClientMemoryTables, registerClientMemoryRoutes, recordMasterView, clearMasterViews } = await import("../server/client-memory-routes");
const { registerProviderEngagementRoutes } = await import("../server/provider-engagement-routes");
const { registerRoutes } = await import("../server/routes");
const server = createServer();
let cases = 0;
async function test(name: string, action: () => Promise<void>) { await action(); cases++; console.log(`✓ ${name}`); }
try {
  await pool.query(`
    CREATE TABLE auth_users(id integer PRIMARY KEY, master_id integer);
    INSERT INTO auth_users(id) VALUES (1), (2), (3);
    CREATE TABLE user_favorites(id serial PRIMARY KEY, user_id integer REFERENCES auth_users(id) ON DELETE CASCADE, master_id integer, created_at timestamptz DEFAULT now(), UNIQUE(user_id,master_id));
    CREATE TABLE provider_availability(id serial PRIMARY KEY, provider_id integer, date text, status text, from_time text, to_time text, note text, updated_at timestamptz DEFAULT now(), UNIQUE(provider_id,date));
    CREATE TABLE provider_visibility(provider_id integer PRIMARY KEY, is_visible integer DEFAULT 1, reason text, updated_at timestamptz DEFAULT now());
    CREATE TABLE provider_profiles(id integer PRIMARY KEY, owner_user_id integer);
  `);
  await ensureClientMemoryTables();
  await ensureClientMemoryTables(); // Deployment/restart is idempotent.
  const profiles = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `Тестовый мастер ${i + 1}`, category: "Сантехника", categoryId: 1,
    services: [{ name: "Установка смесителя", price: "1 500 ₽" }], city: "Грозный", isVisible: i !== 44, reviews: 0, rating: 0, description: "", price: "1 500 ₽" } as Master));
  const users = new Map([1, 2, 3].map((id) => [id, { id, sessionVersion: 1, role: id === 3 ? "master" : "client", masterId: id === 3 ? 1 : undefined, name: `Тест ${id}` } as AuthUser]));
  // Only this isolated test process uses fake profiles/accounts. Persistence is real PostgreSQL.
  storage.getUserById = async (id) => users.get(id);
  storage.getMasterById = async (id) => profiles.find((master) => master.id === id);
  storage.getMasters = async () => profiles.filter((master) => master.isVisible !== false);
  let createdOrders = 0;
  storage.createOrder = async (input) => ({ ...input, id: ++createdOrders } as Order);
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => {
    req.session = { userId: Number(req.header("X-Test-User")) || undefined, sessionVersion: Number(req.header("X-Test-Version") ?? "1") } as any;
    next();
  });
  registerClientMemoryRoutes(app, { getUser: storage.getUserById, getMaster: storage.getMasterById, listMasters: storage.getMasters, isVisible: async (id) => id !== 45 });
  await registerProviderEngagementRoutes(app);
  await registerRoutes(server, app);
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => { console.error(error); res.status(500).json({ message: error.message }); });
  server.on("request", app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address() as import("node:net").AddressInfo;
  const request = (path: string, method = "GET", user?: number, body?: unknown, version = 1) => fetch(`http://127.0.0.1:${address.port}${path}`, {
    method, headers: { "Content-Type": "application/json", "X-Test-User": String(user ?? ""), "X-Test-Version": String(version) }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  await test("anonymous history forbidden", async () => { assert.equal((await request("/api/recent-masters")).status, 401); });
  await test("revoked session forbidden", async () => { assert.equal((await request("/api/recent-masters", "GET", 1, undefined, 2)).status, 401); });
  await test("provider cannot use client history", async () => { assert.equal((await request("/api/recent-masters", "GET", 3)).status, 403); });
  await test("invalid, removed and hidden profiles rejected", async () => {
    assert.equal((await request("/api/recent-masters/NaN", "POST", 1)).status, 400);
    assert.equal((await request("/api/recent-masters/2147483648", "POST", 1)).status, 400);
    assert.equal((await request("/api/recent-masters/999", "POST", 1)).status, 404);
    assert.equal((await request("/api/recent-masters/45", "POST", 1)).status, 404);
  });
  await test("view writes ignore supplied user identity", async () => {
    assert.equal((await request("/api/recent-masters/1", "POST", 1, { userId: 2 })).status, 204);
    assert.deepEqual(await (await request("/api/recent-masters", "GET", 2)).json(), []);
  });
  await test("repeat view upserts instead of duplicating", async () => {
    await recordMasterView(1, 2); await recordMasterView(1, 1);
    const rows = await (await request("/api/recent-masters", "GET", 1)).json();
    assert.deepEqual(rows.map((row: any) => row.master.id), [1, 2]);
  });
  await test("40 concurrent views capped at 30", async () => {
    await Promise.all(Array.from({ length: 40 }, (_, i) => recordMasterView(1, i + 1)));
    const count = await pool.query("SELECT count(*)::int AS n FROM user_master_views WHERE user_id=1"); assert.equal(count.rows[0].n, 30);
  });
  await test("clearing one account preserves another", async () => {
    await recordMasterView(2, 1); await clearMasterViews(1);
    assert.equal((await (await request("/api/recent-masters", "GET", 1)).json()).length, 0);
    assert.equal((await (await request("/api/recent-masters", "GET", 2)).json()).length, 1);
  });
  await test("history excludes old and newly hidden profiles", async () => {
    await recordMasterView(1, 1); await recordMasterView(1, 45);
    await pool.query("UPDATE user_master_views SET viewed_at=now()-interval '91 days' WHERE user_id=1 AND master_id=1");
    assert.deepEqual(await (await request("/api/recent-masters", "GET", 1)).json(), []);
    await recordMasterView(1, 2);
    assert.equal((await pool.query("SELECT count(*)::int n FROM user_master_views WHERE user_id=1 AND master_id=1")).rows[0].n, 0);
  });
  await test("private memory is not HTTP cached", async () => {
    assert.equal((await request("/api/recent-masters", "GET", 1)).headers.get("cache-control"), "private, no-store");
    assert.equal((await request("/api/favorites", "GET", 1)).headers.get("cache-control"), "private, no-store");
  });
  await test("favorites persist, deduplicate and isolate accounts", async () => {
    await Promise.all(Array.from({ length: 8 }, () => storage.addFavorite(1, 1)));
    assert.deepEqual(await storage.getFavoriteMasterIds(1), [1]); assert.deepEqual(await storage.getFavoriteMasterIds(2), []);
    await storage.addFavorite(2, 1); await storage.removeFavorite(1, 1);
    assert.deepEqual(await storage.getFavoriteMasterIds(1), []); assert.deepEqual(await storage.getFavoriteMasterIds(2), [1]);
  });
  const today = serviceNow().date;
  const tomorrow = upcomingDates(2)[1];
  await pool.query("INSERT INTO provider_availability(provider_id,date,status,from_time,to_time) VALUES (1,$1,'available','00:00','23:59'),(2,$1,'busy',NULL,NULL),(45,$1,'available','00:00','23:59'),(1,$2,'available','09:00','18:00')", [today, tomorrow]);
  await test("batch availability includes only visible unexpired confirmed windows", async () => {
    const payload = await (await request("/api/catalog/availability-today")).json();
    assert.equal(payload.date, today); assert.equal(payload.timeZone, "Europe/Moscow");
    assert.equal(!!payload.providers[1], isAvailableToday({ date: today, status: "available", fromTime: "00:00", toTime: "23:59" }));
    assert.equal(payload.providers[2], undefined); assert.equal(payload.providers[45], undefined);
  });
  await test("provider /me schedule route no longer shadowed", async () => {
    const response = await request(`/api/providers/me/availability?from=${today}&days=7`, "GET", 3);
    assert.equal(response.status, 200); assert.equal((await response.json()).length, 2);
    assert.equal((await request("/api/providers/me/availability?from=2026-02-30", "GET", 3)).status, 400);
  });
  await test("API search applies category AND service words", async () => {
    assert.equal((await (await request("/api/masters?categoryId=2&search=смесителя")).json()).length, 0);
    assert.equal((await (await request("/api/masters?categoryId=1&search=смесителя")).json()).length, 44);
  });
  const booking = { masterId: 1, service: "Установка смесителя", expectedPrice: "1 500 ₽", scheduledAt: formatBookingSlot(tomorrow, "12:00"), address: "Тестовая улица, 1" };
  await test("order authentication required", async () => { assert.equal((await request("/api/orders", "POST", undefined, booking)).status, 401); });
  await test("past/invalid dates rejected before order creation", async () => {
    assert.equal((await request("/api/orders", "POST", 1, { ...booking, scheduledAt: "01.01.2020, 12:00" })).status, 400);
    assert.equal((await request("/api/orders", "POST", 1, { ...booking, scheduledAt: "31.02.2027, 12:00" })).status, 400);
  });
  await test("out-of-window time and changed price require reconfirmation", async () => {
    assert.equal((await request("/api/orders", "POST", 1, { ...booking, scheduledAt: formatBookingSlot(tomorrow, "18:00") })).status, 409);
    assert.equal((await request("/api/orders", "POST", 1, { ...booking, expectedPrice: "500 ₽" })).status, 409);
    assert.equal(createdOrders, 0);
  });
  await test("valid repeat creates new pending order using current price", async () => {
    const response = await request("/api/orders", "POST", 1, booking);
    assert.equal(response.status, 201); const order = await response.json();
    assert.equal(order.price, "1 500 ₽"); assert.equal(order.status, "pending"); assert.equal(order.clientId, 1); assert.equal(createdOrders, 1);
  });
  await test("busy schedule cannot receive booking", async () => {
    await pool.query("UPDATE provider_availability SET status='busy' WHERE provider_id=1 AND date=$1", [tomorrow]);
    assert.equal((await request("/api/orders", "POST", 1, booking)).status, 409); assert.equal(createdOrders, 1);
  });
  await test("clearing history leaves favorites intact", async () => {
    assert.equal((await request("/api/recent-masters", "DELETE", 2)).status, 204);
    assert.deepEqual(await storage.getFavoriteMasterIds(2), [1]);
  });
  console.log(`\n${cases} PostgreSQL / HTTP integration checks passed.`);
} finally {
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end(); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.end();
}
