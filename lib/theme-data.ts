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

export type LandingPreset = ThemePreset | 'creator_bio';

export const THEME_TOKENS: Record<ThemePreset, ThemeVisualTokens> = {
  rose_luxury: {
    preset: 'rose_luxury',
    gender: 'female',
    label: '👩 Для неї • Lavender & Butter',
    meshClass: 'canvas-rose',
    avatarRingClass: 'avatar-ring-rose',
    fallbackPosterClass: 'fallback-poster-rose',
    aiBannerGradient: 'bg-[#1A1724] border border-[#DECFFC]/35',
    commentBubbleClass:
      'bg-[#EFEAFF] border-l-4 border-[#5B50EC] text-[#141218]',
    emojiFrameGradient:
      'from-[#6F66F2] via-[#DECFFC] to-[#F4FF7A] shadow-lg shadow-[#6F66F2]/20',
    priorityBadgeClass: 'bg-[#F4FF7A] text-[#141218]',
    priorityBadgeText: '🔥 Мрія #1',
    pricePillClass:
      'text-[#141218] bg-[#F4FF7A] border border-[#141218]/15',
    shimmerBarClass: 'bg-[#5B50EC]',
    primaryCtaGradient:
      'bg-[#F4FF7A] hover:bg-[#e8f566] !text-[#141218] shadow-lg',
    primaryJarBtnText: '🐈 Поповнити Банку',
    primaryBookBtnText: '🎁 Забронювати подарунок',
    donorsBadgeClass: 'bg-[#EFEAFF] text-[#5B50EC]',
    surpriseBoxGradient:
      'from-[#EFEAFF] via-slate-50 to-[#FFE8EE] border-[#DECFFC]',
  },
  cyber_titanium: {
    preset: 'cyber_titanium',
    gender: 'male',
    label: '👨 Для нього • Pro Titanium',
    meshClass: 'canvas-cyber',
    avatarRingClass: 'avatar-ring-cyber',
    fallbackPosterClass: 'fallback-poster-cyber',
    aiBannerGradient: 'bg-[#15161D] border border-emerald-400/30',
    commentBubbleClass:
      'bg-[#EEF2FA] border-l-4 border-[#4F46E5] text-[#15161D]',
    emojiFrameGradient:
      'from-emerald-400 via-[#818CF8] to-[#4F46E5] shadow-lg shadow-emerald-500/20',
    priorityBadgeClass: 'bg-[#4F46E5] text-white',
    priorityBadgeText: '⚡ Топ-бажання',
    pricePillClass:
      'text-[#0B1120] bg-[#34D399] border border-emerald-400/40',
    shimmerBarClass: 'bg-emerald-500',
    primaryCtaGradient:
      'bg-[#34D399] hover:bg-emerald-400 !text-[#0B1120] shadow-lg shadow-emerald-500/20',
    primaryJarBtnText: '🫙 Поповнити Банку',
    primaryBookBtnText: '🎁 Забронювати',
    donorsBadgeClass: 'bg-emerald-200/80 text-emerald-900',
    surpriseBoxGradient:
      'from-[#EEF2FA] via-blue-50 to-emerald-50 border-indigo-200',
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
      'https://images.pexels.com/photos/5910931/pexels-photo-5910931.jpeg?auto=compress&cs=tinysrgb&w=400',
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
          'https://images.pexels.com/photos/31449823/pexels-photo-31449823.jpeg?auto=compress&cs=tinysrgb&w=700',
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
        title: 'Авторський букет з 25 білих півоній та ранункулюсів',
        emoji: '🌸',
        description:
          'Улюблений букет із бутика @kamelia_flowers. Оплатіть у Direct — магазин сам спитає у мене зручний час доставки!',
        price: 4200,
        currency: 'UAH',
        imageUrl:
          'https://images.pexels.com/photos/12775959/pexels-photo-12775959.jpeg?auto=compress&cs=tinysrgb&w=700',
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
        title: 'Півонії в шовковій стрічці (Подарунковий сет)',
        emoji: '💐',
        description: 'Український бутік @kamelia_flowers — доставка без розкриття домашньої адреси 🌸',
        price: 3400,
        currency: 'UAH',
        imageUrl:
          'https://images.pexels.com/photos/12615496/pexels-photo-12615496.jpeg?auto=compress&cs=tinysrgb&w=700',
        originalUrl: 'https://www.instagram.com/kamelia_flowers/',
        affiliateUrl: 'https://www.instagram.com/kamelia_flowers/?utm_source=mriyii',
        instagramHandle: 'kamelia_flowers',
        isBooked: false,
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-lux-2',
        wishlistId: 'wl-lux',
        title: 'Парфуми Parfums de Marly Delina',
        emoji: '💍',
        description: 'Оригінал, версія Eau de Parfum 75 ml з Brocard.',
        price: 9400,
        currency: 'UAH',
        imageUrl:
          'https://images.pexels.com/photos/4938265/pexels-photo-4938265.jpeg?auto=compress&cs=tinysrgb&w=700',
        originalUrl: 'https://rozetka.com.ua/ua/delina-parfum/',
        affiliateUrl: 'https://rozetka.com.ua/ua/delina-parfum/?utm_source=mriyii',
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
      'https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=400',
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
          'https://images.pexels.com/photos/5208818/pexels-photo-5208818.jpeg?auto=compress&cs=tinysrgb&w=700',
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
        title: 'Sony WH-1000XM5 Midnight + Дріп-бокс',
        emoji: '🎧',
        description: 'Топове шумозаглушення для глибокого фокусу за кодом і кави.',
        price: 14500,
        currency: 'UAH',
        imageUrl:
          'https://images.pexels.com/photos/29687786/pexels-photo-29687786.jpeg?auto=compress&cs=tinysrgb&w=700',
        originalUrl: 'https://rozetka.com.ua/ua/sony-wh-1000xm5/',
        affiliateUrl: 'https://rozetka.com.ua/ua/sony-wh-1000xm5/?utm_source=mriyii',
        isBooked: false,
        monoJarUrl: 'https://send.monobank.ua/jar/demoMaxAirpods',
        monoJarId: 'demoMaxAirpods',
        jarTargetAmount: 14500,
        jarCurrentAmount: 9800,
        isAiSurprise: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-cyb-3',
        wishlistId: 'wl-cyb',
        title: 'Вікенд із друзями та кастомізація сетапу',
        emoji: '🥂',
        description: 'Колір Carbon Black, доставка через Direct @max.tech.',
        price: 12000,
        currency: 'UAH',
        imageUrl:
          'https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=700',
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
