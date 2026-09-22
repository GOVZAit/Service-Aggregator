import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import type { Doctor } from "@/lib/doctors-data";
import type { CityOrganization } from "@/lib/city-services-data";
import type { Category } from "@shared/schema";
import type { VerificationDocument } from "@shared/verification-schema";
import type { AdminAutoPartsSupplierView, AutoPartsVehicleOrigin, AutoPartsVehicleType } from "@shared/auto-parts-schema";

type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

interface Summary {
  totalProviders: number;
  importedProviders: number;
  hiddenProviders: number;
  pendingVerifications: number;
  users: number;
}

interface AdminProvider {
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

interface AuditEntry {
  id: number;
  adminName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AdminDirectoryItem<T> {
  id: number;
  visible: boolean;
  origin: "seed" | "manual" | "override";
  record: T;
  updatedAt: string | null;
}

type DirectoryTab = "doctors" | "city-services";

interface ImportSourceView {
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

interface ImportConfig {
  enabled: boolean;
  configurationError: string | null;
  intervalMinutes: number;
  runOnStartup: boolean;
  sources: ImportSourceView[];
}

interface ImportRun {
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

interface VerificationQueueItem {
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

interface VerificationEventDetail {
  id: number;
  actorRole: "provider" | "admin" | "system";
  action: "submitted" | "resubmitted" | "verified" | "rejected" | "reset";
  note: string | null;
  createdAt: string;
}

interface OrganizationAccountOption {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface VerificationDetail {
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

const fieldClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Ошибка запроса");
  return data as T;
}

function displayName(provider: AdminProvider) {
  const value = provider.effectiveData.name ?? provider.effectiveData.companyName;
  return typeof value === "string" && value.trim() ? value : `Профиль #${provider.id}`;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function categoryIdsValue(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "number").join(", ") : "";
}

export default function AdminDashboardPage() {
  const { logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [selected, setSelected] = useState<AdminProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | "create" | "edit" | null>(null);
  const [error, setError] = useState("");

  const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>([]);
  const [verificationSelected, setVerificationSelected] = useState<VerificationQueueItem | null>(null);
  const [verificationDetail, setVerificationDetail] = useState<VerificationDetail | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [verificationWorking, setVerificationWorking] = useState(false);

  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
  const [importRuns, setImportRuns] = useState<ImportRun[]>([]);
  const [importWorking, setImportWorking] = useState<string | null>(null);

  const [autoPartsSuppliers, setAutoPartsSuppliers] = useState<AdminAutoPartsSupplierView[]>([]);
  const [organizationAccounts, setOrganizationAccounts] = useState<OrganizationAccountOption[]>([]);
  const [autoPartsOpen, setAutoPartsOpen] = useState(false);
  const [autoPartsWorking, setAutoPartsWorking] = useState<number | "create" | null>(null);
  const [autoPartsForm, setAutoPartsForm] = useState({
    name: "",
    supplierType: "store",
    partsCondition: "mixed",
    salesType: "retail",
    city: "Грозный",
    phone: "",
    brands: "",
    partGroups: "",
    vehicleTypes: ["passenger"] as AutoPartsVehicleType[],
    vehicleOrigins: ["foreign", "domestic"] as AutoPartsVehicleOrigin[],
    delivery: false,
    pickup: true,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryEditingId, setCategoryEditingId] = useState<number | null>(null);
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [categoryWorking, setCategoryWorking] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    iconName: "Wrench",
    emoji: "🔧",
    color: "#0B8FB6",
  });

  const [directoryTab, setDirectoryTab] = useState<DirectoryTab>("doctors");
  const [doctors, setDoctors] = useState<AdminDirectoryItem<Doctor>[]>([]);
  const [cityServices, setCityServices] = useState<AdminDirectoryItem<CityOrganization>[]>([]);
  const [directorySelectedId, setDirectorySelectedId] = useState<number | null>(null);
  const [directoryDraft, setDirectoryDraft] = useState("");
  const [directoryCreating, setDirectoryCreating] = useState(false);
  const [directoryWorking, setDirectoryWorking] = useState(false);

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [visibility, setVisibility] = useState("");
  const [verification, setVerification] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    providerType: "master",
    name: "",
    phone: "",
    city: "Грозный",
    categoryIds: "1",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    city: "",
    categoryIds: "",
    description: "",
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (type) params.set("type", type);
    if (source) params.set("source", source);
    if (visibility) params.set("visibility", visibility);
    if (verification) params.set("verification", verification);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [q, type, source, visibility, verification]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [nextSummary, nextProviders, nextAudit, nextDoctors, nextCityServices, nextCategories, nextImportConfig, nextImportRuns, nextVerificationQueue, nextAutoPartsSuppliers, nextOrganizationAccounts] = await Promise.all([
        api<Summary>("/api/admin/summary"),
        api<AdminProvider[]>(`/api/admin/providers${queryString}`),
        api<AuditEntry[]>("/api/admin/audit?limit=30"),
        api<AdminDirectoryItem<Doctor>[]>("/api/admin/directories/doctors"),
        api<AdminDirectoryItem<CityOrganization>[]>("/api/admin/directories/city-services"),
        api<Category[]>("/api/admin/categories"),
        api<ImportConfig>("/api/admin/import/config"),
        api<ImportRun[]>("/api/admin/import/runs?limit=30"),
        api<VerificationQueueItem[]>("/api/admin/verifications"),
        api<AdminAutoPartsSupplierView[]>("/api/admin/auto-parts/suppliers"),
        api<OrganizationAccountOption[]>("/api/admin/auto-parts/organization-accounts"),
      ]);
      setSummary(nextSummary);
      setProviders(nextProviders);
      setAudit(nextAudit);
      setDoctors(nextDoctors);
      setCityServices(nextCityServices);
      setCategories(nextCategories);
      setImportConfig(nextImportConfig);
      setImportRuns(nextImportRuns);
      setVerificationQueue(nextVerificationQueue);
      setAutoPartsSuppliers(nextAutoPartsSuppliers);
      setOrganizationAccounts(nextOrganizationAccounts);
      if (verificationSelected) {
        const refreshedVerification = nextVerificationQueue.find((item) => item.providerId === verificationSelected.providerId);
        if (refreshedVerification) setVerificationSelected(refreshedVerification);
      }
      if (selected) {
        const refreshed = nextProviders.find((item) => item.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить админ-панель");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      name: textValue(selected.effectiveData.name),
      phone: textValue(selected.effectiveData.phone),
      city: textValue(selected.effectiveData.city),
      categoryIds: categoryIdsValue(selected.effectiveData.categoryIds),
      description: textValue(selected.effectiveData.description),
    });
  }, [selected]);

