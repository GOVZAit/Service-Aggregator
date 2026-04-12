import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import {
  User, Phone, Briefcase, Star, Award, Edit3, LogOut,
  Moon, Sun, Plus, Camera, Check, X, PhoneCall, PhoneOff,
  Clock, Calendar, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallMode } from "@shared/schema";

const categoryOptions = [
  "Сантехника", "Электрика", "Уборка", "Ремонт", "Красота", "Авто", "Доставка", "Репетиторы"
];

const myServices = [
  { id: 1, name: "Замена смесителя", price: "1 500 ₽" },
  { id: 2, name: "Установка унитаза", price: "3 000 ₽" },
  { id: 3, name: "Прочистка засора", price: "2 000 ₽" },
  { id: 4, name: "Замена труб", price: "от 5 000 ₽" },
];

const portfolioPhotos = [
  "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=200&h=200&fit=crop",
];

const CALL_MODE_OPTIONS: Array<{ id: CallMode; label: string; desc: string; icon: any }> = [
  { id: "always", label: "Всегда доступен", desc: "Клиенты могут позвонить 24/7", icon: PhoneCall },
  { id: "schedule", label: "По расписанию", desc: "Только в рабочие часы", icon: Clock },
  { id: "online_only", label: "Только онлайн", desc: "Пока онлайн-статус включён", icon: Phone },
  { id: "disabled", label: "Звонки отключены", desc: "Только чат и заявки", icon: PhoneOff },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

export default function MasterProfilePage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(
    "Профессиональный сантехник с опытом 10 лет. Работаю по всему Грозному. Гарантия на все виды работ."
  );
  const [descDraft, setDescDraft] = useState(description);
  const [selectedCategory, setSelectedCategory] = useState("Сантехника");

  // Availability settings
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(phone);
  const [callMode, setCallMode] = useState<CallMode>("always");
  const [workFrom, setWorkFrom] = useState("09:00");
  const [workTo, setWorkTo] = useState("18:00");
  const [showSchedule, setShowSchedule] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "МС";

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setIsDark(!isDark);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold">Профиль исполнителя</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Avatar + name + rating */}
        <section className="rounded-2xl bg-card border border-border/60 p-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {initials}
              </div>
              <button
                data-testid="button-change-avatar"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white shadow"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg leading-tight">{user?.name || "Мастер"}</h2>
              <p className="text-muted-foreground text-sm mt-0.5">{user?.phone || ""}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>4.9</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Award className="w-4 h-4" />
                  <span>432 выполнено</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">О себе</p>
              {!editingDescription && (
                <button
                  onClick={() => { setDescDraft(description); setEditingDescription(true); }}
                  data-testid="button-edit-description"
                  className="flex items-center gap-1 text-xs text-primary font-medium"
                >
                  <Edit3 className="w-3 h-3" />
                  Изменить
                </button>
              )}
            </div>
            {editingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={3}
                  data-testid="input-description"
                  className="w-full text-sm text-foreground bg-muted border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingDescription(false)}
                    data-testid="button-cancel-description"
                    className="flex-1 flex items-center justify-center gap-1 text-sm text-muted-foreground border border-border rounded-xl py-2"
                  >
                    <X className="w-4 h-4" />Отмена
                  </button>
                  <button
                    onClick={() => { setDescription(descDraft); setEditingDescription(false); }}
                    data-testid="button-save-description"
                    className="flex-[2] flex items-center justify-center gap-1 text-sm text-white bg-primary rounded-xl py-2"
                  >
                    <Check className="w-4 h-4" />Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed">{description}</p>
            )}
          </div>
        </section>

        {/* Category */}
        <section className="rounded-2xl bg-card border border-border/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Категория услуг</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                data-testid={`button-category-${cat}`}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                  selectedCategory === cat
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* ── Availability & Call Settings ─────────────────────────── */}
        <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Доступность для звонков</h3>
          </div>

          {/* Phone number */}
          <div className="px-4 py-3 border-b border-border/60">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Номер телефона</p>
              {!editingPhone && (
                <button
                  onClick={() => { setPhoneDraft(phone); setEditingPhone(true); }}
                  data-testid="button-edit-phone"
                  className="text-xs text-primary font-medium"
                >
                  Изменить
                </button>
              )}
            </div>
            {editingPhone ? (
              <div className="flex gap-2 mt-1">
                <input
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  placeholder="+7 (928) 000-00-00"
                  data-testid="input-phone"
                  className="flex-1 text-sm bg-muted border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => setEditingPhone(false)}
                  className="px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setPhone(phoneDraft); setEditingPhone(false); }}
                  data-testid="button-save-phone"
                  className="px-3 py-2 rounded-xl bg-primary text-white text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium mt-1">{phone || <span className="text-muted-foreground">Не указан</span>}</p>
            )}
          </div>

          {/* Call mode */}
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Режим звонков</p>
            {CALL_MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = callMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setCallMode(opt.id);
                    if (opt.id === "schedule") setShowSchedule(true);
                  }}
                  data-testid={`call-mode-${opt.id}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-primary/40"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-foreground")}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Working hours (shown when schedule mode) */}
          {callMode === "schedule" && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowSchedule((v) => !v)}
                className="w-full flex items-center justify-between text-sm font-semibold text-primary border border-primary/30 rounded-xl px-4 py-2.5 mb-3"
                data-testid="button-toggle-schedule"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Рабочие часы: {workFrom} — {workTo}
                </span>
                {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showSchedule && (
                <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Начало</p>
                    <select
                      value={workFrom}
                      onChange={(e) => setWorkFrom(e.target.value)}
                      data-testid="select-work-from"
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm font-semibold outline-none"
                    >
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="text-muted-foreground font-bold mt-4">—</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Конец</p>
                    <select
                      value={workTo}
                      onChange={(e) => setWorkTo(e.target.value)}
                      data-testid="select-work-to"
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm font-semibold outline-none"
                    >
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* My services */}
        <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Мои услуги</h3>
            <button data-testid="button-add-service" className="flex items-center gap-1 text-xs text-primary font-medium">
              <Plus className="w-3.5 h-3.5" />Добавить
            </button>
          </div>
          <div className="divide-y divide-border/60">
            {myServices.map((svc) => (
              <div key={svc.id} data-testid={`row-service-${svc.id}`} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-foreground">{svc.name}</span>
                <span className="text-sm font-semibold text-foreground">{svc.price}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Portfolio */}
        <section className="rounded-2xl bg-card border border-border/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Портфолио</h3>
            <button data-testid="button-add-photo" className="flex items-center gap-1 text-xs text-primary font-medium">
              <Plus className="w-3.5 h-3.5" />Добавить фото
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {portfolioPhotos.map((url, i) => (
              <div key={i} data-testid={`img-portfolio-${i}`} className="aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <button
              data-testid="button-add-portfolio-photo"
              className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/40 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </section>

        {/* Settings */}
        <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Настройки</h3>
          </div>
          <button
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
              <span className="text-sm">Тёмная тема</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{isDark ? "Включена" : "Выключена"}</span>
          </button>
          <div className="px-4 py-3 border-t border-border/60 flex items-center gap-3 text-xs text-muted-foreground">
            <User className="w-4 h-4" />
            <span>Исполнитель · GOVZAservice</span>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          data-testid="button-master-logout"
          className="w-full rounded-2xl border border-red-200 dark:border-red-900 py-4 flex items-center justify-center gap-2 text-red-500 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
      </main>

      <MasterBottomNavigation />
    </div>
  );
}
