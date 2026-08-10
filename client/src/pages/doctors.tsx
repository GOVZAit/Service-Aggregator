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
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { doctors, doctorSpecialties, type Doctor } from "@/lib/doctors-data";
import type { ChatMessage } from "@shared/schema";

type DoctorSort = "rating" | "price" | "experience";

const sortOptions: { key: DoctorSort; label: string }[] = [
  { key: "rating", label: "По рейтингу" },
  { key: "price", label: "Дешевле" },
  { key: "experience", label: "По стажу" },
];

const districts = Array.from(new Set(doctors.map((d) => d.district)));

// Doctor chats live in the same in-memory message store as master chats;
// offset the id so they never collide with master ids.
const doctorChatId = (id: number) => 1000 + id;

const extractPrice = (price: string) => Number(price.replace(/\D/g, "")) || 0;

export default function DoctorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<DoctorSort>("rating");
  const [district, setDistrict] = useState<string | null>(null);
  const [childrenOnly, setChildrenOnly] = useState(false);
  const [homeVisitsOnly, setHomeVisitsOnly] = useState(false);
  const [chatDoctor, setChatDoctor] = useState<Doctor | null>(null);

  const hasActiveFilters = district !== null || childrenOnly || homeVisitsOnly || sortBy !== "rating";

  const resetFilters = () => {
    setSortBy("rating");
    setDistrict(null);
    setChildrenOnly(false);
    setHomeVisitsOnly(false);
  };

  const filtered = useMemo(() => {
    let result = doctors;
    if (specialty) result = result.filter((d) => d.specialtyId === specialty);
    if (district) result = result.filter((d) => d.district === district);
    if (childrenOnly) result = result.filter((d) => d.acceptsChildren);
    if (homeVisitsOnly) result = result.filter((d) => d.homeVisits);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.clinic.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "price": return extractPrice(a.price) - extractPrice(b.price);
        case "experience": return b.experienceYears - a.experienceYears;
        default: return b.rating - a.rating;
      }
    });
  }, [searchQuery, specialty, district, childrenOnly, homeVisitsOnly, sortBy]);

  if (chatDoctor) {
    return <DoctorChat doctor={chatDoctor} onBack={() => setChatDoctor(null)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-28">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Врачи</h1>
              <p className="text-xs text-muted-foreground">Грозный · запись по телефону</p>
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
                className="pl-12 pr-10 bg-muted/60 border-0 rounded-2xl font-medium placeholder:text-muted-foreground/70"
                style={{ height: "48px" }}
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
                  ? "bg-emerald-600 text-white"
                  : "bg-muted/60 text-foreground hover:bg-muted"
              )}
              style={{ width: "48px", height: "48px" }}
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
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-muted/60 text-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-base leading-none">{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {showFilters && (
            <div className="mt-3 rounded-2xl border border-border/60 bg-card p-4 space-y-4" data-testid="doctor-filters-panel">
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
                        sortBy === opt.key ? "bg-emerald-600 text-white" : "bg-muted/60 hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Район</p>
                <div className="flex gap-2 flex-wrap">
                  {districts.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDistrict((prev) => (prev === d ? null : d))}
                      aria-pressed={district === d}
                      data-testid={`doctor-district-${d}`}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                        district === d ? "bg-emerald-600 text-white" : "bg-muted/60 hover:bg-muted"
                      )}
                    >
                      {d}
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
                    childrenOnly ? "bg-emerald-600 text-white" : "bg-muted/60 hover:bg-muted"
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
                    homeVisitsOnly ? "bg-emerald-600 text-white" : "bg-muted/60 hover:bg-muted"
                  )}
                >
                  <HomeIcon className="w-4 h-4" /> Выезд на дом
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  data-testid="doctor-filters-reset"
                  className="text-sm font-medium text-emerald-600 hover:underline"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 pt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold mb-1">Никого не нашли</p>
            <p className="text-sm text-muted-foreground mb-3">Попробуйте изменить запрос или фильтры</p>
            {(hasActiveFilters || specialty || searchQuery) && (
              <button
                onClick={() => { resetFilters(); setSpecialty(null); setSearchQuery(""); }}
                className="text-sm font-medium text-emerald-600 hover:underline"
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
                className="bg-card border border-border/60 rounded-3xl p-4 shadow-sm"
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
                        <p className="text-sm text-emerald-600 font-medium">{doc.specialty}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-amber-500/10 px-2 py-1 rounded-lg">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span className="text-sm font-bold">{doc.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({doc.reviews})</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Стаж {doc.experienceYears} лет · {doc.price} · {doc.district}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{doc.clinic} — {doc.address}</span>
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    {doc.schedule}
                  </p>
                </div>

                {(doc.acceptsChildren || doc.homeVisits) && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {doc.acceptsChildren && (
                      <Badge variant="secondary" className="gap-1 rounded-lg">
                        <Baby className="w-3 h-3" /> Принимает детей
                      </Badge>
                    )}
                    {doc.homeVisits && (
                      <Badge variant="secondary" className="gap-1 rounded-lg">
                        <HomeIcon className="w-3 h-3" /> Выезд на дом
                      </Badge>
                    )}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <a
                    href={`tel:${doc.phone.replace(/[^+\d]/g, "")}`}
                    data-testid={`doctor-call-${doc.id}`}
                    className="flex-1 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Позвонить
                  </a>
                  <button
                    onClick={() => setChatDoctor(doc)}
                    data-testid={`doctor-message-${doc.id}`}
                    className="flex-1 h-11 rounded-2xl border-2 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/10 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
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
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/60 px-3 py-2.5 flex items-center gap-2">
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
          <p className="text-xs text-emerald-600">{doctor.specialty} · {doctor.clinic}</p>
        </div>
        <a
          href={`tel:${doctor.phone.replace(/[^+\d]/g, "")}`}
          aria-label="Позвонить врачу"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20"
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
                  ? "bg-emerald-600 text-white rounded-br-md"
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
          className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
