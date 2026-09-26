import type { VerificationDocument } from "@shared/verification-schema";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface Summary {
  totalProviders: number;
  importedProviders: number;
  hiddenProviders: number;
  pendingVerifications: number;
  users: number;
}

export interface AdminProvider {
  id: number;
  ownerUserId: number | null;
  providerType: "master" | "organization";
  organizationKind: string | null;
  dataSource: "manual" | "import";
  sourceName: string | null;
  sourceExternalId: string | null;
  sourceUrl: string | null;
  importedAt: string | null;
  createdAt: string;
  updatedAt: string;
  importedData: Record<string, unknown>;
  manualOverrides: Record<string, unknown>;
  effectiveData: Record<string, unknown>;
  visible: boolean;
  visibilityReason: string | null;
  verification: {
    status: VerificationStatus;
    note: string | null;
    updatedAt: string | null;
  };
}

export interface AuditEntry {
  id: number;
  adminName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminDirectoryItem<T> {
  id: number;
  visible: boolean;
  origin: "seed" | "manual" | "override";
  record: T;
  updatedAt: string | null;
}

export type DirectoryTab = "doctors" | "city-services";

export interface ImportSourceView {
  name: string;
  url: string;
  adapter: "json" | "jsonld";
  enabled: boolean;
  providerType: "master" | "organization" | null;
  organizationKind: string | null;
  defaultCategoryIds: number[] | null;
  categoryMappings: number;
  hasCustomHeaders: boolean;
  timeoutMs: number;
  maxItems: number;
}

export interface ImportConfig {
  enabled: boolean;
  configurationError: string | null;
  intervalMinutes: number;
  runOnStartup: boolean;
  sources: ImportSourceView[];
}

export interface ImportRun {
  id: number;
  sourceName: string;
  trigger: "scheduler" | "admin" | "startup";
  status: "running" | "success" | "partial" | "failed";
  fetched: number;
  parsed: number;
  imported: number;
  skipped: number;
  errors: string[];
  details: Record<string, unknown>;
  startedAt: string;
  finishedAt: string | null;
}

export interface VerificationQueueItem {
  providerId: number;
  providerType: "master" | "organization";
  ownerUserId: number | null;
  name: string;
  companyName: string | null;
  phone: string | null;
  status: VerificationStatus;
  note: string | null;
  documentCount: number;
  providerComment: string;
  submittedAt: string;
  updatedAt: string;
}

export interface VerificationEventDetail {
  id: number;
  actorRole: "provider" | "admin" | "system";
  action: "submitted" | "resubmitted" | "verified" | "rejected" | "reset";
  note: string | null;
  createdAt: string;
}

export interface OrganizationAccountOption {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface VerificationDetail {
  status: VerificationStatus;
  note: string | null;
  updatedAt: string | null;
  submission: {
    documents: VerificationDocument[];
    providerComment: string;
    submittedAt: string;
    updatedAt: string;
  } | null;
  events: VerificationEventDetail[];
}

