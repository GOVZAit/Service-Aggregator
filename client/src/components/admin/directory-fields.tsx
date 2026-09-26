import { doctorSpecialties } from "@/lib/doctors-data";
import { cityCategories } from "@/lib/city-services-data";

/** Edits the existing payload without discarding fields not shown by this form.
 * JSON is an internal transport only, not the administrator's editing interface. */
export function DirectoryFields({ kind, value, onChange }: { kind: "doctors" | "city-services"; value: string; onChange: (value: string) => void }) {
  let record: Record<string, any>;
  try { record = JSON.parse(value); } catch { return <p role="alert">Не удалось открыть запись. Закройте и откройте её снова.</p>; }
  const set = (key: string, next: unknown) => onChange(JSON.stringify({ ...record, [key]: next }));
  const input = (key: string, label: string, type = "text", maxLength = 160, help?: string) => <label className="admin-field">{label}<input type={type} required={["name", "phone", "experienceYears", "price", "subcategory"].includes(key)} min={key === "experienceYears" ? 0 : undefined} max={key === "experienceYears" ? 80 : undefined} maxLength={maxLength} value={record[key] ?? ""} onChange={e => set(key, type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} />{help && <small>{help}</small>}</label>;
  const bool = (key: string, label: string) => <label className="admin-form-check"><input type="checkbox" checked={Boolean(record[key])} onChange={e => set(key, e.target.checked)} />{label}</label>;
  const locations: Array<Record<string, any>> = record.locations ?? [];
  const changeLocation = (index: number, key: string, next: unknown) => set("locations", locations.map((l, i) => i === index ? { ...l, [key]: next } : l));
  return <div className="admin-edit-fields">
    {input("name", kind === "doctors" ? "Имя врача" : "Название организации")}
    {kind === "doctors" ? <>
      <label className="admin-field">Специальность<select value={record.specialtyId ?? ""} onChange={e => {
        const found = doctorSpecialties.find(s => s.id === e.target.value);
        onChange(JSON.stringify({ ...record, specialtyId: e.target.value, specialty: found?.label ?? record.specialty }));
      }}>{!doctorSpecialties.some(s => s.id === record.specialtyId) && <option value={record.specialtyId}>{record.specialty}</option>}{doctorSpecialties.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <div className="admin-form-grid">{input("phone", "Телефон", "tel", 40)}{input("experienceYears", "Стаж, лет", "number")}</div>
      {input("price", "Стоимость приёма", "text", 80, "Например: от 1 500 ₽ или по запросу")}
      {input("avatar", "Ссылка на фото", "text", 1000000, "Необязательно. Текущее фото сохраняется, пока вы не измените это поле.")}
      {bool("acceptsChildren", "Принимает детей")}{bool("homeVisits", "Выезжает на дом")}
      <div><h3 className="admin-section-title">Места приёма</h3>{locations.map((location, index) => <fieldset className="admin-location mb-3" key={index}>
        <legend className="px-1 text-sm font-semibold">Место {index + 1}</legend>
        {([['clinic', 'Клиника'], ['city', 'Город'], ['address', 'Адрес'], ['schedule', 'Расписание']] as const).map(([key, label]) => <label className="admin-field" key={key}>{label}<input required value={location[key] ?? ""} maxLength={key === "address" ? 250 : 160} onChange={e => changeLocation(index, key, e.target.value)} /></label>)}
        <div className="admin-form-grid">{([['lat', 'Широта'], ['lng', 'Долгота']] as const).map(([key, label]) => <label className="admin-field" key={key}>{label}<input type="number" step="any" value={location[key] ?? ""} onChange={e => changeLocation(index, key, e.target.value === "" ? undefined : Number(e.target.value))} /></label>)}</div>
        {locations.length > 1 && <button type="button" className="admin-form-button" onClick={() => set("locations", locations.filter((_, i) => i !== index))}>Убрать это место</button>}
      </fieldset>)}<button type="button" className="admin-form-button" disabled={locations.length >= 12} onClick={() => set("locations", [...locations, { clinic: "", city: "", address: "", schedule: "" }])}>Добавить место приёма</button></div>
      <p className="text-xs text-muted-foreground">Рейтинг и количество отзывов этой формой не изменяются.</p>
    </> : <>
      <label className="admin-field">Категория<select value={record.categoryId ?? "contacts"} onChange={e => set("categoryId", e.target.value)}>{!cityCategories.some(c => c.id === record.categoryId) && <option value={record.categoryId}>{record.categoryId}</option>}{cityCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {input("subcategory", "Вид организации")} {input("phone", "Телефон", "tel", 60)}{input("address", "Адрес", "text", 300)}
      <div className="admin-form-grid">{input("hours", "Режим работы")}{input("district", "Район")}</div>
      {input("website", "Сайт", "url", 1000)}{input("whatsapp", "WhatsApp", "tel", 60)}
      <label className="admin-field">Описание<textarea value={record.description ?? ""} maxLength={2000} onChange={e => set("description", e.target.value)} /></label>
      {bool("isEmergency", "Экстренная служба")}{bool("importantNumber", "Важный номер")}
    </>}
  </div>;
}
