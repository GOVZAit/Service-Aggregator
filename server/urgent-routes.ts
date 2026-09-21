import type { Express } from "express";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { providerAvailability } from "@shared/provider-engagement-schema";
import { getEffectiveCategory } from "./category-service";

function moscowNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}`,
  };
}

function timeInside(from: string, to: string, now: string) {
  return from <= now && now < to;
}

const urgentSearchSchema = z.object({
  categoryId: z.number().int().positive(),
  city: z.string().trim().max(80).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.lat === undefined) !== (value.lng === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Координаты должны передаваться парой",
    });
  }
});

function canCallNow(provider: Awaited<ReturnType<typeof storage.getMasters>>[number], now: string) {
  if (!provider.phone || provider.callMode === "disabled") return false;
  if (provider.callMode === "always") return true;
  if (provider.callMode === "online_only") return provider.isOnline;
  if (provider.callMode === "schedule") {
    return timeInside(provider.workingHours.from, provider.workingHours.to, now);
  }
  return false;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function registerUrgentRoutes(app: Express) {
  app.post("/api/urgent/providers/search", async (req, res) => {
    const parsed = urgentSearchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const { categoryId, city = "", lat, lng } = parsed.data;
    if (!getEffectiveCategory(categoryId)) {
      return res.status(400).json({ message: "Выберите категорию" });
    }

    const hasCoordinates = lat !== undefined && lng !== undefined;

    const providers = (await storage.getMasters()).filter((provider) =>
      (provider.categoryIds ?? [provider.categoryId]).includes(categoryId),
    );
    if (providers.length === 0) return res.json([]);

    const { date, time } = moscowNow();
    const providerIds = providers.map((provider) => provider.id);
    const availabilityRows = await db.select().from(providerAvailability)
      .where(and(
        inArray(providerAvailability.providerId, providerIds),
        eq(providerAvailability.date, date),
      ));
    const availabilityByProvider = new Map(availabilityRows.map((row) => [row.providerId, row]));

    const results = providers.flatMap((provider) => {
      const explicit = availabilityByProvider.get(provider.id);
      let availableNow = false;
      let availabilitySource: "calendar" | "online" | undefined;
      let availableUntil: string | undefined;

      if (explicit) {
        if (
          explicit.status === "available" &&
          explicit.fromTime &&
          explicit.toTime &&
          timeInside(explicit.fromTime, explicit.toTime, time)
        ) {
          availableNow = true;
          availabilitySource = "calendar";
          availableUntil = explicit.toTime;
        }
      } else if (
        provider.isOnline &&
        provider.workingHours?.from &&
        provider.workingHours?.to &&
        timeInside(provider.workingHours.from, provider.workingHours.to, time)
      ) {
        availableNow = true;
        availabilitySource = "online";
        availableUntil = provider.workingHours.to;
      }

      if (!availableNow) return [];

      const providerLat = typeof provider.lat === "number" ? provider.lat : undefined;
      const providerLng = typeof provider.lng === "number" ? provider.lng : undefined;
      const distance = hasCoordinates && providerLat !== undefined && providerLng !== undefined
        ? distanceKm(lat!, lng!, providerLat, providerLng)
        : undefined;

      return [{
        id: provider.id,
        name: provider.name,
        category: provider.category,
        rating: provider.rating,
        reviews: provider.reviews,
        price: provider.price,
        avatar: provider.avatar,
        verified: provider.verified,
        providerType: provider.providerType ?? "master",
        companyName: provider.companyName,
        city: provider.city,
        district: provider.district,
        phone: canCallNow(provider, time) ? provider.phone : undefined,
        callMode: provider.callMode,
        isOnline: provider.isOnline,
        availabilitySource,
        availableUntil,
        ...(distance !== undefined ? { distanceKm: Math.round(distance * 10) / 10 } : {}),
      }];
    });

    results.sort((left, right) => {
      const leftCity = city && left.city === city ? 1 : 0;
      const rightCity = city && right.city === city ? 1 : 0;
      if (leftCity !== rightCity) return rightCity - leftCity;

      const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;

      const leftExplicit = left.availabilitySource === "calendar" ? 1 : 0;
      const rightExplicit = right.availabilitySource === "calendar" ? 1 : 0;
      if (leftExplicit !== rightExplicit) return rightExplicit - leftExplicit;

      return right.rating - left.rating;
    });

    res.json(results.slice(0, 12));
  });
}
