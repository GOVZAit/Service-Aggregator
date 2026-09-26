import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Doctor } from "@/lib/doctors-data";
import type { CityOrganization } from "@/lib/city-services-data";
import { doctorDirectoryPayloadSchema, cityServiceDirectoryPayloadSchema } from "@shared/directory-schema";
import { useAdminData, useAdminRuntime } from "./admin-runtime";
import { AdminEditor, AdminPageList, AdminToolbar, LoadState, StatusBadge } from "./admin-common";
import { DirectoryFields } from "./directory-fields";
import type { AdminDirectoryItem, DirectoryTab } from "./admin-types";
type Item = AdminDirectoryItem<Doctor | CityOrganization>;
export function AdminDirectories({ kind }: { kind: DirectoryTab }) {
  const [q, setQ] = useState(""); const [visibility, setVisibility] = useState("");
  const [edit, setEdit] = useState<Item | "new" | null>(null);
  const base = `/api/admin/directories/${kind}`;
  const data = useAdminData<Item[]>(base); const { busy, act, clearMessage } = useAdminRuntime();
  const items = useMemo(() => (data.data ?? []).filter(i => (!visibility || i.visible === (visibility === "visible")) && `${i.id} ${i.record.name} ${i.record.phone} ${"specialty" in i.record ? i.record.specialty : i.record.subcategory}`.toLocaleLowerCase("ru-RU").includes(q.trim().toLocaleLowerCase("ru-RU"))), [data.data, q, visibility]);
  const open = (item: Item | "new") => { clearMessage(); setEdit(item); };
  return <><AdminToolbar value={q} onChange={setQ} placeholder={kind === "doctors" ? "Имя, специальность или телефон" : "Название или телефон"} onAdd={() => open("new")} addLabel={kind === "doctors" ? "Добавить врача" : "Добавить организацию"} />
    <label className="admin-field mb-4 max-w-xs">Видимость<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="">Все записи</option><option value="visible">Опубликованные</option><option value="hidden">Скрытые</option></select></label>
    <LoadState query={data}><AdminPageList items={items} render={item => <article key={item.id} className="admin-record" data-testid={`admin-directory-${item.id}`}>
      <div className="admin-record-info"><h2>{item.record.name}</h2><p>{"specialty" in item.record ? item.record.specialty : item.record.subcategory} · #{item.id}</p><p>{item.record.phone || "Телефон не указан"}</p><div className="admin-badges"><StatusBadge value={item.visible ? "visible" : "hidden"} label={item.visible ? "Опубликовано" : "Скрыто"} /><StatusBadge value="neutral" label={item.origin === "seed" ? "Базовая запись" : item.origin === "override" ? "Отредактировано" : "Добавлено вручную"} /></div></div>
      <div className="admin-record-actions"><Button variant="outline" disabled={busy} onClick={e => { e.currentTarget.focus(); open(item); }}><Pencil size={16} className="mr-2" />Изменить</Button><Button variant="ghost" disabled={busy} onClick={() => void act(`${base}/${item.id}/visibility`, "POST", { visible: !item.visible }, `${item.visible ? "Скрыть" : "Опубликовать"} запись «${item.record.name}»? Данные не удаляются.`)}>{item.visible ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}{item.visible ? "Скрыть" : "Вернуть"}</Button></div>
    </article>} /></LoadState>
    {edit && <DirectoryEditor key={edit === "new" ? "new" : edit.id} kind={kind} item={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
  </>;
}
function DirectoryEditor({ kind, item, onClose }: { kind: DirectoryTab; item: Item | null; onClose: () => void }) {
  const { act } = useAdminRuntime();
  const [value, setValue] = useState(JSON.stringify(item?.record ?? (kind === "doctors" ? { name: "", specialty: "Терапевт", specialtyId: "therapist", locations: [{ clinic: "", address: "", city: "", schedule: "" }], experienceYears: 0, rating: 0, reviews: 0, price: "по запросу", phone: "", avatar: "" } : { categoryId: "contacts", name: "", subcategory: "", phone: "", address: "", hours: "", district: "" })));
  const save = async () => {
    const { id: _id, ...payload } = JSON.parse(value);
    const parsed = (kind === "doctors" ? doctorDirectoryPayloadSchema : cityServiceDirectoryPayloadSchema).safeParse(payload);
    if (!parsed.success) {
      const field = String(parsed.error.issues[0].path[0]);
      const labels: Record<string, string> = { name: "имя или название", phone: "телефон", locations: "места приёма: клиника, город, адрес, расписание и координаты", experienceYears: "стаж (от 0 до 80)", specialty: "специальность", price: "стоимость приёма", subcategory: "вид организации", website: "сайт" };
      throw new Error(`Проверьте поле «${labels[field] ?? field}».`);
    }
    // An admin editing contact details must not overwrite review totals from an old snapshot.
    const next: Record<string, unknown> = { ...parsed.data };
    if (item && kind === "doctors") { delete next.rating; delete next.reviews; }
    return act(`/api/admin/directories/${kind}${item ? `/${item.id}` : ""}`, item ? "PATCH" : "POST", next);
  };
  return <AdminEditor title={item ? "Редактирование записи" : kind === "doctors" ? "Новый врач" : "Новая организация"} value={value} onClose={onClose} onSave={save} description="Изменения появятся в публичном каталоге после сохранения."><DirectoryFields kind={kind} value={value} onChange={setValue} /></AdminEditor>;
}
