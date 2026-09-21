import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Send, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { categories as seededCategories, type Category, type Master } from "@shared/schema";

interface InvitationOption {
  id: number;
  title: string;
  category: string;
  budget: string;
  createdAt: string;
  invitationStatus: "pending" | "responded" | "declined" | null;
}

export function InviteProviderModal({
  master,
  onClose,
}: {
  master: Master;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(master.category);
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");

  const { data: options = [], isLoading } = useQuery<InvitationOption[]>({
    queryKey: ["/api/masters", master.id, "invitation-options"],
    queryFn: async () => {
      const response = await fetch(`/api/masters/${master.id}/invitation-options`);
      if (!response.ok) throw new Error("Не удалось загрузить ваши заявки");
      return response.json();
    },
  });

  const { data: categories = seededCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    initialData: seededCategories,
  });

  const supportedCategories = useMemo(() => {
    const ids = master.categoryIds ?? [master.categoryId];
    return categories.filter((item) => ids.includes(item.id));
  }, [categories, master.categoryId, master.categoryIds]);

  const existingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequestId) throw new Error("Выберите заявку");
      return apiRequest("POST", `/api/masters/${master.id}/invitations`, {
        requestId: selectedRequestId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/masters", master.id, "invitation-options"] });
      toast({ title: "Приглашение отправлено", description: `${master.name} получит push-уведомление о вашей заявке.` });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Не удалось отправить приглашение", description: error.message, variant: "destructive" });
    },
  });

  const newMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/masters/${master.id}/invitations/new`, {
        title: title.trim(),
        category,
        description: description.trim(),
        budget: budget.trim(),
        location: location.trim(),
      });
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/requests"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/masters", master.id, "invitation-options"] }),
      ]);
      toast({ title: "Заявка создана и приглашение отправлено" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Не удалось создать приглашение", description: error.message, variant: "destructive" });
    },
  });

  const canCreate =
    title.trim().length >= 3 &&
    description.trim().length >= 5 &&
    budget.trim().length > 0 &&
    location.trim().length >= 3 &&
    category.length > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-background p-5 shadow-2xl safe-area-pb sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">Персональное приглашение</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-.03em]">Предложить заказ {master.name}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Выберите открытую заявку или создайте новую. Исполнитель получит отдельное уведомление.
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-2xl bg-muted/70 p-1">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`min-h-11 rounded-xl text-sm font-bold ${mode === "existing" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Моя заявка
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`min-h-11 rounded-xl text-sm font-bold ${mode === "new" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Новая заявка
          </button>
        </div>

        {mode === "existing" ? (
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="h-28 animate-pulse rounded-2xl bg-muted" />
            ) : options.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-5 text-center">
                <p className="text-sm font-semibold">Подходящих открытых заявок нет</p>
                <p className="mt-1 text-xs text-muted-foreground">Создайте новую заявку специально для этого исполнителя.</p>
                <Button variant="outline" className="mt-3" onClick={() => setMode("new")}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Создать заявку
                </Button>
              </div>
            ) : (
              options.map((request) => {
                const alreadyInvited = request.invitationStatus !== null;
                return (
                  <button
                    type="button"
                    key={request.id}
                    disabled={alreadyInvited}
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${selectedRequestId === request.id ? "border-primary bg-primary/[.05]" : "border-border"} ${alreadyInvited ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{request.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{request.category} · {request.budget}</p>
                      </div>
                      {alreadyInvited && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                    </div>
                    {request.invitationStatus && (
                      <p className="mt-2 text-[11px] font-semibold text-primary">
                        {request.invitationStatus === "pending"
                          ? "Приглашение уже отправлено"
                          : request.invitationStatus === "responded"
                            ? "Исполнитель уже откликнулся"
                            : "Ранее отклонено — можно отправить новое приглашение после создания новой заявки"}
                      </p>
                    )}
                  </button>
                );
              })
            )}

            {options.length > 0 && (
              <Button
                className="h-12 w-full rounded-2xl"
                disabled={!selectedRequestId || existingMutation.isPending}
                onClick={() => existingMutation.mutate()}
              >
                <Send className="mr-2 h-4 w-4" />
                {existingMutation.isPending ? "Отправляем…" : "Отправить приглашение"}
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Что нужно сделать?"
              maxLength={120}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm"
            >
              {supportedCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Опишите задачу"
              rows={4}
              maxLength={2000}
              className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Бюджет, например 3 000 ₽"
              maxLength={80}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Адрес выполнения работы"
              maxLength={250}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button
              className="h-12 w-full rounded-2xl"
              disabled={!canCreate || newMutation.isPending}
              onClick={() => newMutation.mutate()}
            >
              <Send className="mr-2 h-4 w-4" />
              {newMutation.isPending ? "Создаём…" : "Создать и пригласить"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
