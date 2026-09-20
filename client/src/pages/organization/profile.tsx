import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Eye, EyeOff, LogOut, Plus, Save, Trash2 } from "lucide-react";
import OrganizationBottomNavigation from "@/components/organization-bottom-navigation";
import { PushNotificationCard } from "@/components/push-notification-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { organizationKindLabels, type OrganizationKind } from "@shared/provider-schema";
import type { Category, Master, Service } from "@shared/schema";

interface ProviderMe {
  provider: Master;
  visible: boolean;
}

export default function OrganizationProfilePage() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<ProviderMe>({ queryKey: ["/api/providers/me"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const provider = data?.provider;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<OrganizationKind>("service_company");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  useEffect(() => {
    if (!provider) return;
    setName(provider.name);
    setDescription(provider.description);
    setPhone(provider.phone ?? "");
    setCity(provider.city ?? "");
    setKind((provider.organizationKind as OrganizationKind | undefined) ?? "service_company");
    setCategoryIds(provider.categoryIds ?? [provider.categoryId]);
    setServices(provider.services ?? []);
  }, [provider?.id]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/providers/me", {
      name: name.trim(),
      companyName: name.trim(),
      description: description.trim(),
      phone: phone.trim() || undefined,
      city: city.trim() || undefined,
      organizationKind: kind,
      categoryIds,
      services,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/providers/me"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/masters"] }),
      ]);
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (visible: boolean) => apiRequest("POST", "/api/providers/me/visibility", { visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/masters"] });
    },
  });

  if (isLoading || !provider) {
    return <div className="app-page bg-background"><main className="p-6 text-center text-muted-foreground">Загрузка профиля…</main><OrganizationBottomNavigation /></div>;
  }

  const addService = () => {
    if (!serviceName.trim() || !servicePrice.trim()) return;
    setServices((current) => [...current, { name: serviceName.trim(), price: servicePrice.trim() }]);
    setServiceName("");
    setServicePrice("");
  };

  return (
    <div className="app-page bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 px-4 py-4 safe-area-pt backdrop-blur-xl">
        <div className="mx-auto max-w-lg lg:max-w-4xl">
          <p className="text-xs text-muted-foreground">Кабинет организации</p>
          <h1 className="text-xl font-bold">Профиль организации</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-28 lg:max-w-4xl">
        {provider.dataSource === "import" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            Данные этого профиля могут обновляться импортом. Ваши ручные изменения имеют приоритет и не будут затёрты.
          </div>
        )}

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Основные данные</h2>
          </div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название организации" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Описание" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" />
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Тип организации</h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(organizationKindLabels) as Array<[OrganizationKind, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cn("min-h-11 rounded-xl border px-3 text-left text-sm", kind === value && "border-primary bg-primary/5 text-primary")}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <h2 className="font-semibold">Категории услуг</h2>
            <p className="text-xs text-muted-foreground">Организация может работать в нескольких категориях.</p>
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
                  className={cn("flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm", selected && "border-primary bg-primary/5 text-primary")}
                >
                  {category.name}{selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border bg-card">
          <div className="border-b p-4"><h2 className="font-semibold">Услуги и цены</h2></div>
          <div className="divide-y">
            {services.map((service, index) => (
              <div key={`${service.name}-${index}`} className="flex items-center gap-3 p-3">
                <div className="flex-1"><p className="text-sm font-medium">{service.name}</p><p className="text-xs text-muted-foreground">{service.price}</p></div>
                <button onClick={() => setServices((current) => current.filter((_, i) => i !== index))} className="flex h-11 w-11 items-center justify-center text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t p-3">
            <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Услуга" />
            <Input value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="Цена" className="w-28" />
            <Button size="icon" className="h-11 w-11" onClick={addService}><Plus className="h-4 w-4" /></Button>
          </div>
        </section>

        <PushNotificationCard />

        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold">Видимость в каталоге</p>
              <p className="text-xs text-muted-foreground">
                {data.visible ? "Организация видна клиентам" : "Профиль скрыт из поиска"}
              </p>
            </div>
            <Button
              variant={data.visible ? "outline" : "default"}
              disabled={visibilityMutation.isPending}
              onClick={() => visibilityMutation.mutate(!data.visible)}
            >
              {data.visible ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {data.visible ? "Скрыть" : "Показать"}
            </Button>
          </div>
        </section>

        <Button className="h-12 w-full" disabled={saveMutation.isPending || categoryIds.length === 0 || name.trim().length < 2 || description.trim().length < 10} onClick={() => saveMutation.mutate()}>
          <Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? "Сохраняем…" : "Сохранить изменения"}
        </Button>

        <Button variant="ghost" className="h-11 w-full text-destructive" onClick={async () => { await logout(); navigate("/"); }}>
          <LogOut className="mr-2 h-4 w-4" />Выйти
        </Button>
      </main>
      <OrganizationBottomNavigation />
    </div>
  );
}
