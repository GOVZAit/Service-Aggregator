import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isAvailableToday, serviceNow } from "@shared/service-time";
import type { RecentMasterView, TodayAvailability } from "@shared/client-memory";
import type { Master } from "@shared/schema";

export function useServiceClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const interval = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { clearInterval(interval); window.removeEventListener("focus", update); };
  }, []);
  return now;
}

export function useTodayAvailability() {
  const now = useServiceClock();
  const query = useQuery<TodayAvailability>({
    queryKey: ["/api/catalog/availability-today", serviceNow(now).date],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/catalog/availability-today", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось проверить доступность");
      return response.json();
    },
    staleTime: 30_000, refetchInterval: 60_000, refetchOnWindowFocus: true,
  });
  const availableIds = useMemo(() => new Set(Object.entries(query.isError ? {} : query.data?.providers ?? {})
    .filter(([, day]) => isAvailableToday(day, now)).map(([id]) => Number(id))), [query.data, query.isError, now]);
  return { ...query, availableIds };
}

export function useRecentMasters() {
  const { user } = useAuth();
  const client = useQueryClient();
  const { toast } = useToast();
  const ownerId = user?.role === "client" ? user.id : null;
  const queryKey = ["/api/recent-masters", ownerId] as const;
  const query = useQuery<RecentMasterView[]>({
    queryKey, enabled: ownerId !== null,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/recent-masters", { signal, cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Не удалось загрузить историю");
      return response.json();
    },
    staleTime: 30_000, refetchOnWindowFocus: true,
  });
  const clear = useMutation({
    mutationKey: ["clear-recent-masters", ownerId], networkMode: "always", retry: false,
    mutationFn: () => apiRequest("DELETE", "/api/recent-masters"),
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: () => { client.setQueryData(queryKey, []); },
    onError: () => toast({ title: "История не очищена", description: "Проверьте соединение и повторите.", variant: "destructive" }),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  return { ...query, data: ownerId === null ? [] : query.data ?? [], clear };
}

export function useRecordMasterView(master: Master | undefined) {
  const { user } = useAuth();
  const client = useQueryClient();
  const ownerId = user?.role === "client" ? user.id : null;
  const id = master?.id;
  const visible = master?.isVisible !== false;
  useEffect(() => {
    if (!ownerId || !id || !visible) return;
    const controller = new AbortController();
    void fetch(`/api/recent-masters/${id}`, {
      method: "POST", credentials: "include", signal: controller.signal,
    }).then((response) => {
      if (response.ok) return client.invalidateQueries({ queryKey: ["/api/recent-masters", ownerId] });
    }).catch(() => { /* Best effort: a history write must not prevent opening a profile. */ });
    return () => controller.abort();
  }, [id, visible, ownerId, client]);
}
