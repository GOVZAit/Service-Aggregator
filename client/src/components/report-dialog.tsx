import { useState } from "react";
import { Flag } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TargetType = "provider" | "review";
type Reason = "spam" | "abuse" | "misleading" | "privacy" | "other";

const reasons: Array<{ value: Reason; label: string }> = [
  { value: "spam", label: "Спам / реклама" },
  { value: "abuse", label: "Оскорбления / недопустимый контент" },
  { value: "misleading", label: "Недостоверная информация" },
  { value: "privacy", label: "Персональные данные / приватность" },
  { value: "other", label: "Другое" },
];

interface ReportDialogProps {
  targetType: TargetType;
  targetId: number;
  compact?: boolean;
  className?: string;
}

export function ReportDialog({ targetType, targetId, compact = false, className }: ReportDialogProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("misleading");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const start = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiRequest("POST", "/api/moderation/reports", {
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      setOpen(false);
      setDetails("");
      toast({
        title: "Жалоба отправлена",
        description: "Администратор GOVZA рассмотрит её в очереди модерации.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast({
        title: message.includes("409") ? "Жалоба уже отправлена" : "Не удалось отправить жалобу",
        description: message.includes("409")
          ? "Ваша предыдущая жалоба на этот объект ещё рассматривается."
          : "Попробуйте ещё раз.",
        variant: message.includes("409") ? "default" : "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "sm" : "icon"}
        className={cn(compact ? "h-8 rounded-xl px-2 text-[11px] text-muted-foreground" : "h-11 w-11", className)}
        onClick={start}
        aria-label="Пожаловаться"
      >
        <Flag className={cn(compact ? "mr-1 h-3.5 w-3.5" : "h-4.5 w-4.5")} />
        {compact ? "Пожаловаться" : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-[1.6rem]">
          <DialogHeader>
            <DialogTitle>Отправить жалобу</DialogTitle>
            <DialogDescription>
              Укажите причину. Жалоба попадёт администратору и не публикуется другим пользователям.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold">Причина</span>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as Reason)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              >
                {reasons.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold">Комментарий</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Что именно следует проверить?"
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Отмена</Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy ? "Отправляем…" : "Отправить жалобу"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
