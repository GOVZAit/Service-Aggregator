import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileCheck2, ImagePlus, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VerificationDocument, VerificationDocumentType } from "@shared/verification-schema";

interface VerificationEventView {
  id: number;
  actorRole: "provider" | "admin" | "system";
  action: "submitted" | "resubmitted" | "verified" | "rejected" | "reset";
  note: string | null;
  createdAt: string;
}

interface VerificationState {
  status: "unverified" | "pending" | "verified" | "rejected";
  note: string | null;
  updatedAt: string | null;
  submission: {
    documents: VerificationDocument[];
    providerComment: string;
    submittedAt: string;
    updatedAt: string;
  } | null;
  events: VerificationEventView[];
}

const typeLabels: Record<VerificationDocumentType, string> = {
  identity: "Документ, удостоверяющий личность",
  qualification: "Диплом / квалификация",
  self_employed: "Самозанятость",
  business: "Документы организации / ИП",
  license: "Лицензия / разрешение",
  other: "Другой документ",
};

const statusCopy: Record<VerificationState["status"], { title: string; body: string; className: string }> = {
  unverified: {
    title: "Профиль не проверен",
    body: "Отправьте документы, чтобы администратор мог подтвердить профиль.",
    className: "border-border bg-muted/30",
  },
  pending: {
    title: "Документы на проверке",
    body: "Заявка отправлена. После решения вы получите уведомление.",
    className: "border-amber-500/25 bg-amber-500/5",
  },
  verified: {
    title: "Профиль подтверждён",
    body: "Статус «Проверен» отображается клиентам.",
    className: "border-emerald-500/25 bg-emerald-500/5",
  },
  rejected: {
    title: "Нужно исправить документы",
    body: "Проверьте комментарий администратора и отправьте документы повторно.",
    className: "border-destructive/25 bg-destructive/5",
  },
};

async function submitVerification(documents: VerificationDocument[], comment: string) {
  const response = await fetch("/api/providers/me/verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documents,
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Не удалось отправить документы");
  return data as VerificationState;
}

function randomDocumentId() {
  if ("randomUUID" in crypto) return crypto.randomUUID();
  return `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ProviderVerificationCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<VerificationState>({
    queryKey: ["/api/providers/me/verification"],
  });
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [comment, setComment] = useState("");
  const [documentType, setDocumentType] = useState<VerificationDocumentType>("identity");
  const [documentTitle, setDocumentTitle] = useState("");
  const [message, setMessage] = useState("");

  const status = data?.status ?? "unverified";
  const copy = statusCopy[status];

  const existingDocuments = useMemo(
    () => data?.submission?.documents ?? [],
    [data?.submission?.documents],
  );

  const mutation = useMutation({
    mutationFn: () => submitVerification(documents.length > 0 ? documents : existingDocuments, comment),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/providers/me/verification"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/providers/me"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/masters"] }),
      ]);
      setDocuments([]);
      setComment("");
      setMessage("Документы отправлены на проверку");
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const addDocument = (file: File | undefined) => {
    setMessage("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Поддерживаются JPEG, PNG и WebP");
      return;
    }
    if (file.size > 900_000) {
      setMessage("Фото документа должно быть меньше 900 КБ");
      return;
    }
    if (documents.length >= 5) {
      setMessage("Можно отправить не более 5 документов");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === "string" ? reader.result : "";
      if (!image) return;
      const title = documentTitle.trim() || typeLabels[documentType];
      setDocuments((current) => [
        ...current,
        {
          id: randomDocumentId(),
          type: documentType,
          title,
          image,
        },
      ]);
      setDocumentTitle("");
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return <section className="premium-card h-40 animate-pulse bg-muted/45" />;
  }

  const canSubmit = documents.length > 0 || existingDocuments.length > 0;
  const allowSubmission = status !== "pending";

  return (
    <section className="premium-card overflow-hidden">
      <div className="border-b border-border/70 p-4">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Верификация профиля</h3>
            <p className="text-xs text-muted-foreground">Документы видны только вам и администраторам GOVZA.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className={cn("rounded-2xl border p-4", copy.className)}>
          <div className="flex items-start gap-3">
            {status === "verified"
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              : <ShieldAlert className={cn("mt-0.5 h-5 w-5 shrink-0", status === "rejected" ? "text-destructive" : "text-primary")} />}
            <div>
              <p className="text-sm font-extrabold">{copy.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
              {data?.note && (
                <p className="mt-2 rounded-xl bg-background/70 px-3 py-2 text-xs">
                  <span className="font-bold">Комментарий администратора:</span> {data.note}
                </p>
              )}
            </div>
          </div>
        </div>

        {existingDocuments.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Последняя подача</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {existingDocuments.map((document) => (
                <div key={document.id} className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                  <img src={document.image} alt={document.title} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] font-bold">{document.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{typeLabels[document.type]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allowSubmission && (
          <>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as VerificationDocumentType)}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                value={documentTitle}
                onChange={(event) => setDocumentTitle(event.target.value)}
                placeholder="Название документа (необязательно)"
              />
              <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/40 px-4 text-sm font-bold text-primary">
                <ImagePlus className="mr-1.5 h-4 w-4" />
                Фото
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    addDocument(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {documents.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {documents.map((document) => (
                  <div key={document.id} className="relative overflow-hidden rounded-xl border border-primary/25">
                    <img src={document.image} alt={document.title} className="aspect-[4/3] w-full object-cover" />
                    <div className="p-2 pr-10">
                      <p className="line-clamp-2 text-[11px] font-bold">{document.title}</p>
                    </div>
                    <button
                      type="button"
                      className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-lg bg-background/90 text-destructive shadow"
                      aria-label={`Удалить ${document.title}`}
                      onClick={() => setDocuments((current) => current.filter((item) => item.id !== document.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              placeholder="Комментарий для администратора (необязательно)"
            />

            <Button
              className="w-full rounded-xl"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === "rejected" || existingDocuments.length > 0 ? "Отправить повторно" : "Отправить на проверку"}
            </Button>
          </>
        )}

        {message && (
          <p className={cn("text-xs font-semibold", message.includes("отправлены") ? "text-emerald-600" : "text-destructive")}>
            {message}
          </p>
        )}

        {(data?.events.length ?? 0) > 0 && (
          <details className="rounded-xl border border-border/70 p-3">
            <summary className="cursor-pointer text-xs font-extrabold">История верификации</summary>
            <div className="mt-3 space-y-2">
              {data!.events.map((event) => (
                <div key={event.id} className="flex gap-3 text-[11px]">
                  <time className="w-28 shrink-0 text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString("ru-RU")}
                  </time>
                  <div>
                    <span className="font-bold">{event.action}</span>
                    {event.note && <span className="text-muted-foreground"> · {event.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
