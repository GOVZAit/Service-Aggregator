import { useMemo, useState } from "react";
import { Search, Phone, MapPin, Clock, Star, Baby, Home as HomeIcon, X, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/bottom-navigation";
import { cn } from "@/lib/utils";
import { doctors, doctorSpecialties } from "@/lib/doctors-data";

export default function DoctorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = doctors;
    if (specialty) {
      result = result.filter((d) => d.specialtyId === specialty);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.clinic.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => b.rating - a.rating);
  }, [searchQuery, specialty]);

  return (
    <div className="min-h-screen bg-background pb-24">
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

          <div className="relative">
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
        </div>
      </header>

      <main className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 pt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold mb-1">Никого не нашли</p>
            <p className="text-sm text-muted-foreground">Попробуйте изменить запрос или специальность</p>
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
                      Стаж {doc.experienceYears} лет · {doc.price}
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

                <a
                  href={`tel:${doc.phone.replace(/[^+\d]/g, "")}`}
                  data-testid={`doctor-call-${doc.id}`}
                  className="mt-3 w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Позвонить · {doc.phone}
                </a>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
