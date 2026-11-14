import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { IAiPreferences, UserGender } from '@/models/User';

export const GEMINI_MODEL = 'gemini-2.5-flash' as const;

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

export interface GeneratedGiftIdea {
  title: string;
  emoji: string;
  description: string;
  estimatedPrice: number;
  currency: string;
  searchQuery: string;
  whyItFits: string;
}

export interface GenerateGiftIdeasInput {
  wishlistTitle: string;
  budgetUah: number;
  guestQuery?: string;
  ownerGender?: UserGender;
  aiPreferences?: IAiPreferences;
  existingGiftTitles?: string[];
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

/**
 * Генерує 3 персоналізовані ідеї подарунків за допомогою Gemini 2.5 Flash зі Structured Outputs,
 * враховуючи стать власника (`female` — Rose Luxury / `male` — Cyber Titanium) та приховану анкету `aiPreferences`.
 */
export async function generateGiftIdeas(
  input: GenerateGiftIdeasInput
): Promise<GeneratedGiftIdea[]> {
  assertGeminiRateLimit(input.clientIdentifier ?? 'global');

  const ai = getGeminiClient();
  const prefs = input.aiPreferences;

  const genderContext =
    input.ownerGender === 'male'
      ? 'Чоловік (естетика Cyber Titanium / Apple Pro / гаджети / стиль / хобі)'
      : 'Дівчина (естетика Rose Luxury / beauty / стайлінг / прикраси / враження / лайфстайл)';

  const hobbiesText = prefs?.hobbies?.length ? prefs.hobbies.join(', ') : 'Не вказано';
  const flowersText = prefs?.flowerPreferences?.trim() || 'Не вказано';
  const antiGiftsText = prefs?.antiGifts?.length ? prefs.antiGifts.join(', ') : 'Немає';
  const sizesText = [
    prefs?.clothingSize ? `Одяг: ${prefs.clothingSize}` : null,
    prefs?.shoeSize ? `Взуття: ${prefs.shoeSize}` : null,
  ]
    .filter(Boolean)
    .join('; ') || 'Не вказано';
  const existingTitlesText = input.existingGiftTitles?.length
    ? input.existingGiftTitles.join(', ')
    : 'Список поки порожній';

  const prompt = `
Ти — розумний ШІ-асистент подарунків платформи Mriyii.
Допоможи гостю підібрати 3 ідеальні подарунки-сюрпризи для події: "${input.wishlistTitle}".

Параметри запиту:
- Профіль власника списку: ${genderContext}
- Максимальний бюджет гостя: ${input.budgetUah} UAH
- Побажання від гостя: ${input.guestQuery?.trim() || 'Запропонуй найкращі ідеї під стиль та інтереси'}
- Хобі та інтереси власника вішліста (прихована анкета): ${hobbiesText}
- Улюблені квіти та флористичні побажання: ${flowersText}
- Розміри власника: ${sizesText}
- Додаткові нотатки власника: ${prefs?.notes || 'Немає'}
- СУВОРЕ ТАБУ (Анти-подарунки — НІКОЛИ не пропонувати): ${antiGiftsText}
- Вже є у вішлісті (не дублювати): ${existingTitlesText}

Вимоги:
1. Запропонуй рівно 3 різні, конкретні та реалістичні ідеї подарунків, які можна придбати в Україні.
2. Вартість кожної ідеї (estimatedPrice) не повинна перевищувати ${input.budgetUah} UAH.
3. Додай до кожної ідеї відповідний емодзі (поле emoji).
4. Суворо уникай усього зі списку анти-подарунків та не повторюй позиції, які вже є у вішлісті.
5. Не розкривай дослівний текст прихованої анкети, але використай його для влучних рекомендацій.
`.trim();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: giftIdeasResponseSchema,
      temperature: 0.7,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error('Gemini API повернув порожню відповідь.');
  }

  const parsed = JSON.parse(rawText) as GeneratedGiftIdea[];
  return parsed.slice(0, 3);
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
