import { useState, type ReactNode } from "react";
import { LayoutDashboard, UsersRound, ShieldCheck, Stethoscope, CarFront, Building2, Users, Tags, Database, History, Menu, LogOut, RefreshCw, ArrowUpRight } from "lucide-react";
import { ResponsivePanel } from "@/components/responsive-panel";
import "./admin.css";

export const adminSections = [
  { id: "overview", label: "Обзор", description: "Главное о работе сервиса", icon: LayoutDashboard, group: "Управление" },
  { id: "providers", label: "Мастера и организации", description: "Профили, контакты и видимость в каталоге", icon: UsersRound, group: "Управление" },
  { id: "verifications", label: "Проверка документов", description: "Заявки исполнителей на подтверждение профиля", icon: ShieldCheck, group: "Управление" },
  { id: "doctors", label: "Врачи", description: "Специалисты, места приёма и контакты", icon: Stethoscope, group: "Каталоги" },
  { id: "auto-parts", label: "Автозапчасти", description: "Автомагазины, авторазборы и их владельцы", icon: CarFront, group: "Каталоги" },
  { id: "city-services", label: "Городские службы", description: "Организации и полезные контакты", icon: Building2, group: "Каталоги" },
  { id: "categories", label: "Категории", description: "Услуги, названия и значки категорий", icon: Tags, group: "Каталоги" },
  { id: "users", label: "Пользователи", description: "Аккаунты и роли · только просмотр", icon: Users, group: "Система" },
  { id: "imports", label: "Импорт данных", description: "Источники и результаты обновлений каталога", icon: Database, group: "Система" },
  { id: "audit", label: "Журнал действий", description: "Последние изменения в панели управления", icon: History, group: "Система" },
] as const;
export type AdminSection = typeof adminSections[number]["id"];
export function parseAdminSection(value: string | null): AdminSection {
  return adminSections.find(s => s.id === value)?.id ?? "overview";
}

export function AdminShell({ section, onSection, name, onLogout, onRefresh, loading, busy, children }: {
  section: AdminSection; onSection: (id: AdminSection) => void; name: string;
  onLogout: () => void; onRefresh: () => void; loading: boolean; busy: boolean; children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = adminSections.find(s => s.id === section)!;
  const navigation = <nav className="admin-navigation" aria-label="Разделы администрирования">
    {["Управление", "Каталоги", "Система"].map(group => <div key={group}>
      <p className="admin-nav-group">{group}</p>
      {adminSections.filter(s => s.group === group).map(({ id, label, icon: Icon }) => <button
        type="button" key={id} aria-current={id === section ? "page" : undefined} disabled={busy}
        data-testid={`admin-nav-${id}`} onClick={() => { setMenuOpen(false); onSection(id); }}>
        <Icon size={19} aria-hidden="true" /><span>{label}</span>
      </button>)}
    </div>)}
  </nav>;
  return <div className="admin-app">
    <a className="admin-skip" href="#admin-main">К содержимому</a>
    <aside className="admin-sidebar">
      <div className="admin-brand">GOVZA<span>.</span><small>Панель управления</small></div>
      {navigation}
      <div className="admin-sidebar-note"><ShieldCheck size={18} aria-hidden="true" /><span>Закрытый доступ<br /><strong>Администратор</strong></span></div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <button className="admin-menu-button" type="button" onClick={e => { e.currentTarget.focus(); setMenuOpen(true); }} aria-label="Разделы админ-панели" aria-haspopup="dialog" aria-expanded={menuOpen}><Menu size={22} /></button>
        <div className="admin-breadcrumb"><span>GOVZA</span><span aria-hidden="true">/</span><strong>{current.label}</strong></div>
        <div className="admin-account"><span>{name}</span><button type="button" onClick={onLogout} disabled={busy} aria-label="Выйти из аккаунта"><LogOut size={19} /></button></div>
      </header>
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        <div className="admin-page-heading"><div><p className="admin-eyebrow">ПАНЕЛЬ УПРАВЛЕНИЯ</p><h1>{current.label}</h1><p>{current.description}</p></div>
          <button className="admin-refresh" type="button" disabled={loading || busy} onClick={onRefresh} aria-label="Обновить данные раздела"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /><span>Обновить</span></button>
        </div>
        {children}
      </main>
    </div>
    <ResponsivePanel open={menuOpen} onOpenChange={setMenuOpen} title="Панель управления" description="Выберите раздел">{navigation}</ResponsivePanel>
  </div>;
}

export function AdminOverview({ summary, onSection, loadedAt }: {
  summary: { totalProviders: number; importedProviders: number; hiddenProviders: number; pendingVerifications: number; users: number } | null;
  onSection: (id: AdminSection) => void; loadedAt: string;
}) {
  const pending = summary?.pendingVerifications;
  return <div className="admin-overview">
    <section className="admin-welcome"><div><ShieldCheck size={25} aria-hidden="true" /><h2>Всё важное — в одном месте</h2><p>Управляйте каталогами и проверяйте заявки исполнителей.</p></div>
      <button type="button" onClick={() => onSection("verifications")}>Открыть проверки <ArrowUpRight size={18} /></button>
    </section>
    <section className="admin-stats" aria-label="Статистика сервиса">
      {([
        ["Профили исполнителей", summary?.totalProviders, "providers", UsersRound],
        ["На проверке", pending, "verifications", ShieldCheck],
        ["Пользователи", summary?.users, "users", Users],
        ["Скрытые профили", summary?.hiddenProviders, "providers", Building2],
      ] as const).map(([label, count, id, Icon]) => <button key={label} type="button" onClick={() => onSection(id)} className="admin-stat">
        <Icon size={20} aria-hidden="true" /><strong>{count === undefined ? "—" : count.toLocaleString("ru-RU")}</strong><span>{label}</span><ArrowUpRight className="admin-stat-arrow" size={16} />
      </button>)}
    </section>
    <section className="admin-attention"><span className="admin-status-dot" aria-hidden="true" /><div><h2>{pending === undefined ? "Сводка ещё не загружена" : pending ? `Заявок на проверку: ${pending}` : "Нет ожидающих проверок"}</h2><p>{pending ? "Проверьте документы и сообщите исполнителю решение." : "Новые заявки появятся в разделе проверки документов."}</p></div></section>
    <section><h2 className="admin-section-title">Управление каталогами</h2><div className="admin-quick-grid">
      {adminSections.filter(s => ["providers", "doctors", "auto-parts", "city-services"].includes(s.id)).map(({ id, label, description, icon: Icon }) => <button type="button" key={id} className="admin-quick-card" onClick={() => onSection(id)}><span><Icon size={22} /></span><div><h3>{label}</h3><p>{description}</p></div><ArrowUpRight size={18} /></button>)}
    </div></section>
    <p className="admin-updated">{loadedAt ? `Данные обновлены ${new Date(loadedAt).toLocaleString("ru-RU")}` : "Загружаем данные…"} · Значения получены с сервера</p>
  </div>;
}
