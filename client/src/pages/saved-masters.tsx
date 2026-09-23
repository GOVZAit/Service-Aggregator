import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Heart, History, ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentMasters, useTodayAvailability } from "@/hooks/use-master-memory";
import { AppBrandHeader } from "@/components/app-brand-header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MasterCard } from "@/components/master-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { RECENT_MASTER_DAYS, RECENT_MASTER_LIMIT } from "@shared/client-memory";
import type { Master } from "@shared/schema";

export default function SavedMastersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const tab = new URLSearchParams(search).get("tab") === "recent" ? "recent" : "favorites";
  const favorites = useFavorites();
  const recent = useRecentMasters();
  const availability = useTodayAvailability();
  const catalog = useQuery<Master[]>({
    queryKey: ["/api/masters"], enabled: user?.role === "client", staleTime: 30_000, refetchOnWindowFocus: true,
  });
  const byId = new Map((catalog.data ?? []).map((master) => [master.id, master]));
  const masters = tab === "recent" ? recent.data.map((item) => item.master) : favorites.favorites.flatMap((id) => {
    const master = byId.get(id);
    return master ? [master] : [];
  });
  const unavailable = tab === "favorites" && !catalog.isPending && !catalog.isError ? favorites.favorites.filter((id) => !byId.has(id)) : [];
  const loading = authLoading || (tab === "recent" ? recent.isPending : favorites.isLoading || catalog.isPending);
  const error = tab === "recent" ? recent.isError : favorites.isError || catalog.isError;

  return (
    <div className="app-page bg-background">
      <header className="app-header-shell safe-area-pt">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <AppBrandHeader compact />
          <Link href="/" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> К каталогу</Link>
          <h1 className="mt-2 text-2xl font-extrabold">Мои мастера</h1>
          <p className="mt-1 text-sm text-muted-foreground">Сохранённые профили и недавние просмотры.</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-5">
        {!authLoading && user?.role !== "client" ? <EmptyState icon={<Heart className="h-10 w-10" />} title="Сохраните мастеров в аккаунте"
          description="После входа избранное и история будут доступны на ваших устройствах. Гостевые просмотры не записываются."
          action={<Button onClick={() => navigate("/auth")}>Войти</Button>} /> : (
          <Tabs value={tab} onValueChange={(value) => navigate(value === "recent" ? "/saved?tab=recent" : "/saved")}>
            <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="favorites" className="min-h-10 rounded-lg"><Heart className="mr-2 h-4 w-4" /> Избранное {!favorites.isLoading && favorites.favorites.length > 0 ? `(${favorites.favorites.length})` : ""}</TabsTrigger>
              <TabsTrigger value="recent" className="min-h-10 rounded-lg"><History className="mr-2 h-4 w-4" /> Вы смотрели</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {tab === "recent" && <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Последние {RECENT_MASTER_LIMIT} профилей за {RECENT_MASTER_DAYS} дней. История видна только вам.</p>
                {recent.data.length > 0 && <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" disabled={recent.clear.isPending}><Trash2 className="mr-2 h-4 w-4" /> Очистить</Button></AlertDialogTrigger>
                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Очистить историю просмотров?</AlertDialogTitle><AlertDialogDescription>Просмотренные профили исчезнут из истории на всех устройствах. Избранное и заказы останутся.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => recent.clear.mutate()}>Очистить историю</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>}
              </div>}
              {loading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((id) => <Skeleton key={id} className="h-44 rounded-2xl" />)}</div>
                : error ? <EmptyState icon={<History className="h-10 w-10" />} title="Не удалось загрузить профили" description="Ваши данные не потеряны. Проверьте соединение."
                    action={<Button variant="outline" onClick={() => { void favorites.refetch(); void recent.refetch(); void catalog.refetch(); }}>Повторить</Button>} />
                : masters.length === 0 && unavailable.length === 0 ? <EmptyState icon={tab === "recent" ? <History className="h-10 w-10" /> : <Heart className="h-10 w-10" />}
                    title={tab === "recent" ? "История пока пуста" : "В избранном пока никого"}
                    description={tab === "recent" ? "Здесь появятся мастера, чьи профили вы откроете после входа." : "Нажмите на сердечко в карточке или профиле мастера."}
                    action={<Button onClick={() => navigate("/")}>Найти мастера</Button>} />
                : <div className="grid gap-4 md:grid-cols-2">
                    {masters.map((master) => <MasterCard key={master.id} master={master} isFavorite={favorites.favorites.includes(master.id)} favoritePending={favorites.isPending(master.id)} onToggleFavorite={(event) => favorites.toggle(master.id, event)}
                      availableToday={availability.availableIds.has(master.id) ? availability.data?.providers[master.id] : undefined} />)}
                    {unavailable.map((id) => <div key={id} className="premium-card flex items-center gap-3 p-4"><p className="flex-1 text-sm text-muted-foreground">Этот профиль сейчас недоступен.</p><Button variant="outline" size="sm" disabled={favorites.isPending(id)} onClick={() => favorites.toggle(id)}>Убрать</Button></div>)}
                  </div>}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
