import { z } from "zod";
import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { authUsers } from "./schema";
import { providerProfiles } from "./provider-schema";

export type VerificationDocumentType =
  | "identity"
  | "qualification"
  | "self_employed"
  | "business"
  | "license"
  | "other";

export interface VerificationDocument {
  id: string;
  type: VerificationDocumentType;
  title: string;
  image: string;
}

export const providerVerificationSubmissions = pgTable("provider_verification_submissions", {
  providerId: integer("provider_id").primaryKey().references(() => providerProfiles.id, { onDelete: "cascade" }),
  documents: jsonb("documents").$type<VerificationDocument[]>().default([]).notNull(),
  providerComment: text("provider_comment"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const providerVerificationEvents = pgTable("provider_verification_events", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providerProfiles.id, { onDelete: "cascade" }),
  actorUserId: integer("actor_user_id").references(() => authUsers.id, { onDelete: "set null" }),
  actorRole: text("actor_role").$type<"provider" | "admin" | "system">().notNull(),
  action: text("action").$type<"submitted" | "resubmitted" | "verified" | "rejected" | "reset">().notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("provider_verification_events_provider_created_idx").on(table.providerId, table.createdAt),
]);

const documentSchema = z.object({
  id: z.string().trim().min(4).max(100),
  type: z.enum(["identity", "qualification", "self_employed", "business", "license", "other"]),
  title: z.string().trim().min(2).max(140),
  image: z.string()
    .max(1_500_000, "Изображение документа слишком большое")
    .refine(
      (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
      "Документ должен быть изображением JPEG, PNG или WebP",
    ),
}).strict();

export const providerVerificationSubmitSchema = z.object({
  documents: z.array(documentSchema).min(1, "Добавьте хотя бы один документ").max(5, "Можно отправить не более 5 документов"),
  comment: z.string().trim().max(1000).optional(),
}).strict();

export const providerVerificationReviewSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  note: z.string().trim().max(1000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.status === "rejected" && !value.note?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["note"],
      message: "Укажите причину отклонения",
    });
  }
});

export type ProviderVerificationSubmitInput = z.infer<typeof providerVerificationSubmitSchema>;
export type ProviderVerificationReviewInput = z.infer<typeof providerVerificationReviewSchema>;
