import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AvailabilityDayView, AvailabilityStatus } from "@shared/provider-engagement-schema";

import { useServiceClock } from "@/hooks/use-master-memory";
import { serviceNow, upcomingDates } from "@shared/service-time";

const emptyAvailability: AvailabilityDayView[] = [];

type DraftDay = {
  status: AvailabilityStatus | "unset";
  fromTime: string;
  toTime: string;
  note: string;
};

export function ProviderAvailabilityCard({
  defaultFrom,
  defaultTo,
}: {
  defaultFrom: string;
  defaultTo: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const clock = useServiceClock();
  const from = serviceNow(clock).date;
  const dates = useMemo(() => upcomingDates(31, new Date(`${from}T12:00:00Z`)), [from]);

  const { data: availability = emptyAvailability, isLoading, isError, refetch } = useQuery<AvailabilityDayView[]>({
    queryKey: ["/api/providers/me/availability", from, 31],
    staleTime: 30_000, refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch(`/api/providers/me/availability?from=${from}&days=31`);
      if (!response.ok) throw new Error("Не удалось загрузить расписание");
      return response.json();
    },
  });

  const [draft, setDraft] = useState<Record<string, DraftDay>>({});

  useEffect(() => {
    const rows = new Map(availability.map((day) => [day.date, day]));
    const next: Record<string, DraftDay> = {};
    for (const date of dates) {
      const key = date;
      const row = rows.get(key);
      next[key] = {
        status: row?.status ?? "unset",
        fromTime: row?.fromTime ?? defaultFrom,
        toTime: row?.toTime ?? defaultTo,
        note: row?.note ?? "",
      };
    }
    setDraft(next);
  }, [availability, dates, defaultFrom, defaultTo]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const original = new Map(availability.map((day) => [day.date, day]));
      const upserts = dates.flatMap((date) => {
        const key = date;
        const day = draft[key];
        if (!day || day.status === "unset") return [];
        const previous = original.get(key);
        const unchanged =
          previous?.status === day.status &&
          (previous.fromTime ?? "") === (day.status === "available" ? day.fromTime : "") &&
          (previous.toTime ?? "") === (day.status === "available" ? day.toTime : "") &&
          (previous.note ?? "") === day.note.trim();
        if (unchanged) return [];
        return [{
          date: key,
          status: day.status,
          ...(day.status === "available" ? { fromTime: day.fromTime, toTime: day.toTime } : {}),
          ...(day.note.trim() ? { note: day.note.trim() } : {}),
        }];
      });

      const deletions = dates
        .map((date) => date)
        .filter((key) => original.has(key) && draft[key]?.status === "unset");

      if (upserts.length > 0) {
        await apiRequest("PUT", "/api/providers/me/availability", { days: upserts });
      }
      await Promise.all(
        deletions.map((date) => apiRequest("DELETE", `/api/providers/me/availability/${date}`)),
      );
      return { changed: upserts.length + deletions.length };
    },
    onSuccess: async ({ changed }) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["/api/providers/me/availability"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/providers"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/catalog/availability-today"] })]);
      toast({
        title: changed > 0 ? "Расписание сохранено" : "Изменений нет",
        description: changed > 0 ? "Клиенты увидят актуальную доступность в вашем профиле." : undefined,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Не удалось сохранить расписание", description: error.message, variant: "destructive" });
    },
  });

  const setDay = (key: string, patch: Partial<DraftDay>) => {
    setDraft((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  return (
    <section className="premium-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            Календарь доступности
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Укажите свободные окна на ближайшие 31 день. Неуказанный день не считается свободным.
          </p>
        </div>
        <Button size="sm" disabled={isLoading || isError || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          <Save className="mr-1.5 h-4 w-4" />
          Сохранить
        </Button>
      </div>

      {isError && <p role="alert" className="mt-3 text-sm text-destructive">Расписание не загрузилось. <button onClick={() => void refetch()} className="min-h-11 underline">Повторить</button></p>}
      <p className="mt-2 text-xs text-muted-foreground">Время по Москве. Отметка «Свободен сегодня» исчезнет после окончания окна.</p>
      <fieldset disabled={isLoading || isError || saveMutation.isPending} className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {dates.map((date, index) => {
          const key = date;
          const day = draft[key] ?? {
            status: "unset" as const,
            fromTime: defaultFrom,
            toTime: defaultTo,
            note: "",
          };
          const label = index === 0
            ? "Сегодня"
            : index === 1
              ? "Завтра"
              : new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

          return (
            <div key={key} className="rounded-2xl border border-border/70 bg-muted/25 p-3">
              <div className="grid gap-2 sm:grid-cols-[110px_150px_1fr] sm:items-center">
                <div>
                  <p className="text-sm font-bold">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{key}</p>
                </div>
                <select
                  aria-label={`Доступность ${key}`}
                  value={day.status}
                  onChange={(event) => setDay(key, { status: event.target.value as DraftDay["status"] })}
                  className="h-10 rounded-xl border border-border bg-background px-2 text-sm"
                >
                  <option value="unset">Не указано</option>
                  <option value="available">Свободен</option>
                  <option value="busy">Занят</option>
                  <option value="off">Выходной</option>
                </select>
                {day.status === "available" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`Начало окна ${key}`}
                      value={day.fromTime}
                      onChange={(event) => setDay(key, { fromTime: event.target.value })}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-2 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">—</span>
                    <input
                      type="time"
                      aria-label={`Конец окна ${key}`}
                      value={day.toTime}
                      onChange={(event) => setDay(key, { toTime: event.target.value })}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-2 text-sm"
                    />
                  </div>
                ) : (
                  <input
                    aria-label={`Комментарий ${key}`}
                    value={day.note}
                    onChange={(event) => setDay(key, { note: event.target.value })}
                    maxLength={160}
                    placeholder={day.status === "busy" ? "Например: занят до вечера" : "Комментарий (необязательно)"}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />
                )}
              </div>
            </div>
          );
        })}
      </fieldset>
    </section>
  );
}
