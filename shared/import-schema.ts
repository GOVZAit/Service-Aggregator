import { z } from "zod";
import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export type ProviderImportRunStatus = "running" | "success" | "partial" | "failed";
export type ProviderImportTrigger = "scheduler" | "admin" | "startup";

export const providerImportRuns = pgTable("provider_import_runs", {
  id: serial("id").primaryKey(),
  sourceName: text("source_name").notNull(),
  trigger: text("trigger").$type<ProviderImportTrigger>().notNull(),
  status: text("status").$type<ProviderImportRunStatus>().notNull(),
  fetched: integer("fetched").default(0).notNull(),
  parsed: integer("parsed").default(0).notNull(),
  imported: integer("imported").default(0).notNull(),
  skipped: integer("skipped").default(0).notNull(),
  errors: jsonb("errors").$type<string[]>().default([]).notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

const organizationKindSchema = z.enum([
  "service_company",
  "medical",
  "education",
  "auto_service",
  "beauty",
  "delivery",
  "public_service",
  "other",
]);

const categoryTargetSchema = z.union([
  z.number().int().positive(),
  z.array(z.number().int().positive()).min(1).max(8),
]);

export const providerImportSourceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  url: z.string().url().max(2000).superRefine((value, ctx) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Import source must use HTTPS" });
      }
      if (url.username || url.password) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credentials in import source URL are not allowed" });
      }
    } catch {
      // z.string().url() reports malformed URLs.
    }
  }),
  adapter: z.enum(["json", "jsonld"]),
  enabled: z.boolean().default(true),
  providerType: z.enum(["master", "organization"]).optional(),
  organizationKind: organizationKindSchema.optional(),
  defaultCategoryIds: z.array(z.number().int().positive()).min(1).max(8).optional(),
  categoryMap: z.record(z.string(), categoryTargetSchema).default({}),
  headers: z.record(z.string(), z.string()).optional(),
  timeoutMs: z.number().int().min(1000).max(60000).default(15000),
  maxItems: z.number().int().min(1).max(5000).default(1000),
  itemPath: z.string().trim().max(200).optional(),
  fields: z.object({
    id: z.string().trim().min(1).max(200),
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(200).optional(),
    sourceUrl: z.string().trim().min(1).max(200).optional(),
    companyName: z.string().trim().min(1).max(200).optional(),
  }).strict().optional(),
}).strict().superRefine((source, ctx) => {
  if (source.adapter === "json") {
    if (!source.fields) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fields"],
        message: "JSON source requires fields mapping",
      });
    }
    if (!source.providerType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerType"],
        message: "JSON source requires providerType",
      });
    }
  }
  if (!source.defaultCategoryIds && Object.keys(source.categoryMap).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoryMap"],
      message: "Configure defaultCategoryIds or categoryMap",
    });
  }
});

export const providerImportSourcesSchema = z.array(providerImportSourceSchema).max(50).superRefine((sources, ctx) => {
  const seen = new Set<string>();
  sources.forEach((source, index) => {
    const normalized = source.name.toLocaleLowerCase("en-US");
    if (seen.has(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "name"],
        message: "Import source names must be unique",
      });
    }
    seen.add(normalized);
  });
});

export type ProviderImportSource = z.infer<typeof providerImportSourceSchema>;
