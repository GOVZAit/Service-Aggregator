import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@shared/schema";

function ScorePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
            aria-label={`${score} из 5`}
            aria-pressed={value === score}
          >
            <Star className={`h-5 w-5 ${score <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [quality, setQuality] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [priceMatch, setPriceMatch] = useState(5);
  const [courtesy, setCourtesy] = useState(5);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/orders/${order.id}/review`, {
        rating,
        quality,
        punctuality,
        priceMatch,
        courtesy,
        comment: comment.trim() || undefined,
      });
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/orders", order.id, "review"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/masters/${order.masterId}/reviews`] }),
      ]);
      toast({ title: "Спасибо за отзыв", description: "Он отмечен как отзыв по реальному заказу." });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Не удалось сохранить отзыв",
        description: error.message.includes("409")
          ? "Отзыв по этому заказу уже оставлен."
          : "Проверьте данные и попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Проверенный заказ</p>
            <h2 className="mt-1 text-xl font-bold">Как прошла работа?</h2>
            <p className="mt-1 text-sm text-muted-foreground">{order.title}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onClose} aria-label="Закрыть">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 p-4">
          <ScorePicker label="Общая оценка" value={rating} onChange={setRating} />
          <ScorePicker label="Качество работы" value={quality} onChange={setQuality} />
          <ScorePicker label="Соблюдение сроков" value={punctuality} onChange={setPunctuality} />
          <ScorePicker label="Соответствие цены" value={priceMatch} onChange={setPriceMatch} />
          <ScorePicker label="Вежливость" value={courtesy} onChange={setCourtesy} />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold">Комментарий</label>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Что понравилось? Что важно знать другим клиентам?"
            className="resize-none rounded-2xl"
            data-testid="review-comment"
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">{comment.length}/2000</p>
        </div>

        <Button
          className="mt-4 h-12 w-full rounded-xl text-base"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          data-testid="review-submit"
        >
          {mutation.isPending ? "Сохраняем…" : "Опубликовать отзыв"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Отзыв будет помечен как оставленный после завершённого заказа GOVZA.
        </p>
      </div>
    </div>
  );
}
