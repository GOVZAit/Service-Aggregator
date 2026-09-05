import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Camera, CheckCircle2, MapPin, PackageSearch, Pencil, Plus, Search, X } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LostFoundListing, LostFoundListingInput, LostFoundType } from "@shared/schema";

const emptyForm = (): LostFoundListingInput => ({
  type: "lost",
  title: "",
  description: "",
  location: "",
  eventDate: new Date().toISOString().slice(0, 10),
  contact: "",
  image: "",
});

export default function LostFoundPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<"all" | LostFoundType>("all");
  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected] = useState<LostFoundListing | null>(null);
  const [editing, setEditing] = useState<LostFoundListing | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LostFoundListingInput>(emptyForm);

  const { data: listings = [], isLoading } = useQuery<LostFoundListing[]>({
    queryKey: ["/api/lost-found"],
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    return listings.filter((listing) =>
      (type === "all" || listing.type === type) &&
      (showClosed || listing.status === "active") &&
      (!query || [listing.title, listing.description, listing.location].some((value) =>
        value.toLocaleLowerCase("ru").includes(query),
      )),
    );
  }, [listings, search, showClosed, type]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(editing ? "PATCH" : "POST", editing ? `/api/lost-found/${editing.id}` : "/api/lost-found", form);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/lost-found"] });
      setFormOpen(false);
      setEditing(null);
      toast({ title: editing ? "Объявление обновлено" : "Объявление опубликовано" });
    },
    onError: (error: Error) => toast({ title: "Не удалось сохранить", description: readableError(error), variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/lost-found/${id}`, { status: "closed" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/lost-found"] });
      setSelected(null);
      toast({ title: "Объявление закрыто" });
    },
    onError: (error: Error) => toast({ title: "Не удалось закрыть", description: readableError(error), variant: "destructive" }),
  });

  function openCreate() {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setEditing(null);
    setForm({ ...emptyForm(), contact: user.phone ?? user.email ?? "" });
    setFormOpen(true);
  }

  function openEdit(listing: LostFoundListing) {
    setSelected(null);
    setEditing(listing);
    setForm({
      type: listing.type,
      title: listing.title,
      description: listing.description,
      location: listing.location,
      eventDate: listing.eventDate,
      contact: listing.contact,
      image: listing.image ?? "",
    });
    setFormOpen(true);
  }

  return (
    <div className="app-page bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl safe-area-pt">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4 lg:max-w-5xl lg:px-6">
          <div>
            <p className="text-xs text-muted-foreground">Чеченская Республика</p>
            <h1 className="mt-0.5 text-xl font-bold">Потеряно / Найдено</h1>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" />Добавить</Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 pb-28 lg:max-w-5xl lg:px-6 lg:pb-32">
        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 lg:flex lg:items-center lg:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <PackageSearch className="h-6 w-6" />
          </div>
          <div>
            <h2 className="mt-4 text-lg font-bold lg:mt-0">Поможем вернуть важное</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Опубликуйте пропажу или сообщите о найденной вещи, документе или животном.
            </p>
          </div>
        </section>

        <section className="mt-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по объявлениям" className="pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {([["all", "Все"], ["lost", "Потеряно"], ["found", "Найдено"]] as const).map(([value, label]) => (
              <Button key={value} variant={type === value ? "default" : "outline"} size="sm" onClick={() => setType(value)}>{label}</Button>
            ))}
            <Button variant={showClosed ? "secondary" : "ghost"} size="sm" onClick={() => setShowClosed((value) => !value)}>Закрытые</Button>
          </div>
        </section>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Загружаем объявления…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed p-8 text-center">
            <PackageSearch className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-semibold">Объявлений пока нет</p>
            <p className="mt-1 text-sm text-muted-foreground">Измените фильтр или опубликуйте первое объявление.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => (
              <button key={listing.id} onClick={() => setSelected(listing)} className="overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition hover:border-primary/40">
                {listing.image && <img src={listing.image} alt="" className="h-44 w-full object-cover" />}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${listing.type === "lost" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {listing.type === "lost" ? "Потеряно" : "Найдено"}
                    </span>
                    {listing.status === "closed" && <span className="text-xs text-muted-foreground">Закрыто</span>}
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-bold">{listing.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{listing.location}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <ListingDialog listing={selected} currentUserId={user?.id} onClose={() => setSelected(null)} onEdit={openEdit} onCloseListing={(id) => closeMutation.mutate(id)} closing={closeMutation.isPending} />
      <ListingFormDialog open={formOpen} editing={Boolean(editing)} form={form} setForm={setForm} onOpenChange={setFormOpen} onSubmit={() => saveMutation.mutate()} saving={saveMutation.isPending} />
      <BottomNavigation />
    </div>
  );
}

function ListingDialog({ listing, currentUserId, onClose, onEdit, onCloseListing, closing }: {
  listing: LostFoundListing | null;
  currentUserId?: number;
  onClose: () => void;
  onEdit: (listing: LostFoundListing) => void;
  onCloseListing: (id: number) => void;
  closing: boolean;
}) {
  if (!listing) return null;
  const own = listing.authorId === currentUserId;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${listing.type === "lost" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            {listing.type === "lost" ? "Потеряно" : "Найдено"}{listing.status === "closed" ? " · закрыто" : ""}
          </div>
          <DialogTitle className="pt-2 text-left text-xl">{listing.title}</DialogTitle>
          <DialogDescription className="text-left">Автор: {listing.authorName}</DialogDescription>
        </DialogHeader>
        {listing.image && <img src={listing.image} alt={listing.title} className="max-h-72 w-full rounded-2xl object-cover" />}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{listing.description}</p>
        <div className="space-y-2 rounded-2xl bg-muted/50 p-4 text-sm">
          <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{listing.location}</p>
          <p className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{formatDate(listing.eventDate)}</p>
          <p className="font-medium">Связаться: {listing.contact}</p>
        </div>
        {own && listing.status === "active" && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onEdit(listing)}><Pencil className="mr-2 h-4 w-4" />Изменить</Button>
            <Button variant="secondary" className="flex-1" disabled={closing} onClick={() => onCloseListing(listing.id)}><CheckCircle2 className="mr-2 h-4 w-4" />Закрыть</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListingFormDialog({ open, editing, form, setForm, onOpenChange, onSubmit, saving }: {
  open: boolean;
  editing: boolean;
  form: LostFoundListingInput;
  setForm: React.Dispatch<React.SetStateAction<LostFoundListingInput>>;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const update = (field: keyof LostFoundListingInput, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const valid = form.title.trim().length >= 3 && form.description.trim().length >= 10 && form.location.trim().length >= 3 && form.eventDate && form.contact.trim().length >= 3;

  function readImage(file?: File) {
    if (!file) return;
    if (file.size > 900_000) return alert("Выберите фото размером до 900 КБ");
    const reader = new FileReader();
    reader.onload = () => update("image", String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Изменить объявление" : "Новое объявление"}</DialogTitle>
          <DialogDescription>Заполните детали, чтобы с вами было проще связаться.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <Field label="Тип">
            <Select value={form.type} onValueChange={(value: LostFoundType) => update("type", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="lost">Потеряно</SelectItem><SelectItem value="found">Найдено</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Заголовок"><Input value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={120} placeholder="Например, потерян паспорт" /></Field>
          <Field label="Описание"><Textarea value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={2000} rows={4} placeholder="Опишите вещь и важные приметы" /></Field>
          <Field label="Место"><Input value={form.location} onChange={(event) => update("location", event.target.value)} maxLength={250} placeholder="Город, улица или ориентир" /></Field>
          <Field label="Дата"><Input type="date" value={form.eventDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => update("eventDate", event.target.value)} /></Field>
          <Field label="Как связаться"><Input value={form.contact} onChange={(event) => update("contact", event.target.value)} maxLength={150} placeholder="Телефон, email или мессенджер" /></Field>
          <Field label="Фото (необязательно)">
            <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => readImage(event.target.files?.[0])} />
            {form.image ? (
              <div className="relative"><img src={form.image} alt="" className="h-40 w-full rounded-2xl object-cover" /><Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2" onClick={() => update("image", "")}><X className="h-4 w-4" /></Button></div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}><Camera className="mr-2 h-4 w-4" />Выбрать фото</Button>
            )}
          </Field>
          <Button type="submit" className="w-full" disabled={!valid || saving}>{saving ? "Сохраняем…" : editing ? "Сохранить изменения" : "Опубликовать"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function readableError(error: Error) {
  try {
    return JSON.parse(error.message.replace(/^\d+:\s*/, "")).message ?? error.message;
  } catch {
    return error.message;
  }
}