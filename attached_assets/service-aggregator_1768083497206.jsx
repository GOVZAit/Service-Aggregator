import React, { useState, useEffect } from 'react';

// Иконки
const Icons = {
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Location: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Star: ({ filled }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#FFB800" : "none"} stroke="#FFB800" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Chat: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Heart: ({ filled }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#FF3B5C" : "none"} stroke={filled ? "#FF3B5C" : "currentColor"} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Verified: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#007AFF">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  Filter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Back: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  ),
  Image: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Wallet: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  User: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Home: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Orders: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Phone: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#34C759" stroke="#34C759" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Camera: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
};

// Категории услуг
const categories = [
  { id: 1, name: 'Сантехника', icon: '🔧', color: '#007AFF' },
  { id: 2, name: 'Электрика', icon: '⚡', color: '#FF9500' },
  { id: 3, name: 'Уборка', icon: '🧹', color: '#34C759' },
  { id: 4, name: 'Ремонт', icon: '🔨', color: '#FF3B30' },
  { id: 5, name: 'Красота', icon: '💅', color: '#FF2D55' },
  { id: 6, name: 'Авто', icon: '🚗', color: '#5856D6' },
  { id: 7, name: 'Доставка', icon: '📦', color: '#AF52DE' },
  { id: 8, name: 'Репетиторы', icon: '📚', color: '#00C7BE' },
];

// Мастера
const mastersData = [
  {
    id: 1,
    name: 'Алексей Петров',
    category: 'Сантехника',
    categoryId: 1,
    rating: 4.9,
    reviews: 234,
    price: 'от 1 500 ₽',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '1.2 км',
    responseTime: '~15 мин',
    completedOrders: 567,
    description: 'Профессиональный сантехник с опытом 12 лет. Выполняю все виды работ: установка, ремонт, замена.',
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
  },
  {
    id: 2,
    name: 'Мария Иванова',
    category: 'Уборка',
    categoryId: 3,
    rating: 5.0,
    reviews: 189,
    price: 'от 2 000 ₽',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '0.8 км',
    responseTime: '~10 мин',
    completedOrders: 423,
    description: 'Профессиональная уборка квартир и домов. Использую экологичные средства. Работаю быстро и качественно.',
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
  },
  {
    id: 3,
    name: 'Дмитрий Козлов',
    category: 'Электрика',
    categoryId: 2,
    rating: 4.8,
    reviews: 156,
    price: 'от 2 500 ₽',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '2.1 км',
    responseTime: '~20 мин',
    completedOrders: 312,
    description: 'Электрик с допуском до 1000В. Любые электромонтажные работы. Гарантия на все работы 2 года.',
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
  },
  {
    id: 4,
    name: 'Анна Соколова',
    category: 'Красота',
    categoryId: 5,
    rating: 4.9,
    reviews: 312,
    price: 'от 1 000 ₽',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    verified: true,
    distance: '1.5 км',
    responseTime: '~30 мин',
    completedOrders: 891,
    description: 'Мастер маникюра и педикюра. Работаю с лучшими материалами. Стерильность гарантирую.',
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
  },
];

// Заявки для аукциона
const auctionRequests = [
  {
    id: 1,
    title: 'Нужен сантехник срочно',
    category: 'Сантехника',
    description: 'Течёт труба под раковиной, нужно заменить сифон и проверить соединения',
    budget: '2 000 - 3 000 ₽',
    location: 'ул. Ленина, 45',
    postedAt: '15 мин назад',
    responses: 3,
    user: { name: 'Иван К.', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop&crop=face' },
  },
  {
    id: 2,
    title: 'Генеральная уборка 3-комн.',
    category: 'Уборка',
    description: 'Квартира 85 кв.м., нужна генеральная уборка после ремонта',
    budget: '8 000 - 12 000 ₽',
    location: 'пр. Мира, 112',
    postedAt: '32 мин назад',
    responses: 7,
    user: { name: 'Елена М.', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face' },
  },
  {
    id: 3,
    title: 'Установка 5 розеток',
    category: 'Электрика',
    description: 'Нужно установить 5 розеток в новой квартире, проводка уже есть',
    budget: '2 500 - 4 000 ₽',
    location: 'ул. Гагарина, 78',
    postedAt: '1 час назад',
    responses: 5,
    user: { name: 'Сергей П.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
  },
];

// Мои заказы
const myOrders = [
  {
    id: 1,
    title: 'Замена смесителя',
    master: mastersData[0],
    status: 'completed',
    date: '8 января 2026',
    price: '1 800 ₽',
  },
  {
    id: 2,
    title: 'Уборка квартиры',
    master: mastersData[1],
    status: 'in_progress',
    date: '10 января 2026',
    price: '3 000 ₽',
  },
  {
    id: 3,
    title: 'Маникюр',
    master: mastersData[3],
    status: 'pending',
    date: '12 января 2026',
    price: '1 500 ₽',
  },
];

// Главный компонент
export default function ServiceAggregator() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: 'Здравствуйте! Чем могу помочь?', sender: 'master', time: '10:30' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  const toggleFavorite = (masterId) => {
    setFavorites(prev => 
      prev.includes(masterId) 
        ? prev.filter(id => id !== masterId)
        : [...prev, masterId]
    );
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setChatMessages(prev => [...prev, {
      id: prev.length + 1,
      text: newMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }]);
    setNewMessage('');
    // Имитация ответа мастера
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: prev.length + 1,
        text: 'Отлично! Могу приехать сегодня после 15:00. Вам удобно?',
        sender: 'master',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  const filteredMasters = selectedCategory 
    ? mastersData.filter(m => m.categoryId === selectedCategory)
    : mastersData.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Стили
  const styles = {
    container: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(180deg, #F5F5F7 0%, #E8E8ED 100%)',
      minHeight: '100vh',
      maxWidth: '430px',
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
    },
    header: {
      background: 'rgba(255, 255, 255, 0.72)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '60px 20px 16px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '0.5px solid rgba(0, 0, 0, 0.1)',
    },
    searchBar: {
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(142, 142, 147, 0.12)',
      borderRadius: '12px',
      padding: '12px 16px',
      gap: '10px',
    },
    searchInput: {
      flex: 1,
      border: 'none',
      background: 'transparent',
      fontSize: '17px',
      outline: 'none',
      color: '#1D1D1F',
    },
    content: {
      padding: '20px',
      paddingBottom: '100px',
    },
    sectionTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#1D1D1F',
      marginBottom: '16px',
      letterSpacing: '-0.4px',
    },
    categoriesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      marginBottom: '32px',
    },
    categoryCard: {
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '16px 8px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    },
    categoryIcon: {
      fontSize: '28px',
      marginBottom: '8px',
    },
    categoryName: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#1D1D1F',
    },
    masterCard: {
      background: '#FFFFFF',
      borderRadius: '20px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    masterHeader: {
      display: 'flex',
      gap: '14px',
      marginBottom: '12px',
    },
    masterAvatar: {
      width: '56px',
      height: '56px',
      borderRadius: '16px',
      objectFit: 'cover',
    },
    masterInfo: {
      flex: 1,
    },
    masterName: {
      fontSize: '17px',
      fontWeight: '600',
      color: '#1D1D1F',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    masterCategory: {
      fontSize: '14px',
      color: '#8E8E93',
      marginTop: '2px',
    },
    masterStats: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginTop: '6px',
    },
    rating: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#1D1D1F',
    },
    reviews: {
      fontSize: '13px',
      color: '#8E8E93',
    },
    masterMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '12px',
      borderTop: '0.5px solid rgba(0, 0, 0, 0.08)',
    },
    distance: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '13px',
      color: '#8E8E93',
    },
    price: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#007AFF',
    },
    tabBar: {
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '430px',
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '0.5px solid rgba(0, 0, 0, 0.1)',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0 28px',
      zIndex: 100,
    },
    tabItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer',
      color: '#8E8E93',
      transition: 'color 0.2s',
      background: 'none',
      border: 'none',
      padding: '4px 12px',
    },
    tabItemActive: {
      color: '#007AFF',
    },
    tabLabel: {
      fontSize: '10px',
      fontWeight: '500',
    },
    btn: {
      background: '#007AFF',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '14px',
      padding: '16px 24px',
      fontSize: '17px',
      fontWeight: '600',
      cursor: 'pointer',
      width: '100%',
      transition: 'all 0.2s ease',
    },
    btnSecondary: {
      background: 'rgba(0, 122, 255, 0.1)',
      color: '#007AFF',
    },
  };

  // Экран профиля мастера
  const MasterProfile = () => (
    <div style={{ background: '#F5F5F7', minHeight: '100vh' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px)',
        padding: '60px 20px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button 
          onClick={() => { setCurrentScreen('home'); setSelectedMaster(null); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <Icons.Back />
        </button>
        <span style={{ fontSize: '17px', fontWeight: '600' }}>Профиль мастера</span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Основная инфо */}
        <div style={{ 
          background: '#FFFFFF', 
          borderRadius: '24px', 
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <img 
              src={selectedMaster.avatar} 
              alt={selectedMaster.name}
              style={{ width: '80px', height: '80px', borderRadius: '24px', objectFit: 'cover' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#1D1D1F' }}>
                  {selectedMaster.name}
                </span>
                {selectedMaster.verified && <Icons.Shield />}
              </div>
              <div style={{ fontSize: '15px', color: '#8E8E93', marginBottom: '8px' }}>
                {selectedMaster.category}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icons.Star filled />
                  <span style={{ fontWeight: '600' }}>{selectedMaster.rating}</span>
                  <span style={{ color: '#8E8E93', fontSize: '14px' }}>({selectedMaster.reviews})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E8E93', fontSize: '14px' }}>
                  <Icons.Location />
                  {selectedMaster.distance}
                </div>
              </div>
            </div>
            <button 
              onClick={() => toggleFavorite(selectedMaster.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              <Icons.Heart filled={favorites.includes(selectedMaster.id)} />
            </button>
          </div>

          <p style={{ fontSize: '15px', color: '#3C3C43', lineHeight: '1.5', marginBottom: '20px' }}>
            {selectedMaster.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0, 122, 255, 0.08)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#007AFF' }}>{selectedMaster.completedOrders}</div>
              <div style={{ fontSize: '12px', color: '#8E8E93' }}>заказов</div>
            </div>
            <div style={{ background: 'rgba(52, 199, 89, 0.08)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#34C759' }}>{selectedMaster.responseTime}</div>
              <div style={{ fontSize: '12px', color: '#8E8E93' }}>ответ</div>
            </div>
            <div style={{ background: 'rgba(255, 149, 0, 0.08)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF9500' }}>12 лет</div>
              <div style={{ fontSize: '12px', color: '#8E8E93' }}>опыт</div>
            </div>
          </div>
        </div>

        {/* Портфолио */}
        <div style={{ 
          background: '#FFFFFF', 
          borderRadius: '24px', 
          padding: '20px',
          marginBottom: '16px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Портфолио</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {selectedMaster.portfolio.map((img, idx) => (
              <img 
                key={idx}
                src={img}
                alt={`Работа ${idx + 1}`}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px' }}
              />
            ))}
          </div>
        </div>

        {/* Услуги */}
        <div style={{ 
          background: '#FFFFFF', 
          borderRadius: '24px', 
          padding: '20px',
          marginBottom: '16px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Услуги и цены</h3>
          {selectedMaster.services.map((service, idx) => (
            <div 
              key={idx}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '14px 0',
                borderBottom: idx < selectedMaster.services.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span style={{ fontSize: '15px', color: '#1D1D1F' }}>{service.name}</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#007AFF' }}>{service.price}</span>
            </div>
          ))}
        </div>

        {/* Кнопки действий */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '100px' }}>
          <button 
            style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }}
            onClick={() => setCurrentScreen('chat')}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Icons.Chat /> Написать
            </span>
          </button>
          <button 
            style={{ ...styles.btn, flex: 1 }}
            onClick={() => setShowPayment(true)}
          >
            Заказать
          </button>
        </div>
      </div>

      {/* Модал оплаты */}
      {showPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px 24px 0 0',
            padding: '24px',
            width: '100%',
            maxWidth: '430px',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{ width: '36px', height: '4px', background: '#E5E5E5', borderRadius: '2px', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>Оформление заказа</h3>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '16px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: '16px',
              marginBottom: '16px',
            }}>
              <img src={selectedMaster.avatar} alt="" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
              <div>
                <div style={{ fontWeight: '600' }}>{selectedMaster.name}</div>
                <div style={{ color: '#8E8E93', fontSize: '14px' }}>{selectedMaster.services[0].name}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontWeight: '700', color: '#007AFF' }}>{selectedMaster.services[0].price}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#8E8E93', marginBottom: '8px' }}>Способ оплаты</div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '16px',
                background: 'rgba(0,122,255,0.08)',
                borderRadius: '16px',
                border: '2px solid #007AFF',
              }}>
                <Icons.Wallet />
                <span style={{ fontWeight: '500' }}>Банковская карта</span>
                <span style={{ marginLeft: 'auto', color: '#8E8E93' }}>•••• 4242</span>
              </div>
            </div>

            <button 
              style={{ ...styles.btn, marginBottom: '12px' }}
              onClick={() => {
                setShowPayment(false);
                setOrderCreated(true);
                setTimeout(() => setOrderCreated(false), 3000);
              }}
            >
              Оплатить {selectedMaster.services[0].price}
            </button>
            <button 
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={() => setShowPayment(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Уведомление о создании заказа */}
      {orderCreated && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#34C759',
          color: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(52, 199, 89, 0.3)',
          zIndex: 1001,
          animation: 'fadeIn 0.3s ease',
        }}>
          <Icons.Check />
          <span style={{ fontWeight: '600' }}>Заказ успешно создан!</span>
        </div>
      )}
    </div>
  );

  // Экран чата
  const ChatScreen = () => (
    <div style={{ background: '#F5F5F7', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(20px)',
        padding: '60px 20px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '0.5px solid rgba(0,0,0,0.1)',
      }}>
        <button 
          onClick={() => setCurrentScreen('master')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Icons.Back />
        </button>
        <img src={selectedMaster.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600' }}>{selectedMaster.name}</div>
          <div style={{ fontSize: '12px', color: '#34C759' }}>онлайн</div>
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007AFF' }}>
          <Icons.Phone />
        </button>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {chatMessages.map(msg => (
          <div 
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '12px',
            }}
          >
            <div style={{
              background: msg.sender === 'user' ? '#007AFF' : '#FFFFFF',
              color: msg.sender === 'user' ? '#FFFFFF' : '#1D1D1F',
              padding: '12px 16px',
              borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              maxWidth: '80%',
              boxShadow: msg.sender === 'master' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}>
              <div style={{ fontSize: '15px', lineHeight: '1.4' }}>{msg.text}</div>
              <div style={{ 
                fontSize: '11px', 
                opacity: 0.7, 
                textAlign: 'right',
                marginTop: '4px',
              }}>{msg.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px 20px 32px',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(142, 142, 147, 0.12)',
          borderRadius: '24px',
          padding: '8px 16px',
        }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93' }}>
            <Icons.Camera />
          </button>
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Сообщение..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '17px',
              outline: 'none',
            }}
          />
          <button 
            onClick={sendMessage}
            style={{ 
              background: newMessage.trim() ? '#007AFF' : 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              color: newMessage.trim() ? '#FFFFFF' : '#8E8E93',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icons.Send />
          </button>
        </div>
      </div>
    </div>
  );

  // Экран аукциона заявок
  const AuctionScreen = () => (
    <div style={{ background: '#F5F5F7', minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>Заявки</h1>
        <p style={{ color: '#8E8E93', fontSize: '15px' }}>Откликайтесь на заказы клиентов</p>
      </div>

      <div style={styles.content}>
        {/* Создать заявку */}
        <button style={{
          width: '100%',
          background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          cursor: 'pointer',
          textAlign: 'left',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icons.Plus />
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '17px' }}>Создать заявку</div>
            <div style={{ opacity: 0.8, fontSize: '14px' }}>Опишите задачу и получите отклики</div>
          </div>
        </button>

        <h2 style={styles.sectionTitle}>Активные заявки</h2>

        {auctionRequests.map(request => (
          <div 
            key={request.id}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '12px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <img src={request.user.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600' }}>{request.user.name}</div>
                <div style={{ fontSize: '13px', color: '#8E8E93' }}>{request.postedAt}</div>
              </div>
              <span style={{
                background: 'rgba(0, 122, 255, 0.1)',
                color: '#007AFF',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
              }}>
                {request.category}
              </span>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '8px' }}>{request.title}</h3>
            <p style={{ fontSize: '14px', color: '#3C3C43', lineHeight: '1.4', marginBottom: '12px' }}>
              {request.description}
            </p>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              paddingTop: '12px',
              borderTop: '0.5px solid rgba(0,0,0,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8E8E93', fontSize: '14px' }}>
                <Icons.Location />
                {request.location}
              </div>
              <div style={{ marginLeft: 'auto', fontWeight: '700', color: '#34C759' }}>
                {request.budget}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginTop: '16px',
            }}>
              <span style={{ fontSize: '14px', color: '#8E8E93' }}>
                {request.responses} откликов
              </span>
              <button style={{
                background: '#007AFF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontWeight: '600',
                cursor: 'pointer',
              }}>
                Откликнуться
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Экран заказов
  const OrdersScreen = () => (
    <div style={{ background: '#F5F5F7', minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Мои заказы</h1>
      </div>

      <div style={styles.content}>
        {myOrders.map(order => (
          <div 
            key={order.id}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '12px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <img src={order.master.avatar} alt="" style={{ width: '48px', height: '48px', borderRadius: '14px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600' }}>{order.title}</div>
                <div style={{ fontSize: '14px', color: '#8E8E93' }}>{order.master.name}</div>
              </div>
              <span style={{
                background: order.status === 'completed' ? 'rgba(52, 199, 89, 0.1)' : 
                           order.status === 'in_progress' ? 'rgba(255, 149, 0, 0.1)' : 'rgba(0, 122, 255, 0.1)',
                color: order.status === 'completed' ? '#34C759' : 
                       order.status === 'in_progress' ? '#FF9500' : '#007AFF',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
              }}>
                {order.status === 'completed' ? 'Выполнен' : 
                 order.status === 'in_progress' ? 'В работе' : 'Ожидает'}
              </span>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '0.5px solid rgba(0,0,0,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8E8E93', fontSize: '14px' }}>
                <Icons.Clock />
                {order.date}
              </div>
              <div style={{ fontWeight: '700', color: '#1D1D1F' }}>{order.price}</div>
            </div>

            {order.status === 'completed' && (
              <button style={{
                width: '100%',
                marginTop: '16px',
                background: 'rgba(255, 184, 0, 0.1)',
                color: '#FF9500',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                <Icons.Star filled />
                Оставить отзыв
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Экран профиля пользователя
  const ProfileScreen = () => (
    <div style={{ background: '#F5F5F7', minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Профиль</h1>
      </div>

      <div style={styles.content}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #007AFF, #5856D6)',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '36px',
            fontWeight: '600',
          }}>
            ИК
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Иван Козлов</h2>
          <p style={{ color: '#8E8E93' }}>ivan@example.com</p>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '32px', 
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '0.5px solid rgba(0,0,0,0.08)',
          }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#007AFF' }}>12</div>
              <div style={{ fontSize: '13px', color: '#8E8E93' }}>заказов</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#34C759' }}>4.9</div>
              <div style={{ fontSize: '13px', color: '#8E8E93' }}>рейтинг</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF9500' }}>3</div>
              <div style={{ fontSize: '13px', color: '#8E8E93' }}>избранных</div>
            </div>
          </div>
        </div>

        {[
          { icon: '💳', label: 'Способы оплаты', sublabel: '•••• 4242' },
          { icon: '📍', label: 'Адреса', sublabel: '2 адреса' },
          { icon: '🔔', label: 'Уведомления', sublabel: 'Включены' },
          { icon: '🛡️', label: 'Безопасность', sublabel: '' },
          { icon: '❓', label: 'Помощь', sublabel: '' },
        ].map((item, idx) => (
          <div 
            key={idx}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '24px' }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500' }}>{item.label}</div>
              {item.sublabel && <div style={{ fontSize: '13px', color: '#8E8E93' }}>{item.sublabel}</div>}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );

  // Главный экран
  const HomeScreen = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#8E8E93' }}>Ваше местоположение</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
              <Icons.Location />
              <span>Москва, Россия</span>
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #007AFF, #5856D6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '600',
          }}>
            ИК
          </div>
        </div>

        <div style={styles.searchBar}>
          <Icons.Search />
          <input 
            type="text"
            placeholder="Поиск услуг или мастеров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93' }}>
            <Icons.Filter />
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <h2 style={styles.sectionTitle}>Категории</h2>
        <div style={styles.categoriesGrid}>
          {categories.map(cat => (
            <div 
              key={cat.id}
              style={{
                ...styles.categoryCard,
                border: selectedCategory === cat.id ? `2px solid ${cat.color}` : '2px solid transparent',
              }}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            >
              <div style={styles.categoryIcon}>{cat.icon}</div>
              <div style={styles.categoryName}>{cat.name}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
            {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Рекомендуемые'}
          </h2>
          {selectedCategory && (
            <button 
              onClick={() => setSelectedCategory(null)}
              style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', fontSize: '15px' }}
            >
              Сбросить
            </button>
          )}
        </div>

        {filteredMasters.map(master => (
          <div 
            key={master.id}
            style={styles.masterCard}
            onClick={() => { setSelectedMaster(master); setCurrentScreen('master'); }}
          >
            <div style={styles.masterHeader}>
              <img src={master.avatar} alt={master.name} style={styles.masterAvatar} />
              <div style={styles.masterInfo}>
                <div style={styles.masterName}>
                  {master.name}
                  {master.verified && <Icons.Verified />}
                </div>
                <div style={styles.masterCategory}>{master.category}</div>
                <div style={styles.masterStats}>
                  <div style={styles.rating}>
                    <Icons.Star filled />
                    {master.rating}
                  </div>
                  <span style={styles.reviews}>{master.reviews} отзывов</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFavorite(master.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Icons.Heart filled={favorites.includes(master.id)} />
              </button>
            </div>

            <div style={styles.masterMeta}>
              <div style={styles.distance}>
                <Icons.Location />
                {master.distance}
                <span style={{ margin: '0 8px', color: '#E5E5E5' }}>•</span>
                <Icons.Clock />
                {master.responseTime}
              </div>
              <div style={styles.price}>{master.price}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.tabBar}>
        {[
          { id: 'home', icon: <Icons.Home />, label: 'Главная' },
          { id: 'auction', icon: <Icons.Search />, label: 'Заявки' },
          { id: 'orders', icon: <Icons.Orders />, label: 'Заказы' },
          { id: 'profile', icon: <Icons.User />, label: 'Профиль' },
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tabItem,
              ...(activeTab === tab.id ? styles.tabItemActive : {}),
            }}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== 'home') setCurrentScreen(tab.id);
              else setCurrentScreen('home');
            }}
          >
            {tab.icon}
            <span style={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Роутинг экранов
  const renderScreen = () => {
    switch (currentScreen) {
      case 'master':
        return <MasterProfile />;
      case 'chat':
        return <ChatScreen />;
      case 'auction':
        return <AuctionScreen />;
      case 'orders':
        return <OrdersScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #8E8E93; }
      `}</style>
      {renderScreen()}
      {(currentScreen === 'auction' || currentScreen === 'orders' || currentScreen === 'profile') && (
        <div style={styles.tabBar}>
          {[
            { id: 'home', icon: <Icons.Home />, label: 'Главная' },
            { id: 'auction', icon: <Icons.Search />, label: 'Заявки' },
            { id: 'orders', icon: <Icons.Orders />, label: 'Заказы' },
            { id: 'profile', icon: <Icons.User />, label: 'Профиль' },
          ].map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tabItem,
                ...(activeTab === tab.id ? styles.tabItemActive : {}),
              }}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentScreen(tab.id);
              }}
            >
              {tab.icon}
              <span style={styles.tabLabel}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