  const mutateVisibility = async (provider: AdminProvider) => {
    setWorking(provider.id);
    setError("");
    try {
      await api(`/api/admin/providers/${provider.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !provider.visible }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить видимость");
    } finally {
      setWorking(null);
    }
  };

  const createProvider = async () => {
    const categoryIds = createForm.categoryIds
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0);

    setWorking("create");
    setError("");
    try {
      await api("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: createForm.providerType,
          data: {
            name: createForm.name,
            categoryIds,
            ...(createForm.phone.trim() ? { phone: createForm.phone.trim() } : {}),
            ...(createForm.city.trim() ? { city: createForm.city.trim() } : {}),
          },
        }),
      });
      setCreateForm({ providerType: "master", name: "", phone: "", city: "Грозный", categoryIds: "1" });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать профиль");
    } finally {
      setWorking(null);
    }
  };

  const saveSelected = async () => {
    if (!selected) return;
    const categoryIds = editForm.categoryIds
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0);

    const patch: Record<string, unknown> = {
      name: editForm.name,
      categoryIds,
    };
    if (editForm.phone.trim()) patch.phone = editForm.phone.trim();
    if (editForm.city.trim()) patch.city = editForm.city.trim();
    if (editForm.description.trim().length >= 10) patch.description = editForm.description.trim();

    setWorking("edit");
    setError("");
    try {
      await api(`/api/admin/providers/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить изменения");
    } finally {
      setWorking(null);
    }
  };



  const createAutoPartsSupplier = async () => {
    setAutoPartsWorking("create");
    setError("");
    try {
      await api("/api/admin/auto-parts/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: autoPartsForm.name.trim(),
          supplierType: autoPartsForm.supplierType,
          partsCondition: autoPartsForm.partsCondition,
          salesType: autoPartsForm.salesType,
          city: autoPartsForm.city.trim(),
          ...(autoPartsForm.phone.trim() ? { phone: autoPartsForm.phone.trim() } : {}),
          brands: autoPartsForm.brands.split(",").map((item) => item.trim()).filter(Boolean),
          partGroups: autoPartsForm.partGroups.split(",").map((item) => item.trim()).filter(Boolean),
          vehicleTypes: autoPartsForm.vehicleTypes,
          vehicleOrigins: autoPartsForm.vehicleOrigins,
          delivery: autoPartsForm.delivery,
          pickup: autoPartsForm.pickup,
        }),
      });
      setAutoPartsForm({
        name: "",
        supplierType: "store",
        partsCondition: "mixed",
        salesType: "retail",
        city: "Грозный",
        phone: "",
        brands: "",
        partGroups: "",
        vehicleTypes: ["passenger"] as AutoPartsVehicleType[],
        vehicleOrigins: ["foreign", "domestic"] as AutoPartsVehicleOrigin[],
        delivery: false,
        pickup: true,
      });
      setAutoPartsOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить магазин автозапчастей");
    } finally {
      setAutoPartsWorking(null);
    }
  };

