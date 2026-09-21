import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import MasterBottomNavigation from "@/components/master-bottom-navigation";
import { AppBrandHeader } from "@/components/app-brand-header";
import { PushNotificationCard } from "@/components/push-notification-card";
import { ProviderVerificationCard } from "@/components/provider-verification-card";
import { ProviderAvailabilityCard } from "@/components/provider-availability-card";
import { Award, Briefcase, Building2, Camera, Check, Clock, LogOut, Moon, Phone, Plus, Save, Sun, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cities, executorTypeLabels } from "@shared/schema";
import type { CallMode, Category, Certificate, ExecutorType, Master, MasterSettingsInput, Service } from "@shared/schema";

const callModes: { id: CallMode; label: string }[] = [
  { id: "always", label: "Всегда доступен" },
  { id: "schedule", label: "По расписанию" },
  { id: "online_only", label: "Только когда онлайн" },
  { id: "disabled", label: "Только чат" },
];

export default function MasterProfilePage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const masterId = user?.masterId;
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: master, isLoading } = useQuery<Master>({ queryKey: [`/api/masters/${masterId}`], enabled: !!masterId });
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("Сантехника");
  const [city, setCity] = useState("Грозный");
  const [callMode, setCallMode] = useState<CallMode>("always");
  const [workFrom, setWorkFrom] = useState("09:00");
  const [workTo, setWorkTo] = useState("18:00");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certYear, setCertYear] = useState("");
  const [certImage, setCertImage] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));

  useEffect(() => {
    if (!master) return;
    setDescription(master.description);
    setCompanyName(master.companyName ?? "");
    setPhone(master.phone ?? "");
    setCategory(master.category);
    setCity(master.city ?? "Грозный");
    setCallMode(master.callMode);
    setWorkFrom(master.workingHours.from);
    setWorkTo(master.workingHours.to);
  }, [master]);

  const mutation = useMutation({
    mutationFn: (patch: MasterSettingsInput) => apiRequest("PATCH", `/api/masters/${masterId}`, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/masters/${masterId}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/masters"] });
      setMessage("Сохранено");
      window.setTimeout(() => setMessage(""), 1800);
    },
    onError: () => setMessage("Не удалось сохранить"),
  });

  const saveMain = () => {
    const selected = categories.find((item) => item.name === category);
    mutation.mutate({ description: description.trim(), companyName: companyName.trim(), phone: phone.trim(), category, categoryId: selected?.id, city: city as any, callMode, workingHours: { from: workFrom, to: workTo } });
  };
  const addService = () => {
    if (!serviceName.trim() || !servicePrice.trim() || !master) return;
    mutation.mutate({ services: [...master.services, { name: serviceName.trim(), price: servicePrice.trim() }] }, { onSuccess: () => { setServiceName(""); setServicePrice(""); } });
  };
  const removeService = (index: number) => master && mutation.mutate({ services: master.services.filter((_, i) => i !== index) });
  const addCertificate = () => {
    if (!certTitle.trim() || !master) return;
    const certificate: Certificate = { id: Date.now(), title: certTitle.trim(), ...(certIssuer.trim() ? { issuer: certIssuer.trim() } : {}), ...(certYear.trim() ? { year: certYear.trim() } : {}), ...(certImage ? { image: certImage } : {}) };
    mutation.mutate({ certificates: [...(master.certificates ?? []), certificate], hasCertificate: true }, { onSuccess: () => { setCertTitle(""); setCertIssuer(""); setCertYear(""); setCertImage(undefined); } });
  };
  const removeCertificate = (id: number) => {
    const certificates = (master?.certificates ?? []).filter((item) => item.id !== id);
    mutation.mutate({ certificates, hasCertificate: certificates.length > 0 });
  };
  const readImage = (file: File | undefined, target: "avatar" | "portfolio") => {
    if (!file || !master) return;
    if (file.size > 700_000) { setMessage("Фото должно быть меньше 700 КБ"); return; }
    const reader = new FileReader();
    reader.onload = () => mutation.mutate(target === "avatar" ? { avatar: reader.result as string } : { portfolio: [...master.portfolio, reader.result as string] });
    reader.readAsDataURL(file);
  };
  const readCertificateImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 700_000) { setMessage("Фото должно быть меньше 700 КБ"); return; }
    const reader = new FileReader();
    reader.onload = () => setCertImage(reader.result as string);
    reader.readAsDataURL(file);
  };
  const toggleTheme = () => { const dark = !isDark; setIsDark(dark); document.documentElement.classList.toggle("dark", dark); localStorage.setItem("theme", dark ? "dark" : "light"); };

  if (isLoading || !master) return <div className="app-page bg-background px-4 pt-8"><div className="max-w-lg mx-auto space-y-4"><div className="h-28 rounded-2xl bg-muted animate-pulse" /><div className="h-72 rounded-2xl bg-muted animate-pulse" /></div><MasterBottomNavigation /></div>;
  const initials = master.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}:00`);
  const visibility = [
    ["showPrices", "Услуги и цены", master.showPrices !== false],
    ["showPortfolio", "Портфолио", master.showPortfolio !== false],
    ["showReviews", "Отзывы", master.showReviews !== false],
    ["showCertificates", "Сертификаты", master.showCertificates !== false],
  ] as const;

  return <div className="app-page bg-background">
    <header className="app-header-shell sticky top-0 z-40 safe-area-pt"><div className="max-w-lg lg:max-w-4xl mx-auto px-4 py-4"><AppBrandHeader compact /><div className="mt-6 flex items-end justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">Кабинет мастера</p><h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em]">Профиль</h1><p className="mt-1 text-xs text-muted-foreground">Изменения сразу видны клиентам</p></div>{message && <span className={cn("rounded-full px-3 py-1.5 text-xs font-bold", message === "Сохранено" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>{message}</span>}</div></div></header>
    <main className="max-w-lg lg:max-w-4xl mx-auto px-4 py-4 space-y-4">
      <section className="premium-card p-4 flex items-center gap-4"><div className="relative">{master.avatar ? <img src={master.avatar} alt={master.name} className="w-20 h-20 rounded-[1.4rem] object-cover" /> : <div className="w-20 h-20 rounded-[1.4rem] bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">{initials}</div>}<label className="absolute -right-2 -bottom-2 w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer"><Camera className="w-4 h-4" /><input type="file" accept="image/*" className="hidden" onChange={(event) => readImage(event.target.files?.[0], "avatar")} /></label></div><div><h2 className="font-bold text-lg">{master.name}</h2><p className="text-sm text-muted-foreground">{master.category} · {master.city}</p><p className="text-xs mt-1">★ {master.rating} · {master.completedOrders} выполнено</p></div></section>

      <section className="premium-card p-4 space-y-3"><h3 className="font-semibold flex items-center gap-2"><User className="w-4 h-4 text-primary" />Основная информация</h3><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000} placeholder="Расскажите об опыте и гарантиях" className="w-full rounded-2xl bg-muted/60 border border-border/70 px-3 py-3 text-base resize-none" data-testid="input-description" /><div className="grid sm:grid-cols-2 gap-2"><div className="relative"><Building2 className="absolute left-3 top-4 w-4 h-4 text-muted-foreground" /><Input autoComplete="organization" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Компания или бренд" className="h-12 pl-9" /></div><div className="relative"><Phone className="absolute left-3 top-4 w-4 h-4 text-muted-foreground" /><Input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон для клиентов" className="h-12 pl-9" /></div></div><div className="grid grid-cols-2 gap-2"><select value={category} onChange={(e) => setCategory(e.target.value)} className="h-12 rounded-2xl border border-border/70 bg-background px-3 text-base">{categories.map((item) => <option key={item.id}>{item.name}</option>)}</select><select value={city} onChange={(e) => setCity(e.target.value)} className="h-12 rounded-2xl border border-border/70 bg-background px-3 text-base">{cities.filter((item) => item !== "Все города").map((item) => <option key={item}>{item}</option>)}</select></div><div><p className="text-xs font-medium text-muted-foreground mb-2">Приём звонков</p><div className="grid grid-cols-2 gap-2">{callModes.map((mode) => <button key={mode.id} onClick={() => setCallMode(mode.id)} className={cn("pressable min-h-[44px] rounded-2xl border border-border/70 px-3 py-2 text-xs font-medium", callMode === mode.id && "border-primary bg-primary/5 text-primary")}>{mode.label}</button>)}</div></div>{callMode === "schedule" && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><select value={workFrom} onChange={(e) => setWorkFrom(e.target.value)} className="h-11 rounded-lg border bg-background px-2">{hours.map((hour) => <option key={hour}>{hour}</option>)}</select><span>—</span><select value={workTo} onChange={(e) => setWorkTo(e.target.value)} className="h-11 rounded-lg border bg-background px-2">{hours.map((hour) => <option key={hour}>{hour}</option>)}</select></div>}<Button onClick={saveMain} disabled={mutation.isPending || description.trim().length < 10} className="accent-gradient h-12 w-full rounded-2xl font-bold text-white"><Save className="w-4 h-4 mr-2" />Сохранить профиль</Button></section>

      <section className="premium-card overflow-hidden"><div className="p-4 border-b"><h3 className="font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />Услуги и цены</h3></div><div className="divide-y">{master.services.map((service, index) => <div key={`${service.name}-${index}`} className="p-3 flex items-center gap-3"><div className="flex-1"><p className="text-sm font-medium">{service.name}</p><p className="text-xs text-muted-foreground">{service.price}</p></div><button onClick={() => removeService(index)} aria-label="Удалить услугу" className="w-11 h-11 flex items-center justify-center text-destructive"><Trash2 className="w-4 h-4" /></button></div>)}{master.services.length === 0 && <p className="p-4 text-sm text-muted-foreground">Добавьте хотя бы одну услугу, чтобы клиенты могли записаться.</p>}</div><div className="p-3 border-t flex gap-2"><Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Название услуги" /><Input value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="Цена" className="w-28" /><Button size="icon" className="h-11 w-11" onClick={addService} disabled={!serviceName.trim() || !servicePrice.trim()}><Plus className="w-4 h-4" /></Button></div></section>

      <section className="premium-card p-4"><div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Портфолио</h3><label className="min-h-[44px] flex items-center text-xs text-primary font-medium cursor-pointer"><Plus className="inline w-4 h-4" /> Добавить фото<input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], "portfolio")} /></label></div><div className="grid grid-cols-3 gap-2">{master.portfolio.map((image, index) => <div key={index} className="relative aspect-square"><img src={image} alt={`Работа ${index + 1}`} className="w-full h-full rounded-2xl object-cover" /><button onClick={() => mutation.mutate({ portfolio: master.portfolio.filter((_, i) => i !== index) })} aria-label={`Удалить работу ${index + 1}`} className="absolute -top-1 -right-1 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button></div>)}{master.portfolio.length === 0 && <p className="col-span-3 text-sm text-muted-foreground">Фотографий пока нет</p>}</div></section>

      <section className="premium-card p-4 space-y-3"><h3 className="font-semibold">Тип мастера</h3><div className="flex flex-wrap gap-2">{(Object.keys(executorTypeLabels) as ExecutorType[]).map((type) => <button key={type} onClick={() => mutation.mutate({ executorType: type })} className={cn("min-h-[44px] rounded-2xl border border-border/70 px-3 py-2 text-sm", master.executorType === type && "border-primary bg-primary/5 text-primary")}>{executorTypeLabels[type]}</button>)}</div></section>

      <section className="premium-card overflow-hidden"><div className="p-4 border-b"><h3 className="font-semibold flex items-center gap-2"><Award className="w-4 h-4 text-primary" />Сертификаты и дипломы</h3></div><div className="divide-y">{(master.certificates ?? []).map((cert) => <div key={cert.id} className="p-3 flex items-center gap-3">{cert.image ? <img src={cert.image} alt={cert.title} className="w-12 h-12 rounded-xl object-cover" /> : <Award className="w-5 h-5 text-primary" />}<div className="flex-1"><p className="text-sm font-medium">{cert.title}</p><p className="text-xs text-muted-foreground">{[cert.issuer, cert.year].filter(Boolean).join(" · ")}</p></div><button onClick={() => removeCertificate(cert.id)} aria-label={`Удалить ${cert.title}`} className="w-11 h-11 flex items-center justify-center text-destructive"><Trash2 className="w-4 h-4" /></button></div>)}</div><div className="p-3 border-t grid gap-2"><Input value={certTitle} onChange={(e) => setCertTitle(e.target.value)} placeholder="Название документа" /><div className="flex gap-2"><Input value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} placeholder="Кем выдан" /><Input value={certYear} onChange={(e) => setCertYear(e.target.value)} placeholder="Год" className="w-24" /></div><div className="flex gap-2"><label className="flex-1 h-11 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-xs text-muted-foreground cursor-pointer"><Camera className="w-4 h-4" />{certImage ? "Фото добавлено" : "Добавить фото документа"}<input type="file" accept="image/*" className="hidden" onChange={(event) => readCertificateImage(event.target.files?.[0])} /></label><Button className="h-11 rounded-xl" onClick={addCertificate} disabled={!certTitle.trim() || (master.certificates?.length ?? 0) >= 10}><Plus className="w-4 h-4 mr-1" />Добавить</Button></div></div></section>

      <section className="premium-card overflow-hidden"><div className="p-4 border-b"><h3 className="font-semibold">Видимость публичного профиля</h3></div>{visibility.map(([field, label, enabled]) => <button key={field} onClick={() => mutation.mutate({ [field]: !enabled })} className="w-full p-4 border-b last:border-0 flex justify-between"><span className="text-sm">{label}</span><span className={cn("w-11 h-6 rounded-full p-1", enabled ? "bg-primary" : "bg-muted")}><span className={cn("block w-4 h-4 rounded-full bg-white transition-transform", enabled && "translate-x-5")} /></span></button>)}</section>

      <ProviderAvailabilityCard defaultFrom={master.workingHours.from} defaultTo={master.workingHours.to} />
      <PushNotificationCard />
      <ProviderVerificationCard />

      <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-11 rounded-xl" onClick={toggleTheme}>{isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}{isDark ? "Светлая тема" : "Тёмная тема"}</Button><Button variant="ghost" className="h-11 text-destructive" onClick={async () => { await logout(); navigate("/"); }}><LogOut className="w-4 h-4 mr-2" />Выйти</Button></div>
    </main><MasterBottomNavigation />
  </div>;
}
