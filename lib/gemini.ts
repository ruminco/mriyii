import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { IAiPreferences, UserGender } from '@/models/User';

export const GEMINI_MODEL = 'gemini-2.5-flash' as const;

export type AiAssistantMode = 'from_wishlist' | 'web_search';

let aiClient: GoogleGenAI | null = null;

/**
 * Отримання Singleton-клієнта GoogleGenAI (@google/genai).
 */
export function getGeminiClient(): GoogleGenAI {
  if (aiClient) {
    return aiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Критична помилка: Змінна оточення GEMINI_API_KEY не задана у .env.local');
  }

  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

/**
 * In-memory Rate Limiter (5 запитів / хвилину на один ідентифікатор / IP)
 * згідно з правилом [Tech Lead & Security].
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestTimestampsByClient = new Map<string, number[]>();

export function assertGeminiRateLimit(clientIdentifier: string): void {
  const key = clientIdentifier.trim() || 'anonymous';
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const recentRequests = (requestTimestampsByClient.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error(
      'Перевищено ліміт запитів до ШІ-асистента (максимум 5 запитів на хвилину). Спробуйте трохи пізніше.'
    );
  }

  recentRequests.push(now);
  requestTimestampsByClient.set(key, recentRequests);
}

export interface WishlistItemCandidate {
  id: string;
  title: string;
  emoji?: string;
  price?: number;
  description?: string;
  hasMonoJar?: boolean;
  jarCurrentAmount?: number;
  jarTargetAmount?: number;
}

export interface GeneratedGiftIdea {
  title: string;
  emoji: string;
  description: string;
  estimatedPrice: number;
  currency: string;
  searchQuery: string;
  whyItFits: string;
  mode?: AiAssistantMode;
  wishlistItemId?: string;
  isMonoJarContribution?: boolean;
  sourceUrl?: string;
  sourceStore?: string;
}

export interface GenerateGiftIdeasInput {
  wishlistTitle: string;
  budgetUah: number;
  mode?: AiAssistantMode;
  guestQuery?: string;
  ownerGender?: UserGender;
  aiPreferences?: IAiPreferences;
  existingGiftTitles?: string[];
  availableWishlistItems?: WishlistItemCandidate[];
  clientIdentifier?: string;
}

/**
 * Схема Structured Outputs (responseSchema) для гарантованої генерації 3 ідей подарунків у JSON.
 */
export const giftIdeasResponseSchema: Schema = {
  type: Type.ARRAY,
  description: 'Рівно 3 персоналізовані ідеї подарунків для іменинника в межах бюджету.',
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Конкретна назва подарунка українською мовою.',
      },
      emoji: {
        type: Type.STRING,
        description: 'Один виразний емодзі, що відповідає категорії подарунка (наприклад, ✨, 🎧, 💍, 🎮, 🏝️).',
      },
      description: {
        type: Type.STRING,
        description: 'Стислий та привабливий опис товару (колір, модель, характеристики).',
      },
      estimatedPrice: {
        type: Type.NUMBER,
        description: 'Орієнтовна вартість у гривнях (UAH), що не перевищує бюджет гостя.',
      },
      currency: {
        type: Type.STRING,
        description: 'Валюта ціни, завжди UAH.',
      },
      searchQuery: {
        type: Type.STRING,
        description: 'Оптимальний пошуковий запит для покупки товару на Rozetka або в українських магазинах.',
      },
      whyItFits: {
        type: Type.STRING,
        description: 'Коротке пояснення для гостя, чому цей подарунок ідеально підходить (без прямого цитування прихованої анкети).',
      },
      wishlistItemId: {
        type: Type.STRING,
        description: 'ID існуючого лоту з вішліста (якщо mode === from_wishlist).',
      },
      isMonoJarContribution: {
        type: Type.BOOLEAN,
        description: 'Чи це пропозиція докинути комфортну суму в Монобанку на дорогий лот.',
      },
      sourceUrl: {
        type: Type.STRING,
        description: 'Пряме посилання на знайдений товар у магазині (якщо знайдено через Google Search).',
      },
      sourceStore: {
        type: Type.STRING,
        description: 'Назва українського магазину або бренду (напр. Rozetka, Apple, @kamelia_flowers).',
      },
    },
    required: [
      'title',
      'emoji',
      'description',
      'estimatedPrice',
      'currency',
      'searchQuery',
      'whyItFits',
    ],
  },
};

