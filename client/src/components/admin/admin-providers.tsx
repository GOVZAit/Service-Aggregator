import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Category } from "@shared/schema";
import { useDebounce } from "@/hooks/use-debounce";
import { useAdminData, useAdminRuntime } from "./admin-runtime";
import { AdminEditor, AdminPageList, AdminToolbar, LoadState, StatusBadge } from "./admin-common";
import type { AdminProvider } from "./admin-types";
const nameOf = (p: AdminProvider) => String(p.effectiveData.name || p.effectiveData.companyName || `Профиль #${p.id}`);
export function AdminProviders() {
  const [q, setQ] = useState(""); const [type, setType] = useState(""); const [visibility, setVisibility] = useState(""); const [verification, setVerification] = useState("");
  const query = useDebounce(q, 250);
  const params = new URLSearchParams({ q: query, type, visibility, verification });
  const data = useAdminData<AdminProvider[]>(`/api/admin/providers?${params}`);
  const categories = useAdminData<Category[]>("/api/admin/categories");
  const [edit, setEdit] = useState<AdminProvider | "new" | null>(null);
  const { busy, act, clearMessage } = useAdminRuntime();
  const items = useMemo(() => data.data ?? [], [data.data]);
  const open = (p: AdminProvider | "new") => { clearMessage(); setEdit(p); };
  return <><AdminToolbar value={q} onChange={setQ} placeholder="Поиск по имени, телефону или городу" onAdd={() => open("new")} addLabel="Добавить профиль" />
    <div className="admin-filter-row">
      <label className="admin-field">Тип<select value={type} onChange={e => setType(e.target.value)}><option value="">Все исполнители</option><option value="master">Мастера</option><option value="organization">Организации</option></select></label>
      <label className="admin-field">Видимость<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="">Все профили</option><option value="visible">В каталоге</option><option value="hidden">Скрытые</option></select></label>
      <label className="admin-field">Проверка<select value={verification} onChange={e => setVerification(e.target.value)}><option value="">Любой статус</option><option value="pending">На проверке</option><option value="verified">Подтверждены</option><option value="unverified">Не проверены</option><option value="rejected">Отклонены</option></select></label>
    </div>
    <LoadState query={data}><AdminPageList items={items} render={p => <article className="admin-record" key={p.id} data-testid={`admin-provider-${p.id}`}>
      <div className="admin-record-avatar" aria-hidden="true">{nameOf(p).slice(0, 2).toUpperCase()}</div><div className="admin-record-info"><h2>{nameOf(p)}</h2><p>{p.providerType === "organization" ? "Организация" : "Мастер"} · #{p.id} · {String(p.effectiveData.city || "Город не указан")}</p><p>{String(p.effectiveData.phone || "Телефон не указан")} · {p.dataSource === "import" ? "Импорт" : "Добавлен вручную"}</p><div className="admin-badges"><StatusBadge value={p.verification.status} />{!p.visible && <StatusBadge value="hidden" label="Скрыт" />}</div></div>
      <div className="admin-record-actions"><Button variant="outline" disabled={busy} onClick={e => { e.currentTarget.focus(); open(p); }}><Pencil size={16} className="mr-2" />Изменить</Button><Button variant="ghost" disabled={busy} onClick={() => void act(`/api/admin/providers/${p.id}/visibility`, "POST", { visible: !p.visible }, `${p.visible ? "Скрыть" : "Вернуть"} профиль «${nameOf(p)}» ${p.visible ? "из каталога" : "в каталог"}? ${p.visible ? "Данные и история не удаляются." : "Профиль станет виден пользователям."}`)}>{p.visible ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}{p.visible ? "Скрыть" : "Вернуть"}</Button></div>
    </article>} /></LoadState>
    {edit && <ProviderEditor key={edit === "new" ? "new" : edit.id} item={edit === "new" ? null : edit} categories={categories.data ?? []} categoryError={categories.isError} onClose={() => setEdit(null)} />}
  </>;
}
function ProviderEditor({ item, categories, categoryError, onClose }: { item: AdminProvider | null; categories: Category[]; categoryError: boolean; onClose: () => void }) {
  const { act } = useAdminRuntime();
  const data = item?.effectiveData ?? {};
  const [form, setForm] = useState({ providerType: item?.providerType ?? "master", name: String(data.name ?? ""), phone: String(data.phone ?? ""), city: String(data.city ?? ""), description: String(data.description ?? ""), categoryIds: (Array.isArray(data.categoryIds) ? data.categoryIds : []) as number[] });
  const input = (key: "name" | "phone" | "city", label: string, max: number) => <label className="admin-field">{label}<input type={key === "phone" ? "tel" : "text"} required={key === "name"} minLength={key === "name" ? 2 : undefined} maxLength={max} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></label>;
  const save = async () => {
    if (categoryError || !categories.length) throw new Error("Список категорий не загружен. Закройте форму и обновите раздел.");
    if (!form.categoryIds.length || form.categoryIds.length > 8) throw new Error("Выберите от 1 до 8 категорий.");
    if (item?.effectiveData.description && !form.description.trim()) throw new Error("Описание нельзя очистить текущим API. Введите новое описание (от 10 символов).");
    if (form.description && form.description.trim().length < 10) throw new Error("Описание должно содержать не меньше 10 символов.");
    const payload = { name: form.name.trim(), phone: form.phone.trim(), city: form.city.trim(), categoryIds: form.categoryIds, ...(form.description ? { description: form.description.trim() } : {}) };
    return act(item ? `/api/admin/providers/${item.id}` : "/api/admin/providers", item ? "PATCH" : "POST", item ? payload : { providerType: form.providerType, data: payload });
  };
  return <AdminEditor title={item ? "Изменить профиль" : "Новый исполнитель"} description="Исправления сохраняются отдельно от импортированных данных." value={form} onClose={onClose} onSave={save}>
    {!item && <label className="admin-field">Тип профиля<select value={form.providerType} onChange={e => setForm(f => ({ ...f, providerType: e.target.value as "master" | "organization" }))}><option value="master">Мастер</option><option value="organization">Организация</option></select></label>}
    {input("name", "Имя или название", 120)}{input("phone", "Телефон", 30)}{input("city", "Город", 80)}
    <fieldset className="admin-location"><legend className="px-1 text-sm font-semibold">Категории · {form.categoryIds.length} из 8</legend>{categories.map(c => <label key={c.id} className="admin-form-check"><input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={e => setForm(f => ({ ...f, categoryIds: e.target.checked ? [...f.categoryIds, c.id] : f.categoryIds.filter(id => id !== c.id) }))} />{c.name}</label>)}{!categories.length && <p role="status">{categoryError ? "Категории недоступны" : "Загружаем категории…"}</p>}</fieldset>
    <label className="admin-field">Описание<textarea value={form.description} maxLength={2000} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /><small>Необязательно при создании; минимум 10 символов при заполнении.</small></label>
  </AdminEditor>;
}
