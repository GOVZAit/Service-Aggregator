import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, AdminApiError } from "./admin-api";
import { useAdminConfirm } from "./admin-confirm";

interface AdminRuntime {
  userId: number;
  busy: boolean;
  error: string;
  success: string;
  denied: boolean;
  clearMessage: () => void;
  onDenied: () => void;
  confirm: (message: string) => Promise<boolean>;
  act: (url: string, method: string, body?: unknown, question?: string, successMessage?: string) => Promise<boolean>;
}
const Context = createContext<AdminRuntime | null>(null);
export function useAdminRuntime() {
  const value = useContext(Context);
  if (!value) throw new Error("Admin runtime is required");
  return value;
}
export function AdminRuntimeProvider({ userId, children }: { userId: number; children: ReactNode }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [denied, setDenied] = useState(false);
  const locked = useRef(false);
  const alive = useRef(true);
  const { confirm, dialog } = useAdminConfirm();
  useEffect(() => { alive.current = true; return () => { alive.current = false; void client.cancelQueries({ queryKey: ["admin", userId] }); client.removeQueries({ queryKey: ["admin", userId] }); }; }, [client, userId]);
  const onDenied = useCallback(() => { setDenied(true); void client.cancelQueries({ queryKey: ["admin", userId] }); client.removeQueries({ queryKey: ["admin", userId] }); }, [client, userId]);
  const clearMessage = () => { setError(""); setSuccess(""); };
  const act: AdminRuntime["act"] = async (url, method, body, question, successMessage = "Изменения сохранены") => {
    if (locked.current || denied) return false;
    locked.current = true; setBusy(true); clearMessage();
    try {
      if (question && !await confirm(question)) return false;
      if (!alive.current) return false;
      await adminApi(url, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (!alive.current) return false;
      setSuccess(successMessage);
      await client.invalidateQueries({ queryKey: ["admin", userId] });
      return true;
    } catch (err) {
      if (!alive.current) return false;
      if (err instanceof AdminApiError && [401, 403].includes(err.status)) onDenied();
      setError(err instanceof Error ? err.message : "Не удалось сохранить изменения. Повторите позже.");
      return false;
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  };
  return <Context.Provider value={{ userId, busy, error, success, denied, onDenied, clearMessage, confirm, act }}>{children}{dialog}</Context.Provider>;
}
export function useAdminData<T>(url: string, enabled = true) {
  const { userId, onDenied, denied } = useAdminRuntime();
  const result = useQuery<T>({
    queryKey: ["admin", userId, url],
    queryFn: ({ signal }) => adminApi<T>(url, { signal }),
    enabled: enabled && !denied, retry: false, staleTime: 0, gcTime: 0,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (result.error instanceof AdminApiError && [401, 403].includes(result.error.status)) onDenied();
  }, [result.error, onDenied]);
  return result;
}
