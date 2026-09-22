import type { Master, ServiceRequest, Order, AuthUser, LostFoundListing, LostFoundListingInput, LostFoundStatus, UserRole } from "@shared/schema";
import { authUsers, lostFoundListings, masterSettings, passwordResetTokens, persistedOrders, userFavorites } from "@shared/schema";
import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "./db";
import { getEffectiveCategory } from "./category-service";
import {
  createProviderProfile,
  getPersistentProvider,
  hiddenProviderIds,
  listPersistentProviders,
  updatePersistentProvider,
} from "./provider-service";

const mastersData: Master[] = [
  {
    id: 1,
    name: 'Умар Дудаев',
    category: 'Сантехника',
    categoryId: 1,
    rating: 4.9,
    reviews: 187,
    price: 'от 1 500 ₽',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '1.1 км',
    responseTime: '~15 мин',
    completedOrders: 432,
    description: 'Профессиональный сантехник с опытом 10 лет. Работаю по всему Грозному. Гарантия на все виды работ.',
    portfolio: [
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop',
    ],
    services: [
      { name: 'Замена смесителя', price: '1 500 ₽' },
      { name: 'Установка унитаза', price: '3 000 ₽' },
      { name: 'Прочистка засора', price: '2 000 ₽' },
      { name: 'Замена труб', price: 'от 5 000 ₽' },
    ],
    phone: '+7 (928) 111-22-33',
    callMode: 'always',
    workingHours: { from: '08:00', to: '20:00' },
    isOnline: true,
    district: 'Заводской',
    city: 'Грозный',
    lat: 43.3245,
    lng: 45.6889,
    topMaster: true,
    hasCertificate: true,
    executorType: 'self_employed',
    showPortfolio: true,
    certificates: [
      {
        id: 1,
        title: 'Диплом «Монтаж и эксплуатация сантехнических систем»',
        issuer: 'Грозненский технический колледж',
        year: '2014',
        image: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&h=400&fit=crop',
      },
      {
        id: 2,
        title: 'Сертификат «Установка газовых водонагревателей»',
        issuer: 'Учебный центр «Профи»',
        year: '2021',
      },
    ],
  },
  {
    id: 2,
    name: 'Зулейха Хасанова',
    category: 'Уборка',
    categoryId: 3,
    rating: 5.0,
    reviews: 143,
    price: 'от 2 000 ₽',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '0.7 км',
    responseTime: '~10 мин',
    completedOrders: 318,
    description: 'Профессиональная уборка квартир, домов и офисов. Использую экологичные средства. Грозный и пригороды.',
    portfolio: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1527515545081-5db817172677?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=300&fit=crop',
    ],
    services: [
      { name: 'Уборка 1-комн.', price: '2 000 ₽' },
      { name: 'Уборка 2-комн.', price: '3 000 ₽' },
      { name: 'Генеральная уборка', price: 'от 5 000 ₽' },
      { name: 'Мытьё окон', price: '500 ₽/окно' },
    ],
    phone: '+7 (928) 222-33-44',
    callMode: 'schedule',
    workingHours: { from: '09:00', to: '18:00' },
    isOnline: true,
    district: 'Ленинский',
    city: 'Грозный',
    lat: 43.3119,
    lng: 45.6949,
    topMaster: true,
    companyName: 'Чистый Дом',
    hasCertificate: true,
    executorType: 'company',
    showPortfolio: true,
  },
  {
    id: 3,
    name: 'Ислам Магомедов',
    category: 'Электрика',
    categoryId: 2,
    rating: 4.8,
    reviews: 112,
    price: 'от 2 500 ₽',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '2.3 км',
    responseTime: '~20 мин',
    completedOrders: 256,
    description: 'Электрик с допуском до 1000В. Любые электромонтажные работы в Грозном. Гарантия 2 года.',
    portfolio: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400&h=300&fit=crop',
    ],
    services: [
      { name: 'Замена розетки', price: '500 ₽' },
      { name: 'Установка люстры', price: '1 500 ₽' },
      { name: 'Разводка проводки', price: 'от 10 000 ₽' },
      { name: 'Установка щитка', price: '5 000 ₽' },
    ],
    phone: '+7 (928) 333-44-55',
    callMode: 'online_only',
    workingHours: { from: '09:00', to: '19:00' },
    isOnline: false,
    district: 'Октябрьский',
    city: 'Грозный',
    lat: 43.3056,
    lng: 45.7211,
    hasCertificate: false,
    executorType: 'private',
    showPortfolio: true,
  },
  {
    id: 4,
    name: 'Айна Мусаева',
    category: 'Красота',
    categoryId: 5,
    rating: 4.7,
    reviews: 89,
    price: 'от 1 000 ₽',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    verified: false,
    distance: '1.8 км',
    responseTime: '~30 мин',
    completedOrders: 174,
    description: 'Мастер маникюра и педикюра с выездом на дом. Работаю с качественными материалами.',
    portfolio: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400&h=300&fit=crop',
    ],
    services: [
      { name: 'Маникюр', price: '1 000 ₽' },
      { name: 'Педикюр', price: '1 500 ₽' },
      { name: 'Наращивание', price: '3 000 ₽' },
      { name: 'Дизайн', price: 'от 500 ₽' },
    ],
    phone: '+7 (928) 444-55-66',
    callMode: 'disabled',
    workingHours: { from: '10:00', to: '20:00' },
    isOnline: false,
    district: 'Шейх-Мансуровский',
    city: 'Грозный',
    lat: 43.3298,
    lng: 45.6772,
    hasCertificate: false,
    executorType: 'private',
    showPortfolio: false,
  },
  {
    id: 5,
    name: 'Хасан Гайтаев',
    category: 'Ремонт',
    categoryId: 4,
    rating: 4.5,
    reviews: 67,
    price: 'от 3 000 ₽',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face',
    verified: false,
    distance: '3.5 км',
    responseTime: '~25 мин',
    completedOrders: 98,
    description: 'Мастер по ремонту квартир в Грозном. Покраска, укладка плитки, поклейка обоев.',
    portfolio: [
      'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=300&fit=crop',
    ],
    services: [
      { name: 'Покраска стен', price: '500 ₽/м²' },
      { name: 'Укладка плитки', price: '1 200 ₽/м²' },
      { name: 'Поклейка обоев', price: '400 ₽/м²' },
      { name: 'Косметический ремонт', price: 'от 30 000 ₽' },
    ],
    phone: '+7 (928) 555-66-77',
    callMode: 'always',
    workingHours: { from: '08:00', to: '18:00' },
    isOnline: true,
    district: 'Старопромысловский',
    city: 'Грозный',
    lat: 43.3402,
    lng: 45.6501,
    companyName: 'Рем-Бригада «Грозный»',
    hasCertificate: true,
    executorType: 'company',
    showPortfolio: true,
  },
  {
    id: 6,
    name: 'Рустам Чалаев',
    category: 'Авто',
    categoryId: 6,
    rating: 4.8,
    reviews: 201,
    price: 'от 2 000 ₽',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '4.2 км',
    responseTime: '~40 мин',
    completedOrders: 389,
    description: 'Автомеханик с 12-летним стажем. Диагностика, ремонт двигателя и ходовой. Гудермес, выезд по республике.',
    portfolio: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=300&fit=crop',
    ],
    services: [
      { name: 'Диагностика', price: '2 000 ₽' },
      { name: 'Замена масла', price: '1 500 ₽' },
      { name: 'Ремонт ходовой', price: 'от 5 000 ₽' },
      { name: 'Замена тормозов', price: '3 500 ₽' },
    ],
    phone: '+7 (928) 666-77-88',
    callMode: 'schedule',
    workingHours: { from: '09:00', to: '19:00' },
    isOnline: true,
    district: 'Заводской',
    city: 'Гудермес',
    lat: 43.3520,
    lng: 46.1032,
    topMaster: true,
    companyName: 'Автосервис «Кавказ»',
    hasCertificate: true,
    executorType: 'company',
    showPortfolio: true,
  },
  {
    id: 7,
    name: 'Лейла Байсарова',
    category: 'Репетиторы',
    categoryId: 8,
    rating: 4.6,
    reviews: 54,
    price: 'от 800 ₽/час',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
    verified: false,
    distance: '1.4 км',
    responseTime: '~20 мин',
    completedOrders: 62,
    description: 'Репетитор по математике и русскому языку. Готовлю к ОГЭ и ЕГЭ. Онлайн по всей Чечне, очно в Урус-Мартане.',
    portfolio: [
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=300&fit=crop',
    ],
    services: [
      { name: 'Математика (1 час)', price: '800 ₽' },
      { name: 'Русский язык (1 час)', price: '800 ₽' },
      { name: 'Подготовка к ОГЭ', price: '1 000 ₽/час' },
      { name: 'Подготовка к ЕГЭ', price: '1 200 ₽/час' },
    ],
    phone: '+7 (928) 777-88-99',
    callMode: 'online_only',
    workingHours: { from: '10:00', to: '21:00' },
    isOnline: false,
    district: 'Ленинский',
    city: 'Урус-Мартан',
    lat: 43.1225,
    lng: 45.5366,
    hasCertificate: false,
    executorType: 'self_employed',
    showPortfolio: true,
  },
  {
    id: 8,
    name: 'Заур Эдилов',
    category: 'Доставка',
    categoryId: 7,
    rating: 4.9,
    reviews: 308,
    price: 'от 300 ₽',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '0.9 км',
    responseTime: '~5 мин',
    completedOrders: 1124,
    description: 'Курьер и грузчик. Доставка товаров, переезды по Грозному и ЧР. Работаю 7 дней в неделю.',
    portfolio: [
      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&h=300&fit=crop',
    ],
    services: [
      { name: 'Доставка по городу', price: '300 ₽' },
      { name: 'Доставка по ЧР', price: 'от 800 ₽' },
      { name: 'Помощь с переездом', price: 'от 2 000 ₽' },
      { name: 'Грузчик (1 час)', price: '600 ₽' },
    ],
    phone: '+7 (928) 888-99-00',
    callMode: 'always',
    workingHours: { from: '07:00', to: '23:00' },
    isOnline: true,
    district: 'Октябрьский',
    city: 'Грозный',
    lat: 43.3089,
    lng: 45.7043,
    topMaster: true,
    companyName: 'Грозный-Экспресс',
    hasCertificate: false,
    executorType: 'company',
    showPortfolio: false,
  },
];

