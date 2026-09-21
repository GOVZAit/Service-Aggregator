import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db, pool } from "./db";
import {
  providerAvailabilityExceptions,
  providerAvailabilityRules,
  type AvailabilityDayKey,
  type AvailabilityExceptionInput,
  type ProviderAvailabilityPatch,
  type WeeklyAvailability,
} from "@shared/availability-schema";
import { persistedOrders } from "@shared/schema";

const APP_TIME_ZONE = "Europe/Moscow";
const APP_OFFSET = "+03:00";
const DAY_KEYS: AvailabilityDayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export async function ensureAvailabilityTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provider_availability_rules (
      provider_id integer PRIMARY KEY REFERENCES provider_profiles(id) ON DELETE CASCADE,
      weekly jsonb NOT NULL,
      slot_minutes integer NOT NULL DEFAULT 60,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS provider_availability_exceptions (
      id serial PRIMARY KEY,
      provider_id integer NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      date text NOT NULL,
      mode text NOT NULL,
      "from" text,
      "to" text,
      note text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS provider_availability_exceptions_provider_date_unique
      ON provider_availability_exceptions(provider_id, date);
    CREATE INDEX IF NOT EXISTS provider_availability_exceptions_provider_idx
      ON provider_availability_exceptions(provider_id);

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

    CREATE UNIQUE INDEX IF NOT EXISTS orders_master_scheduled_active_unique
      ON orders(master_id, scheduled_at)
      WHERE scheduled_at IS NOT NULL AND status IN ('pending', 'in_progress');
  `);
}

function datePartsInMoscow(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    date: `${map.get("year")}-${map.get("month")}-${map.get("day")}`,
    time: `${map.get("hour")}:${map.get("minute")}`,
  };
}

export function currentMoscowDate() {
  return datePartsInMoscow(new Date()).date;
}

function isPlainDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function dayKey(date: string): AvailabilityDayKey {
  const value = new Date(`${date}T12:00:00Z`);
  return DAY_KEYS[value.getUTCDay()];
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function clock(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function slotIso(date: string, time: string) {
  return `${date}T${time}:00${APP_OFFSET}`;
}

function effectiveRule(
  weekly: WeeklyAvailability,
  date: string,
  exception?: typeof providerAvailabilityExceptions.$inferSelect,
) {
  if (exception?.mode === "off") return undefined;
  if (exception?.mode === "custom" && exception.from && exception.to) {
    return { enabled: true, from: exception.from, to: exception.to };
  }
  const rule = weekly[dayKey(date)];
  return rule?.enabled ? rule : undefined;
}

export async function getAvailabilitySettings(providerId: number) {
  const [rule] = await db.select().from(providerAvailabilityRules)
    .where(eq(providerAvailabilityRules.providerId, providerId))
    .limit(1);
  const exceptions = await db.select().from(providerAvailabilityExceptions)
    .where(eq(providerAvailabilityExceptions.providerId, providerId));

  return {
    configured: Boolean(rule),
    weekly: rule?.weekly ?? null,
    slotMinutes: rule?.slotMinutes ?? 60,
    updatedAt: rule?.updatedAt?.toISOString() ?? null,
    exceptions: exceptions
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        id: item.id,
        date: item.date,
        mode: item.mode,
        from: item.from ?? null,
        to: item.to ?? null,
        note: item.note ?? null,
      })),
  };
}

export async function saveAvailabilitySettings(providerId: number, input: ProviderAvailabilityPatch) {
  await db.insert(providerAvailabilityRules).values({
    providerId,
    weekly: input.weekly,
    slotMinutes: input.slotMinutes,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: providerAvailabilityRules.providerId,
    set: {
      weekly: input.weekly,
      slotMinutes: input.slotMinutes,
      updatedAt: new Date(),
    },
  });
  return getAvailabilitySettings(providerId);
}

export async function upsertAvailabilityException(providerId: number, input: AvailabilityExceptionInput) {
  if (!isPlainDate(input.date)) throw new Error("Некорректная дата");
  if (input.date < currentMoscowDate()) throw new Error("Нельзя изменять прошедшую дату");

  await db.insert(providerAvailabilityExceptions).values({
    providerId,
    date: input.date,
    mode: input.mode,
    from: input.mode === "custom" ? input.from! : null,
    to: input.mode === "custom" ? input.to! : null,
    note: input.note?.trim() || null,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [
      providerAvailabilityExceptions.providerId,
      providerAvailabilityExceptions.date,
    ],
    set: {
      mode: input.mode,
      from: input.mode === "custom" ? input.from! : null,
      to: input.mode === "custom" ? input.to! : null,
      note: input.note?.trim() || null,
      updatedAt: new Date(),
    },
  });

  return getAvailabilitySettings(providerId);
}

export async function deleteAvailabilityException(providerId: number, date: string) {
  if (!isPlainDate(date)) return false;
  const removed = await db.delete(providerAvailabilityExceptions)
    .where(and(
      eq(providerAvailabilityExceptions.providerId, providerId),
      eq(providerAvailabilityExceptions.date, date),
    ))
    .returning({ id: providerAvailabilityExceptions.id });
  return removed.length > 0;
}

export interface AvailabilitySlotView {
  time: string;
  scheduledAt: string;
  available: boolean;
}

export interface AvailabilityDayView {
  date: string;
  available: boolean;
  slots: AvailabilitySlotView[];
  exceptionMode: "off" | "custom" | null;
  note: string | null;
}

export async function getPublicAvailability(providerId: number, fromDate: string, days: number) {
  if (!isPlainDate(fromDate)) throw new Error("Некорректная дата");
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 31);
  const [rule] = await db.select().from(providerAvailabilityRules)
    .where(eq(providerAvailabilityRules.providerId, providerId))
    .limit(1);

  if (!rule) {
    return {
      configured: false,
      timeZone: APP_TIME_ZONE,
      fromDate,
      days: [] as AvailabilityDayView[],
      availableToday: null as boolean | null,
    };
  }

  const endDateExclusive = addDays(fromDate, safeDays);
  const exceptions = await db.select().from(providerAvailabilityExceptions)
    .where(and(
      eq(providerAvailabilityExceptions.providerId, providerId),
      gte(providerAvailabilityExceptions.date, fromDate),
      lt(providerAvailabilityExceptions.date, endDateExclusive),
    ));
  const exceptionMap = new Map(exceptions.map((item) => [item.date, item]));

  const rangeStart = new Date(`${fromDate}T00:00:00${APP_OFFSET}`);
  const rangeEnd = new Date(`${endDateExclusive}T00:00:00${APP_OFFSET}`);
  const booked = await db.select({
    scheduledAt: persistedOrders.scheduledAt,
  }).from(persistedOrders).where(and(
    eq(persistedOrders.masterId, providerId),
    inArray(persistedOrders.status, ["pending", "in_progress"]),
    gte(persistedOrders.scheduledAt, rangeStart),
    lt(persistedOrders.scheduledAt, rangeEnd),
  ));
  const bookedTimes = new Set(
    booked
      .filter((item): item is { scheduledAt: Date } => item.scheduledAt instanceof Date)
      .map((item) => item.scheduledAt.getTime()),
  );

  const now = Date.now();
  const result: AvailabilityDayView[] = [];

  for (let index = 0; index < safeDays; index += 1) {
    const date = addDays(fromDate, index);
    const exception = exceptionMap.get(date);
    const dayRule = effectiveRule(rule.weekly, date, exception);
    const slots: AvailabilitySlotView[] = [];

    if (dayRule) {
      const start = minutes(dayRule.from);
      const end = minutes(dayRule.to);
      for (let minute = start; minute + rule.slotMinutes <= end; minute += rule.slotMinutes) {
        const time = clock(minute);
        const scheduledAt = slotIso(date, time);
        const timestamp = new Date(scheduledAt).getTime();
        slots.push({
          time,
          scheduledAt,
          available: timestamp > now && !bookedTimes.has(timestamp),
        });
      }
    }

    result.push({
      date,
      available: slots.some((slot) => slot.available),
      slots,
      exceptionMode: exception?.mode ?? null,
      note: exception?.note ?? null,
    });
  }

  return {
    configured: true,
    timeZone: APP_TIME_ZONE,
    fromDate,
    slotMinutes: rule.slotMinutes,
    days: result,
    availableToday: fromDate === currentMoscowDate() ? (result[0]?.available ?? false) : null,
  };
}

export async function isBookableSlot(providerId: number, scheduledAt: Date) {
  const [rule] = await db.select().from(providerAvailabilityRules)
    .where(eq(providerAvailabilityRules.providerId, providerId))
    .limit(1);
  if (!rule) return true;

  const local = datePartsInMoscow(scheduledAt);
  const availability = await getPublicAvailability(providerId, local.date, 1);
  return availability.days[0]?.slots.some(
    (slot) => slot.available && new Date(slot.scheduledAt).getTime() === scheduledAt.getTime(),
  ) ?? false;
}

export function formatOrderScheduledAt(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