function selectWishlistIdeasFallback(input: GenerateGiftIdeasInput): GeneratedGiftIdea[] {
  const candidates = input.availableWishlistItems ?? [];
  if (candidates.length === 0) {
    return [];
  }

  const sorted = [...candidates].sort((a, b) => {
    const aPrice = a.price ?? input.budgetUah;
    const bPrice = b.price ?? input.budgetUah;
    const aFits = aPrice <= input.budgetUah ? 0 : 1;
    const bFits = bPrice <= input.budgetUah ? 0 : 1;
    if (aFits !== bFits) return aFits - bFits;
    if (a.hasMonoJar && !b.hasMonoJar) return -1;
    if (!a.hasMonoJar && b.hasMonoJar) return 1;
    return aPrice - bPrice;
  });

  return sorted.slice(0, 3).map((item) => {
    const price = item.price ?? input.budgetUah;
    const isJarTopUp = Boolean(item.hasMonoJar && price > input.budgetUah);
    return {
      title: item.title,
      emoji: item.emoji || '🎁',
      description:
        item.description ||
        (isJarTopUp
          ? `Товар коштує ${price.toLocaleString('uk-UA')} ₴ — ви можете закинути комфортний внесок до ${input.budgetUah.toLocaleString('uk-UA')} ₴ прямо в Монобанку!`
          : 'Позиція вже у вішлісті отримувача — 100% точне влучання в бажання.'),
      estimatedPrice: isJarTopUp ? input.budgetUah : price,
      currency: 'UAH',
      searchQuery: item.title,
      whyItFits: isJarTopUp
        ? 'Спільний збір на Монобанку дозволяє підтримати головну мрію в межах вашого бюджету.'
        : 'Це точне бажання зі списку отримувача, яке ще вільне до бронювання.',
      mode: 'from_wishlist',
      wishlistItemId: item.id,
      isMonoJarContribution: isJarTopUp,
    };
  });
}

/**
 * Генерує 3 персоналізовані ідеї подарунків за допомогою Gemini 2.5 Flash у двох режимах:
 * 1) `from_wishlist`: фільтрує та ранжує існуючі вільні лоти зі списку (або пропонує донат у Монобанку);
 * 2) `web_search`: використовує Gemini Google Search Grounding (`tools: [{ googleSearch: {} }]`)
 *    + приховану анкету `aiPreferences` для пошуку реальних товарів в українських магазинах.
 */