const requestsData: ServiceRequest[] = [
  {
    id: 1,
    title: 'Нужен сантехник срочно',
    category: 'Сантехника',
    description: 'Течёт труба под раковиной, нужно заменить сифон и проверить соединения',
    budget: '2 000 - 3 000 ₽',
    location: 'ул. Шейха Мансура, 45, Грозный',
    postedAt: '15 мин назад',
    responses: 3,
    user: { name: 'Али Х.', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop&crop=face' },
  },
  {
    id: 2,
    title: 'Генеральная уборка 3-комн.',
    category: 'Уборка',
    description: 'Квартира 85 кв.м., нужна генеральная уборка после ремонта',
    budget: '8 000 - 12 000 ₽',
    location: 'пр. Путина, 112, Грозный',
    postedAt: '32 мин назад',
    responses: 7,
    user: { name: 'Малика Б.', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face' },
  },
  {
    id: 3,
    title: 'Установка 5 розеток',
    category: 'Электрика',
    description: 'Нужно установить 5 розеток в новой квартире, проводка уже есть',
    budget: '2 500 - 4 000 ₽',
    location: 'ул. Грибоедова, 18, Грозный',
    postedAt: '1 час назад',
    responses: 5,
    user: { name: 'Рамзан Э.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
  },
  {
    id: 4,
    title: 'Маникюр на дом',
    category: 'Красота',
    description: 'Нужен мастер маникюра с выездом на дом. Классический маникюр + покрытие гель-лаком',
    budget: '1 500 - 2 500 ₽',
    location: 'пр. Победы, 23, Грозный',
    postedAt: '2 часа назад',
    responses: 4,
    user: { name: 'Хеда А.', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face' },
  },
];

const ordersData: Order[] = [
  {
    id: 1,
    title: 'Замена смесителя',
    masterId: 1,
    status: 'completed',
    date: '8 апреля 2026',
    price: '1 800 ₽',
  },
  {
    id: 2,
    title: 'Уборка квартиры',
    masterId: 2,
    status: 'in_progress',
    date: '10 апреля 2026',
    price: '3 000 ₽',
  },
  {
    id: 3,
    title: 'Маникюр',
    masterId: 4,
    status: 'pending',
    date: '12 апреля 2026',
    price: '1 500 ₽',
  },
];

export interface IStorage {
  getMasters(): Promise<Master[]>;
  getMasterById(id: number): Promise<Master | undefined>;
  getMastersByCategory(categoryId: number): Promise<Master[]>;
  searchMasters(query: string): Promise<Master[]>;
  updateMaster(id: number, patch: Partial<Master>): Promise<Master | undefined>;
  createMaster(data: { name: string; phone?: string }): Promise<Master>;

  getRequests(): Promise<ServiceRequest[]>;
  getRequestById(id: number): Promise<ServiceRequest | undefined>;
  createRequest(data: Omit<ServiceRequest, 'id' | 'postedAt' | 'responses' | 'user'> & { userName: string; userAvatar: string }): Promise<ServiceRequest>;

  getOrders(filter?: { clientId?: number; masterId?: number }): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  createOrder(data: Omit<Order, 'id'>): Promise<Order>;
  updateOrder(id: number, patch: Pick<Order, 'status'>): Promise<Order | undefined>;
  updateOrderTravel(id: number, patch: { travelStatus: "idle" | "en_route" | "arrived"; liveLocationUrl?: string | null }): Promise<Order | undefined>;

  // Auth
  createUser(data: { name: string; phone?: string; email?: string; passwordHash: string; role: UserRole }): Promise<AuthUser>;
  getUserByIdentifier(identifier: string): Promise<AuthUser | undefined>;
  getUserById(id: number): Promise<AuthUser | undefined>;
  updateUser(id: number, patch: { name: string }): Promise<AuthUser | undefined>;
  updateUserPassword(id: number, passwordHash: string): Promise<AuthUser | undefined>;
  createPasswordReset(userId: number, tokenHash: string, expiresAt: number): Promise<void>;
  consumePasswordReset(tokenHash: string, now: number): Promise<AuthUser | undefined>;
  revokePasswordResets(userId: number): Promise<void>;

  getFavoriteMasterIds(userId: number): Promise<number[]>;
  addFavorite(userId: number, masterId: number): Promise<void>;
  removeFavorite(userId: number, masterId: number): Promise<void>;

  getLostFoundListings(): Promise<LostFoundListing[]>;
  getLostFoundListingById(id: number): Promise<LostFoundListing | undefined>;
  createLostFoundListing(authorId: number, data: LostFoundListingInput): Promise<LostFoundListing>;
  updateLostFoundListing(id: number, data: Partial<LostFoundListingInput> & { status?: LostFoundStatus }): Promise<LostFoundListing | undefined>;
}

export class MemStorage implements IStorage {
  private masters: Master[];

  private requests: ServiceRequest[];

  private nextRequestId: number;

  constructor() {
    this.masters = [...mastersData];
    this.requests = [...requestsData];
    this.nextRequestId = requestsData.length + 1;
  }

  async getMasters(): Promise<Master[]> {
    const hidden = await hiddenProviderIds();
    const seed = await Promise.all(
      this.masters
        .filter((master) => !hidden.has(master.id))
        .map((master) => this.withPersistedSettings(master)),
    );
    const persistent = await listPersistentProviders();
    return [...seed, ...persistent];
  }

  async getMasterById(id: number): Promise<Master | undefined> {
    const persistent = await getPersistentProvider(id);
    if (persistent) return persistent;
    const master = this.masters.find(m => m.id === id);
    return master ? this.withPersistedSettings(master) : undefined;
  }

  async getMastersByCategory(categoryId: number): Promise<Master[]> {
    const masters = await this.getMasters();
    return masters.filter((master) => (master.categoryIds ?? [master.categoryId]).includes(categoryId));
  }

  async searchMasters(query: string): Promise<Master[]> {
    const q = query.toLowerCase();
    const masters = await this.getMasters();
    return masters.filter((master) =>
      master.name.toLowerCase().includes(q) ||
      master.category.toLowerCase().includes(q) ||
      master.description.toLowerCase().includes(q) ||
      (master.companyName?.toLowerCase().includes(q) ?? false)
    );
  }

  async updateMaster(id: number, patch: Partial<Master>): Promise<Master | undefined> {
    const persistent = await getPersistentProvider(id);
    if (persistent) return updatePersistentProvider(id, patch);
    const master = this.masters.find(m => m.id === id);
    if (!master) return undefined;
    const { id: _id, ...safe } = patch;
    const cityCenters: Record<string, { lat: number; lng: number }> = {
      'Грозный': { lat: 43.317, lng: 45.6992 },
      'Гудермес': { lat: 43.352, lng: 46.1032 },
      'Аргун': { lat: 43.2921, lng: 45.8878 },
      'Урус-Мартан': { lat: 43.1225, lng: 45.5366 },
      'Шали': { lat: 43.148, lng: 45.9019 },
    };
    const center = safe.city ? cityCenters[safe.city] : undefined;
    const firstPrice = safe.services?.[0]?.price;
    const [current] = await db.select().from(masterSettings)
      .where(eq(masterSettings.masterId, id)).limit(1);
    const persisted: Partial<Master> = {
      ...(current?.settings ?? {}),
      ...safe,
      ...(center ?? {}),
      ...(firstPrice ? { price: `от ${firstPrice.replace(/^от\\s+/i, '')}` } : {}),
    };
    await db.insert(masterSettings).values({ masterId: id, settings: persisted })
      .onConflictDoUpdate({
        target: masterSettings.masterId,
        set: { settings: persisted, updatedAt: new Date() },
      });
    return { ...master, ...persisted };
  }

  async createMaster(data: { name: string; phone?: string }): Promise<Master> {
    const id = Math.max(0, ...this.masters.map((master) => master.id)) + 1;
    const master: Master = {
      id,
      name: data.name,
      category: getEffectiveCategory(1)?.name ?? 'Сантехника',
      categoryId: 1,
      rating: 0,
      reviews: 0,
      price: 'Цена по договорённости',
      avatar: '',
      verified: false,
      distance: '',
      responseTime: '~30 мин',
      completedOrders: 0,
      description: 'Новый исполнитель службы 995',
      portfolio: [],
      services: [],
      phone: data.phone,
      callMode: 'always',
      workingHours: { from: '09:00', to: '18:00' },
      isOnline: false,
      city: 'Грозный',
      lat: 43.317,
      lng: 45.6992,
      executorType: 'private',
    };
    this.masters.push(master);
    return master;
  }

  async getRequests(): Promise<ServiceRequest[]> {
    return [...this.requests].reverse();
  }

  async getRequestById(id: number): Promise<ServiceRequest | undefined> {
    return this.requests.find(r => r.id === id);
  }

  async createRequest(data: Omit<ServiceRequest, 'id' | 'postedAt' | 'responses' | 'user'> & { userName: string; userAvatar: string }): Promise<ServiceRequest> {
    const request: ServiceRequest = {
      id: this.nextRequestId++,
      title: data.title,
      category: data.category,
      description: data.description,
      budget: data.budget,
      location: data.location,
      postedAt: 'только что',
      responses: 0,
      user: { name: data.userName, avatar: data.userAvatar },
    };
    this.requests.push(request);
    return request;
  }

  async getOrders(filter?: { clientId?: number; masterId?: number }): Promise<Order[]> {
    if (filter?.clientId !== undefined) {
      const rows = await db.select({
        id: persistedOrders.id, title: persistedOrders.title, masterId: persistedOrders.masterId,
        clientId: persistedOrders.clientId, status: persistedOrders.status, date: persistedOrders.date,
        price: persistedOrders.price, address: persistedOrders.address, comment: persistedOrders.comment,
        travelStatus: persistedOrders.travelStatus, liveLocationUrl: persistedOrders.liveLocationUrl,
        travelUpdatedAt: persistedOrders.travelUpdatedAt,
      }).from(persistedOrders).where(eq(persistedOrders.clientId, filter.clientId)).orderBy(desc(persistedOrders.id));
      return rows.map(toOrder);
    }
    if (filter?.masterId !== undefined) {
      const rows = await db.select({
        id: persistedOrders.id, title: persistedOrders.title, masterId: persistedOrders.masterId,
        clientId: persistedOrders.clientId, status: persistedOrders.status, date: persistedOrders.date,
        price: persistedOrders.price, address: persistedOrders.address, comment: persistedOrders.comment,
        travelStatus: persistedOrders.travelStatus, liveLocationUrl: persistedOrders.liveLocationUrl,
        travelUpdatedAt: persistedOrders.travelUpdatedAt,
      }).from(persistedOrders).where(eq(persistedOrders.masterId, filter.masterId)).orderBy(desc(persistedOrders.id));
      return rows.map(toOrder);
    }
    return [];
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select({
      id: persistedOrders.id, title: persistedOrders.title, masterId: persistedOrders.masterId,
      clientId: persistedOrders.clientId, status: persistedOrders.status, date: persistedOrders.date,
      price: persistedOrders.price, address: persistedOrders.address, comment: persistedOrders.comment,
        travelStatus: persistedOrders.travelStatus, liveLocationUrl: persistedOrders.liveLocationUrl,
        travelUpdatedAt: persistedOrders.travelUpdatedAt,
    }).from(persistedOrders).where(eq(persistedOrders.id, id)).limit(1);
    return order ? toOrder(order) : undefined;
  }

  async createOrder(data: Omit<Order, 'id'>): Promise<Order> {
    if (data.clientId === undefined) throw new Error("clientId is required");
    const [order] = await db.insert(persistedOrders).values({
      title: data.title,
      masterId: data.masterId,
      clientId: data.clientId,
      status: data.status,
      date: data.date,
      price: data.price,
      address: data.address ?? null,
      comment: data.comment ?? null,
      travelStatus: "idle",
      liveLocationUrl: null,
      travelUpdatedAt: null,
    }).returning();
    const { createdAt: _, ...result } = order;
    return toOrder(result);
  }

  async updateOrder(id: number, patch: Pick<Order, 'status'>): Promise<Order | undefined> {
    const [order] = await db.update(persistedOrders)
      .set({ status: patch.status })
      .where(eq(persistedOrders.id, id))
      .returning();
    if (!order) return undefined;
    const { createdAt: _, ...result } = order;
    return toOrder(result);
  }

  async updateOrderTravel(
    id: number,
    patch: { travelStatus: "idle" | "en_route" | "arrived"; liveLocationUrl?: string | null },
  ): Promise<Order | undefined> {
    const [order] = await db.update(persistedOrders)
      .set({
        travelStatus: patch.travelStatus,
        liveLocationUrl: patch.liveLocationUrl === undefined ? undefined : patch.liveLocationUrl,
        travelUpdatedAt: new Date(),
      })
      .where(eq(persistedOrders.id, id))
      .returning();
    if (!order) return undefined;
    const { createdAt: _, ...result } = order;
    return toOrder(result);
  }

  async createUser(data: { name: string; phone?: string; email?: string; passwordHash: string; role: UserRole }): Promise<AuthUser> {
    const [created] = await db.insert(authUsers).values({
      ...data,
      masterId: null,
    }).returning();

    let user = created;
    if (data.role === "master" || data.role === "organization") {
      const profile = await createProviderProfile(
        created.id,
        data.role,
        data.name,
        data.phone,
      );
      const [linked] = await db.update(authUsers)
        .set({ masterId: profile.id })
        .where(eq(authUsers.id, created.id))
        .returning();
      user = linked;
    }

    return {
      ...user,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      masterId: user.masterId ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async getUserByIdentifier(identifier: string): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(authUsers)
      .where(or(eq(authUsers.phone, identifier), eq(authUsers.email, identifier))).limit(1);
    return user ? {
      ...user,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      masterId: user.masterId ?? undefined,
      createdAt: user.createdAt.toISOString(),
    } : undefined;
  }

  async getUserById(id: number): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.id, id)).limit(1);
    return user ? {
      ...user,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      masterId: user.masterId ?? undefined,
      createdAt: user.createdAt.toISOString(),
    } : undefined;
  }

  async updateUser(id: number, patch: { name: string }): Promise<AuthUser | undefined> {
    const [user] = await db.update(authUsers).set(patch).where(eq(authUsers.id, id)).returning();
    return user ? {
      ...user,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      masterId: user.masterId ?? undefined,
      createdAt: user.createdAt.toISOString(),
    } : undefined;
  }

  async updateUserPassword(id: number, passwordHash: string): Promise<AuthUser | undefined> {
    const [user] = await db.update(authUsers).set({
      passwordHash,
      sessionVersion: sql`${authUsers.sessionVersion} + 1`,
    }).where(eq(authUsers.id, id)).returning();
    return user ? {
      ...user,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      masterId: user.masterId ?? undefined,
      createdAt: user.createdAt.toISOString(),
    } : undefined;
  }

  async createPasswordReset(userId: number, tokenHash: string, expiresAt: number): Promise<void> {
    const now = new Date();
    await db.delete(passwordResetTokens).where(
      or(
        eq(passwordResetTokens.userId, userId),
        lte(passwordResetTokens.expiresAt, now),
      ),
    );
    await db.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt: new Date(expiresAt),
    });
  }

  async consumePasswordReset(tokenHash: string, now: number): Promise<AuthUser | undefined> {
    const claimed = await db.transaction(async (tx) => {
      const [token] = await tx.update(passwordResetTokens)
        .set({ usedAt: new Date(now) })
        .where(and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date(now)),
        ))
        .returning({ userId: passwordResetTokens.userId });
      return token;
    });

    return claimed ? this.getUserById(claimed.userId) : undefined;
  }

  async revokePasswordResets(userId: number): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  }

  async getFavoriteMasterIds(userId: number): Promise<number[]> {
    const rows = await db.select({ masterId: userFavorites.masterId })
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt));
    return rows.map((row) => row.masterId);
  }

  async addFavorite(userId: number, masterId: number): Promise<void> {
    await db.insert(userFavorites).values({ userId, masterId }).onConflictDoNothing();
  }

  async removeFavorite(userId: number, masterId: number): Promise<void> {
    await db.delete(userFavorites).where(and(
      eq(userFavorites.userId, userId),
      eq(userFavorites.masterId, masterId),
    ));
  }

  async getLostFoundListings(): Promise<LostFoundListing[]> {
    const rows = await db.select({
      listing: lostFoundListings,
      authorName: authUsers.name,
    }).from(lostFoundListings)
      .innerJoin(authUsers, eq(lostFoundListings.authorId, authUsers.id))
      .orderBy(desc(lostFoundListings.createdAt));
    return rows.map(({ listing, authorName }) => toLostFoundListing(listing, authorName));
  }

  async getLostFoundListingById(id: number): Promise<LostFoundListing | undefined> {
    const [row] = await db.select({
      listing: lostFoundListings,
      authorName: authUsers.name,
    }).from(lostFoundListings)
      .innerJoin(authUsers, eq(lostFoundListings.authorId, authUsers.id))
      .where(eq(lostFoundListings.id, id)).limit(1);
    return row ? toLostFoundListing(row.listing, row.authorName) : undefined;
  }

  async createLostFoundListing(authorId: number, data: LostFoundListingInput): Promise<LostFoundListing> {
    const [listing] = await db.insert(lostFoundListings).values({
      ...data,
      image: data.image || null,
      authorId,
    }).returning();
    const author = await this.getUserById(authorId);
    return toLostFoundListing(listing, author?.name ?? "Пользователь");
  }

  async updateLostFoundListing(id: number, data: Partial<LostFoundListingInput> & { status?: LostFoundStatus }): Promise<LostFoundListing | undefined> {
    const [listing] = await db.update(lostFoundListings).set({
      ...data,
      ...(data.image !== undefined ? { image: data.image || null } : {}),
      updatedAt: new Date(),
    }).where(eq(lostFoundListings.id, id)).returning();
    if (!listing) return undefined;
    const author = await this.getUserById(listing.authorId);
    return toLostFoundListing(listing, author?.name ?? "Пользователь");
  }

  private async withPersistedSettings(master: Master): Promise<Master> {
    const [row] = await db.select().from(masterSettings).where(eq(masterSettings.masterId, master.id)).limit(1);
    const merged = row ? { ...master, ...row.settings } : { ...master };
    const categoryIds = merged.categoryIds?.length ? merged.categoryIds : [merged.categoryId];
    const category = getEffectiveCategory(categoryIds[0]);
    return category
      ? { ...merged, category: category.name, categoryId: category.id, categoryIds }
      : merged;
  }
}

export const storage = new MemStorage();

type PersistedOrderRow = typeof persistedOrders.$inferSelect;

function toOrder(row: Omit<PersistedOrderRow, "createdAt">): Order {
  return {
    id: row.id,
    title: row.title,
    masterId: row.masterId,
    clientId: row.clientId,
    status: row.status,
    date: row.date,
    price: row.price,
    ...(row.address !== null ? { address: row.address } : {}),
    ...(row.comment !== null ? { comment: row.comment } : {}),
    travelStatus: row.travelStatus,
    ...(row.liveLocationUrl !== null ? { liveLocationUrl: row.liveLocationUrl } : {}),
    ...(row.travelUpdatedAt ? { travelUpdatedAt: row.travelUpdatedAt.toISOString() } : {}),
  };
}

type LostFoundListingRow = typeof lostFoundListings.$inferSelect;

function toLostFoundListing(row: LostFoundListingRow, authorName: string): LostFoundListing {
  return {
    ...row,
    authorName,
    image: row.image ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
