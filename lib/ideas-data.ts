export type IdeaSlug =
  | 'for-girlfriend'
  | 'for-boyfriend'
  | 'for-friend'
  | 'luxury-surprise';

export type IdeaFilterTag =
  | 'all'
  | 'for-her'
  | 'for-him'
  | 'luxury'
  | 'under-3000'
  | 'tech';

export interface IdeaGiftItem {
  id: string;
  title: string;
  emoji: string;
  price: number;
  shopName: string;
  imageUrl: string;
  originalUrl: string;
  description: string;
  categorySlug: IdeaSlug;
  tags: IdeaFilterTag[];
  trendingCountLabel: string;
}

export interface IdeaCategoryMeta {
  slug: IdeaSlug;
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
  emoji: string;
}

export const IDEA_CATEGORIES: Record<IdeaSlug, IdeaCategoryMeta> = {
  'for-girlfriend': {
    slug: 'for-girlfriend',
    title: 'Ідеї подарунків для неї',
    subtitle: 'Б’юті-мрії, парфумерія, прикраси та букети без розкриття домашньої адреси',
    seoTitle: 'Що подарувати дівчині або дружині — ідеї подарунків у гривні | Mriyii',
    seoDescription:
      'Добірка актуальних подарунків для неї з цінами в ₴ UAH: Dyson, парфуми, прикраси та букети. Додавайте у свій вішліст за 1 клік.',
    emoji: '👩',
  },
  'for-boyfriend': {
    slug: 'for-boyfriend',
    title: 'Ідеї подарунків для нього',
    subtitle: 'Техніка, аудіо, ігрові консолі та кавові гаджети для спільного збору або бронювання',
    seoTitle: 'Що подарувати хлопцю або чоловіку — ідеї подарунків | Mriyii',
    seoDescription:
      'ТОП подарунків для нього в Україні з цінами в ₴ UAH: навушники, PS5, кавоварки та аксесуари.',
    emoji: '👨',
  },
  'for-friend': {
    slug: 'for-friend',
    title: 'Ідеї подарунків для подруги чи друга',
    subtitle: 'Естетичні, корисні та бюджетні мрії до 3 000 ₴ і вище для будь-якої компанії',
    seoTitle: 'Що подарувати подрузі або другу на день народження | Mriyii',
    seoDescription:
      'Стильні ідеї подарунків для друзів у гривні: доглядова косметика, аромати, термокружки та сертифікати.',
    emoji: '🎉',
  },
  'luxury-surprise': {
    slug: 'luxury-surprise',
    title: 'Luxury / VIP-сюрпризи без адреси',
    subtitle: 'Преміальні подарунки та авторські букети для Instagram Bio з анонімним даруванням',
    seoTitle: 'VIP та Luxury подарунки з анонімним даруванням — Mriyii',
    seoDescription:
      'Преміальні подарунки, годинники, ювелірні прикраси та квіти без розкриття домашньої адреси.',
    emoji: '🕶️',
  },
};

export const IDEA_FILTER_CHIPS: Array<{ key: IdeaFilterTag; label: string }> = [
  { key: 'all', label: 'Всі ідеї' },
  { key: 'for-her', label: 'Для неї 👩' },
  { key: 'for-him', label: 'Для нього 👨' },
  { key: 'luxury', label: 'Luxury / VIP 🕶️' },
  { key: 'under-3000', label: 'До 3 000 ₴' },
  { key: 'tech', label: 'Техніка ⚡' },
];