  const setAutoPartsOwner = async (supplierId: number, ownerUserId: number | null) => {
    setAutoPartsWorking(supplierId);
    setError("");
    try {
      await api(`/api/admin/auto-parts/suppliers/${supplierId}/owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось привязать аккаунт");
    } finally {
      setAutoPartsWorking(null);
    }
  };

  const toggleAutoPartsVisibility = async (supplier: AdminAutoPartsSupplierView) => {
    setAutoPartsWorking(supplier.id);
    setError("");
    try {
      await api(`/api/admin/auto-parts/suppliers/${supplier.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !supplier.visible }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить видимость магазина");
    } finally {
      setAutoPartsWorking(null);
    }
  };


  const openVerification = async (item: VerificationQueueItem) => {
    setVerificationSelected(item);
    setVerificationDetail(null);
    setVerificationNote(item.note ?? "");
    setError("");
    try {
      const detail = await api<VerificationDetail>(`/api/admin/verifications/${item.providerId}`);
      setVerificationDetail(detail);
    } catch (err) {
      setVerificationDetail(null);
      setError(err instanceof Error ? err.message : "Не удалось открыть документы");
    }
  };

  const reviewVerification = async (status: "verified" | "rejected") => {
    if (!verificationSelected) return;
    setVerificationWorking(true);
    setError("");
    try {
      const detail = await api<VerificationDetail>(
        `/api/admin/verifications/${verificationSelected.providerId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...(verificationNote.trim() ? { note: verificationNote.trim() } : {}),
          }),
        },
      );
      setVerificationDetail(detail);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить решение");
    } finally {
      setVerificationWorking(false);
    }
  };


  const runImport = async (sourceName?: string) => {
    const key = sourceName ?? "all";
    setImportWorking(key);
    setError("");
    try {
      await api<{ results: Array<{ sourceName: string; status: string; imported: number; skipped: number }> }>("/api/admin/import/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceName ? { sourceName } : {}),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось запустить импорт");
    } finally {
      setImportWorking(null);
    }
  };

  const reloadImportConfig = async () => {
    setImportWorking("reload");
    setError("");
    try {
      const config = await api<ImportConfig>("/api/admin/import/reload", { method: "POST" });
      setImportConfig(config);
      setImportRuns(await api<ImportRun[]>("/api/admin/import/runs?limit=30"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось перечитать конфигурацию импорта");
    } finally {
      setImportWorking(null);
    }
  };

  const startCategoryCreate = () => {
    setCategoryEditingId(null);
    setCategoryCreating(true);
    setCategoryForm({
      name: "",
      iconName: "Wrench",
      emoji: "🔧",
      color: "#0B8FB6",
    });
  };

  const startCategoryEdit = (category: Category) => {
    setCategoryCreating(false);
    setCategoryEditingId(category.id);
    setCategoryForm({
      name: category.name,
      iconName: category.iconName,
      emoji: category.emoji,
      color: category.color,
    });
  };

  const cancelCategoryEdit = () => {
    setCategoryCreating(false);
    setCategoryEditingId(null);
  };

  const saveCategory = async () => {
    const payload = {
      name: categoryForm.name.trim(),
      iconName: categoryForm.iconName,
      emoji: categoryForm.emoji.trim(),
      color: categoryForm.color.trim(),
    };
    setCategoryWorking(true);
    setError("");
    try {
      await api(
        categoryCreating ? "/api/admin/categories" : `/api/admin/categories/${categoryEditingId}`,
        {
          method: categoryCreating ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      cancelCategoryEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить категорию");
    } finally {
      setCategoryWorking(false);
    }
  };


  const directoryItems: Array<AdminDirectoryItem<Doctor> | AdminDirectoryItem<CityOrganization>> = directoryTab === "doctors" ? doctors : cityServices;

  const selectDirectoryItem = (item: AdminDirectoryItem<Doctor> | AdminDirectoryItem<CityOrganization>) => {
    setDirectoryCreating(false);
    setDirectorySelectedId(item.id);
    setDirectoryDraft(JSON.stringify(item.record, null, 2));
  };

  const startDirectoryCreate = () => {
    setDirectorySelectedId(null);
    setDirectoryCreating(true);
    const template = directoryTab === "doctors"
      ? {
          name: "",
          specialty: "Терапевт",
          specialtyId: "therapist",
          locations: [{ clinic: "", address: "", city: "Грозный", schedule: "" }],
          experienceYears: 0,
          rating: 0,
          reviews: 0,
          price: "по запросу",
          phone: "",
          avatar: "",
        }
      : {
          categoryId: "contacts",
          name: "",
          subcategory: "",
          phone: "",
          address: "",
          hours: "",
          district: "",
        };
    setDirectoryDraft(JSON.stringify(template, null, 2));
  };

  const saveDirectory = async () => {
    setError("");
    let parsed: Record<string, unknown>;
    try {
      const value = JSON.parse(directoryDraft);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Запись должна быть JSON-объектом");
      }
      parsed = value as Record<string, unknown>;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Некорректный JSON");
      return;
    }

    const { id: _id, ...payload } = parsed;
    const base = directoryTab === "doctors"
      ? "/api/admin/directories/doctors"
      : "/api/admin/directories/city-services";
    const url = directoryCreating ? base : `${base}/${directorySelectedId}`;

    setDirectoryWorking(true);
    try {
      await api(url, {
        method: directoryCreating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setDirectoryCreating(false);
      setDirectorySelectedId(null);
      setDirectoryDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить запись");
    } finally {
      setDirectoryWorking(false);
    }
  };

  const toggleDirectoryVisibility = async (
    item: AdminDirectoryItem<Doctor> | AdminDirectoryItem<CityOrganization>,
  ) => {
    const base = directoryTab === "doctors"
      ? "/api/admin/directories/doctors"
      : "/api/admin/directories/city-services";

    setDirectoryWorking(true);
    setError("");
    try {
      await api(`${base}/${item.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !item.visible }),
      });
      if (directorySelectedId === item.id) {
        setDirectorySelectedId(null);
        setDirectoryDraft("");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить видимость записи");
    } finally {
      setDirectoryWorking(false);
    }
  };


