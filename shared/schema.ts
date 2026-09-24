import { z } from "zod";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export interface Category {
  id: number;
  name: string;
  iconName: string;
  emoji: string;
  color: string;
}

export const categories: Category[] = [
  { id: 1, name: 'Сантехника', iconName: 'Wrench', emoji: '🔧', color: '#007AFF' },
  { id: 2, name: 'Электрика', iconName: 'Zap', emoji: '⚡', color: '#FF9500' },
  { id: 3, name: 'Уборка', iconName: 'Sparkles', emoji: '🧹', color: '#34C759' },
  { id: 4, name: 'Ремонт', iconName: 'Hammer', emoji: '🔨', color: '#FF3B30' },
  { id: 5, name: 'Красота', iconName: 'Palette', emoji: '💇‍♀️', color: '#FF2D55' },
  { id: 6, name: 'Авто', iconName: 'Car', emoji: '🚗', color: '#5856D6' },
  { id: 7, name: 'Доставка', iconName: 'Package', emoji: '📦', color: '#AF52DE' },
  { id: 8, name: 'Репетиторы', iconName: 'BookOpen', emoji: '📚', color: '#00C7BE' },
];

// Cities of the Chechen Republic for location filter
export const cities = [
  'Все города',
  'Грозный',
  'Гудермес',
  'Аргун',
  'Урус-Мартан',
  'Шали',
] as const;

export type City = typeof cities[number];

export interface Service {
  name: string;
  price: string;
}

// How master controls inbound calls from clients
export type CallMode = 'always' | 'schedule' | 'online_only' | 'disabled';

export interface WorkingHours {
  from: string; // "09:00"
  to: string;   // "18:00"
}

// Who performs the work
export type ExecutorType = 'private' | 'self_employed' | 'company';

export const executorTypeLabels: Record<ExecutorType, string> = {
  private: 'Частное лицо',
  self_employed: 'Самозанятый',
  company: 'Компания',
};

export interface Master {
  id: number;
  name: string;
  category: string;
  categoryId: number;
  rating: number;
  reviews: number;
  price: string;
  avatar: string;
  verified: boolean;
  distance: string;
  responseTime: string;
  completedOrders: number;
  description: string;
  portfolio: string[];
  services: Service[];
  // Availability & contact
  phone?: string;
  callMode: CallMode;
  workingHours: WorkingHours;
  isOnline: boolean;
  // New: location and recognition
  district?: string;
  city?: string;
  lat?: number;
  lng?: number;
  topMaster?: boolean;
  // Optional brand / company name the provider represents
  companyName?: string;
  providerType?: 'master' | 'organization';
  organizationKind?: 'service_company' | 'medical' | 'education' | 'auto_service' | 'beauty' | 'delivery' | 'public_service' | 'other';
  categoryIds?: number[];
  isVisible?: boolean;
  dataSource?: 'seed' | 'manual' | 'import';
  // Trust & filtering
  hasCertificate?: boolean;
  executorType?: ExecutorType;
  // Profile block visibility (master can hide sections)
  showPortfolio?: boolean;
  showReviews?: boolean;
  showPrices?: boolean;
  showCertificates?: boolean;
  // Certificates & diplomas shown on the public profile
  certificates?: Certificate[];
}

export interface Certificate {
  id: number;
  title: string;
  issuer?: string;
  year?: string;
  /** Image of the document — URL or data-URL uploaded by the master */
  image?: string;
}

export interface RequestUser {
  name: string;
  avatar: string;
}

export interface ServiceRequest {
  id: number;
  title: string;
  category: string;
  description: string;
  budget: string;
  location: string;
  postedAt: string;
  responses: number;
  user: RequestUser;
}

export type OrderStatus = 'completed' | 'in_progress' | 'pending' | 'rejected';
export type OrderTravelStatus = 'idle' | 'en_route' | 'arrived';

export interface Order {
  id: number;

  title: string;

  masterId: number;

  status: OrderStatus;

  date: string;

  price: string;
  /** Internal owner link for client-scoped order lists */

  clientId?: number;

  address?: string;

  comment?: string;

  clientName?: string;

  clientContact?: string;

  travelStatus?: OrderTravelStatus;

