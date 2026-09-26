import { useCallback, useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AppBootScreen } from "@/components/app-boot-screen";
import { AdminShell, AdminOverview, parseAdminSection, type AdminSection } from "@/components/admin/admin-shell";
import { AdminRuntimeProvider, useAdminData, useAdminRuntime } from "@/components/admin/admin-runtime";
import { AdminProviders } from "@/components/admin/admin-providers";
import { AdminDirectories } from "@/components/admin/admin-directories";
import { AdminParts } from "@/components/admin/admin-parts";
import { AdminVerifications } from "@/components/admin/admin-verifications";
import { AdminCategories, AdminImports, AdminAudit } from "@/components/admin/admin-system";
import { AdminUsers } from "@/components/admin/admin-users";
import { LoadState } from "@/components/admin/admin-common";
import type { Summary } from "@/components/admin/admin-types";

export default function AdminDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  if (isLoading) return <AppBootScreen />;
  if (!user || user.role !== "admin") return <div className="admin-access"><ShieldAlert size={32} /><h1>Доступ ограничен</h1><p>Панель доступна только аккаунтам с ролью администратора.</p><Link href="/auth">Войти</Link></div>;
  // Rendering a login form on insecure production HTTP would invite credential disclosure.
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  if (import.meta.env.PROD && window.location.protocol !== "https:" && !local) {
    return <div className="admin-access"><ShieldAlert size={32} /><h1>Нужно защищённое подключение</h1><p>Администрирование по HTTP отключено. Сначала настройте HTTPS на сервере. Не вводите пароль через незащищённое подключение.</p></div>;
  }
  return <AdminRuntimeProvider key={user.id} userId={user.id}><AdminControlCenter name={user.name} onLogout={logout} /></AdminRuntimeProvider>;
}
function AdminControlCenter({ name, onLogout }: { name: string; onLogout: () => Promise<void> }) {
  const search = useSearch();
  const [section, setSection] = useState<AdminSection>(() => parseAdminSection(new URLSearchParams(search).get("section")));
  const { userId, busy, error, success, denied, clearMessage } = useAdminRuntime();
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  // URL preserves the selected screen across reloads and supports back/forward.
  useEffect(() => setSection(parseAdminSection(new URLSearchParams(search).get("section"))), [search]);
  const select = (id: AdminSection) => {
    if (busy) return;
    clearMessage(); setSection(id);
    const url = new URL(window.location.href);
    url.search = ""; if (id !== "overview") url.searchParams.set("section", id);
    window.history.pushState({}, "", url);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => document.getElementById("admin-main")?.focus({ preventScroll: true }));
  };
  const refresh = async () => { setRefreshing(true); clearMessage(); try { await client.invalidateQueries({ queryKey: ["admin", userId] }); } finally { setRefreshing(false); } };
  const logout = async () => { try { await onLogout(); } catch { setLogoutError("Не удалось завершить сессию. Проверьте соединение и повторите."); } };
  if (denied) return <div className="admin-access"><ShieldAlert size={32} /><h1>Сессия или права изменились</h1><p>Доступ к данным закрыт. Войдите повторно с аккаунтом администратора.</p>{logoutError && <p role="alert">{logoutError}</p>}<button type="button" className="admin-form-button" onClick={() => void logout()}>Выйти и войти заново</button></div>;
  return <AdminShell section={section} onSection={select} name={name} onLogout={() => void logout()} onRefresh={() => void refresh()} loading={refreshing} busy={busy}>
    {(error || logoutError) && <div className="admin-error" role="alert">{error || logoutError}</div>}
    {success && <div className="admin-success" role="status">{success}</div>}
    {section === "overview" && <Overview onSection={select} />}
    {section === "providers" && <AdminProviders />}
    {section === "verifications" && <AdminVerifications />}
    {(section === "doctors" || section === "city-services") && <AdminDirectories key={section} kind={section} />}
    {section === "auto-parts" && <AdminParts />}
    {section === "categories" && <AdminCategories />}
    {section === "users" && <AdminUsers />}
    {section === "imports" && <AdminImports />}
    {section === "audit" && <AdminAudit />}
  </AdminShell>;
}
function Overview({ onSection }: { onSection: (id: AdminSection) => void }) {
  const query = useAdminData<Summary>("/api/admin/summary");
  return <LoadState query={query}><AdminOverview summary={query.data ?? null} onSection={onSection} loadedAt={query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : ""} /></LoadState>;
}
