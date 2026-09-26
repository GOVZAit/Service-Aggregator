import type { Request, Response } from "express";

interface AdminSessionUser { id: number; role: string; sessionVersion: number }

/** Shared by every admin endpoint, including directory, import and document routes.
 * A client-side route guard is only UX; the persisted role/session are authoritative.
 */
export async function authorizeAdmin<T extends AdminSessionUser>(
  req: Request, res: Response, getUser: (id: number) => Promise<T | undefined>,
  requireHttps = process.env.NODE_ENV === "production",
): Promise<T | undefined> {
  res.set("Cache-Control", "no-store, private");
  res.set("Pragma", "no-cache");
  res.vary("Cookie");
  res.vary("Origin");
  res.vary("Sec-Fetch-Site");
  if (requireHttps && !req.secure) {
    res.status(403).json({ message: "Панель администратора доступна только по HTTPS" }); return;
  }
  const site = req.get("Sec-Fetch-Site");
  if (site === "cross-site" || site === "same-site") {
    res.status(403).json({ message: "Межсайтовый запрос запрещён" }); return;
  }
  const { userId, sessionVersion } = req.session ?? {};
  if (!Number.isSafeInteger(userId) || !userId || !Number.isSafeInteger(sessionVersion)) {
    res.status(401).json({ message: "Войдите в аккаунт администратора" }); return;
  }
  let user: T | undefined;
  try { user = await getUser(userId); }
  catch { res.status(503).json({ message: "Не удалось проверить права доступа. Повторите позже." }); return; }
  if (!user || user.sessionVersion !== sessionVersion) {
    res.status(401).json({ message: "Сессия недействительна. Войдите снова." }); return;
  }
  if (user.role !== "admin") {
    res.status(403).json({ message: "Доступно только администратору" }); return;
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // SameSite cookies are defence in depth, not the sole CSRF protection.
    // The custom header requires a browser CORS preflight; no admin CORS origins are allowed.
    if (req.get("X-Govza-Admin") !== "1") {
      res.status(403).json({ message: "Защитный заголовок отсутствует. Обновите страницу." }); return;
    }
    const origin = req.get("Origin");
    const referer = req.get("Referer");
    let source: string | undefined;
    try { source = origin ? new URL(origin).origin : referer ? new URL(referer).origin : undefined; }
    catch { res.status(403).json({ message: "Источник запроса не подтверждён" }); return; }
    const target = `${req.protocol}://${req.get("Host")}`;
    if ((source && source !== target) || (!source && site !== "same-origin")) {
      res.status(403).json({ message: "Источник запроса не подтверждён" }); return;
    }
  }
  return user;
}