  liveLocationUrl?: string;

  travelUpdatedAt?: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'master';
  time: string;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  ordersCount: number;
  rating: number;
  favoritesCount: number;
}

// ── Auth types ────────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'master' | 'organization' | 'admin';

export interface AuthUser {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  passwordHash: string;
  sessionVersion: number;
  role: UserRole;
  createdAt: string;
  /** Provider profile managed by this account. Kept as masterId for backward-compatible order/request APIs. */
  masterId?: number;
}

export type PublicUser = Omit<AuthUser, 'passwordHash' | 'sessionVersion'>;

export type LostFoundType = 'lost' | 'found';
export type LostFoundStatus = 'active' | 'closed';

export interface LostFoundListing {
  id: number;
  authorId: number;
  authorName: string;
  type: LostFoundType;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  contact: string;
  image?: string;
  status: LostFoundStatus;
  createdAt: string;
  updatedAt: string;
}

export const authUsers = pgTable("auth_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  sessionVersion: integer("session_version").default(1).notNull(),
  role: text("role").$type<UserRole>().notNull(),
  masterId: integer("master_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("auth_users_phone_unique").on(table.phone),
  uniqueIndex("auth_users_email_unique").on(table.email),
  uniqueIndex("auth_users_master_id_unique").on(table.masterId),
]);
export const userFavorites = pgTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  masterId: integer("master_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_favorites_user_master_unique").on(table.userId, table.masterId),
  index("user_favorites_user_id_idx").on(table.userId),
]);

export const userMasterViews = pgTable("user_master_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  masterId: integer("master_id").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_master_views_user_master_unique").on(table.userId, table.masterId),
  index("user_master_views_user_date_idx").on(table.userId, table.viewedAt),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("password_reset_tokens_hash_unique").on(table.tokenHash),
  index("password_reset_tokens_user_id_idx").on(table.userId),
  index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
]);

export const registerSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  identifier: z.string().min(5, 'Введите номер телефона или email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  role: z.enum(['client', 'master', 'organization']).default('client'),
});

// Settings a master may update on their own profile
export const masterSettingsSchema = z.object({
  avatar: z.string().max(1_000_000).optional(),
  description: z.string().min(10, 'Добавьте описание').max(1000).optional(),
  category: z.string().min(1).max(80).optional(),
  categoryId: z.number().int().positive().optional(),
  categoryIds: z.array(z.number().int().positive()).min(1).max(8).optional(),
  organizationKind: z.enum(['service_company', 'medical', 'education', 'auto_service', 'beauty', 'delivery', 'public_service', 'other']).optional(),
  companyName: z.string().max(80).optional(),
  city: z.enum(['Грозный', 'Гудермес', 'Аргун', 'Урус-Мартан', 'Шали']).optional(),
  phone: z.string().max(30).optional(),
  callMode: z.enum(['always', 'schedule', 'online_only', 'disabled']).optional(),
  workingHours: z.object({
    from: z.string().regex(/^\d{2}:\d{2}$/),
    to: z.string().regex(/^\d{2}:\d{2}$/),
  }).strict().optional(),
  isOnline: z.boolean().optional(),
  services: z.array(z.object({
    name: z.string().min(1).max(120),
    price: z.string().min(1).max(40),
  }).strict()).max(30).optional(),
  portfolio: z.array(z.string().max(1_000_000)).max(12).optional(),
  showPortfolio: z.boolean().optional(),
  showReviews: z.boolean().optional(),
  showPrices: z.boolean().optional(),
  hasCertificate: z.boolean().optional(),
  executorType: z.enum(['private', 'self_employed', 'company']).optional(),
  showCertificates: z.boolean().optional(),
  certificates: z.array(z.object({
    id: z.number(),
    title: z.string().min(1, 'Укажите название').max(120),
    issuer: z.string().max(120).optional(),
    year: z.string().max(10).optional(),
    image: z.string().max(1_000_000).optional(), // URL or data-URL (~700 КБ файла)
  }).strict()).max(10).optional(),
}).strict();

export type MasterSettingsInput = z.infer<typeof masterSettingsSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Введите номер телефона или email'),
  password: z.string().min(1, 'Введите пароль'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(5, 'Введите телефон или email').max(254),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(6, 'Минимум 6 символов').max(128),
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const clientProfileSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(80),
}).strict();

