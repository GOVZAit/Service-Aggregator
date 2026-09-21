import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type ReviewStatus = "visible" | "hidden";
type ReportStatus = "open" | "resolved" | "dismissed";
type TargetType = "provider" | "review";

interface AdminReview {
  id: number;
  orderId: number;
  masterId: number;
  providerName: string;
  clientName: string;
  service: string;
  rating: number;
  comment: string;
  providerReply: string | null;
  moderationStatus: ReviewStatus;
  moderationNote: string | null;
  moderatedAt: string | null;
  createdAt: string;
}

interface AdminReport {
  id: number;
  reporterName: string;
  targetType: TargetType;
  targetId: number;
  targetLabel: string;
  reason: string;
  details: string;
  status: ReportStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const reasonLabels: Record<string, string> = {
  spam: "Спам / реклама",
  abuse: "Недопустимый контент",
  misleading: "Недостоверная информация",
  privacy: "Приватность / персональные данные",
  other: "Другое",
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: init?.body ? {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    } : init?.headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Ошибка запроса");
  return data as T;
}

export default function AdminModerationPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"reports" | "reviews">("reports");
  const [reportStatus, setReportStatus] = useState<"open" | "all">("open");
  const [reviewStatus, setReviewStatus] = useState<"all" | ReviewStatus>("all");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [nextReports, nextReviews] = await Promise.all([
        request<AdminReport[]>(`/api/admin/moderation/reports?status=${reportStatus}`),
        request<AdminReview[]>(`/api/admin/moderation/reviews?status=${reviewStatus}`),
      ]);
      setReports(nextReports);
      setReviews(nextReviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить очередь модерации");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [reportStatus, reviewStatus]);

  const moderateReview = async (reviewId: number, status: ReviewStatus, note = "") => {
    const key = `review-${reviewId}`;
    setWorking(key);
    try {
      await request(`/api/admin/moderation/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note || undefined }),
      });
      toast({ title: status === "hidden" ? "Отзыв скрыт" : "Отзыв снова опубликован" });
      await load();
    } catch (err) {
      toast({
        title: "Не удалось изменить отзыв",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  };

  const resolveReport = async (reportId: number, status: "resolved" | "dismissed", note = "") => {
    const key = `report-${reportId}`;
    setWorking(key);
    try {
      await request(`/api/admin/moderation/reports/${reportId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note || undefined }),
      });
      toast({ title: status === "resolved" ? "Жалоба закрыта" : "Жалоба отклонена" });
      await load();
    } catch (err) {
      toast({
        title: "Не удалось закрыть жалобу",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  };

  const hideTargetAndResolve = async (report: AdminReport) => {
    const key = `report-${report.id}`;
    setWorking(key);
    try {
      if (report.targetType === "review") {
        await request(`/api/admin/moderation/reviews/${report.targetId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "hidden",
            note: `Скрыто по жалобе #${report.id}`,
          }),
        });
      } else {
        await request(`/api/admin/providers/${report.targetId}/visibility`, {
          method: "POST",
          body: JSON.stringify({ visible: false }),
        });
      }

      await request(`/api/admin/moderation/reports/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "resolved",
          note: report.targetType === "review"
            ? "Отзыв скрыт"
            : "Профиль скрыт",
        }),
      });

      toast({
        title: report.targetType === "review" ? "Отзыв скрыт, жалоба закрыта" : "Профиль скрыт, жалоба закрыта",
      });
      await load();
    } catch (err) {
      toast({
        title: "Действие не выполнено",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-12 safe-area-pt">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl" aria-label="Назад в админ-панель">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-primary">
                <ShieldAlert className="h-5 w-5" />
                <span className="text-xs font-extrabold uppercase tracking-[.14em]">GOVZA Admin</span>
              </div>
              <h1 className="truncate text-xl font-extrabold tracking-[-.035em]">Модерация и жалобы</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Обновить
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 rounded-2xl bg-muted/70 p-1">
          <button
            type="button"
            onClick={() => setTab("reports")}
            className={`min-h-11 rounded-xl text-sm font-bold transition ${tab === "reports" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Жалобы · {reports.filter((item) => item.status === "open").length}
          </button>
          <button
            type="button"
            onClick={() => setTab("reviews")}
            className={`min-h-11 rounded-xl text-sm font-bold transition ${tab === "reviews" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Отзывы · {reviews.length}
          </button>
        </div>

        {tab === "reports" ? (
          <section className="space-y-4">
            <div className="flex gap-2">
              {(["open", "all"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setReportStatus(status)}
                  className={`rounded-full px-3 py-2 text-xs font-bold ${reportStatus === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {status === "open" ? "Открытые" : "Все"}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((id) => <div key={id} className="h-52 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : reports.length === 0 ? (
              <div className="premium-card py-14 text-center">
                <Flag className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 font-bold">Жалоб в этой очереди нет</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {reports.map((report) => (
                  <article key={report.id} className="premium-card space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-primary">
                          Жалоба #{report.id} · {report.targetType === "review" ? "отзыв" : "профиль"}
                        </div>
                        <h2 className="mt-1 font-extrabold">{report.targetLabel}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">От: {report.reporterName}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        report.status === "open"
                          ? "bg-amber-500/10 text-amber-700"
                          : report.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {report.status}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-muted/55 p-3">
                      <p className="text-xs font-bold">{reasonLabels[report.reason] ?? report.reason}</p>
                      {report.details && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{report.details}</p>}
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {new Date(report.createdAt).toLocaleString("ru-RU")}
                    </p>

                    {report.status === "open" && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={working === `report-${report.id}`}
                          onClick={() => void hideTargetAndResolve(report)}
                        >
                          <EyeOff className="mr-1.5 h-4 w-4" />
                          {report.targetType === "review" ? "Скрыть отзыв" : "Скрыть профиль"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={working === `report-${report.id}`}
                          onClick={() => void resolveReport(report.id, "resolved", "Проверено без скрытия")}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Решено
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="sm:col-span-2"
                          disabled={working === `report-${report.id}`}
                          onClick={() => void resolveReport(report.id, "dismissed", "Нарушение не подтверждено")}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Отклонить жалобу
                        </Button>
                      </div>
                    )}

                    {report.resolutionNote && (
                      <p className="rounded-xl bg-background px-3 py-2 text-xs text-muted-foreground">
                        Решение: {report.resolutionNote}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "visible", "hidden"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setReviewStatus(status)}
                  className={`rounded-full px-3 py-2 text-xs font-bold ${reviewStatus === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {status === "all" ? "Все" : status === "visible" ? "Опубликованы" : "Скрыты"}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((id) => <div key={id} className="h-52 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : reviews.length === 0 ? (
              <div className="premium-card py-14 text-center">
                <p className="font-bold">Отзывов в этом фильтре нет</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {reviews.map((review) => (
                  <article key={review.id} className="premium-card space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-extrabold">{review.providerName}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {review.clientName} · {review.service} · {review.rating}/5
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        review.moderationStatus === "hidden"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-emerald-500/10 text-emerald-700"
                      }`}>
                        {review.moderationStatus === "hidden" ? "скрыт" : "виден"}
                      </span>
                    </div>

                    <p className="rounded-2xl bg-muted/55 p-3 text-sm leading-relaxed">
                      {review.comment || "Отзыв без текстового комментария"}
                    </p>

                    {review.providerReply && (
                      <p className="rounded-xl bg-primary/[0.06] px-3 py-2 text-xs">
                        Ответ исполнителя: {review.providerReply}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {review.moderationStatus === "visible" ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={working === `review-${review.id}`}
                          onClick={() => void moderateReview(review.id, "hidden", "Скрыто администратором")}
                        >
                          <EyeOff className="mr-1.5 h-4 w-4" /> Скрыть
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={working === `review-${review.id}`}
                          onClick={() => void moderateReview(review.id, "visible", "Возвращено администратором")}
                        >
                          <Eye className="mr-1.5 h-4 w-4" /> Вернуть
                        </Button>
                      )}
                      <Link href={`/master/${review.masterId}`}>
                        <Button size="sm" variant="ghost">Открыть профиль</Button>
                      </Link>
                    </div>

                    {review.moderationNote && (
                      <p className="text-[11px] text-muted-foreground">Модерация: {review.moderationNote}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
