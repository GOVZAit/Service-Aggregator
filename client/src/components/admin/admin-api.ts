export class AdminApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function adminApi<T>(url: string, init?: RequestInit): Promise<T> {
  if (!url.startsWith("/api/admin/")) throw new Error("Недопустимый адрес запроса");
  const headers = new Headers(init?.headers);
  if (init?.method && !["GET", "HEAD"].includes(init.method.toUpperCase())) {
    headers.set("X-Govza-Admin", "1");
    if (init.body) headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AdminApiError(data.message || "Не удалось выполнить запрос", response.status);
  return data as T;
}
