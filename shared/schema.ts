import { z } from "zod";

export const categories = [
  { id: 1, name: 'Сантехника', iconName: 'Wrench', emoji: '🔧', color: '#007AFF' },
  { id: 2, name: 'Электрика', iconName: 'Zap', emoji: '⚡', color: '#FF9500' },
  { id: 3, name: 'Уборка', iconName: 'Sparkles', emoji: '🧹', color: '#34C759' },
  { id: 4, name: 'Ремонт', iconName: 'Hammer', emoji: '🔨', color: '#FF3B30' },
  { id: 5, name: 'Красота', iconName: 'Palette', emoji: '💇‍♀️', color: '#FF2D55' },
  { id: 6, name: 'Авто', iconName: 'Car', emoji: '🚗', color: '#5856D6' },
  { id: 7, name: 'Доставка', iconName: 'Package', emoji: '📦', color: '#AF52DE' },
  { id: 8, name: 'Репетиторы', iconName: 'BookOpen', emoji: '📚', color: '#00C7BE' },
] as const;

export type Category = typeof categories[number];

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
  // Optional brand / company name the master represents
  companyName?: string;
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

export type OrderStatus = 'completed' | 'in_progress' | 'pending';

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

export type UserRole = 'client' | 'master';

export interface AuthUser {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  /** Master profile this account manages (demo accounts are bound to master #1) */
  masterId?: number;
}

export type PublicUser = Omit<AuthUser, 'passwordHash'>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  identifier: z.string().min(5, 'Введите номер телефона или email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  role: z.enum(['client', 'master']).default('client'),
});

// Settings a master may update on their own profile
export const masterSettingsSchema = z.object({
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
  }).strict()).max(20).optional(),
}).strict();

export type MasterSettingsInput = z.infer<typeof masterSettingsSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Введите номер телефона или email'),
  password: z.string().min(1, 'Введите пароль'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const clientProfileSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(80),
}).strict();

export const createOrderSchema = z.object({
  masterId: z.number().int().positive(),
  service: z.string().min(1, 'Выберите услугу').max(120),
  scheduledAt: z.string().min(1, 'Выберите дату и время').max(40),
  address: z.string().min(3, 'Укажите адрес').max(250),
  comment: z.string().max(1000).optional(),
}).strict();

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
