import type { ThemePreset, UserGender } from '@/models/User';
import type { GuestGiftItemDTO } from '@/actions/wishlist';

export interface ThemeVisualTokens {
  preset: ThemePreset;
  gender: UserGender;
  label: string;
  meshClass: string;
  avatarRingClass: string;
  fallbackPosterClass: string;
  aiBannerGradient: string;
  commentBubbleClass: string;
  emojiFrameGradient: string;
  priorityBadgeClass: string;
  priorityBadgeText: string;
  pricePillClass: string;
  shimmerBarClass: string;
  primaryCtaGradient: string;
  primaryJarBtnText: string;
  primaryBookBtnText: string;
  donorsBadgeClass: string;
  surpriseBoxGradient: string;
}

export const THEME_TOKENS: Record<ThemePreset, ThemeVisualTokens> = {
  rose_luxury: {
    preset: 'rose_luxury',
    gender: 'female',
    label: '👩 Для неї • Midnight Velvet',
    meshClass: 'canvas-rose',
    avatarRingClass: 'avatar-ring-rose',
    fallbackPosterClass: 'fallback-poster-rose',
    aiBannerGradient: 'bg-[#171D30] border border-amber-400/30',
    commentBubbleClass:
      'bg-amber-50 border-l-4 border-amber-500 text-slate-950',
    emojiFrameGradient:
      'from-amber-400 via-amber-500 to-indigo-500 shadow-lg shadow-amber-500/20',
    priorityBadgeClass: 'bg-amber-500 text-slate-950',
    priorityBadgeText: '🔥 Мрія #1',
    pricePillClass:
      'text-amber-200 bg-amber-500/20 border border-amber-400/40',
    shimmerBarClass: 'bg-emerald-500',
    primaryCtaGradient:
      'bg-amber-500 hover:bg-amber-600 !text-slate-950 shadow-lg shadow-amber-500/20',
    primaryJarBtnText: '🐈 Поповнити Банку',
    primaryBookBtnText: '👑 Подарувати все',
    donorsBadgeClass: 'bg-emerald-200/80 text-emerald-900',
    surpriseBoxGradient:
      'from-indigo-50 via-slate-50 to-amber-50 border-indigo-200',
  },
  cyber_titanium: {
    preset: 'cyber_titanium',
    gender: 'male',
    label: '👨 Для нього • Cyber Titanium',
    meshClass: 'canvas-cyber',
    avatarRingClass: 'avatar-ring-cyber',
    fallbackPosterClass: 'fallback-poster-cyber',
    aiBannerGradient: 'bg-[#171D30] border border-emerald-400/30',
    commentBubbleClass:
      'bg-indigo-50 border-l-4 border-indigo-600 text-indigo-950',
    emojiFrameGradient:
      'from-emerald-400 via-cyan-400 to-indigo-500 shadow-lg shadow-emerald-500/20',
    priorityBadgeClass: 'bg-indigo-600 text-white',
    priorityBadgeText: '⚡ Топ-бажання',
    pricePillClass:
      'text-emerald-200 bg-emerald-500/20 border border-emerald-400/40',
    shimmerBarClass: 'bg-emerald-500',
    primaryCtaGradient:
      'bg-emerald-400 hover:bg-emerald-500 !text-slate-950 shadow-lg shadow-emerald-500/20',
    primaryJarBtnText: '🫙 Поповнити Банку',
    primaryBookBtnText: '🎁 Забронювати',
    donorsBadgeClass: 'bg-emerald-200/80 text-emerald-900',
    surpriseBoxGradient:
      'from-indigo-50 via-blue-50 to-emerald-50 border-indigo-200',
  },
};

