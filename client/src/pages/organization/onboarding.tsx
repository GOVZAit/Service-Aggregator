import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { organizationKindLabels, type OrganizationKind } from "@shared/provider-schema";
import type { Category } from "@shared/schema";

export default function OrganizationOnboardingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<OrganizationKind>("service_company");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState("Грозный");

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const canSave = categoryIds.length > 0 && description.trim().length >= 10;

  const mutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/providers/me", {
      organizationKind: kind,
      categoryIds,
      description: description.trim(),
      phone: phone.trim() || undefined,
      city,
      companyName: user?.name,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/providers/me"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/masters"] }),
      ]);
      navigate("/organization");
    },
  });

  const selectedNames = useMemo(
    () => categories.filter((category) => categoryIds.includes(category.id)).map((category) => category.name),
    [categories, categoryIds],
  );

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 safe-area-pt">
      <main className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Настройте организацию</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Организация может работать сразу в нескольких категориях.
          </p>
        </div>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Тип организации</h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(organizationKindLabels) as Array<[OrganizationKind, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2 text-left text-sm",
                  kind === value && "border-primary bg-primary/5 text-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <h2 className="font-semibold">Категории услуг</h2>
            <p className="text-xs text-muted-foreground">Можно выбрать несколько направлений.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((category) => {
              const selected = categoryIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryIds((current) =>
                    selected ? current.filter((id) => id !== category.id) : [...current, category.id]
                  )}
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-xl border px-3 text-sm font-medium",
                    selected && "border-primary bg-primary/5 text-primary",
                  )}
                >
                  {category.name}
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
          {selectedNames.length > 0 && (
            <p className="text-xs text-muted-foreground">Выбрано: {selectedNames.join(", ")}</p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Контакты и описание</h2>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Чем занимается организация, какие услуги оказывает, где работает…"
          />
        </section>

        <Button
          className="h-12 w-full rounded-xl"
          disabled={!canSave || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Сохраняем…" : "Завершить настройку"}
          {!mutation.isPending && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
        {mutation.isError && <p className="text-center text-sm text-destructive">Не удалось сохранить профиль.</p>}
      </main>
    </div>
  );
}