export const createOrderSchema = z.object({
  masterId: z.number().int().positive(),
  service: z.string().min(1, 'Выберите услугу').max(120),
  scheduledAt: z.string().min(1, 'Выберите дату и время').max(40),
  expectedPrice: z.string().max(120).optional(),
  address: z.string().min(3, 'Укажите адрес').max(250),
  comment: z.string().max(1000).optional(),
}).strict();

export const updateOrderStatusSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'rejected']),
}).strict();

const liveLocationUrlSchema = z.string().url('Некорректная ссылка карты').max(1000).refine((value) => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return [
      'maps.app.goo.gl',
      'google.com',
      'www.google.com',
      'yandex.ru',
      'yandex.com',
      'www.yandex.ru',
      'www.yandex.com',
    ].includes(host);
  } catch {
    return false;
  }
}, 'Используйте live-ссылку Google Maps или Яндекс Карт');

export const updateOrderTravelSchema = z.object({
  status: z.enum(['en_route', 'arrived', 'idle']),
  liveLocationUrl: liveLocationUrlSchema.optional(),
}).strict();

const lostFoundEventDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Укажите корректную дату')
  .refine((value) => value <= new Date().toISOString().slice(0, 10), 'Дата не может быть будущей');

export const lostFoundListingInputSchema = z.object({
  type: z.enum(['lost', 'found']),
  title: z.string().trim().min(3, 'Заголовок должен содержать минимум 3 символа').max(120),
  description: z.string().trim().min(10, 'Добавьте описание минимум из 10 символов').max(2000),
  location: z.string().trim().min(3, 'Укажите место').max(250),
  eventDate: lostFoundEventDateSchema,
  contact: z.string().trim().min(3, 'Укажите способ связи').max(150),
  image: z.string().max(1_500_000, 'Фото слишком большое')
    .refine((value) => !value || /^data:image\/(jpeg|png|webp);base64,/i.test(value), 'Недопустимый формат фото')
    .optional(),
}).strict();

export const updateLostFoundListingSchema = lostFoundListingInputSchema.partial().extend({
  status: z.enum(['active', 'closed']).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Нет изменений');

export type LostFoundListingInput = z.infer<typeof lostFoundListingInputSchema>;

// ── Messages / requests ───────────────────────────────────────────────────────

export const insertMessageSchema = z.object({
  text: z.string().min(1),
  sender: z.enum(['user', 'master']),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const insertRequestSchema = z.object({
  title: z.string().min(1, 'Введите заголовок'),
  category: z.string().min(1, 'Выберите категорию'),
  description: z.string().min(1, 'Опишите задачу'),
  budget: z.string().min(1, 'Укажите бюджет'),
  location: z.string().min(1, 'Укажите адрес'),
});

export type InsertRequest = z.infer<typeof insertRequestSchema>;

export const persistedOrders = pgTable("orders", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  masterId: integer("master_id").notNull(),
  clientId: integer("client_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  status: text("status").$type<OrderStatus>().notNull(),
  date: text("date").notNull(),
  price: text("price").notNull(),
  address: text("address"),
  comment: text("comment"),
  travelStatus: text("travel_status").$type<OrderTravelStatus>().default("idle").notNull(),
  liveLocationUrl: text("live_location_url"),
  travelUpdatedAt: timestamp("travel_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("orders_client_id_idx").on(table.clientId),
  index("orders_master_id_idx").on(table.masterId),
]);

export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").$type<Record<string, unknown>>().notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => [
  index("user_sessions_expire_idx").on(table.expire),
]);

export const masterSettings = pgTable("master_settings", {
  masterId: integer("master_id").primaryKey(),
  settings: jsonb("settings").$type<Partial<Master>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lostFoundListings = pgTable("lost_found_listings", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  type: text("type").$type<LostFoundType>().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  eventDate: text("event_date").notNull(),
  contact: text("contact").notNull(),
  image: text("image"),
  status: text("status").$type<LostFoundStatus>().default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("lost_found_type_status_idx").on(table.type, table.status),
  index("lost_found_author_id_idx").on(table.authorId),
]);
