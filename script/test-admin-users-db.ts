/** Real SQL, isolated localhost test schema. Never accepts production DB credentials. */
import assert from "node:assert/strict";
import pg from "pg";
import express from "express";
import { createServer } from "node:http";
import { once } from "node:events";
const url = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/missing");
if (process.env.NODE_ENV !== "test" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Use NODE_ENV=test with a localhost *_test database only.");
const admin = new pg.Pool({ connectionString: url.toString() });
const schema = `govza_admin_${process.pid}_${Date.now()}`;
await admin.query(`CREATE SCHEMA "${schema}"`); url.searchParams.set("options", `-c search_path=${schema}`); process.env.DATABASE_URL = url.toString();
const { pool } = await import("../server/db");
const { storage } = await import("../server/storage");
const { registerAdminUserRoutes } = await import("../server/admin-user-routes");
let count = 0; const server = createServer();
async function test(name: string, fn: () => Promise<void>) { await fn(); count++; console.log(`✓ ${name}`); }
try {
  await pool.query(`CREATE TABLE auth_users (id serial PRIMARY KEY, name text NOT NULL, email text, phone text, role text NOT NULL, created_at timestamptz DEFAULT now(), password text, session_version integer DEFAULT 1, secret_token text);
    INSERT INTO auth_users(name,email,phone,role,password,secret_token) VALUES ('Admin','admin@example.invalid',NULL,'admin','sensitive-hash','secret-reset-token'),('Alpha','alpha@example.invalid','111','client','hash','token'),('100% literal',NULL,NULL,'master','hash','token'),('Under_score',NULL,NULL,'organization','hash','token');`);
  // Auth accounts are controllable fixtures; directory records and SQL pagination use real Postgres.
  const users = new Map([[1, { id: 1, role: "admin", sessionVersion: 1 }], [2, { id: 2, role: "client", sessionVersion: 1 }]]);
  storage.getUserById = async id => users.get(id) as any;
  const app = express(); app.use((req, _res, next) => { req.session = { userId: Number(req.get("X-Test-User")) || undefined, sessionVersion: Number(req.get("X-Test-Version") || "1") } as any; next(); });
  registerAdminUserRoutes(app); server.on("request", app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const port = (server.address() as import("node:net").AddressInfo).port;
  const request = (query = "", id = 1, version = 1) => fetch(`http://127.0.0.1:${port}/api/admin/users${query}`, { headers: { "X-Test-User": String(id), "X-Test-Version": String(version) } });
  await test("user list denies anonymous and non-admin accounts", async () => { assert.equal((await request("", 0)).status, 401); assert.equal((await request("", 2)).status, 403); });
  await test("revoked sessions cannot list users", async () => assert.equal((await request("", 1, 0)).status, 401));
  await test("only whitelisted fields are serialized", async () => { const res = await request(); assert.equal(res.status, 200); assert.equal(res.headers.get("cache-control"), "no-store, private"); const body = await res.json(); assert.equal(body.total, 4); for (const row of body.items) assert.deepEqual(Object.keys(row).sort(), ["id", "name", "email", "phone", "role", "createdAt"].sort()); assert.ok(!JSON.stringify(body).includes("sensitive-hash")); });
  await test("literal wildcard search", async () => { for (const q of ["%", "_"]) { const data = await (await request(`?q=${encodeURIComponent(q)}`)).json(); assert.equal(data.total, 1); } });
  await test("SQL-like input is plain search text", async () => { const data = await (await request(`?q=${encodeURIComponent("' OR 1=1 --")}`)).json(); assert.equal(data.total, 0); });
  await test("role filter and pagination use matching totals", async () => { const filtered = await (await request("?role=client")).json(); assert.equal(filtered.total, 1); assert.equal(filtered.items[0].role, "client"); const first = await (await request("?pageSize=2&page=1")).json(); const second = await (await request("?pageSize=2&page=2")).json(); assert.equal(first.total, 4); assert.equal(second.total, 4); assert.equal(new Set([...first.items,...second.items].map(i => i.id)).size, 4); });
  await test("out-of-range page returns empty items and correct total", async () => { const result = await (await request("?page=50")).json(); assert.equal(result.total, 4); assert.deepEqual(result.items, []); });
  await test("bad pagination and unknown roles rejected", async () => { for (const q of ["?page=0", "?pageSize=500", "?role=root"]) assert.equal((await request(q)).status, 400); });
  await test("persisted role downgrade takes effect", async () => { users.set(1, { id: 1, role: "client", sessionVersion: 1 }); assert.equal((await request()).status, 403); });
  console.log(`${count} admin database checks passed.`);
} finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await pool.end(); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.end(); }
