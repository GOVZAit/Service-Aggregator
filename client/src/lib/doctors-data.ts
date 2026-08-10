// Where a doctor sees patients — a doctor can work in several clinics
export interface DoctorLocation {
  clinic: string;
  address: string;
  city: string;
  schedule: string;
  lat?: number;
  lng?: number;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  specialtyId: string;
  locations: DoctorLocation[];
  experienceYears: number;
  rating: number;
  reviews: number;
  price: string;
  phone: string;
  acceptsChildren?: boolean;
  /** Doctor also sees patients at home */
  homeVisits?: boolean;
  avatar: string;
}

export interface DoctorSpecialty {
  id: string;
  label: string;
  emoji: string;
}

export const doctorSpecialties: DoctorSpecialty[] = [
  { id: 'therapist', label: 'Терапевт', emoji: '🩺' },
  { id: 'pediatrician', label: 'Педиатр', emoji: '👶' },
  { id: 'dentist', label: 'Стоматолог', emoji: '🦷' },
  { id: 'cardiologist', label: 'Кардиолог', emoji: '❤️' },
  { id: 'neurologist', label: 'Невролог', emoji: '🧠' },
  { id: 'gynecologist', label: 'Гинеколог', emoji: '🌸' },
  { id: 'ophthalmologist', label: 'Офтальмолог', emoji: '👁️' },
  { id: 'ent', label: 'ЛОР', emoji: '👂' },
];

export const doctors: Doctor[] = [
  {
    id: 1,
    name: 'Аминат Джабраилова',
    specialty: 'Терапевт',
    specialtyId: 'therapist',
    locations: [
      {
        clinic: 'Республиканская клиническая больница',
        address: 'ул. Хвостова, 4',
        city: 'Грозный',
        schedule: 'Пн–Пт 08:00–14:00',
        lat: 43.3168,
        lng: 45.6842,
      },
      {
        clinic: 'Медцентр «Здоровье»',
        address: 'пр. Кадырова, 39',
        city: 'Грозный',
        schedule: 'Пн, Ср, Пт 15:00–18:00',
        lat: 43.3110,
        lng: 45.6890,
      },
    ],
    experienceYears: 18,
    rating: 4.9,
    reviews: 214,
    price: 'приём от 800 ₽',
    phone: '+7 (8712) 22-33-11',
    homeVisits: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 2,
    name: 'Магомед Ахмадов',
    specialty: 'Кардиолог',
    specialtyId: 'cardiologist',
    locations: [
      {
        clinic: 'Республиканский кардиодиспансер',
        address: 'ул. Гаражная, 2а',
        city: 'Грозный',
        schedule: 'Пн–Сб 09:00–17:00',
        lat: 43.3055,
        lng: 45.7010,
      },
    ],
    experienceYears: 22,
    rating: 5.0,
    reviews: 187,
    price: 'приём от 1 200 ₽',
    phone: '+7 (8712) 29-44-55',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 3,
    name: 'Хеда Исраилова',
    specialty: 'Педиатр',
    specialtyId: 'pediatrician',
    locations: [
      {
        clinic: 'Детская поликлиника №1',
        address: 'пр. Кирова, 10',
        city: 'Грозный',
        schedule: 'Пн–Пт 08:00–15:00',
        lat: 43.3222,
        lng: 45.6930,
      },
      {
        clinic: 'Детский центр «Малыш»',
        address: 'ул. Ватутина, 5',
        city: 'Гудермес',
        schedule: 'Сб 09:00–14:00',
        lat: 43.3505,
        lng: 46.1050,
      },
    ],
    experienceYears: 14,
    rating: 4.8,
    reviews: 302,
    price: 'приём от 700 ₽',
    phone: '+7 (8712) 22-58-90',
    acceptsChildren: true,
    homeVisits: true,
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 4,
    name: 'Руслан Товсултанов',
    specialty: 'Стоматолог',
    specialtyId: 'dentist',
    locations: [
      {
        clinic: 'Стоматология «Дент-Люкс»',
        address: 'пр. Путина, 28',
        city: 'Грозный',
        schedule: 'Ежедневно 09:00–20:00',
        lat: 43.3190,
        lng: 45.6980,
      },
    ],
    experienceYears: 12,
    rating: 4.9,
    reviews: 256,
    price: 'приём от 500 ₽',
    phone: '+7 (928) 890-12-34',
    acceptsChildren: true,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 5,
    name: 'Зарема Мовсарова',
    specialty: 'Гинеколог',
    specialtyId: 'gynecologist',
    locations: [
      {
        clinic: 'Республиканский перинатальный центр',
        address: 'ул. Сайханова, 65',
        city: 'Грозный',
        schedule: 'Пн–Пт 09:00–16:00',
        lat: 43.3010,
        lng: 45.7150,
      },
    ],
    experienceYears: 16,
    rating: 4.9,
    reviews: 178,
    price: 'приём от 1 000 ₽',
    phone: '+7 (8712) 29-61-20',
    avatar: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 6,
    name: 'Ибрагим Дадаев',
    specialty: 'Невролог',
    specialtyId: 'neurologist',
    locations: [
      {
        clinic: 'Клиника «Медикс»',
        address: 'ул. Маяковского, 92',
        city: 'Грозный',
        schedule: 'Пн, Ср, Пт 09:00–15:00',
        lat: 43.3350,
        lng: 45.6800,
      },
      {
        clinic: 'ЦРБ Урус-Мартана',
        address: 'ул. Больничная, 8',
        city: 'Урус-Мартан',
        schedule: 'Вт, Чт 10:00–16:00',
        lat: 43.1240,
        lng: 45.5390,
      },
    ],
    experienceYears: 20,
    rating: 4.7,
    reviews: 143,
    price: 'приём от 1 100 ₽',
    phone: '+7 (928) 002-45-67',
    homeVisits: true,
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 7,
    name: 'Липа Успанова',
    specialty: 'Офтальмолог',
    specialtyId: 'ophthalmologist',
    locations: [
      {
        clinic: 'Центр микрохирургии глаза',
        address: 'ул. Назарбаева, 108',
        city: 'Грозный',
        schedule: 'Пн–Пт 08:30–17:00',
        lat: 43.2980,
        lng: 45.6900,
      },
    ],
    experienceYears: 11,
    rating: 4.8,
    reviews: 96,
    price: 'приём от 900 ₽',
    phone: '+7 (8712) 33-71-02',
    acceptsChildren: true,
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 8,
    name: 'Адам Сайдулаев',
    specialty: 'ЛОР',
    specialtyId: 'ent',
    locations: [
      {
        clinic: 'ЦРБ Аргуна',
        address: 'ул. Шоссейная, 1',
        city: 'Аргун',
        schedule: 'Пн–Пт 08:00–15:30',
        lat: 43.2930,
        lng: 45.8830,
      },
    ],
    experienceYears: 9,
    rating: 4.6,
    reviews: 88,
    price: 'приём от 800 ₽',
    phone: '+7 (8712) 24-15-33',
    acceptsChildren: true,
    avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=200&h=200&fit=crop&crop=face',
  },
];
