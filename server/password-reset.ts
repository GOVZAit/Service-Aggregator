import { randomUUID } from "crypto";

const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_KEY = 3;
const MAX_TRACKED_RATE_LIMIT_KEYS = 10_000;

const requestHistory = new Map<string, number[]>();
let lastRateLimitSweep = 0;

export function passwordResetRateLimited(keys: string[], now = Date.now()) {
  if (now - lastRateLimitSweep >= REQUEST_WINDOW_MS) {
    requestHistory.forEach((times, key) => {
      const recent = times.filter((time) => now - time < REQUEST_WINDOW_MS);
      if (recent.length) requestHistory.set(key, recent);
      else requestHistory.delete(key);
    });
    lastRateLimitSweep = now;
  }

  const uniqueKeys = Array.from(new Set(keys));
  const histories = uniqueKeys.map((key) => ({
    key,
    recent: (requestHistory.get(key) ?? []).filter((time) => now - time < REQUEST_WINDOW_MS),
  }));
  if (histories.some(({ recent }) => recent.length >= MAX_REQUESTS_PER_KEY)) return true;

  const newKeyCount = histories.filter(({ key }) => !requestHistory.has(key)).length;
  if (requestHistory.size + newKeyCount > MAX_TRACKED_RATE_LIMIT_KEYS) return true;

  histories.forEach(({ key, recent }) => requestHistory.set(key, [...recent, now]));
  return false;
}

async function sendWebhook(url: string, payload: object) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`delivery webhook returned ${response.status}`);
}

export async function deliverPasswordReset(identifier: string, resetPath: string, isEmail: boolean) {
  const url = isEmail ? process.env.PASSWORD_RESET_EMAIL_WEBHOOK_URL : process.env.PASSWORD_RESET_SMS_WEBHOOK_URL;
  if (!url) return false;
  await sendWebhook(url, {
    idempotencyKey: randomUUID(),
    to: identifier,
    template: "password-reset",
    resetPath,
    expiresInMinutes: 10,
  });
  return true;
}

export function isPasswordResetDeliveryConfigured(isEmail: boolean) {
  return Boolean(isEmail ? process.env.PASSWORD_RESET_EMAIL_WEBHOOK_URL : process.env.PASSWORD_RESET_SMS_WEBHOOK_URL);
}