export async function generateGiftIdeas(
  input: GenerateGiftIdeasInput
): Promise<GeneratedGiftIdea[]> {
  assertGeminiRateLimit(input.clientIdentifier ?? 'global');

  const mode: AiAssistantMode = input.mode ?? 'web_search';
  const ai = getGeminiClient();
  const prefs = input.aiPreferences;

  const genderContext =
    input.ownerGender === 'male'
      ? 'Чоловік (естетика Cyber Titanium / Apple Pro / гаджети / стиль / хобі)'
      : 'Дівчина (естетика Rose Luxury / beauty / стайлінг / прикраси / враження / лайфстайл)';

  const hobbiesText = prefs?.hobbies?.length ? prefs.hobbies.join(', ') : 'Не вказано';
  const flowersText = prefs?.flowerPreferences?.trim() || 'Не вказано';
  const antiGiftsText = prefs?.antiGifts?.length ? prefs.antiGifts.join(', ') : 'Немає';
  const sizesText =
    [
      prefs?.clothingSize ? `Одяг: ${prefs.clothingSize}` : null,
      prefs?.shoeSize ? `Взуття: ${prefs.shoeSize}` : null,
    ]
      .filter(Boolean)
      .join('; ') || 'Не вказано';

  if (mode === 'from_wishlist') {
    const candidates = input.availableWishlistItems ?? [];
    if (candidates.length === 0) {
      return [];
    }

    const candidatesJson = JSON.stringify(
      candidates.slice(0, 20).map((c) => ({
        id: c.id,
        title: c.title,
        emoji: c.emoji || '🎁',
        priceUah: c.price ?? 0,
        hasMonoJar: Boolean(c.hasMonoJar),
        jarCurrentAmount: c.jarCurrentAmount ?? 0,
        jarTargetAmount: c.jarTargetAmount ?? c.price ?? 0,
        description: c.description ?? '',
      }))
    );

    const prompt = `
Ти — розумний ШІ-асистент подарунків платформи Mriyii (Режим А: «Обрати з того, що вже є у вішлісті»).
Проаналізуй доступні вільні лоти вішліста "${input.wishlistTitle}" та порекомендуй до 3 найкращих варіантів під бюджет гостя: ${input.budgetUah} UAH.

Вхідні лоти вішліста:
${candidatesJson}

Побажання гостя: ${input.guestQuery?.trim() || 'Підбери найкращі варіанти з цього списку під мій бюджет'}

Правила:
1. Обирай ТІЛЬКИ з переданих вище лотів та обов'язково зберігай точний wishlistItemId.
2. Якщо ціна лоту <= ${input.budgetUah} UAH — пропонуй його як пряме бронювання (isMonoJarContribution: false).
3. Якщо лот дорожчий, але має hasMonoJar: true — пропонуй докинути комфортну суму ${input.budgetUah} UAH у Монобанку (isMonoJarContribution: true).
4. Коротко поясни у whyItFits, чому це влучний вибір.
`.trim();

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: giftIdeasResponseSchema,
          temperature: 0.4,
        },
      });

      if (!response.text) {
        return selectWishlistIdeasFallback(input);
      }

      const parsed = JSON.parse(response.text) as GeneratedGiftIdea[];
      return parsed.slice(0, 3).map((item) => ({
        ...item,
        mode: 'from_wishlist',
      }));
    } catch {
      return selectWishlistIdeasFallback(input);
    }
  }

  // Режим Б: web_search із Gemini Google Search Grounding (tools: [{ googleSearch: {} }])
  const existingTitlesText = input.existingGiftTitles?.length
    ? input.existingGiftTitles.join(', ')
    : 'Список поки порожній';

  const groundingPrompt = `
Ти — розумний ШІ-консьєрж подарунків платформи Mriyii (Режим Б: пошук реальних товарів в українських інтернет-магазинах).
Знайди через Google Search 3 конкретні, актуальні товари в Україні для події "${input.wishlistTitle}".

Профіль та інтереси іменинника:
- Стать / стиль: ${genderContext}
- Бюджет гостя: до ${input.budgetUah} UAH
- Додаткове побажання гостя: ${input.guestQuery?.trim() || 'Підбери найкращі подарунки під інтереси'}
- Хобі, бренди та інтереси: ${hobbiesText}
- Улюблені квіти / флористика: ${flowersText}
- Розміри: ${sizesText}
- Додаткові нотатки: ${prefs?.notes || 'Немає'}
- СУВОРЕ ТАБУ (НІКОЛИ не пропонувати): ${antiGiftsText}
- Вже є у вішлісті (не дублювати): ${existingTitlesText}

Поверни короткий опис 3 реальних товарів з назвами магазинів (Rozetka, Prom, Instagram-шоуруми, офіційні сайти) та цінами у гривні (UAH) до ${input.budgetUah} ₴.
`.trim();

  let groundedSummary = '';
  let groundedSources: Array<{ title: string; uri: string }> = [];

  try {
    const searchResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: groundingPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.5,
      },
    });

    groundedSummary = searchResponse.text ?? '';
    const candidate = searchResponse.candidates?.[0] as
      | {
          groundingMetadata?: {
            groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
          };
        }
      | undefined;

    groundedSources = (candidate?.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => ({
        title: chunk.web?.title ?? '',
        uri: chunk.web?.uri ?? '',
      }))
      .filter((src) => Boolean(src.uri));
  } catch {
    groundedSummary = '';
  }

  const formattingPrompt = `
Перетвори знайдені ідеї на рівно 3 структуровані JSON-рекомендації для вішліста "${input.wishlistTitle}" з бюджетом до ${input.budgetUah} UAH.

Контекст профілю (не цитуй табу напряму):
- Стиль: ${genderContext}
- Інтереси: ${hobbiesText}
- Квіти: ${flowersText}
- Розміри: ${sizesText}
- Табу (уникати): ${antiGiftsText}
- Вже у списку (уникати): ${existingTitlesText}

${
  groundedSummary
    ? `Результати пошуку в інтернеті:\n${groundedSummary}\n\nЗнайдені джерела:\n${JSON.stringify(groundedSources.slice(0, 6))}`
    : `Підбери 3 реалістичні товари з українських магазинів під ці інтереси.`
}

Вимоги:
1. Рівно 3 ідеї, estimatedPrice <= ${input.budgetUah}, currency = "UAH".
2. Якщо в результатах пошуку є реальний URL джерела — додай його в sourceUrl, а назву магазину в sourceStore.
3. Поле whyItFits має пояснювати гостю, чому подарунок влучає в смаки іменинника, не розкриваючи табу.
`.trim();

  const structuredResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: formattingPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: giftIdeasResponseSchema,
      temperature: 0.4,
    },
  });

  const rawText = structuredResponse.text;
  if (!rawText) {
    throw new Error('Gemini API повернув порожню відповідь.');
  }

  const parsed = JSON.parse(rawText) as GeneratedGiftIdea[];
  return parsed.slice(0, 3).map((item, index) => ({
    ...item,
    mode: 'web_search',
    sourceUrl: item.sourceUrl || groundedSources[index]?.uri,
    sourceStore: item.sourceStore || groundedSources[index]?.title || undefined,
  }));
}

