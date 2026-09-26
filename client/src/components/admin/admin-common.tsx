import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsivePanel } from "@/components/responsive-panel";
import { useAdminRuntime } from "./admin-runtime";

export const verificationLabels: Record<string, string> = { unverified: "Не проверен", pending: "На проверке", verified: "Подтверждён", rejected: "Отклонён" };
export function StatusBadge({ value, label }: { value: string; label?: string }) { return <span className={`admin-badge admin-badge-${value}`}>{label ?? verificationLabels[value] ?? value}</span>; }
export function LoadState({ query, children }: { query: { isPending: boolean; isError: boolean; error: Error | null; refetch: () => unknown }; children: ReactNode }) {
  if (query.isPending) return <p className="admin-loading" role="status">Загружаем данные…</p>;
  if (query.isError) return <div role="alert" className="admin-error">{query.error?.message || "Не удалось загрузить данные"}<button type="button" className="admin-form-button ml-2" onClick={() => query.refetch()}>Повторить</button></div>;
  return <>{children}</>;
}
export function AdminToolbar({ value, onChange, placeholder, children, onAdd, addLabel = "Добавить" }: {
  value: string; onChange: (v: string) => void; placeholder: string; children?: ReactNode; onAdd?: () => void; addLabel?: string;
}) {
  const { busy } = useAdminRuntime();
  return <div className="admin-toolbar"><label className="admin-search"><Search size={18} aria-hidden="true" /><span className="sr-only">{placeholder}</span><input type="search" value={value} maxLength={120} placeholder={placeholder} onChange={e => onChange(e.target.value)} />{value && <button type="button" aria-label="Очистить поиск" onClick={() => onChange("")}><X size={17} /></button>}</label>{children}{onAdd && <Button type="button" onClick={e => { e.currentTarget.focus(); onAdd(); }} disabled={busy}><Plus size={17} className="mr-2" />{addLabel}</Button>}</div>;
}
export function EmptyList({ children = "Ничего не найдено. Измените поиск или фильтры." }: { children?: ReactNode }) { return <div className="admin-empty">{children}</div>; }
export function AdminEditor({ title, description, value, onClose, onSave, children }: {
  title: string; description?: string; value: unknown; onClose: () => void; onSave: () => Promise<boolean>; children: ReactNode;
}) {
  const { busy, error, clearMessage, confirm } = useAdminRuntime();
  const original = useRef(JSON.stringify(value));
  const [localError, setLocalError] = useState("");
  const dirty = JSON.stringify(value) !== original.current;
  useEffect(() => {
    if (!dirty) return;
    const listener = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  const close = async () => { if (busy) return; if (dirty && !await confirm("Закрыть форму без сохранения изменений?")) return; clearMessage(); onClose(); };
  const save = async () => { setLocalError(""); try { if (await onSave()) onClose(); } catch (e) { setLocalError(e instanceof Error ? e.message : "Проверьте поля формы"); } };
  return <ResponsivePanel open onOpenChange={open => { if (!open) void close(); }} title={title} description={description} footer={<div className="admin-editor-footer">
    {(localError || error) && <p role="alert" className="admin-error">{localError || error}</p>}
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void close()}>Отмена</Button><Button type="submit" form="admin-editor-form" className="flex-1" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</Button></div>
  </div>}><form id="admin-editor-form" onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={busy} className="admin-edit-fields">{children}</fieldset></form></ResponsivePanel>;
}
export function AdminPageList<T>({ items, render }: { items: T[]; render: (value: T) => ReactNode }) {
  const [page, setPage] = useState(1);
  const limit = 24, pages = Math.max(1, Math.ceil(items.length / limit)), current = Math.min(page, pages);
  useEffect(() => setPage(1), [items]);
  return <><p className="admin-list-count" role="status">Найдено: {items.length}</p><div className="admin-record-list">{items.slice((current - 1) * limit, current * limit).map(render)}</div>{!items.length && <EmptyList />}{pages > 1 && <div className="admin-pagination"><button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}>Назад</button><span>{current} / {pages}</span><button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)}>Далее</button></div>}</>;
}
