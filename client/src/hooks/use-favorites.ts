import { useRef } from "react";
import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FavoriteChange = { masterId: number; remove: boolean; ownerId: number };
const changeOne = (ids: number[], id: number, present: boolean) =>
  present ? [id, ...ids.filter((item) => item !== id)] : ids.filter((item) => item !== id);

export function useFavorites() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const client = useQueryClient();
  const ownerId = user?.role === "client" ? user.id : null;
  const currentOwner = useRef(ownerId);
  currentOwner.current = ownerId;
  const queryKey = ["/api/favorites", ownerId] as const;
  const mutationKey = ["favorite-change", ownerId] as const;
  const pending = useMutationState<number>({
    filters: { mutationKey, status: "pending" },
    select: (mutation) => (mutation.state.variables as FavoriteChange).masterId,
  });
  const query = useQuery<number[]>({
    queryKey, enabled: ownerId !== null && pending.length === 0,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/favorites", { signal, credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить избранное");
      return response.json();
    },
    staleTime: 15_000, refetchOnWindowFocus: true, refetchInterval: 30_000,
  });
  const mutation = useMutation({
    mutationKey, networkMode: "always", retry: false,
    mutationFn: async ({ masterId, remove, ownerId: actor }: FavoriteChange) => {
      if (currentOwner.current !== actor) throw new Error("Аккаунт изменился");
      await apiRequest(remove ? "DELETE" : "POST", `/api/favorites/${masterId}`);
    },
    onMutate: async ({ masterId, remove }) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<number[]>(queryKey) ?? [];
      client.setQueryData<number[]>(queryKey, (ids = []) => changeOne(ids, masterId, !remove));
      return { wasFavorite: previous.includes(masterId) };
    },
    onError: (_error, { masterId, ownerId: actor }, context) => {
      if (currentOwner.current !== actor) return;
      // Roll back only this item; another in-flight favorite must not be overwritten.
      client.setQueryData<number[]>(queryKey, (ids = []) => changeOne(ids, masterId, context?.wasFavorite ?? false));
      toast({ title: "Избранное не сохранено", description: "Изменение отменено. Проверьте соединение и повторите.", variant: "destructive" });
    },
    onSettled: () => {
      if (client.isMutating({ mutationKey }) === 1) return client.invalidateQueries({ queryKey });
    },
  });

  const toggle = (masterId: number, event?: { preventDefault(): void; stopPropagation(): void }) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (authLoading) return;
    if (ownerId === null) { navigate("/auth"); return; }
    if (query.isPending || query.isError) { void query.refetch(); return; }
    const alreadyPending = client.getMutationCache().findAll({ mutationKey, status: "pending" })
      .some((item) => (item.state.variables as FavoriteChange).masterId === masterId);
    if (alreadyPending) return;
    const ids = client.getQueryData<number[]>(queryKey) ?? [];
    mutation.mutate({ masterId, remove: ids.includes(masterId), ownerId });
  };

  return {
    favorites: ownerId === null ? [] : query.data ?? [], toggle,
    isPending: (id: number) => authLoading || (ownerId !== null && (query.isPending || pending.includes(id))),
    isLoading: ownerId !== null && query.isPending, isError: ownerId !== null && query.isError,
    refetch: query.refetch,
  };
}
