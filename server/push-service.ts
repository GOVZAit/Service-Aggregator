import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { appSettings, pushSubscriptions, type StoredPushSubscription } from "@shared/push-schema";

let initialized = false;
let publicKeyCache = "";

export async function ensurePushTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      endpoint text NOT NULL,
      subscription jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_unique
      ON push_subscriptions(endpoint);

    CREATE TABLE IF NOT EXISTS app_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function setting(key: string) {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return row?.value;
}

async function saveSetting(key: string, value: string) {
  await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value, updatedAt: new Date() },
  });
}

export async function initializePushService() {
  if (initialized) return publicKeyCache;
  await ensurePushTables();

  let publicKey = process.env.VAPID_PUBLIC_KEY || await setting("vapid_public_key");
  let privateKey = process.env.VAPID_PRIVATE_KEY || await setting("vapid_private_key");

  if (!publicKey || !privateKey) {
    const generated = webpush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    await Promise.all([
      saveSetting("vapid_public_key", publicKey),
      saveSetting("vapid_private_key", privateKey),
    ]);
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:push@govza.pro",
    publicKey,
    privateKey,
  );
  publicKeyCache = publicKey;
  initialized = true;
  return publicKey;
}

export async function getPushPublicKey() {
  return initializePushService();
}

export async function storePushSubscription(userId: number, subscription: StoredPushSubscription) {
  await initializePushService();
  await db.insert(pushSubscriptions).values({
    userId,
    endpoint: subscription.endpoint,
    subscription,
  }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: {
      userId,
      subscription,
      updatedAt: new Date(),
    },
  });
}

export async function removePushSubscription(userId: number, endpoint: string) {
  const [row] = await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);
  if (!row || row.userId !== userId) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(userId: number, payload: PushPayload) {
  await initializePushService();
  const rows = await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (rows.length === 0) return { sent: 0 };

  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify({
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          ...payload,
        }),
      );
      sent += 1;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
      } else {
        console.error("Push delivery failed", { userId, subscriptionId: row.id, statusCode: error?.statusCode });
      }
    }
  }
  return { sent };
}