export interface AiExtractedProductMetadata {
  title: string;
  emoji: string;
  description?: string;
  price?: number;
  currency: string;
}

export const productMetadataResponseSchema: Schema = {
  type: Type.OBJECT,
  description: 'Структуровані метадані товару, витягнуті зі сторінки магазину або URL.',
  properties: {
    title: {
      type: Type.STRING,
      description: 'Чиста назва товару без зайвих рекламних слів («Купити», «в інтернет-магазині» тощо).',
    },
    emoji: {
      type: Type.STRING,
      description: 'Один акцентний емодзі категорії товару (наприклад, ✨, 🎧, 💍, 🎮, 📱, 👟).',
    },
    description: {
      type: Type.STRING,
      description: 'Короткий опис основних характеристик товару (1-2 речення).',
    },
    price: {
      type: Type.NUMBER,
      description: 'Числове значення ціни товару (якщо знайдено у фрагменті сторінки), або 0 якщо ціна невідома.',
    },
    currency: {
      type: Type.STRING,
      description: 'Трилітерний код валюти (за замовчуванням UAH).',
    },
  },
  required: ['title', 'emoji', 'currency'],
};

/**
 * Gemini AI Fallback для парсера посилань: коли магазин не віддає OpenGraph-метадані
 * або повертає неповні дані, Gemini 2.5 Flash витягує чисту назву, емодзі, опис та ціну.
 */
export async function extractProductMetadataWithAi(input: {
  url: string;
  pageSnippet?: string;
  clientIdentifier?: string;
}): Promise<AiExtractedProductMetadata | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    assertGeminiRateLimit(input.clientIdentifier ?? 'parser-fallback');
    const ai = getGeminiClient();

    const prompt = `
Витягни структуровану інформацію про товар із цього URL та текстового фрагмента сторінки інтернет-магазину.
Очисти назву від слів "Купити", назви магазину та SEO-шуму. Підбери один влучний емодзі для товару. Якщо точна ціна присутня в тексті — вкажи її числом, інакше вкажи 0.

URL: ${input.url}
Фрагмент сторінки:
${(input.pageSnippet ?? '').slice(0, 4000)}
`.trim();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: productMetadataResponseSchema,
        temperature: 0.2,
      },
    });

    if (!response.text) {
      return null;
    }

    const parsed = JSON.parse(response.text) as AiExtractedProductMetadata;
    return {
      title: parsed.title,
      emoji: parsed.emoji || '✨',
      description: parsed.description,
      price: parsed.price && parsed.price > 0 ? parsed.price : undefined,
      currency: parsed.currency || 'UAH',
    };
  } catch {
    return null;
  }
}
