/** GOVZA's current service region uses Moscow time, not the visitor's device timezone. */
export const SERVICE_TIME_ZONE = "Europe/Moscow";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SERVICE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function serviceNow(now = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isClockTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function upcomingDates(count: number, now = new Date()): string[] {
  const date = new Date(`${serviceNow(now).date}T12:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(date);
    day.setUTCDate(date.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export interface AvailabilityWindow {
  date: string;
  status: string;
  fromTime?: string;
  toTime?: string;
}

export function isAvailableToday(day: AvailabilityWindow | undefined, now = new Date()): boolean {
  const clock = serviceNow(now);
  return Boolean(day && day.date === clock.date && day.status === "available" &&
    isClockTime(day.fromTime) && isClockTime(day.toTime) &&
    day.fromTime < day.toTime && day.toTime > clock.time);
}

export function formatBookingSlot(date: string, time: string): string {
  return `${date.split("-").reverse().join(".")}, ${time}`;
}

/** Accept the existing API's Russian calendar format; reject rolled-over dates. */
export function parseBookingSlot(value: string): { date: string; time: string } | undefined {
  const match = /^(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}:\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  return isCalendarDate(date) && isClockTime(match[4]) ? { date, time: match[4] } : undefined;
}

export function isFutureSlot(date: string, time: string, now = new Date()): boolean {
  const clock = serviceNow(now);
  return isCalendarDate(date) && isClockTime(time) &&
    (date > clock.date || (date === clock.date && time > clock.time));
}

/** Unspecified means a request may be sent, not that the slot is guaranteed free. */
export function canRequestSlot(day: AvailabilityWindow | undefined, date: string, time: string): boolean {
  if (!isCalendarDate(date) || !isClockTime(time)) return false;
  if (!day) return true;
  return day.date === date && day.status === "available" && isClockTime(day.fromTime) &&
    isClockTime(day.toTime) && day.fromTime <= time && time < day.toTime;
}