  return (
    <div className="min-h-[100dvh] bg-background pb-12 safe-area-pt">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-extrabold uppercase tracking-[.16em]">GOVZA Admin</span>
            </div>
            <h1 className="mt-1 text-xl font-extrabold tracking-[-.035em]">Управление каталогом</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Обновить
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "Профили", value: summary?.totalProviders ?? "—", Icon: Database },
            { label: "Импорт", value: summary?.importedProviders ?? "—", Icon: Database },
            { label: "Скрыты", value: summary?.hiddenProviders ?? "—", Icon: EyeOff },
            { label: "На проверке", value: summary?.pendingVerifications ?? "—", Icon: ShieldCheck },
            { label: "Пользователи", value: summary?.users ?? "—", Icon: Users },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="premium-card p-4">
              <Icon className="h-4 w-4 text-primary" />
              <div className="mt-3 text-2xl font-extrabold">{String(value)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </section>

        <section className="premium-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${fieldClass} pl-9`}
                placeholder="Имя, телефон, источник, внешний ID…"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
              <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value)}>
                <option value="">Все типы</option>
                <option value="master">Мастера</option>
                <option value="organization">Организации</option>
              </select>
              <select className={fieldClass} value={source} onChange={(event) => setSource(event.target.value)}>
                <option value="">Все источники</option>
                <option value="manual">Ручные</option>
                <option value="import">Импорт</option>
              </select>
              <select className={fieldClass} value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                <option value="">Любая видимость</option>
                <option value="visible">В каталоге</option>
                <option value="hidden">Скрытые</option>
              </select>
              <select className={fieldClass} value={verification} onChange={(event) => setVerification(event.target.value)}>
                <option value="">Любая проверка</option>
                <option value="unverified">Не проверен</option>
                <option value="pending">На проверке</option>
                <option value="verified">Подтверждён</option>
                <option value="rejected">Отклонён</option>
              </select>
            </div>
            <Button onClick={() => setCreateOpen((value) => !value)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить
            </Button>
          </div>

          {createOpen && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-primary/15 bg-primary/[.035] p-4 md:grid-cols-5">
              <select
                className={fieldClass}
                value={createForm.providerType}
                onChange={(event) => setCreateForm((value) => ({ ...value, providerType: event.target.value }))}
              >
                <option value="master">Мастер</option>
                <option value="organization">Организация</option>
              </select>
              <input className={fieldClass} placeholder="Название / имя" value={createForm.name} onChange={(event) => setCreateForm((value) => ({ ...value, name: event.target.value }))} />
              <input className={fieldClass} placeholder="Телефон" value={createForm.phone} onChange={(event) => setCreateForm((value) => ({ ...value, phone: event.target.value }))} />
              <input className={fieldClass} placeholder="Город" value={createForm.city} onChange={(event) => setCreateForm((value) => ({ ...value, city: event.target.value }))} />
              <div className="flex gap-2">
                <input className={fieldClass} placeholder="Категории: 1,2" value={createForm.categoryIds} onChange={(event) => setCreateForm((value) => ({ ...value, categoryIds: event.target.value }))} />
                <Button disabled={working === "create"} onClick={() => void createProvider()}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
          <div className="space-y-3">
            {loading && providers.length === 0 ? (
              <div className="premium-card p-8 text-center text-sm text-muted-foreground">Загрузка каталога…</div>
            ) : providers.length === 0 ? (
              <div className="premium-card p-8 text-center text-sm text-muted-foreground">По фильтрам ничего не найдено.</div>
            ) : providers.map((provider) => (
              <article
                key={provider.id}
                className={`premium-card cursor-pointer p-4 transition ${selected?.id === provider.id ? "border-primary/40 ring-2 ring-primary/10" : ""}`}
                onClick={() => setSelected(provider)}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-extrabold">{displayName(provider)}</h2>
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {provider.providerType === "organization" ? "Организация" : "Мастер"}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${provider.dataSource === "import" ? "bg-sky-500/10 text-sky-700 dark:text-sky-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
                        {provider.dataSource === "import" ? "Импорт" : "Ручной"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>#{provider.id}</span>
                      <span>{textValue(provider.effectiveData.city) || "Город не указан"}</span>
                      <span>{textValue(provider.effectiveData.phone) || "Телефон не указан"}</span>
                      {provider.sourceName && <span>{provider.sourceName}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    <span className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-semibold">
                      {provider.verification.status === "verified"
                        ? "Подтверждён"
                        : provider.verification.status === "pending"
                          ? "На проверке"
                          : provider.verification.status === "rejected"
                            ? "Отклонён"
                            : "Не проверен"}
                    </span>
                    <Button
                      variant={provider.visible ? "outline" : "default"}
                      size="sm"
                      disabled={working === provider.id}
                      onClick={() => void mutateVisibility(provider)}
                    >
                      {provider.visible ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
                      {provider.visible ? "Скрыть" : "Вернуть"}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="premium-card p-5 xl:sticky xl:top-24">
              {!selected ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Выберите профиль слева, чтобы увидеть импортированные данные и ручные исправления.
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[.14em] text-primary">Редактирование</div>
                      <h3 className="mt-1 text-lg font-extrabold">{displayName(selected)}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">#{selected.id}</span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <input className={fieldClass} placeholder="Имя / название" value={editForm.name} onChange={(event) => setEditForm((value) => ({ ...value, name: event.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className={fieldClass} placeholder="Телефон" value={editForm.phone} onChange={(event) => setEditForm((value) => ({ ...value, phone: event.target.value }))} />
                      <input className={fieldClass} placeholder="Город" value={editForm.city} onChange={(event) => setEditForm((value) => ({ ...value, city: event.target.value }))} />
                    </div>
                    <input className={fieldClass} placeholder="Категории: 1, 2" value={editForm.categoryIds} onChange={(event) => setEditForm((value) => ({ ...value, categoryIds: event.target.value }))} />
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                      placeholder="Описание"
                      value={editForm.description}
                      onChange={(event) => setEditForm((value) => ({ ...value, description: event.target.value }))}
                    />
                    <Button disabled={working === "edit"} onClick={() => void saveSelected()}>
                      <Save className="mr-1.5 h-4 w-4" />
                      Сохранить ручные исправления
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <details className="rounded-xl border border-border p-3" open>
                      <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-wide">Импортированные данные</summary>
                      <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
                        {JSON.stringify(selected.importedData, null, 2)}
                      </pre>
                    </details>
                    <details className="rounded-xl border border-border p-3" open>
                      <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-wide">Ручные overrides</summary>
                      <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
                        {JSON.stringify(selected.manualOverrides, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="premium-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">Автозапчасти</div>
              <h2 className="mt-1 text-lg font-extrabold">Автомагазины и авторазборы</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Отдельный каталог: автомагазины и авторазборы не смешиваются с мастерами.
              </p>
            </div>
            <Button variant="outline" onClick={() => setAutoPartsOpen((value) => !value)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить магазин
            </Button>
          </div>

          {autoPartsOpen && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-primary/15 bg-primary/[.035] p-4 md:grid-cols-2 xl:grid-cols-4">
              <input className={fieldClass} placeholder="Название" value={autoPartsForm.name} onChange={(event) => setAutoPartsForm((value) => ({ ...value, name: event.target.value }))} />
              <select className={fieldClass} value={autoPartsForm.supplierType} onChange={(event) => setAutoPartsForm((value) => ({ ...value, supplierType: event.target.value }))}>
                <option value="store">Автомагазин</option>
                <option value="dismantler">Авторазбор</option>
              </select>
              <select className={fieldClass} value={autoPartsForm.partsCondition} onChange={(event) => setAutoPartsForm((value) => ({ ...value, partsCondition: event.target.value }))}>
                <option value="mixed">Новые и Б/У</option>
                <option value="new">Только новые</option>
                <option value="used">Только Б/У</option>
              </select>
              <select className={fieldClass} value={autoPartsForm.salesType} onChange={(event) => setAutoPartsForm((value) => ({ ...value, salesType: event.target.value }))}>
                <option value="retail">Розница</option>
                <option value="wholesale">Опт</option>
                <option value="both">Опт и розница</option>
              </select>
              <input className={fieldClass} placeholder="Город" value={autoPartsForm.city} onChange={(event) => setAutoPartsForm((value) => ({ ...value, city: event.target.value }))} />
              <input className={fieldClass} placeholder="Телефон" value={autoPartsForm.phone} onChange={(event) => setAutoPartsForm((value) => ({ ...value, phone: event.target.value }))} />
              <input className={fieldClass} placeholder="Марки: Toyota, BMW, Lada" value={autoPartsForm.brands} onChange={(event) => setAutoPartsForm((value) => ({ ...value, brands: event.target.value }))} />
              <input className={fieldClass} placeholder="Группы: кузов, оптика, двигатель" value={autoPartsForm.partGroups} onChange={(event) => setAutoPartsForm((value) => ({ ...value, partGroups: event.target.value }))} />

              <div className="rounded-xl border border-border bg-background p-3 md:col-span-2">
                <p className="mb-2 text-xs font-extrabold">Для какого авто</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    ["passenger", "Легковые"],
                    ["truck", "Грузовые"],
                    ["van", "Микроавтобусы"],
                    ["special", "Спецтехника"],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex min-h-10 items-center gap-2 rounded-lg bg-muted/40 px-2.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={autoPartsForm.vehicleTypes.includes(value)}
                        onChange={(event) => setAutoPartsForm((current) => ({
                          ...current,
                          vehicleTypes: event.target.checked
                            ? [...current.vehicleTypes, value]
                            : current.vehicleTypes.filter((item) => item !== value),
                        }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3 md:col-span-2">
                <p className="mb-2 text-xs font-extrabold">Производитель</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["foreign", "Иномарки"],
                    ["domestic", "Отечественные"],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex min-h-10 items-center gap-2 rounded-lg bg-muted/40 px-2.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={autoPartsForm.vehicleOrigins.includes(value)}
                        onChange={(event) => setAutoPartsForm((current) => ({
                          ...current,
                          vehicleOrigins: event.target.checked
                            ? [...current.vehicleOrigins, value]
                            : current.vehicleOrigins.filter((item) => item !== value),
                        }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm">
                <input type="checkbox" checked={autoPartsForm.delivery} onChange={(event) => setAutoPartsForm((value) => ({ ...value, delivery: event.target.checked }))} />
                Доставка
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm">
                <input type="checkbox" checked={autoPartsForm.pickup} onChange={(event) => setAutoPartsForm((value) => ({ ...value, pickup: event.target.checked }))} />
                Самовывоз
              </label>
              <Button className="xl:col-span-2" disabled={autoPartsWorking === "create" || autoPartsForm.name.trim().length < 2} onClick={() => void createAutoPartsSupplier()}>
                <Save className="mr-1.5 h-4 w-4" />
                Сохранить магазин
              </Button>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {autoPartsSuppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-extrabold">{supplier.name}</h3>
                      {!supplier.visible && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">скрыт</span>}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{supplier.dataSource}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      #{supplier.id} · {supplier.supplierType === "dismantler" ? "Авторазбор" : "Автомагазин"} · {supplier.partsCondition} · {supplier.city || "город не указан"}
                    </p>
                    {(supplier.vehicleTypes.length > 0 || supplier.vehicleOrigins.length > 0) && (
                      <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                        {[
                          ...supplier.vehicleTypes.map((item) => ({
                            passenger: "Легковые",
                            truck: "Грузовые",
                            van: "Микроавтобусы",
                            special: "Спецтехника",
                          })[item]),
                          ...supplier.vehicleOrigins.map((item) => item === "foreign" ? "Иномарки" : "Отечественные"),
                        ].join(", ")}
                      </p>
                    )}
                    {supplier.brands.length > 0 && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{supplier.brands.join(", ")}</p>}
                    <label className="mt-3 block text-[11px] font-bold text-muted-foreground">
                      Аккаунт организации
                      <select
                        className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-2 text-xs text-foreground"
                        value={supplier.ownerUserId ?? ""}
                        disabled={autoPartsWorking === supplier.id}
                        onChange={(event) => void setAutoPartsOwner(
                          supplier.id,
                          event.target.value ? Number(event.target.value) : null,
                        )}
                      >
                        <option value="">Не привязан</option>
                        {organizationAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} · #{account.id}{account.phone ? ` · ${account.phone}` : account.email ? ` · ${account.email}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Button
                    size="sm"
                    variant={supplier.visible ? "ghost" : "outline"}
                    disabled={autoPartsWorking === supplier.id}
                    onClick={() => void toggleAutoPartsVisibility(supplier)}
                  >
                    {supplier.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
            {autoPartsSuppliers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                Магазинов пока нет. Добавьте первый вручную или загрузите через import API.
              </div>
            )}
          </div>
        </section>

        <section className="premium-card p-5">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">Верификация</div>
            <h2 className="mt-1 text-lg font-extrabold">Очередь проверки документов</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Подтверждение через эту очередь синхронизирует публичный бейдж и сохраняет историю решения.
            </p>
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,.8fr)_minmax(420px,1.2fr)]">
            <div className="max-h-[620px] space-y-2 overflow-auto pr-1">
              {verificationQueue.map((item) => (
                <button
                  type="button"
                  key={item.providerId}
                  onClick={() => void openVerification(item)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${verificationSelected?.providerId === item.providerId ? "border-primary/50 bg-primary/[.035]" : "border-border/70"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-extrabold">{item.companyName || item.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        #{item.providerId} · {item.providerType === "organization" ? "Организация" : "Мастер"}
                        {item.phone ? ` · ${item.phone}` : ""}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${
                      item.status === "pending"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : item.status === "verified"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : item.status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Документов: {item.documentCount} · {new Date(item.submittedAt).toLocaleString("ru-RU")}
                  </div>
                </button>
              ))}
              {verificationQueue.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Заявок с документами пока нет.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/[.18] p-4">
              {!verificationSelected ? (
                <div className="grid min-h-[340px] place-items-center text-center">
                  <div>
                    <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-semibold">Выберите заявку</p>
                    <p className="mt-1 text-xs text-muted-foreground">Документы не публикуются в карточке исполнителя.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-[.12em] text-primary">
                        Проверка #{verificationSelected.providerId}
                      </div>
                      <h3 className="mt-1 font-extrabold">{verificationSelected.companyName || verificationSelected.name}</h3>
                      {verificationSelected.providerComment && (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          Комментарий исполнителя: {verificationSelected.providerComment}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{verificationSelected.status}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {(verificationDetail?.submission?.documents ?? []).map((document) => (
                      <div key={document.id} className="overflow-hidden rounded-xl border border-border bg-background">
                        <a href={document.image} target="_blank" rel="noreferrer">
                          <img src={document.image} alt={document.title} className="aspect-[4/3] w-full object-cover" />
                        </a>
                        <div className="p-2">
                          <p className="line-clamp-2 text-[11px] font-bold">{document.title}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{document.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <textarea
                    className="mt-4 min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                    placeholder="Комментарий решения. Для отклонения обязателен."
                    value={verificationNote}
                    onChange={(event) => setVerificationNote(event.target.value)}
                    maxLength={1000}
                  />

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/5"
                      disabled={verificationWorking || !verificationNote.trim()}
                      onClick={() => void reviewVerification("rejected")}
                    >
                      Отклонить
                    </Button>
                    <Button
                      disabled={verificationWorking}
                      onClick={() => void reviewVerification("verified")}
                    >
                      Подтвердить
                    </Button>
                  </div>

                  {(verificationDetail?.events.length ?? 0) > 0 && (
                    <details className="mt-4 rounded-xl border border-border bg-background p-3" open>
                      <summary className="cursor-pointer text-xs font-extrabold">История</summary>
                      <div className="mt-3 space-y-2">
                        {verificationDetail!.events.map((event) => (
                          <div key={event.id} className="grid gap-1 text-[11px] sm:grid-cols-[125px_1fr]">
                            <time className="text-muted-foreground">{new Date(event.createdAt).toLocaleString("ru-RU")}</time>
                            <div>
                              <span className="font-bold">{event.actorRole} · {event.action}</span>
                              {event.note && <span className="text-muted-foreground"> · {event.note}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="premium-card p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">Автоматический импорт</div>
              <h2 className="mt-1 text-lg font-extrabold">Источники providers</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Интернет-данные обновляют только importedData. Ручные исправления остаются в manualOverrides и имеют приоритет.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={importWorking !== null}
                onClick={() => void reloadImportConfig()}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Перечитать конфиг
              </Button>
              <Button
                disabled={importWorking !== null || !importConfig?.sources.some((item) => item.enabled)}
                onClick={() => void runImport()}
              >
                <Database className="mr-1.5 h-4 w-4" />
                Запустить все
              </Button>
            </div>
          </div>

          {importConfig?.configurationError && (
            <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Ошибка конфигурации: {importConfig.configurationError}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-muted/[.22] p-4">
              <div className="text-xs text-muted-foreground">Scheduler</div>
              <div className="mt-1 font-extrabold">{importConfig?.enabled ? "Включён" : "Выключен"}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Интервал: {importConfig?.intervalMinutes ?? "—"} мин
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/[.22] p-4">
              <div className="text-xs text-muted-foreground">Источники</div>
              <div className="mt-1 font-extrabold">{importConfig?.sources.length ?? 0}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Активных: {importConfig?.sources.filter((item) => item.enabled).length ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/[.22] p-4">
              <div className="text-xs text-muted-foreground">При старте сервера</div>
              <div className="mt-1 font-extrabold">{importConfig?.runOnStartup ? "Импортировать" : "Не запускать"}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Управляется environment config</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {(importConfig?.sources ?? []).map((item) => (
              <div key={item.name} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-extrabold">{item.name}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {item.adapter}
                      </span>
                      {!item.enabled && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                          disabled
                        </span>
                      )}
                    </div>
                    <div className="mt-2 break-all text-[11px] leading-relaxed text-muted-foreground">{item.url}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{item.providerType ?? "тип из JSON-LD"}</span>
                      <span>mapping: {item.categoryMappings}</span>
                      <span>max: {item.maxItems}</span>
                      <span>timeout: {item.timeoutMs} ms</span>
                      {item.hasCustomHeaders && <span>custom headers</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!item.enabled || importWorking !== null}
                    onClick={() => void runImport(item.name)}
                  >
                    Запустить
                  </Button>
                </div>
              </div>
            ))}
            {importConfig && importConfig.sources.length === 0 && !importConfig.configurationError && (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground lg:col-span-2">
                Источники пока не настроены. Движок готов; конфигурация читается из <code>PROVIDER_IMPORT_SOURCES_JSON</code>.
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="font-extrabold">Последние запуски</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 font-semibold">Источник</th>
                    <th className="px-2 py-2 font-semibold">Статус</th>
                    <th className="px-2 py-2 font-semibold">Trigger</th>
                    <th className="px-2 py-2 font-semibold">Fetched</th>
                    <th className="px-2 py-2 font-semibold">Imported</th>
                    <th className="px-2 py-2 font-semibold">Skipped</th>
                    <th className="px-2 py-2 font-semibold">Время</th>
                  </tr>
                </thead>
                <tbody>
                  {importRuns.map((run) => (
                    <tr key={run.id} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-2 font-semibold">{run.sourceName}</td>
                      <td className="px-2 py-2">{run.status}</td>
                      <td className="px-2 py-2 text-muted-foreground">{run.trigger}</td>
                      <td className="px-2 py-2">{run.fetched}</td>
                      <td className="px-2 py-2">{run.imported}</td>
                      <td className="px-2 py-2">{run.skipped}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {new Date(run.startedAt).toLocaleString("ru-RU")}
                      </td>
                    </tr>
                  ))}
                  {importRuns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-2 py-8 text-center text-muted-foreground">Запусков пока нет.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {importRuns.some((run) => run.errors.length > 0) && (
              <details className="mt-3 rounded-xl border border-border p-3">
                <summary className="cursor-pointer text-xs font-extrabold">Ошибки последних запусков</summary>
                <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
                  {importRuns.filter((run) => run.errors.length > 0).slice(0, 5).map((run) => (
                    <div key={run.id}>
                      <span className="font-bold text-foreground">{run.sourceName}:</span> {run.errors.slice(0, 5).join(" · ")}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>

        <section className="premium-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">Категории услуг</div>
              <h2 className="mt-1 text-lg font-extrabold">Управление категориями мастеров</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                ID категории стабилен. Переименование автоматически применяется к профилям и открытым заявкам.
              </p>
            </div>
            <Button variant="outline" onClick={startCategoryCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить категорию
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => startCategoryEdit(category)}
                className={`rounded-2xl border p-4 text-left transition hover:border-primary/30 ${categoryEditingId === category.id ? "border-primary/50 bg-primary/[.035]" : "border-border/70"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
                    style={{ backgroundColor: `${category.color}18` }}
                  >
                    {category.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-extrabold">{category.name}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      #{category.id} · {category.iconName} · {category.color}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {(categoryCreating || categoryEditingId !== null) && (
            <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[.035] p-4">
              <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_.7fr_.8fr_auto]">
                <input
                  className={fieldClass}
                  placeholder="Название категории"
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((value) => ({ ...value, name: event.target.value }))}
                />
                <select
                  className={fieldClass}
                  value={categoryForm.iconName}
                  onChange={(event) => setCategoryForm((value) => ({ ...value, iconName: event.target.value }))}
                >
                  {["Wrench", "Zap", "Sparkles", "Hammer", "Palette", "Car", "Package", "BookOpen"].map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <input
                  className={fieldClass}
                  placeholder="Emoji"
                  value={categoryForm.emoji}
                  onChange={(event) => setCategoryForm((value) => ({ ...value, emoji: event.target.value }))}
                />
                <input
                  className={fieldClass}
                  placeholder="#0B8FB6"
                  value={categoryForm.color}
                  onChange={(event) => setCategoryForm((value) => ({ ...value, color: event.target.value }))}
                />
                <div className="flex gap-2">
                  <Button disabled={categoryWorking} onClick={() => void saveCategory()}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" disabled={categoryWorking} onClick={cancelCategoryEdit}>
                    Отмена
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="premium-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">Справочники</div>
              <h2 className="mt-1 text-lg font-extrabold">Врачи и городские контакты</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Seed-записи остаются базой, ручные изменения и скрытия сохраняются в PostgreSQL.
              </p>
            </div>
            <Button variant="outline" onClick={startDirectoryCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить запись
            </Button>
          </div>

          <div className="mt-4 flex w-fit rounded-2xl bg-muted/70 p-1">
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${directoryTab === "doctors" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              onClick={() => {
                setDirectoryTab("doctors");
                setDirectorySelectedId(null);
                setDirectoryCreating(false);
                setDirectoryDraft("");
              }}
            >
              Врачи · {doctors.length}
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${directoryTab === "city-services" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              onClick={() => {
                setDirectoryTab("city-services");
                setDirectorySelectedId(null);
                setDirectoryCreating(false);
                setDirectoryDraft("");
              }}
            >
              Службы и контакты · {cityServices.length}
            </button>
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.9fr)]">
            <div className="max-h-[620px] space-y-2 overflow-auto pr-1">
              {directoryItems.map((item) => {
                const record = item.record as Doctor | CityOrganization;
                const isDoctor = directoryTab === "doctors";
                const meta = isDoctor
                  ? (record as Doctor).specialty
                  : `${(record as CityOrganization).subcategory} · ${(record as CityOrganization).categoryId}`;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-3 transition ${directorySelectedId === item.id ? "border-primary/40 bg-primary/[.035]" : "border-border/70"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => selectDirectoryItem(item)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-bold">{record.name}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                            {item.origin === "seed" ? "seed" : item.origin === "override" ? "override" : "manual"}
                          </span>
                          {!item.visible && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                              скрыто
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          #{item.id} · {meta}
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant={item.visible ? "ghost" : "outline"}
                        disabled={directoryWorking}
                        onClick={() => void toggleDirectoryVisibility(item)}
                      >
                        {item.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/[.18] p-4">
              {directoryDraft ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-[.12em] text-primary">
                        {directoryCreating ? "Новая запись" : `Редактирование #${directorySelectedId}`}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Поля валидируются на сервере перед сохранением.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={directoryWorking}
                      onClick={() => void saveDirectory()}
                    >
                      <Save className="mr-1.5 h-4 w-4" />
                      Сохранить
                    </Button>
                  </div>
                  <textarea
                    className="mt-4 min-h-[470px] w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                    value={directoryDraft}
                    onChange={(event) => setDirectoryDraft(event.target.value)}
                    spellCheck={false}
                  />
                </>
              ) : (
                <div className="grid min-h-[360px] place-items-center text-center">
                  <div>
                    <Database className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-semibold">Выберите запись</p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                      Здесь можно изменить все поля записи или создать новую. Изменения сразу становятся persistent override.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="premium-card p-5">
          <h2 className="text-lg font-extrabold">Журнал действий</h2>
          <div className="mt-4 divide-y divide-border/70">
            {audit.map((entry) => (
              <div key={entry.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[180px_1fr_170px] sm:gap-4">
                <span className="font-semibold">{entry.action}</span>
                <span className="text-muted-foreground">
                  {entry.entityType} #{entry.entityId} · {entry.adminName || "system"}
                </span>
                <time className="text-xs text-muted-foreground sm:text-right">
                  {new Date(entry.createdAt).toLocaleString("ru-RU")}
                </time>
              </div>
            ))}
            {audit.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Журнал пока пуст.</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
