import { desc, eq } from "drizzle-orm";
import { db, pool } from "./db";
import {
  providerVerificationEvents,
  providerVerificationSubmissions,
  type ProviderVerificationSubmitInput,
} from "@shared/verification-schema";
import { providerVerifications } from "@shared/admin-schema";

export async function ensureVerificationWorkflowTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provider_verification_submissions (
      provider_id integer PRIMARY KEY REFERENCES provider_profiles(id) ON DELETE CASCADE,
      documents jsonb NOT NULL DEFAULT '[]'::jsonb,
      provider_comment text,
      submitted_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS provider_verification_events (
      id serial PRIMARY KEY,
      provider_id integer NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      actor_user_id integer REFERENCES auth_users(id) ON DELETE SET NULL,
      actor_role text NOT NULL,
      action text NOT NULL,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS provider_verification_events_provider_created_idx
      ON provider_verification_events(provider_id, created_at DESC);
  `);
}

export async function getVerificationState(providerId: number) {
  const [verification] = await db.select().from(providerVerifications)
    .where(eq(providerVerifications.providerId, providerId))
    .limit(1);
  const [submission] = await db.select().from(providerVerificationSubmissions)
    .where(eq(providerVerificationSubmissions.providerId, providerId))
    .limit(1);
  const events = await db.select().from(providerVerificationEvents)
    .where(eq(providerVerificationEvents.providerId, providerId))
    .orderBy(desc(providerVerificationEvents.createdAt))
    .limit(100);

  return {
    status: verification?.status ?? "unverified",
    note: verification?.note ?? null,
    updatedAt: verification?.updatedAt?.toISOString() ?? null,
    submission: submission ? {
      documents: submission.documents,
      providerComment: submission.providerComment ?? "",
      submittedAt: submission.submittedAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
    } : null,
    events: events.map((event) => ({
      id: event.id,
      actorRole: event.actorRole,
      action: event.action,
      note: event.note ?? null,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function submitVerification(
  providerId: number,
  actorUserId: number,
  input: ProviderVerificationSubmitInput,
) {
  const [existing] = await db.select().from(providerVerificationSubmissions)
    .where(eq(providerVerificationSubmissions.providerId, providerId))
    .limit(1);
  const [currentVerification] = await db.select().from(providerVerifications)
    .where(eq(providerVerifications.providerId, providerId))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx.insert(providerVerificationSubmissions).values({
      providerId,
      documents: input.documents,
      providerComment: input.comment?.trim() || null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: providerVerificationSubmissions.providerId,
      set: {
        documents: input.documents,
        providerComment: input.comment?.trim() || null,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.insert(providerVerifications).values({
      providerId,
      status: "pending",
      note: null,
      updatedBy: null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: providerVerifications.providerId,
      set: {
        status: "pending",
        note: null,
        updatedBy: null,
        updatedAt: new Date(),
      },
    });

    await tx.insert(providerVerificationEvents).values({
      providerId,
      actorUserId,
      actorRole: "provider",
      action: existing || currentVerification?.status === "rejected" ? "resubmitted" : "submitted",
      note: input.comment?.trim() || null,
    });
  });

  return getVerificationState(providerId);
}

export async function reviewVerification(
  providerId: number,
  adminUserId: number,
  status: "verified" | "rejected",
  note?: string,
) {
  const [submission] = await db.select().from(providerVerificationSubmissions)
    .where(eq(providerVerificationSubmissions.providerId, providerId))
    .limit(1);
  if (!submission) return undefined;

  await db.transaction(async (tx) => {
    await tx.insert(providerVerifications).values({
      providerId,
      status,
      note: note?.trim() || null,
      updatedBy: adminUserId,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: providerVerifications.providerId,
      set: {
        status,
        note: note?.trim() || null,
        updatedBy: adminUserId,
        updatedAt: new Date(),
      },
    });

    await tx.insert(providerVerificationEvents).values({
      providerId,
      actorUserId: adminUserId,
      actorRole: "admin",
      action: status,
      note: note?.trim() || null,
    });
  });

  return getVerificationState(providerId);
}

export async function listVerificationQueue() {
  const rows = await pool.query<{
    provider_id: number;
    provider_type: "master" | "organization";
    owner_user_id: number | null;
    status: "unverified" | "pending" | "verified" | "rejected";
    note: string | null;
    documents: unknown;
    provider_comment: string | null;
    submitted_at: Date;
    updated_at: Date;
    imported_data: Record<string, unknown>;
    manual_overrides: Record<string, unknown>;
  }>(`
    SELECT
      p.id AS provider_id,
      p.provider_type,
      p.owner_user_id,
      COALESCE(v.status, 'unverified') AS status,
      v.note,
      s.documents,
      s.provider_comment,
      s.submitted_at,
      s.updated_at,
      p.imported_data,
      p.manual_overrides
    FROM provider_verification_submissions s
    JOIN provider_profiles p ON p.id = s.provider_id
    LEFT JOIN provider_verifications v ON v.provider_id = p.id
    ORDER BY
      CASE COALESCE(v.status, 'unverified')
        WHEN 'pending' THEN 0
        WHEN 'rejected' THEN 1
        WHEN 'verified' THEN 2
        ELSE 3
      END,
      s.updated_at DESC
  `);

  return rows.rows.map((row) => {
    const effective = {
      ...(row.imported_data ?? {}),
      ...(row.manual_overrides ?? {}),
    };
    return {
      providerId: row.provider_id,
      providerType: row.provider_type,
      ownerUserId: row.owner_user_id,
      name: typeof effective.name === "string" ? effective.name : `Профиль #${row.provider_id}`,
      companyName: typeof effective.companyName === "string" ? effective.companyName : null,
      phone: typeof effective.phone === "string" ? effective.phone : null,
      status: row.status,
      note: row.note,
      documents: row.documents,
      providerComment: row.provider_comment ?? "",
      submittedAt: row.submitted_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  });
}
