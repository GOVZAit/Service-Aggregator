export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  specialtyId: string;
  clinic: string;
  address: string;
  district: string;
  experienceYears: number;
  rating: number;
  reviews: number;
  price: string;
  phone: string;
  schedule: string;
  acceptsChildren?: boolean;
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
    clinic: 'Республиканская клиническая больница',
    address: 'ул. Хвостова, 4',
    district: 'Ленинский',
    experienceYears: 18,
    rating: 4.9,
    reviews: 214,
    price: 'приём от 800 ₽',
    phone: '+7 (8712) 22-33-11',
    schedule: 'Пн–Пт 08:00–16:00',
    homeVisits: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 2,
    name: 'Магомед Ахмадов',
    specialty: 'Кардиолог',
    specialtyId: 'cardiologist',
    clinic: 'Республиканский кардиодиспансер',
    address: 'ул. Гаражная, 2а',
    district: 'Октябрьский',
    experienceYears: 22,
    rating: 5.0,
    reviews: 187,
    price: 'приём от 1 200 ₽',
    phone: '+7 (8712) 29-44-55',
    schedule: 'Пн–Сб 09:00–17:00',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 3,
    name: 'Хеда Исраилова',
    specialty: 'Педиатр',
    specialtyId: 'pediatrician',
    clinic: 'Детская поликлиника №1',
    address: 'пр. Кирова, 10',
    district: 'Заводской',
    experienceYears: 14,
    rating: 4.8,
    reviews: 302,
    price: 'приём от 700 ₽',
    phone: '+7 (8712) 22-58-90',
    schedule: 'Пн–Пт 08:00–15:00',
    acceptsChildren: true,
    homeVisits: true,
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 4,
    name: 'Руслан Товсултанов',
    specialty: 'Стоматолог',
    specialtyId: 'dentist',
    clinic: 'Стоматология «Дент-Люкс»',
    address: 'пр. Путина, 28',
    district: 'Ленинский',
    experienceYears: 12,
    rating: 4.9,
    reviews: 256,
    price: 'приём от 500 ₽',
    phone: '+7 (928) 890-12-34',
    schedule: 'Ежедневно 09:00–20:00',
    acceptsChildren: true,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 5,
    name: 'Зарема Мовсарова',
    specialty: 'Гинеколог',
    specialtyId: 'gynecologist',
    clinic: 'Республиканский перинатальный центр',
    address: 'ул. Сайханова, 65',
    district: 'Октябрьский',
    experienceYears: 16,
    rating: 4.9,
    reviews: 178,
    price: 'приём от 1 000 ₽',
    phone: '+7 (8712) 29-61-20',
    schedule: 'Пн–Пт 09:00–16:00',
    avatar: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 6,
    name: 'Ибрагим Дадаев',
    specialty: 'Невролог',
    specialtyId: 'neurologist',
    clinic: 'Клиника «Медикс»',
    address: 'ул. Маяковского, 92',
    district: 'Старопромысловский',
    experienceYears: 20,
    rating: 4.7,
    reviews: 143,
    price: 'приём от 1 100 ₽',
    phone: '+7 (928) 002-45-67',
    schedule: 'Пн–Сб 09:00–18:00',
    homeVisits: true,
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 7,
    name: 'Липа Успанова',
    specialty: 'Офтальмолог',
    specialtyId: 'ophthalmologist',
    clinic: 'Центр микрохирургии глаза',
    address: 'ул. Назарбаева, 108',
    district: 'Шейх-Мансуровский',
    experienceYears: 11,
    rating: 4.8,
    reviews: 96,
    price: 'приём от 900 ₽',
    phone: '+7 (8712) 33-71-02',
    schedule: 'Пн–Пт 08:30–17:00',
    acceptsChildren: true,
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 8,
    name: 'Адам Сайдулаев',
    specialty: 'ЛОР',
    specialtyId: 'ent',
    clinic: 'Городская поликлиника №3',
    address: 'ул. Тухачевского, 21',
    district: 'Старопромысловский',
    experienceYears: 9,
    rating: 4.6,
    reviews: 88,
    price: 'приём от 800 ₽',
    phone: '+7 (8712) 24-15-33',
    schedule: 'Пн–Пт 08:00–15:30',
    acceptsChildren: true,
    avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=200&h=200&fit=crop&crop=face',
  },
];
