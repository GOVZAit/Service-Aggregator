import { useMemo, useState } from "react";
import { Crosshair, MapPin, Navigation, Phone, ShieldCheck, X, Zap } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { categories as seededCategories, cities, type Category } from "@shared/schema";

interface UrgentProvider {
  id: number;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  avatar: string;
  verified: boolean;
  providerType: "master" | "organization";
  companyName?: string;
  city?: string;
  district?: string;
  phone?: string;
  callMode: string;
  isOnline: boolean;
  availabilitySource: "calendar" | "online";
  availableUntil?: string;
  distanceKm?: number;
}

export function UrgentNowModal({
  initialCategoryId,
  onClose,
}: {
  initialCategoryId?: number | null;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const { data: categories = seededCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    initialData: seededCategories,
  });

  const initialId = initialCategoryId && categories.some((item) => item.id === initialCategoryId)
    ? initialCategoryId
    : categories[0]?.id ?? 1;

  const [categoryId, setCategoryId] = useState(initialId);
  const [city, setCity] = useState<string>(cities[1] ?? "Грозный");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [results, setResults] = useState<UrgentProvider[]>([]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId),
    [categories, categoryId],
  );

  const searchMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        categoryId: String(categoryId),
        city,
      });
      if (coords) {
        params.set("lat", String(coords.lat));
        params.set("lng", String(coords.lng));
      }
      const response = await fetch(`/api/urgent/providers?${params.toString()}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || "Не удалось выполнить срочный поиск");
      return data as UrgentProvider[];
    },
    onSuccess: setResults,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Геолокация недоступна — используем выбранный город.");
      return;
    }
    setLocationMessage("Определяем местоположение…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationMessage("Местоположение учтём только для сортировки ближайших исполнителей.");
      },
      () => {
        setCoords(null);
        setLocationMessage("Не удалось получить геолокацию — поиск будет по выбранному городу.");
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 5 * 60 * 1000 },
    );
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-background p-5 shadow-2xl safe-area-pb sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-orange-600">
              <Zap className="h-5 w-5 fill-current" />
              <span className="text-xs font-extrabold uppercase tracking-[.14em]">Нужен сейчас</span>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-.04em]">Найти свободного рядом</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Показываем только исполнителей, которые отметили свободное окно сейчас или находятся онлайн в рабочее время.
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(Number(event.target.value));
              setResults([]);
            }}
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.emoji} {category.name}</option>
            ))}
          </select>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setResults([]);
              }}
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm"
            >
              {cities.filter((item) => item !== "Все города").map((item) => <option key={item}>{item}</option>)}
            </select>
            <Button variant="outline" className="h-12 rounded-2xl px-3" onClick={requestLocation}>
              <Crosshair className="mr-1.5 h-4 w-4" />
              Рядом
            </Button>
          </div>

          {locationMessage && <p className="text-xs leading-relaxed text-muted-foreground">{locationMessage}</p>}

          <Button
            className="h-12 w-full rounded-2xl bg-orange-600 font-bold text-white hover:bg-orange-600/90"
            disabled={!selectedCategory || searchMutation.isPending}
            onClick={() => searchMutation.mutate()}
          >
            <Zap className="mr-2 h-4 w-4 fill-current" />
            {searchMutation.isPending ? "Ищем свободных…" : "Найти свободного сейчас"}
          </Button>
        </div>

        {searchMutation.isError && (
          <div className="mt-4 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
            {searchMutation.error instanceof Error ? searchMutation.error.message : "Не удалось выполнить поиск"}
          </div>
        )}

        {searchMutation.isSuccess && results.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="font-bold">Свободных сейчас не найдено</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Попробуйте другой город или создайте обычную заявку — мастера смогут откликнуться, когда освободятся.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">
              {coords ? "Ближайшие свободные" : "Свободные сейчас"}
            </p>
            {results.slice(0, 6).map((provider, index) => (
              <article key={provider.id} className={`rounded-2xl border p-4 ${index === 0 ? "border-orange-500/30 bg-orange-500/[.04]" : "border-border"}`}>
                {index === 0 && (
                  <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-orange-600">
                    Лучший вариант сейчас
                  </div>
                )}
                <div className="flex items-start gap-3">
                  {provider.avatar ? (
                    <img src={provider.avatar} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-extrabold text-primary">
                      {provider.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-extrabold">{provider.name}</p>
                      {provider.verified && <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ★ {provider.rating} · {provider.price}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {provider.distanceKm !== undefined && (
                        <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{provider.distanceKm} км</span>
                      )}
                      {!provider.distanceKm && provider.city && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{provider.city}</span>
                      )}
                      <span className="font-semibold text-emerald-600">
                        {provider.availabilitySource === "calendar" ? "Свободен" : "Онлайн"}
                        {provider.availableUntil ? ` до ${provider.availableUntil}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => navigate(`/master/${provider.id}?urgent=1`)}>
                    Открыть профиль
                  </Button>
                  {provider.phone ? (
                    <a
                      href={`tel:${provider.phone.replace(/[^+\d]/g, "")}`}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white"
                    >
                      <Phone className="h-4 w-4" />
                      Позвонить
                    </a>
                  ) : (
                    <Button className="rounded-xl" onClick={() => navigate(`/master/${provider.id}?urgent=1`)}>
                      Выбрать
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
