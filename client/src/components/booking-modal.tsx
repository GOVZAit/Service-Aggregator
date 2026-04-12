import { useState } from "react";
import { X, Calendar, MapPin, MessageSquare, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Master } from "@shared/schema";

interface BookingModalProps {
  master: Master;
  onClose: () => void;
}

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
];

const today = new Date();
const dates = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  return d;
});

function formatDate(d: Date) {
  const days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  return { day: d.getDate(), weekday: days[d.getDay()] };
}

export function BookingModal({ master, onClose }: BookingModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [selectedDate, setSelectedDate] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(
    master.services[0]?.name ?? null
  );
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [showServices, setShowServices] = useState(false);

  const canSubmit = selectedTime && address.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mt-auto w-full max-h-[92vh] bg-background rounded-t-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {step === "success" ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 gap-4">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1">Заявка отправлена!</h2>
              <p className="text-muted-foreground text-sm">
                {master.name} получит уведомление и свяжется с вами в течение {master.responseTime}
              </p>
            </div>
            <div className="w-full rounded-2xl bg-muted p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Услуга</span>
                <span className="font-medium">{selectedService}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Дата</span>
                <span className="font-medium">
                  {dates[selectedDate].getDate()} {["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][dates[selectedDate].getMonth()]} в {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Адрес</span>
                <span className="font-medium truncate max-w-[180px]">{address}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-base"
              data-testid="button-booking-done"
            >
              Отлично!
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 pb-3 pt-1 shrink-0 flex items-center justify-between border-b border-border/60">
              <div>
                <h2 className="font-bold text-lg">Записаться к мастеру</h2>
                <p className="text-xs text-muted-foreground">{master.name} · {master.category}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" data-testid="button-close-booking">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Service selector */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Услуга</p>
                <button
                  onClick={() => setShowServices((v) => !v)}
                  data-testid="button-select-service"
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted border border-border text-sm font-medium"
                >
                  <span>{selectedService || "Выберите услугу"}</span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showServices && "rotate-180")} />
                </button>
                {showServices && (
                  <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden">
                    {master.services.map((svc) => (
                      <button
                        key={svc.name}
                        onClick={() => { setSelectedService(svc.name); setShowServices(false); }}
                        data-testid={`option-service-${svc.name}`}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 text-sm border-b border-border/60 last:border-0 transition-colors",
                          selectedService === svc.name ? "bg-primary/5 text-primary font-medium" : "hover:bg-muted/50"
                        )}
                      >
                        <span>{svc.name}</span>
                        <span className="font-semibold">{svc.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date picker */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Дата</p>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {dates.map((d, i) => {
                    const { day, weekday } = formatDate(d);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(i)}
                        data-testid={`date-slot-${i}`}
                        className={cn(
                          "shrink-0 flex flex-col items-center gap-0.5 w-14 py-2.5 rounded-xl border-2 transition-all",
                          selectedDate === i
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        )}
                      >
                        <span className="text-[10px] font-medium opacity-70">{weekday}</span>
                        <span className="text-base font-bold">{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Время</p>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      data-testid={`time-slot-${t}`}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all",
                        selectedTime === t
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Адрес</p>
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ул. Путина, 15, кв. 42"
                  data-testid="input-booking-address"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Comment */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Комментарий (необязательно)</p>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Опишите задачу подробнее..."
                  rows={3}
                  data-testid="input-booking-comment"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="px-5 py-4 border-t border-border/60 shrink-0">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                data-testid="button-booking-submit"
                className={cn(
                  "w-full h-12 rounded-xl font-semibold text-base transition-all",
                  canSubmit
                    ? "bg-primary text-white active:scale-[0.98]"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Отправить заявку
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
