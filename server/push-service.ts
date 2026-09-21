import webpush from "web-push";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, pool } from "./db";
import {
  appSettings,
  inAppNotifications,
  notificationTypes,
  pushPreferences,
  pushSubscriptions,
  type InAppNotification,
  type NotificationPreferences,
  type NotificationType,
  type StoredPushSubscription,
} from "@shared/push-schema";

let initialized = false;
let publicKeyCache = "";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabledTypes: [...notificationTypes],
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "08:00",
  timezone: "Europe/Moscow",
};

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

    CREATE TABLE IF NOT EXISTS in_app_notifications (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      type text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      url text,
      tag text,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS in_app_notifications_user_created_idx
      ON in_app_notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS in_app_notifications_user_read_idx
      ON in_app_notifications(user_id, read_at);

    CREATE TABLE IF NOT EXISTS push_preferences (
      user_id integer PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
      enabled_types jsonb NOT NULL DEFAULT '["request","order","message","review","verification","system"]'::jsonb,
      quiet_hours_enabled integer NOT NULL DEFAULT 0,
      quiet_start text NOT NULL DEFAULT '22:00',
      quiet_end text NOT NULL DEFAULT '08:00',
      timezone text NOT NULL DEFAULT 'Europe/Moscow',
      updated_at timestamptz NOT NULL DEFAULT now()
    );

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

export async function getNotificationPreferences(userId: number): Promise<NotificationPreferences> {
  const [row] = await db.select().from(pushPreferences)
    .where(eq(pushPreferences.userId, userId))
    .limit(1);

  if (!row) return { ...DEFAULT_PREFERENCES, enabledTypes: [...DEFAULT_PREFERENCES.enabledTypes] };

  const validTypes = (row.enabledTypes ?? []).filter(
    (type): type is NotificationType => notificationTypes.includes(type as NotificationType),
  );

  return {
    enabledTypes: validTypes,
    quietHoursEnabled: row.quietHoursEnabled === 1,
    quietStart: row.quietStart,
    quietEnd: row.quietEnd,
    timezone: row.timezone,
  };
}

function validTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export async function saveNotificationPreferences(userId: number, preferences: NotificationPreferences) {
  if (!validTimeZone(preferences.timezone)) {
    throw new Error("Некорректный часовой пояс");
  }

  const enabledTypes = [...new Set(preferences.enabledTypes)]
    .filter((type): type is NotificationType => notificationTypes.includes(type));

  await db.insert(pushPreferences).values({
    userId,
    enabledTypes,
    quietHoursEnabled: preferences.quietHoursEnabled ? 1 : 0,
    quietStart: preferences.quietStart,
    quietEnd: preferences.quietEnd,
    timezone: preferences.timezone,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: pushPreferences.userId,
    set: {
      enabledTypes,
      quietHoursEnabled: preferences.quietHoursEnabled ? 1 : 0,
      quietStart: preferences.quietStart,
      quietEnd: preferences.quietEnd,
      timezone: preferences.timezone,
      updatedAt: new Date(),
    },
  });

  return getNotificationPreferences(userId);
}

function serializeNotification(row: typeof inAppNotifications.$inferSelect): InAppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    ...(row.url ? { url: row.url } : {}),
    ...(row.tag ? { tag: row.tag } : {}),
    data: row.data ?? {},
    read: Boolean(row.readAt),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listNotifications(userId: number, limit = 100) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  const rows = await db.select().from(inAppNotifications)
    .where(eq(inAppNotifications.userId, userId))
    .orderBy(desc(inAppNotifications.createdAt))
    .limit(safeLimit);
  return rows.map(serializeNotification);
}

export async function unreadNotificationCount(userId: number) {
  const rows = await db.select({ id: inAppNotifications.id })
    .from(inAppNotifications)
    .where(and(
      eq(inAppNotifications.userId, userId),
      isNull(inAppNotifications.readAt),
    ));
  return rows.length;
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const [updated] = await db.update(inAppNotifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(inAppNotifications.id, notificationId),
      eq(inAppNotifications.userId, userId),
    ))
    .returning();
  return updated ? serializeNotification(updated) : undefined;
}

export async function markAllNotificationsRead(userId: number) {
  await db.update(inAppNotifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(inAppNotifications.userId, userId),
      isNull(inAppNotifications.readAt),
    ));
}

function inferNotificationType(payload: PushPayload): NotificationType {
  if (payload.type) return payload.type;

  const tag = (payload.tag ?? "").toLocaleLowerCase("ru-RU");
  const url = (payload.url ?? "").toLocaleLowerCase("ru-RU");
  const title = payload.title.toLocaleLowerCase("ru-RU");

  if (
    tag.includes("verification") ||
    url.includes("verification") ||
    title.includes("верификац") ||
    title.includes("провер")
  ) return "verification";

  if (
    tag.includes("review") ||
    url.includes("review") ||
    title.includes("отзыв")
  ) return "review";

  if (
    tag.includes("chat") ||
    tag.includes("message") ||
    url.includes("/messages") ||
    url.includes("/chat") ||
    title.includes("сообщ")
  ) return "message";

  if (
    tag.includes("request") ||
    tag.includes("response") ||
    url.includes("/requests") ||
    title.includes("заявк") ||
    title.includes("отклик")
  ) return "request";

  if (
    tag.includes("order") ||
    url.includes("/orders") ||
    title.includes("заказ")
  ) return "order";

  return "system";
}

function minuteOfDay(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function localMinute(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

function isQuietHours(preferences: NotificationPreferences, now = new Date()) {
  if (!preferences.quietHoursEnabled) return false;
  const current = localMinute(now, preferences.timezone);
  if (current === null) return false;

  const start = minuteOfDay(preferences.quietStart);
  const end = minuteOfDay(preferences.quietEnd);
  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  type?: NotificationType;
}

export async function sendPushToUser(userId: number, payload: PushPayload) {
  await initializePushService();

  const type = inferNotificationType(payload);
  const [notification] = await db.insert(inAppNotifications).values({
    userId,
    type,
    title: payload.title,
    body: payload.body,
    url: payload.url ?? null,
    tag: payload.tag ?? null,
    data: payload.data ?? {},
  }).returning();

  const preferences = await getNotificationPreferences(userId);
  if (!preferences.enabledTypes.includes(type)) {
    return { sent: 0, notificationId: notification.id, suppressed: "type" as const };
  }
  if (isQuietHours(preferences)) {
    return { sent: 0, notificationId: notification.id, suppressed: "quiet_hours" as const };
  }

  const rows = await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (rows.length === 0) return { sent: 0, notificationId: notification.id };

  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify({
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          ...payload,
          type,
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
  return { sent, notificationId: notification.id };
}
