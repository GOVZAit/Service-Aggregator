import assert from "node:assert/strict";

process.env.RESEND_API_KEY = "test-key";
process.env.EMAIL_FROM = "GOVZAmastera <test@example.com>";
process.env.PUBLIC_APP_URL = "https://govza.example.com";

const payloads: Array<{ subject: string; html: string }> = [];
globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
  payloads.push(JSON.parse(String(init?.body)));
  return new Response("{}", { status: 200 });
}) as typeof fetch;

const { sendPasswordResetEmail, sendWelcomeEmail } = await import("../server/email");

assert.equal(
  await sendWelcomeEmail({ to: "client@example.com", login: "client@example.com" }),
  true,
);
assert.equal(
  await sendPasswordResetEmail({
    to: "client@example.com",
    login: "client@example.com",
    resetPath: "/reset-password?token=safe-token",
  }),
  true,
);

assert.match(payloads[0].html, /client@example\.com/);
assert.doesNotMatch(JSON.stringify(payloads[0]), /passwordHash|secret-password/);
assert.match(payloads[1].html, /https:\/\/govza\.example\.com\/reset-password\?token=safe-token/);
assert.doesNotMatch(JSON.stringify(payloads[1]), /passwordHash|secret-password/);

console.log("Email payload checks passed");