export const CURATED_IDEAS: IdeaGiftItem[] = [
  {
    id: 'idea-dyson-airwrap',
    title: 'Стайлер Dyson Airwrap Multi-Styler Complete Long',
    emoji: '✨',
    price: 26000,
    shopName: 'Rozetka.ua',
    imageUrl:
      'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://rozetka.com.ua/ua/',
    description: 'Топовий лот для спільного збору на Монобанку або подарунка від компанії друзів.',
    categorySlug: 'for-girlfriend',
    tags: ['for-her', 'luxury', 'tech'],
    trendingCountLabel: '🔥 У 340+ вішлістах цього місяця',
  },
  {
    id: 'idea-peonies-vip',
    title: 'Букет 25 білих півоній у дизайнерському папері',
    emoji: '🌸',
    price: 3800,
    shopName: '@kamelia_flowers_kyiv',
    imageUrl:
      'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://instagram.com/kamelia_flowers_kyiv',
    description: 'Доставка через Direct бутіка — отримувач сам обирає час та місце без передачі адреси.',
    categorySlug: 'luxury-surprise',
    tags: ['for-her', 'luxury'],
    trendingCountLabel: '🌸 190+ анонімних замовлень',
  },
  {
    id: 'idea-airpods-max',
    title: 'Навушники Apple AirPods Max (USB-C)',
    emoji: '🎧',
    price: 22999,
    shopName: 'Comfy.ua',
    imageUrl:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://comfy.ua/',
    description: 'Ідеальний подарунок для роботи, подорожей та музики. Підходить і для неї, і для нього.',
    categorySlug: 'for-boyfriend',
    tags: ['for-him', 'for-her', 'tech', 'luxury'],
    trendingCountLabel: '🎧 У 270+ вішлістах',
  },
  {
    id: 'idea-ps5-slim',
    title: 'Ігрова консоль PlayStation 5 Slim 1TB',
    emoji: '🎮',
    price: 23499,
    shopName: 'Rozetka.ua',
    imageUrl:
      'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://rozetka.com.ua/ua/',
    description: 'Легендарний груповий подарунок — друзі легко закривають збір через Apple Pay на Банку.',
    categorySlug: 'for-boyfriend',
    tags: ['for-him', 'tech'],
    trendingCountLabel: '🎮 У 210+ вішлістах',
  },
  {
    id: 'idea-rituals-set',
    title: 'Подарунковий набір Rituals The Ritual of Sakura',
    emoji: '🕯️',
    price: 1850,
    shopName: 'Makeup.ua',
    imageUrl:
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://makeup.com.ua/',
    description: 'Естетичний б’юті-комплімент до 3 000 ₴ з ароматом вишневого цвіту та рисового молока.',
    categorySlug: 'for-friend',
    tags: ['for-her', 'under-3000'],
    trendingCountLabel: '✨ Хіт бюджету до 3 000 ₴',
  },
  {
    id: 'idea-chemex-coffee',
    title: 'Набір для альтернативної кави Chemex + кавомолка',
    emoji: '☕',
    price: 2650,
    shopName: 'Rozetka.ua',
    imageUrl:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://rozetka.com.ua/ua/',
    description: 'Для поціновувачів спешелті-кави вдома — стильний дизайн і чистий смак.',
    categorySlug: 'for-friend',
    tags: ['for-him', 'for-her', 'under-3000'],
    trendingCountLabel: '☕ У 140+ вішлістах',
  },
  {
    id: 'idea-marshall-stanmore',
    title: 'Акустична система Marshall Stanmore III Black',
    emoji: '🔊',
    price: 15999,
    shopName: 'Comfy.ua',
    imageUrl:
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://comfy.ua/',
    description: 'Культовий звук та інтер’єрний акцент для дому або студії.',
    categorySlug: 'for-boyfriend',
    tags: ['for-him', 'tech', 'luxury'],
    trendingCountLabel: '🔊 У 160+ вішлістах',
  },
  {
    id: 'idea-cartier-bracelet',
    title: 'Шовкова піжама та кашеміровий плед Luxury Set',
    emoji: '💎',
    price: 7900,
    shopName: '@silk_atelier_ua',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://instagram.com/',
    description: 'Ідеальний VIP-подарунок з доставкою через Instagram Direct без розкриття адреси.',
    categorySlug: 'luxury-surprise',
    tags: ['for-her', 'luxury'],
    trendingCountLabel: '💎 Топ вибір для IG Bio',
  },
  {
    id: 'idea-powerbank-baseus',
    title: 'Швидкий павербанк Baseus 20 000 mAh 65W PD',
    emoji: '⚡',
    price: 2190,
    shopName: 'Comfy.ua',
    imageUrl:
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80',
    originalUrl: 'https://comfy.ua/',
    description: 'Заряджає навіть MacBook — практичний мастхев подарунок до 3 000 ₴.',
    categorySlug: 'for-friend',
    tags: ['for-him', 'for-her', 'under-3000', 'tech'],
    trendingCountLabel: '⚡ Практичний бестселер',
  },
];
