import { z } from "zod";

export const categories = [
  { id: 1, name: 'Сантехника', iconName: 'Wrench', color: '#007AFF' },
  { id: 2, name: 'Электрика', iconName: 'Zap', color: '#FF9500' },
  { id: 3, name: 'Уборка', iconName: 'Sparkles', color: '#34C759' },
  { id: 4, name: 'Ремонт', iconName: 'Hammer', color: '#FF3B30' },
  { id: 5, name: 'Красота', iconName: 'Palette', color: '#FF2D55' },
  { id: 6, name: 'Авто', iconName: 'Car', color: '#5856D6' },
  { id: 7, name: 'Доставка', iconName: 'Package', color: '#AF52DE' },
  { id: 8, name: 'Репетиторы', iconName: 'BookOpen', color: '#00C7BE' },
] as const;

export type Category = typeof categories[number];

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
  phone: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export type PublicUser = Omit<AuthUser, 'passwordHash'>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  phone: z.string().min(6, 'Введите номер телефона'),
  password: z.string().min(6, 'Минимум 6 символов'),
  role: z.enum(['client', 'master']).default('client'),
});

export const loginSchema = z.object({
  phone: z.string().min(1, 'Введите номер телефона'),
  password: z.string().min(1, 'Введите пароль'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

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