export const DEMO_WISHLISTS: Record<
  ThemePreset,
  {
    slug: string;
    title: string;
    ownerName: string;
    ownerAvatarUrl: string;
    ownerBio: string;
    daysLeft: number;
    ownerInstagramHandle: string;
    flowerAndGiftNotes: string;
    eventDate: string;
    aiHobbies: string[];
    aiSizes: string;
    aiFlowerPreferences: string;
    aiAntiGifts: string[];
    items: GuestGiftItemDTO[];
  }
> = {
  rose_luxury: {
    slug: 'olena-vip',
    title: 'Олена Ковальчук • Мої 25 рочків 🥂',
    ownerName: 'Олена Ковальчук',
    ownerAvatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    ownerBio:
      'Зібрала тут речі, про які справді мрію. Можна бронювати у 1 клік, замовляти квіти в Direct або скидатися на Банку!',
    daysLeft: 12,
    ownerInstagramHandle: 'olena.muse',
    flowerAndGiftNotes:
      '🌸 Обожнюю білі півонії, кремові гортензії та пудрові ранункулюси (без червоних троянд 🤍). Улюблена студія квітів — @kamelia_flowers, шоурум суконь — @cher17.ua (розмір S). Напишіть магазину мій @olena.muse — вони самі узгодять зі мною час і місце доставки!',
    eventDate: '2026-12-01T18:00:00.000Z',
    aiHobbies: ['Б’юті & Стайлінг', 'Specialty кава', 'Естетика Apple', 'Подорожі та SPA'],
    aiSizes: 'Одяг S • Взуття 37',
    aiFlowerPreferences: 'Білі півонії, кремові гортензії (@kamelia_flowers)',
    aiAntiGifts: ['Без сувенірів і свічок'],
    items: [
      {
        id: 'demo-lux-1',
        wishlistId: 'wl-lux',
        title: 'Стайлер Dyson Airwrap i.d.™ Strawberry Bronze',
        emoji: '✨',
        description: 'Хочу саме в кольорі Strawberry Bronze для ідеальних локонів ✨',
        price: 26000,
        currency: 'UAH',
        imageUrl:
          'https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=700&q=80',
        originalUrl: 'https://rozetka.com.ua/ua/dyson-airwrap/',
        affiliateUrl: 'https://rozetka.com.ua/ua/dyson-airwrap/?utm_source=mriyii',
        isBooked: false,
        monoJarUrl: 'https://send.monobank.ua/jar/demoOlenaDyson',
        monoJarId: 'demoOlenaDyson',
        jarTargetAmount: 26000,
        jarCurrentAmount: 19500,
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-lux-ig-1',
        wishlistId: 'wl-lux',
        title: 'Авторський букет з 25 білих півоній та ранункулюсів 🌸',
        emoji: '🌸',
        description:
          'Улюблений букет із бутика @kamelia_flowers. Оплатіть у Direct — магазин сам спитає у мене зручний час доставки!',
        price: 4200,
        currency: 'UAH',
        imageUrl:
          'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=700&q=80',
        originalUrl: 'https://www.instagram.com/kamelia_flowers/',
        affiliateUrl: 'https://www.instagram.com/kamelia_flowers/?utm_source=mriyii',
        instagramHandle: 'kamelia_flowers',
        isBooked: false,
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-lux-ig-2',
        wishlistId: 'wl-lux',
        title: 'Шовкова сукня-комбінація Champagne Rose (розмір S)',
        emoji: '👗',
        description: 'Український Instagram-шоурум @cher17.ua, колір шампань, розмір S 🥂',
        price: 5400,
        currency: 'UAH',
        imageUrl:
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=80',
        originalUrl: 'https://www.instagram.com/cher17.ua/',
        affiliateUrl: 'https://www.instagram.com/cher17.ua/?utm_source=mriyii',
        instagramHandle: 'cher17.ua',
        isBooked: false,
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-lux-2',
        wishlistId: 'wl-lux',
        title: 'Парфумована вода Maison Francis Kurkdjian Baccarat Rouge 540',
        emoji: '💍',
        description: 'Оригінал, версія Eau de Parfum 70 ml з Brocard.',
        price: 13800,
        currency: 'UAH',
        imageUrl:
          'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=80',
        originalUrl: 'https://rozetka.com.ua/ua/baccarat-rouge-540/',
        affiliateUrl: 'https://rozetka.com.ua/ua/baccarat-rouge-540/?utm_source=mriyii',
        isBooked: true,
        bookedByName: 'Олександр 👑',
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  cyber_titanium: {
    slug: 'max-cyber',
    title: 'Максим Дмитренко • Мої 30 рочків 🎉',
    ownerName: 'Максим Дмитренко',
    ownerAvatarUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
    ownerBio:
      'Мій список гаджетів та апгрейду робочого сетапу. Можна скинутися в Монобанку або забронювати лот!',
    daysLeft: 14,
    ownerInstagramHandle: 'max.tech',
    flowerAndGiftNotes:
      '☕ Обожнюю свіжообсмажену Specialty каву в зернах під фільтр V60 (Ефіопія / Кенія від @foundation.coffee), вінілові платівки Daft Punk та кастомні кейкапи. Магазину в Direct просто вкажіть мій @max.tech для доставки!',
    eventDate: '2026-11-29T19:00:00.000Z',
    aiHobbies: ['Вело', 'Specialty кава', 'PS5', 'Код & Apple'],
    aiSizes: 'Одяг L • Взуття 43 EU',
    aiFlowerPreferences: 'Specialty кава в зернах під V60 (@foundation.coffee)',
    aiAntiGifts: ['Без чашок з написами і краваток'],
    items: [
      {
        id: 'demo-cyb-1',
        wishlistId: 'wl-cyb',
        title: 'Ігрова консоль Sony PlayStation 5 Pro 2TB',
        emoji: '🎮',
        description: 'Мрія для вечірніх каток з друзями на вихідних 🎮',
        price: 32999,
        currency: 'UAH',
        imageUrl:
          'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=700&q=80',
        originalUrl: 'https://rozetka.com.ua/ua/playstation-5-pro/',
        affiliateUrl: 'https://rozetka.com.ua/ua/playstation-5-pro/?utm_source=mriyii',
        isBooked: false,
        monoJarUrl: 'https://send.monobank.ua/jar/demoMaxPs5',
        monoJarId: 'demoMaxPs5',
        jarTargetAmount: 32999,
        jarCurrentAmount: 24500,
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-cyb-2',
        wishlistId: 'wl-cyb',
        title: 'Apple AirPods Max (USB-C) Midnight',
        emoji: '🎧',
        description: 'Оновлена версія з USB-C у кольорі Темна ніч для глибокого фокусу за кодом.',
        price: 24999,
        currency: 'UAH',
        imageUrl:
          'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&w=700&q=80',
        originalUrl: 'https://rozetka.com.ua/ua/airpods-max-usbc/',
        affiliateUrl: 'https://rozetka.com.ua/ua/airpods-max-usbc/?utm_source=mriyii',
        isBooked: false,
        monoJarUrl: 'https://send.monobank.ua/jar/demoMaxAirpods',
        monoJarId: 'demoMaxAirpods',
        jarTargetAmount: 24999,
        jarCurrentAmount: 18500,
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-cyb-3',
        wishlistId: 'wl-cyb',
        title: 'Кастомна клавіатура Keychron Q1 Pro Wireless',
        emoji: '⌨️',
        description: 'Колір Carbon Black, свічі Gateron Jupiter Banana від @keychron_ua.',
        price: 8999,
        currency: 'UAH',
        imageUrl:
          'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=700&q=80',
        originalUrl: 'https://www.instagram.com/keychron_ua/',
        affiliateUrl: 'https://www.instagram.com/keychron_ua/?utm_source=mriyii',
        instagramHandle: 'keychron_ua',
        isBooked: false,
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
    ],
  },
};
