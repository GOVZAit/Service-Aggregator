/** Pure access-control tests: no DB connection, no production requests. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import type { Request, Response } from "express";
import { authorizeAdmin } from "../server/admin-access";
import { adminUserQuerySchema } from "../shared/admin-users";
let cases = 0;
async function test(name: string, fn: () => unknown | Promise<unknown>) { await fn(); console.log(`✓ ${name}`); cases++; }
const user = { id: 1, role: "admin", sessionVersion: 4 };
async function run(options: { user?: typeof user | null; session?: object; method?: string; headers?: Record<string, string>; secure?: boolean; requireHttps?: boolean; fail?: boolean } = {}) {
  let code = 200, calls = 0; const headers: Record<string, string> = {};
  const values = { host: "govza.example", ...options.headers };
  const req = { method: options.method ?? "GET", session: options.session ?? { userId: 1, sessionVersion: 4 }, secure: options.secure ?? true, protocol: options.secure === false ? "http" : "https", get: (name: string) => values[name.toLowerCase() as keyof typeof values] } as unknown as Request;
  const res = { set: (name: string, value: string) => { headers[name] = value; }, vary: () => {}, status: (status: number) => { code = status; return res; }, json: () => {} } as unknown as Response;
  const authorized = await authorizeAdmin(req, res, async () => { calls++; if (options.fail) throw new Error("DB unavailable"); return options.user === null ? undefined : options.user ?? user; }, options.requireHttps ?? true);
  return { code, authorized, headers, calls };
}
await test("admin with current session allowed", async () => assert.equal((await run()).authorized?.id, 1));
await test("anonymous denied before user lookup", async () => { const r = await run({ session: {} }); assert.equal(r.code, 401); assert.equal(r.calls, 0); });
await test("client, master and organization denied", async () => { for (const role of ["client", "master", "organization"]) assert.equal((await run({ user: { ...user, role } })).code, 403); });
await test("missing and stale session versions denied", async () => { for (const session of [{ userId: 1 }, { userId: 1, sessionVersion: 3 }]) assert.equal((await run({ session })).code, 401); });
await test("deleted account denied", async () => assert.equal((await run({ user: null })).code, 401));
await test("role rechecked on every request", async () => { assert.equal((await run()).code, 200); assert.equal((await run({ user: { ...user, role: "client" } })).code, 403); });
await test("lookup failures fail closed", async () => assert.equal((await run({ fail: true })).code, 503));
await test("production HTTP rejected", async () => { const r = await run({ secure: false }); assert.equal(r.code, 403); assert.equal(r.calls, 0); });
await test("local test HTTP can be explicitly allowed", async () => assert.equal((await run({ secure: false, requireHttps: false })).code, 200));
await test("private responses never cached", async () => { for (const r of [await run(), await run({ session: {} })]) assert.equal(r.headers["Cache-Control"], "no-store, private"); });
await test("cross-site and sibling origins rejected", async () => { for (const site of ["cross-site", "same-site"]) assert.equal((await run({ headers: { "sec-fetch-site": site } })).code, 403); });
await test("same-origin JSON mutations allowed", async () => { for (const method of ["POST", "PATCH", "PUT", "DELETE"]) assert.equal((await run({ method, headers: { "x-govza-admin": "1", origin: "https://govza.example" } })).code, 200); });
await test("missing custom header rejected", async () => assert.equal((await run({ method: "POST", headers: { origin: "https://govza.example" } })).code, 403));
await test("cross-origin and null Origin rejected", async () => { for (const origin of ["https://evil.example", "https://govza.example.evil.example", "null", "http://govza.example"]) assert.equal((await run({ method: "POST", headers: { "x-govza-admin": "1", origin } })).code, 403); });
await test("missing source rejected", async () => assert.equal((await run({ method: "POST", headers: { "x-govza-admin": "1" } })).code, 403));
await test("Referer fallback allowed for same origin", async () => assert.equal((await run({ method: "POST", headers: { "x-govza-admin": "1", referer: "https://govza.example/admin" } })).code, 200));
await test("Fetch Metadata fallback supports same-origin clients", async () => assert.equal((await run({ method: "POST", headers: { "x-govza-admin": "1", "sec-fetch-site": "same-origin" } })).code, 200));
await test("user list limits, roles and repeated parameters validated", () => { for (const q of [{ page: "0" }, { pageSize: "51" }, { role: "root" }, { q: ["a", "b"] }, { q: "x".repeat(121) }, { extra: "password" }, { page: "1 OR 1=1" }]) assert.equal(adminUserQuerySchema.safeParse(q).success, false); assert.equal(adminUserQuerySchema.parse({}).pageSize, 20); });
await test("all registered admin routes use shared server authorization", () => {
  let endpoints = 0;
  for (const file of readdirSync("server").filter(f => f.endsWith("routes.ts"))) {
    const text = readFileSync(`server/${file}`, "utf8");
    for (const match of text.matchAll(/app\.(get|post|put|patch|delete)\("\/api\/admin\/[^\"]+", async \(req, res\) => \{([\s\S]*?)(?=\n  app\.|$)/g)) { assert.ok(match[2].includes("authenticatedAdmin(req, res)"), file); endpoints++; }
  }
  assert.ok(endpoints >= 25, `Found only ${endpoints} endpoints`);
});
console.log(`${cases} admin access checks passed.`);
