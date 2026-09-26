import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autoPartsSupplierPatchSchema, manualAutoPartsSupplierCreateSchema, type AdminAutoPartsSupplierView, type AutoPartsVehicleOrigin, type AutoPartsVehicleType } from "@shared/auto-parts-schema";
import { useAdminData, useAdminRuntime } from "./admin-runtime";
import { AdminEditor, AdminPageList, AdminToolbar, LoadState, StatusBadge } from "./admin-common";
import type { OrganizationAccountOption } from "./admin-types";
const base = "/api/admin/auto-parts/suppliers";
export function AdminParts() {
  const data = useAdminData<AdminAutoPartsSupplierView[]>(base);
  const [q, setQ] = useState(""); const [type, setType] = useState(""); const [visibility, setVisibility] = useState("");
  const [edit, setEdit] = useState<AdminAutoPartsSupplierView | "new" | null>(null);
  const [owner, setOwner] = useState<AdminAutoPartsSupplierView | null>(null);
  const { act, busy, clearMessage } = useAdminRuntime();
  const items = useMemo(() => (data.data ?? []).filter(p => (!type || (type === "store" ? p.supplierType !== "dismantler" : p.supplierType === type)) && (!visibility || p.visible === (visibility === "visible")) && `${p.id} ${p.name} ${p.city ?? ""} ${p.phone ?? ""} ${p.brands.join(" ")}`.toLocaleLowerCase("ru-RU").includes(q.trim().toLocaleLowerCase("ru-RU"))), [data.data, q, type, visibility]);
  return <><AdminToolbar value={q} onChange={setQ} placeholder="Название, город, телефон или марка" onAdd={() => { clearMessage(); setEdit("new"); }} addLabel="Добавить запись" />
    <div className="admin-filter-row"><label className="admin-field">Тип<select value={type} onChange={e => setType(e.target.value)}><option value="">Все записи</option><option value="store">Автомагазины</option><option value="dismantler">Авторазборы</option></select></label><label className="admin-field">Видимость<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="">Все записи</option><option value="visible">Опубликованные</option><option value="hidden">Скрытые</option></select></label></div>
    <LoadState query={data}><AdminPageList items={items} render={p => <article key={p.id} className="admin-record" data-testid={`admin-supplier-${p.id}`}>
      <div className="admin-record-info"><h2>{p.name}</h2><p>{p.supplierType === "dismantler" ? "Авторазбор" : "Автомагазин"} · #{p.id} · {p.city || "Город не указан"}</p>{p.address && <p>{p.address}</p>}<p>{p.phone || "Телефон не указан"}</p><div className="admin-badges"><StatusBadge value={p.visible ? "visible" : "hidden"} label={p.visible ? "В каталоге" : "Скрыт"} /><StatusBadge value="neutral" label={p.ownerUserId ? `Владелец #${p.ownerUserId}` : "Без аккаунта владельца"} /></div></div>
      <div className="admin-record-actions"><Button variant="outline" disabled={busy} onClick={e => { e.currentTarget.focus(); clearMessage(); setEdit(p); }}><Pencil size={16} className="mr-2" />Изменить</Button><Button variant="ghost" disabled={busy} onClick={e => { e.currentTarget.focus(); clearMessage(); setOwner(p); }}><Link2 size={16} className="mr-2" />Владелец</Button><Button variant="ghost" disabled={busy} onClick={() => void act(`${base}/${p.id}/visibility`, "POST", { visible: !p.visible }, `${p.visible ? "Скрыть" : "Опубликовать"} «${p.name}»? Запись не удаляется.`)}>{p.visible ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}{p.visible ? "Скрыть" : "Вернуть"}</Button></div>
    </article>} /></LoadState>
    {edit && <PartsEditor key={edit === "new" ? "new" : edit.id} item={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    {owner && <OwnerEditor item={owner} onClose={() => setOwner(null)} />}
  </>;
}
function OwnerEditor({ item, onClose }: { item: AdminAutoPartsSupplierView; onClose: () => void }) {
  const data = useAdminData<OrganizationAccountOption[]>("/api/admin/auto-parts/organization-accounts");
  const [id, setId] = useState(String(item.ownerUserId ?? "")); const { act } = useAdminRuntime();
  return <AdminEditor title="Аккаунт владельца" description={item.name} value={id} onClose={onClose} onSave={async () => {
    if (!data.data) throw new Error("Дождитесь загрузки аккаунтов.");
    if (id && !data.data.some(a => a.id === Number(id))) throw new Error("Выберите существующий аккаунт организации.");
    return act(`${base}/${item.id}/owner`, "POST", { ownerUserId: id ? Number(id) : null }, id ? `Передать управление записью «${item.name}» аккаунту «${data.data.find(a => a.id === Number(id))?.name}» (#${id})? Это изменит доступ владельца к магазину и запросам.` : `Отвязать аккаунт от «${item.name}»? Прежний владелец потеряет доступ к управлению этой записью.`);
  }}><div className="admin-notice">Привязка определяет, кто управляет магазином. Проверьте имя и контакты перед подтверждением.</div><LoadState query={data}><label className="admin-field">Аккаунт организации<select value={id} onChange={e => setId(e.target.value)}><option value="">Без владельца</option>{item.ownerUserId && !data.data?.some(a => a.id === item.ownerUserId) && <option value={item.ownerUserId}>Текущий аккаунт #{item.ownerUserId} недоступен</option>}{data.data?.map(a => <option key={a.id} value={a.id}>{a.name} · #{a.id}{a.phone ? ` · ${a.phone}` : ""}</option>)}</select></label></LoadState></AdminEditor>;
}
function PartsEditor({ item, onClose }: { item: AdminAutoPartsSupplierView | null; onClose: () => void }) {
  const { act } = useAdminRuntime();
  const [form, setForm] = useState({ name: item?.name ?? "", supplierType: item?.supplierType ?? "store", partsCondition: item?.partsCondition ?? "mixed", salesType: item?.salesType ?? "retail", city: item?.city ?? "", address: item?.address ?? "", phone: item?.phone ?? "", whatsapp: item?.whatsapp ?? "", website: item?.website ?? "", description: item?.description ?? "", brands: item?.brands.join(", ") ?? "", partGroups: item?.partGroups.join(", ") ?? "", vehicleTypes: item?.vehicleTypes ?? [] as AutoPartsVehicleType[], vehicleOrigins: item?.vehicleOrigins ?? [] as AutoPartsVehicleOrigin[], delivery: item?.delivery ?? false, pickup: item?.pickup ?? true });
  const input = (key: "name" | "city" | "address" | "phone" | "whatsapp" | "website" | "brands" | "partGroups", label: string, max = 250) => <label className="admin-field">{label}<input required={key === "name"} minLength={key === "name" ? 2 : undefined} type={key === "phone" || key === "whatsapp" ? "tel" : key === "website" ? "url" : "text"} value={form[key]} maxLength={max} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></label>;
  const save = async () => {
    const { website, brands, partGroups, ...rest } = form;
    // The existing schema does not accept an empty URL; don't silently claim it was cleared.
    if (item?.website && !website.trim()) throw new Error("Укажите корректный сайт. Удаление ссылки текущим API не поддерживается.");
    const payload = { ...rest, name: rest.name.trim(), ...(website.trim() ? { website: website.trim() } : {}), brands: brands.split(",").map(s => s.trim()).filter(Boolean), partGroups: partGroups.split(",").map(s => s.trim()).filter(Boolean) };
    const parsed = (item ? autoPartsSupplierPatchSchema : manualAutoPartsSupplierCreateSchema).safeParse(payload);
    if (!parsed.success) throw new Error(`Проверьте заполнение: ${parsed.error.issues[0].path.join(" / ")}.`);
    return act(`${base}${item ? `/${item.id}` : ""}`, item ? "PATCH" : "POST", parsed.data);
  };
  return <AdminEditor title={item ? "Изменить магазин / авторазбор" : "Новый магазин / авторазбор"} description="Контакты и условия будут видны в каталоге после сохранения." value={form} onClose={onClose} onSave={save}>
    {input("name", "Название", 140)}<label className="admin-field">Тип<select value={form.supplierType} onChange={e => setForm(f => ({ ...f, supplierType: e.target.value as typeof f.supplierType }))}><option value="store">Автомагазин</option><option value="dismantler">Авторазбор</option>{form.supplierType === "supplier" && <option value="supplier">Автомагазин (импорт)</option>}</select></label>
    <div className="admin-form-grid"><label className="admin-field">Состояние запчастей<select value={form.partsCondition} onChange={e => setForm(f => ({ ...f, partsCondition: e.target.value as typeof f.partsCondition }))}><option value="mixed">Новые и б/у</option><option value="new">Новые</option><option value="used">Б/у</option></select></label><label className="admin-field">Продажа<select value={form.salesType} onChange={e => setForm(f => ({ ...f, salesType: e.target.value as typeof f.salesType }))}><option value="retail">Розница</option><option value="wholesale">Опт</option><option value="both">Опт и розница</option></select></label></div>
    {input("city", "Город", 80)}{input("address", "Адрес")}{input("phone", "Телефон", 40)}{input("whatsapp", "WhatsApp", 40)}{input("website", "Сайт", 1000)}{input("brands", "Марки через запятую", 2000)}{input("partGroups", "Группы запчастей через запятую", 2000)}
    <fieldset className="admin-location"><legend className="px-1 text-sm font-semibold">Типы автомобилей</legend>{([["passenger", "Легковые"], ["truck", "Грузовые"], ["van", "Микроавтобусы"], ["special", "Спецтехника"]] as const).map(([id, label]) => <label className="admin-form-check" key={id}><input type="checkbox" checked={form.vehicleTypes.includes(id)} onChange={e => setForm(f => ({ ...f, vehicleTypes: e.target.checked ? [...f.vehicleTypes, id] : f.vehicleTypes.filter(x => x !== id) }))} />{label}</label>)}</fieldset>
    <fieldset className="admin-location"><legend className="px-1 text-sm font-semibold">Производитель</legend>{([["foreign", "Иномарки"], ["domestic", "Отечественные"]] as const).map(([id, label]) => <label className="admin-form-check" key={id}><input type="checkbox" checked={form.vehicleOrigins.includes(id)} onChange={e => setForm(f => ({ ...f, vehicleOrigins: e.target.checked ? [...f.vehicleOrigins, id] : f.vehicleOrigins.filter(x => x !== id) }))} />{label}</label>)}</fieldset>
    <label className="admin-field">Описание<textarea value={form.description} maxLength={2000} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
    {([["pickup", "Самовывоз"], ["delivery", "Доставка"]] as const).map(([key, label]) => <label className="admin-form-check" key={key}><input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />{label}</label>)}
  </AdminEditor>;
}
