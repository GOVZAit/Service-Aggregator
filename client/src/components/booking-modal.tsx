import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Calendar, CheckCircle2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useServiceClock } from "@/hooks/use-master-memory";
import { canRequestSlot, formatBookingSlot, isFutureSlot, serviceNow, upcomingDates } from "@shared/service-time";
import type { AvailabilityDayView } from "@shared/provider-engagement-schema";
import type { Master, Order } from "@shared/schema";

interface BookingModalProps {
  master: Master;
  onClose: () => void;
  initialService?: string;
  initialAddress?: string;
  initialComment?: string;
  heading?: string;
}

// Half-hour request times. The server rechecks the actual day/window before accepting.
const timeSlots = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

export function BookingModal({ master, onClose, initialService, initialAddress = "", initialComment = "", heading = "Записаться к мастеру" }: BookingModalProps) {
  const clock = useServiceClock();
  const today = serviceNow(clock).date;
  const dates = upcomingDates(7, clock);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState(() => initialService
    ? (master.services.some((service) => service.name === initialService) ? initialService : "")
    : master.services[0]?.name ?? "");
  const [address, setAddress] = useState(initialAddress.slice(0, 250));
  const [comment, setComment] = useState(initialComment.slice(0, 1000));
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);
  const [submitError, setSubmitError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const availability = useQuery<AvailabilityDayView[]>({
    queryKey: ["/api/providers", master.id, "availability", today, 7],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/providers/${master.id}/availability?from=${today}&days=7`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось проверить расписание");
      return response.json();
    },
    staleTime: 15_000, refetchInterval: 30_000, refetchOnWindowFocus: true,
  });
  const day = availability.data?.find((row) => row.date === selectedDate);
  const service = master.services.find((item) => item.name === selectedService);
  const missingOriginalService = !!initialService && !master.services.some((item) => item.name === initialService);
  const allowedTimes = Array.from(new Set([...timeSlots, ...(day?.fromTime ? [day.fromTime] : [])])).sort().filter((time) => isFutureSlot(selectedDate, time, clock) && canRequestSlot(day, selectedDate, time));
  const canSubmit = !!service && address.trim().length >= 3 && !!selectedTime && allowedTimes.includes(selectedTime) &&
    !availability.isPending && !availability.isError && !submitting;

  useEffect(() => {
    if (selectedDate < today) { setSelectedDate(today); setSelectedTime(""); }
  }, [today, selectedDate]);

  const handleSubmit = async () => {
    if (sending.current || !canSubmit || !service) return;
    if (!user) { onClose(); navigate("/auth?tab=register"); return; }
    sending.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterId: master.id, service: service.name, expectedPrice: service.price,
          scheduledAt: formatBookingSlot(selectedDate, selectedTime), address: address.trim(), comment: comment.trim() || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409) {
          setSelectedTime("");
          await Promise.all([queryClient.invalidateQueries({ queryKey: ["/api/masters"] }),
            queryClient.invalidateQueries({ queryKey: [`/api/masters/${master.id}`] }), availability.refetch()]);
        }
        throw new Error(typeof payload?.message === "string" ? payload.message : "Не удалось отправить заявку. Проверьте соединение и повторите.");
      }
      setCreatedOrder(payload as Order);
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось отправить заявку.");
    } finally { sending.current = false; setSubmitting(false); }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !sending.current) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content aria-describedby="booking-description" className="fixed bottom-0 left-0 right-0 z-[61] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl outline-none sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[min(560px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 shrink-0">
            <div>
              <Dialog.Title className="text-lg font-bold">{createdOrder ? "Заявка отправлена" : heading}</Dialog.Title>
              <Dialog.Description id="booking-description" className="text-xs text-muted-foreground">{master.name} · {master.category}</Dialog.Description>
            </div>
            <Dialog.Close disabled={submitting} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted" aria-label="Закрыть" data-testid="button-close-booking"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          {createdOrder ? (
            <div className="space-y-4 overflow-y-auto p-6">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
              <p className="text-center text-sm text-muted-foreground">Мастер получил заявку. Дождитесь подтверждения времени и условий работы.</p>
              <dl className="space-y-2 rounded-2xl bg-muted p-4 text-sm">
                <div><dt className="text-muted-foreground">Услуга</dt><dd className="font-medium">{createdOrder.title}</dd></div>
                <div><dt className="text-muted-foreground">Желаемое время (МСК)</dt><dd>{createdOrder.date}</dd></div>
                <div><dt className="text-muted-foreground">Цена по прайсу</dt><dd>{createdOrder.price}</dd></div>
                <div><dt className="text-muted-foreground">Адрес</dt><dd className="break-words">{createdOrder.address}</dd></div>
              </dl>
              <button onClick={onClose} className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground" data-testid="button-booking-done">Готово</button>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                {initialService && <p className="rounded-xl bg-muted p-3 text-sm">Задача и адрес перенесены из прошлого заказа. Выберите новую дату и проверьте текущую цену.</p>}
                {missingOriginalService && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">Услуги «{initialService}» больше нет в прайсе. Выберите подходящую услугу — мы не заменяем её автоматически.</p>}
                <label className="block text-sm font-medium">Услуга
                  <select value={service ? selectedService : ""} onChange={(event) => setSelectedService(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-muted px-3" data-testid="button-select-service">
                    <option value="" disabled>Выберите услугу</option>
                    {master.services.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.price}</option>)}
                  </select>
                </label>
                {service && <p className="text-sm">Текущая цена по прайсу: <strong data-testid="booking-current-price">{service.price}</strong>. Итоговую стоимость согласуйте с мастером.</p>}
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Calendar className="h-4 w-4" />Дата · время по Москве</p>
                  <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Дата записи">
                    {dates.map((date, index) => {
                      const d = new Date(`${date}T12:00:00Z`);
                      return <button key={date} onClick={() => { setSelectedDate(date); setSelectedTime(""); }} aria-pressed={selectedDate === date} data-testid={`date-slot-${index}`} className={cn("flex w-16 shrink-0 flex-col rounded-xl border-2 px-2 py-2", selectedDate === date ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        <span className="text-xs">{index === 0 ? "Сегодня" : d.toLocaleDateString("ru-RU", { weekday: "short", timeZone: "UTC" })}</span>
                        <span className="font-bold">{d.getUTCDate()}</span>
                      </button>;
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Желаемое время</p>
                  {availability.isPending ? <p role="status" className="text-sm text-muted-foreground">Проверяем расписание…</p> : availability.isError ? (
                    <div role="alert" className="text-sm text-destructive">Не удалось проверить расписание. <button className="min-h-11 underline" onClick={() => void availability.refetch()}>Повторить</button></div>
                  ) : <>
                    {!day && <p className="mb-2 text-xs text-muted-foreground">Мастер не указал расписание на этот день. Время будет подтверждено после отправки заявки.</p>}
                    {allowedTimes.length === 0 ? <p role="status" className="rounded-xl bg-muted p-3 text-sm">На этот день нет доступного времени. Выберите другую дату.</p> : <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                      {allowedTimes.map((time) => <button key={time} onClick={() => setSelectedTime(time)} aria-pressed={selectedTime === time} data-testid={`time-slot-${time}`} className={cn("min-h-11 rounded-lg border-2 text-sm", selectedTime === time ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{time}</button>)}
                    </div>}
                  </>}
                </div>
                <label className="block text-sm font-medium">Адрес
                  <input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={250} autoComplete="street-address" placeholder="Улица, дом, квартира" data-testid="input-booking-address" className="mt-2 min-h-12 w-full rounded-xl border border-border bg-muted px-4 text-sm" />
                </label>
                <label className="block text-sm font-medium">Комментарий (необязательно)
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} data-testid="input-booking-comment" className="mt-2 w-full resize-none rounded-xl border border-border bg-muted p-3 text-sm" />
                </label>
              </div>
              <div className="shrink-0 border-t border-border/60 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {submitError && <p role="alert" className="mb-3 text-sm text-destructive">{submitError}</p>}
                <button onClick={() => void handleSubmit()} disabled={!canSubmit} data-testid="button-booking-submit" className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">{submitting ? "Отправляем…" : user ? "Отправить заявку" : "Войти и отправить"}</button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
