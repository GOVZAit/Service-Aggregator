import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Phone, MapPin, Clock, Star, Baby, Home as HomeIcon, X,
  Stethoscope, SlidersHorizontal, ChevronLeft, Send, MessageCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";
import { MapView } from "@/components/map-view";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { doctorSpecialties, type Doctor } from "@/lib/doctors-data";
import type { ChatMessage } from "@shared/schema";

type DoctorSort = "rating" | "price" | "experience";

const sortOptions: { key: DoctorSort; label: string }[] = [
  { key: "rating", label: "По рейтингу" },
  { key: "price", label: "Дешевле" },
  { key: "experience", label: "По стажу" },
];


// Doctor chats live in the same in-memory message store as master chats;
// offset the id so they never collide with master ids.
const doctorChatId = (id: number) => 1000 + id;

const extractPrice = (price: string) => Number(price.replace(/\D/g, "")) || 0;

export default function DoctorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<DoctorSort>("rating");
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [childrenOnly, setChildrenOnly] = useState(false);
  const [homeVisitsOnly, setHomeVisitsOnly] = useState(false);
  const [chatDoctor, setChatDoctor] = useState<Doctor | null>(null);

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/directory/doctors"],
  });
  const doctorCities = useMemo(
    () => Array.from(new Set(doctors.flatMap((doctor) => doctor.locations.map((location) => location.city)))),
    [doctors],
  );

  const hasActiveFilters = cityFilter !== null || childrenOnly || homeVisitsOnly || sortBy !== "rating";

  const resetFilters = () => {
    setSortBy("rating");
    setCityFilter(null);
    setChildrenOnly(false);
    setHomeVisitsOnly(false);
  };

  const filtered = useMemo(() => {
    let result = doctors;
    if (specialty) result = result.filter((d) => d.specialtyId === specialty);
    if (cityFilter) result = result.filter((d) => d.locations.some((l) => l.city === cityFilter));
    if (childrenOnly) result = result.filter((d) => d.acceptsChildren);
    if (homeVisitsOnly) result = result.filter((d) => d.homeVisits);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.locations.some((l) => l.clinic.toLowerCase().includes(q) || l.city.toLowerCase().includes(q))
      );
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "price": return extractPrice(a.price) - extractPrice(b.price);
        case "experience": return b.experienceYears - a.experienceYears;
        default: return b.rating - a.rating;
      }
    });
  }, [searchQuery, specialty, cityFilter, childrenOnly, homeVisitsOnly, sortBy]);

  if (chatDoctor) {
    return <DoctorChat doctor={chatDoctor} onBack={() => setChatDoctor(null)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-28">
      <header className="app-header-shell sticky top-0 z-40 safe-area-pt">
        <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 pt-3 pb-4">
          <AppBrandHeader compact />
          <div className="flex items-center gap-3 mt-5 mb-4">
            <div className="w-11 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl tracking-[-0.04em] leading-tight">Врачи</h1>
              <p className="text-xs text-muted-foreground">Чеченская Республика · запись по телефону</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Врач, специальность или клиника"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 bg-card border border-border/60 rounded-[1.2rem] font-medium shadow-sm placeholder:text-muted-foreground/70"
                style={{ height: "54px" }}
                data-testid="input-doctor-search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Очистить поиск"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground w-11 h-11 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Фильтры"
              aria-expanded={showFilters}
              data-testid="button-doctor-filters"
              className={cn(
                "rounded-2xl flex items-center justify-center transition-colors relative shrink-0",
                hasActiveFilters || showFilters
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground hover:bg-muted"
              )}
              style={{ width: "54px", height: "54px" }}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-background" />
              )}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 lg:-mx-6 lg:px-6 mt-3 lg:flex-wrap lg:overflow-visible">
            {doctorSpecialties.map((s) => {
              const isSelected = specialty === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSpecialty((prev) => (prev === s.id ? null : s.id))}
                  aria-pressed={isSelected}
                  data-testid={`specialty-chip-${s.id}`}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border border-border/60 text-foreground shadow-sm"
                  )}
                >
                  <span className="text-base leading-none">{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {showFilters && (
            <div className="mt-3 premium-card p-4 space-y-4" data-testid="doctor-filters-panel">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Сортировка</p>
                <div className="flex gap-2 flex-wrap">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSortBy(opt.key)}
                      aria-pressed={sortBy === opt.key}
                      data-testid={`doctor-sort-${opt.key}`}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                        sortBy === opt.key ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Город</p>
                <div className="flex gap-2 flex-wrap">
                  {doctorCities.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCityFilter((prev) => (prev === c ? null : c))}
                      aria-pressed={cityFilter === c}
                      data-testid={`doctor-city-${c}`}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                        cityFilter === c ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setChildrenOnly((v) => !v)}
                  aria-pressed={childrenOnly}
                  data-testid="doctor-filter-children"
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                    childrenOnly ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted"
                  )}
                >
                  <Baby className="w-4 h-4" /> Принимает детей
                </button>
                <button
                  onClick={() => setHomeVisitsOnly((v) => !v)}
                  aria-pressed={homeVisitsOnly}
                  data-testid="doctor-filter-home-visits"
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                    homeVisitsOnly ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted"
                  )}
                >
                  <HomeIcon className="w-4 h-4" /> Выезд на дом
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  data-testid="doctor-filters-reset"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "врач" : filtered.length < 5 ? "врача" : "врачей"}
            {cityFilter && <span className="text-primary font-medium"> · {cityFilter}</span>}
          </p>
          <div className="flex bg-muted/70 rounded-2xl p-1">
            <button
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              data-testid="doctors-view-list"
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              Список
            </button>
            <button
              onClick={() => setViewMode("map")}
              aria-pressed={viewMode === "map"}
              data-testid="doctors-view-map"
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                viewMode === "map" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              Карта
            </button>
          </div>
        </div>
        {viewMode === "map" && filtered.length > 0 ? (
          <div className="rounded-[1.75rem] overflow-hidden border border-border/70 shadow-sm h-[420px] lg:h-[540px]">
            <MapView
              organizations={filtered.flatMap((doc) =>
                doc.locations
                  .filter((loc) => !cityFilter || loc.city === cityFilter)
                  .map((loc, i) => ({
                  id: `${doc.id}-${i}`,
                  name: doc.name,
                  subcategory: `${doc.specialty} · ${loc.clinic}`,
                  address: `${loc.city}, ${loc.address}`,
                  phone: doc.phone,
                  hours: loc.schedule,
                  lat: loc.lat,
                  lng: loc.lng,
                }))
              )}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold mb-1">Никого не нашли</p>
            <p className="text-sm text-muted-foreground mb-3">Попробуйте изменить запрос или фильтры</p>
            {(hasActiveFilters || specialty || searchQuery) && (
              <button
                onClick={() => { resetFilters(); setSpecialty(null); setSearchQuery(""); }}
                className="text-sm font-medium text-primary hover:underline"
              >
                Сбросить всё
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                data-testid={`doctor-card-${doc.id}`}
                className="premium-card p-4"
              >
                <div className="flex gap-3">
                  <Avatar className="w-14 h-14 rounded-2xl">
                    <AvatarImage src={doc.avatar} alt={doc.name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl">
                      {doc.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{doc.name}</p>
                        <p className="text-sm text-primary font-medium">{doc.specialty}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-amber-500/10 px-2 py-1 rounded-lg">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span className="text-sm font-bold">{doc.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({doc.reviews})</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Стаж {doc.experienceYears} лет · {doc.price}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {doc.locations.map((loc, i) => (
                    <div key={i} className="rounded-2xl bg-muted/55 px-3 py-2.5 text-sm">
                      <p className="flex items-center gap-2 font-medium">
                        <MapPin className="w-4 h-4 shrink-0 text-primary" />
                        <span className="truncate">{loc.clinic}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 ml-6">{loc.city}, {loc.address}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 ml-6">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {loc.schedule}
                      </p>
                    </div>
                  ))}
                  {doc.homeVisits && (
                    <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm flex items-center gap-2 text-primary font-medium">
                      <HomeIcon className="w-4 h-4 shrink-0" />
                      Принимает на дому — по договорённости
                    </div>
                  )}
                </div>

                {doc.acceptsChildren && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="gap-1 rounded-lg">
                      <Baby className="w-3 h-3" /> Принимает детей
                    </Badge>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <a
                    href={`tel:${doc.phone.replace(/[^+\d]/g, "")}`}
                    data-testid={`doctor-call-${doc.id}`}
                    className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-primary/90 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Позвонить
                  </a>
                  <button
                    onClick={() => setChatDoctor(doc)}
                    data-testid={`doctor-message-${doc.id}`}
                    className="flex-1 h-12 rounded-2xl border-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Написать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}

function DoctorChat({ doctor, onBack }: { doctor: Doctor; onBack: () => void }) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const chatId = doctorChatId(doctor.id);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: [`/api/messages/${chatId}`],
  });

  const sendMutation = useMutation({
    mutationFn: (msgText: string) =>
      apiRequest("POST", `/api/messages/${chatId}`, { text: msgText, sender: "user" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/messages/${chatId}`] });
      setTimeout(async () => {
        await apiRequest("POST", `/api/messages/${chatId}`, {
          text: "Здравствуйте! Спасибо за сообщение. Уточните, пожалуйста, что вас беспокоит, и удобное время приёма.",
          sender: "master",
        });
        queryClient.invalidateQueries({ queryKey: [`/api/messages/${chatId}`] });
      }, 1500);
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
    setText("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg lg:max-w-3xl mx-auto">
      <header className="sticky top-0 z-40 bg-background/92 backdrop-blur-2xl border-b border-border/70 px-3 py-2.5 flex items-center gap-2">
        <button
          onClick={onBack}
          aria-label="Назад к списку врачей"
          data-testid="chat-back"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-10 h-10 rounded-xl">
          <AvatarImage src={doctor.avatar} alt={doctor.name} className="object-cover" />
          <AvatarFallback className="rounded-xl">{doctor.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{doctor.name}</p>
          <p className="text-xs text-primary">{doctor.specialty} · {doctor.locations[0].clinic}</p>
        </div>
        <a
          href={`tel:${doctor.phone.replace(/[^+\d]/g, "")}`}
          aria-label="Позвонить врачу"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-emerald-600/20"
        >
          <Phone className="w-4 h-4" />
        </a>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-2xl px-4 py-3 max-w-xs mx-auto">
            Напишите врачу — обычно отвечают в течение часа
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                m.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className={cn("text-[10px] mt-1", m.sender === "user" ? "text-white/70" : "text-muted-foreground")}>
                {m.time}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border/60 px-3 py-2.5 flex items-center gap-2 safe-area-pb">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Сообщение врачу…"
          className="flex-1 bg-muted/60 border-0 rounded-2xl"
          style={{ height: "46px" }}
          data-testid="chat-input"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          aria-label="Отправить"
          data-testid="chat-send"
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
