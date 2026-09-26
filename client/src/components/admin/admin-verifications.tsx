import { useMemo, useState } from "react";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminData, useAdminRuntime } from "./admin-runtime";
import { AdminEditor, AdminPageList, AdminToolbar, LoadState, StatusBadge, verificationLabels } from "./admin-common";
import type { VerificationQueueItem, VerificationDetail } from "./admin-types";
const documentLabels: Record<string, string> = { identity: "Удостоверение личности", qualification: "Квалификация", self_employed: "Самозанятость", business: "Регистрация организации", license: "Лицензия", other: "Другой документ" };
export function AdminVerifications() {
  const data = useAdminData<VerificationQueueItem[]>("/api/admin/verifications");
  const [status, setStatus] = useState("pending"); const [q, setQ] = useState(""); const [selected, setSelected] = useState<VerificationQueueItem | null>(null);
  const { busy, clearMessage } = useAdminRuntime();
  const items = useMemo(() => (data.data ?? []).filter(i => (!status || i.status === status) && `${i.providerId} ${i.name} ${i.companyName ?? ""} ${i.phone ?? ""}`.toLocaleLowerCase("ru-RU").includes(q.trim().toLocaleLowerCase("ru-RU"))), [data.data, status, q]);
  return <><AdminToolbar value={q} onChange={setQ} placeholder="Имя, организация или телефон" /><label className="admin-field mb-4 max-w-xs">Статус проверки<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Все заявки</option>{Object.entries(verificationLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <LoadState query={data}><AdminPageList items={items} render={i => <article key={i.providerId} className="admin-record" data-testid={`admin-verification-${i.providerId}`}><div className="admin-record-avatar"><ShieldCheck size={22} /></div><div className="admin-record-info"><h2>{i.companyName || i.name}</h2><p>#{i.providerId} · Документов: {i.documentCount}</p><p>Подано: {new Date(i.submittedAt).toLocaleString("ru-RU")}</p><StatusBadge value={i.status} /></div><Button type="button" variant="outline" disabled={busy} onClick={e => { e.currentTarget.focus(); clearMessage(); setSelected(i); }}>Проверить<ChevronRight size={16} className="ml-2" /></Button></article>} /></LoadState>
    {selected && <ReviewEditor item={selected} onClose={() => setSelected(null)} />}
  </>;
}
function ReviewEditor({ item, onClose }: { item: VerificationQueueItem; onClose: () => void }) {
  const data = useAdminData<VerificationDetail>(`/api/admin/verifications/${item.providerId}`);
  const [decision, setDecision] = useState<"" | "verified" | "rejected">(""); const [note, setNote] = useState("");
  const { act } = useAdminRuntime();
  const save = async () => {
    if (!data.data?.submission?.documents.length || data.isError) throw new Error("Документы не загружены. Решение недоступно.");
    if (!decision) throw new Error("Выберите решение по заявке.");
    if (decision === "rejected" && !note.trim()) throw new Error("Укажите причину отклонения — её получит исполнитель.");
    return act(`/api/admin/verifications/${item.providerId}/review`, "POST", { status: decision, ...(note.trim() ? { note: note.trim() } : {}) }, `${decision === "verified" ? "Подтвердить профиль" : "Отклонить заявку"} «${item.companyName || item.name}»? Решение будет сохранено и отправлено исполнителю.`);
  };
  return <AdminEditor title={`Проверка #${item.providerId}`} description={item.companyName || item.name} value={{ decision, note }} onClose={onClose} onSave={save}>
    <LoadState query={data}><div className="admin-notice">Документы доступны только администрации. Не пересылайте и не публикуйте их.</div>
      {data.data?.submission?.providerComment && <p className="text-sm leading-relaxed">Комментарий исполнителя: {data.data.submission.providerComment}</p>}
      <div className="admin-documents">{data.data?.submission?.documents.map(doc => <details key={doc.id} className="admin-document"><summary>{doc.title}<small>{documentLabels[doc.type] ?? doc.type} · Открыть изображение</small></summary>{/^data:image\/(jpeg|png|webp);base64,/i.test(doc.image) ? <img src={doc.image} alt={doc.title} className="mt-3 w-full rounded-lg object-contain" /> : <p role="alert">Неподдерживаемый формат документа</p>}</details>)}</div>
      <fieldset className="admin-location"><legend className="px-1 text-sm font-semibold">Решение</legend><label className="admin-form-check"><input type="radio" name="review-decision" checked={decision === "verified"} onChange={() => setDecision("verified")} />Подтвердить профиль</label><label className="admin-form-check"><input type="radio" name="review-decision" checked={decision === "rejected"} onChange={() => setDecision("rejected")} />Отклонить и указать причину</label></fieldset>
      <label className="admin-field">Комментарий исполнителю{decision === "rejected" ? " · обязательно" : ""}<textarea maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /><small>Не включайте номера документов и другие лишние персональные данные.</small></label>
      {!!data.data?.events.length && <details className="admin-document"><summary>История проверки</summary><div className="mt-3 space-y-3">{data.data.events.map(e => <div key={e.id} className="text-xs leading-relaxed"><strong>{verificationLabels[e.action] ?? ({ submitted: "Подана заявка", resubmitted: "Повторная заявка", reset: "Проверка сброшена" } as Record<string, string>)[e.action] ?? e.action}</strong><p className="text-muted-foreground">{new Date(e.createdAt).toLocaleString("ru-RU")}</p>{e.note && <p>{e.note}</p>}</div>)}</div></details>}
    </LoadState>
  </AdminEditor>;
}
