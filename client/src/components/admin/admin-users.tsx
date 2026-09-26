import { useState } from "react";
import { useAdminData } from "./admin-runtime";
import { useDebounce } from "@/hooks/use-debounce";
import { adminRoleLabels, type AdminUsersPage } from "@shared/admin-users";

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebounce(q, 250);
  const params = new URLSearchParams({ q: query, role, page: String(page), pageSize: "20" });
  const data = useAdminData<AdminUsersPage>(`/api/admin/users?${params}`);
  return <section aria-label="Список пользователей">
    <div className="admin-notice">Здесь доступны контакты и роли аккаунтов. Пароли и токены не отображаются. Назначение администраторов и удаление аккаунтов из этой панели не выполняются.</div>
    <div className="admin-users-tools">
      <label className="admin-field">Поиск пользователя<input type="search" placeholder="Имя, телефон, email или ID" maxLength={120} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} data-testid="admin-user-search" /></label>
      <label className="admin-field">Роль<select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value="">Все роли</option>{Object.entries(adminRoleLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </div>
    {data.isPending ? <p className="admin-loading" role="status">Загружаем пользователей…</p> : data.isError ? <div className="admin-error" role="alert">{data.error.message}<button type="button" className="admin-form-button ml-3" onClick={() => void data.refetch()}>Повторить</button></div> : <>
      <p className="mb-3 text-sm text-muted-foreground" role="status">Найдено: {data.data.total}</p>
      <div className="admin-user-list">{data.data.items.map(user => <article className="admin-user-row" key={user.id} data-testid={`admin-user-${user.id}`}>
        <div><h2>{user.name}</h2><p>#{user.id}{user.phone ? ` · ${user.phone}` : ""}</p>{user.email && <p>{user.email}</p>}</div>
        <span className="admin-user-role">{adminRoleLabels[user.role]}</span><div><p>Регистрация</p><time>{new Date(user.createdAt).toLocaleDateString("ru-RU")}</time></div>
      </article>)}</div>
      {!data.data.items.length && <p className="admin-loading">Пользователи не найдены. Измените запрос или роль.</p>}
      <div className="admin-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Назад</button><span>Страница {page} из {Math.max(1, Math.ceil(data.data.total / data.data.pageSize))}</span><button type="button" disabled={page * data.data.pageSize >= data.data.total} onClick={() => setPage(p => p + 1)}>Далее</button></div>
    </>}
  </section>;
}
