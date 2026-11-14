import dns from 'node:dns/promises';
import net from 'node:net';
import * as cheerio from 'cheerio';
import { buildAffiliateUrl } from '@/lib/affiliate';
import { extractProductMetadataWithAi } from '@/lib/gemini';

export interface ParsedProductResult {
  title: string;
  emoji: string;
  description?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  originalUrl: string;
  affiliateUrl: string;
  instagramHandle?: string;
  parsedViaAiFallback?: boolean;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  'metadata.google.internal',
  '169.254.169.254',
]);

/**
 * Перевіряє, чи належить IPv4 або IPv6 адреса до локальних, приватних або службових підмереж (Захист від SSRF).
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();

  // IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.slice('::ffff:'.length);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateOrReservedIp(ipv4Part);
    }
  }

  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map((octet) => Number(octet));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
      return true;
    }

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (a === 10) return true;
    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private network)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  if (net.isIPv6(normalized)) {
    if (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fe80:') || // Link-local
      normalized.startsWith('fc') || // Unique local (fc00::/7)
      normalized.startsWith('fd') || // Unique local (fc00::/7)
      normalized.startsWith('ff') // Multicast
    ) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Сувора Анти-SSRF перевірка URL перед виконанням будь-якого мережевого запиту.
 */
export async function validateSafeExternalUrl(rawUrl: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw new Error('Некоректний формат URL посилання.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Дозволені лише посилання з протоколом HTTP або HTTPS.');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Посилання не повинно містити облікових даних авторизації.');
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    throw new Error('Запити до локальних або внутрішніх хостів суворо заборонені (SSRF Protection).');
  }

  // Якщо хост є прямою IP-адресою
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error('Доступ до приватних або локальних IP-адрес заборонено (SSRF Protection).');
    }
    return parsedUrl;
  }

  // Перевірка DNS-записів хоста
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      throw new Error('Не вдалося визначити IP-адресу домену.');
    }

    for (const record of records) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new Error(
          'Домен вказує на внутрішню або приватну IP-адресу. Запит заблоковано (SSRF Protection).'
        );
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('SSRF Protection')) {
      throw error;
    }
    throw new Error('Не вдалося перевірити безпеку домену або сайт недоступний.');
  }

  return parsedUrl;
}

function extractNumericPrice(rawPrice?: string | null): number | undefined {
  if (!rawPrice) return undefined;
  const cleaned = rawPrice.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : undefined;
}

function deriveTitleFromUrlSlug(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || url.hostname;
  const cleaned = decodeURIComponent(lastSegment)
    .replace(/\.(html|htm|php|aspx)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!cleaned) return url.hostname;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function inferCategoryEmoji(title: string): string {
  const lower = title.toLowerCase();
  if (/півон|квіт|букет|гортенз|троянд|flower|тюльпан/.test(lower)) return '🌸';
  if (/airpods|навушн|headphone|marshall|sony|акустик|колонк/.test(lower)) return '🎧';
  if (/dyson|стайлер|фен|парфум|духи|косметик|крем|шанел|dior|сукн|шоурум/.test(lower)) return '✨';
  if (/каблучк|кільц|прикрас|пандор|pandora|золот|срібн|підвіск|сережк/.test(lower)) return '💍';
  if (/playstation|ps5|xbox|nintendo|steam|гра|геймпад|клавіатур|миш/.test(lower)) return '🎮';
  if (/iphone|macbook|ipad|apple watch|смартфон|ноутбук|планшет|монітор/.test(lower)) return '⚡';
  if (/кросівк|nike|adidas|new balance|взутт|сумк|худі|куртк|одяг/.test(lower)) return '👟';
  if (/кав|кавоварк|пуровер|чашк|термос/.test(lower)) return '☕';
  if (/подорож|тур|відпочинок|готель|сертифікат|spa|спа/.test(lower)) return '🏝️';
  return '🎁';
}

function extractInstagramHandle(url: URL, rawTitle?: string): string | undefined {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'instagram.com' || host === 'ig.me') {
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] === 'm' && segments[1]) {
      return segments[1].replace(/^@/, '');
    }
    if (segments[0] && !['p', 'reel', 'reels', 'stories', 'explore'].includes(segments[0])) {
      return segments[0].replace(/^@/, '');
    }
  }
  const matchInTitle = rawTitle?.match(/@([a-zA-Z0-9._]{2,30})/);
  return matchInTitle?.[1];
}

/**
 * Парсить метадані товару за URL:
 * 1. Анти-SSRF перевірка (протокол, хост, DNS -> IP).
 * 2. Завантаження HTML із безпечним таймаутом та перевіркою редіректів.
 * 3. Витягування OpenGraph (`og:title`, `og:image`, `og:price:amount`), JSON-LD Product та стандартних мета-тегів через `cheerio`.
 * 4. Інтелектуальний фолбек через Gemini 2.5 Flash (`extractProductMetadataWithAi`), якщо магазин не віддав назву або ціну.
 * 5. Генерація партнерського посилання (`buildAffiliateUrl`) та розпізнавання Instagram-нікнейму магазину (`instagramHandle`).
 */
export async function parseProductUrl(rawUrl: string): Promise<ParsedProductResult> {
  const safeUrl = await validateSafeExternalUrl(rawUrl);
  const { affiliateUrl } = buildAffiliateUrl(safeUrl.toString());

  let html = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(safeUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MriyiiBot/1.0; +https://mriyii.app) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);

    // Якщо стався редірект, перевіряємо кінцевий URL на SSRF
    if (response.url && response.url !== safeUrl.toString()) {
      await validateSafeExternalUrl(response.url);
    }

    if (response.ok) {
      html = await response.text();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('SSRF Protection')) {
      throw error;
    }
    // Якщо сайт заблокував запит або перевищено час очікування — переходимо до фолбеку
  }

  let title = '';
  let emoji = '';
  let description: string | undefined;
  let price: number | undefined;
  let currency = 'UAH';
  let imageUrl: string | undefined;
  let pageSnippet = '';

  if (html) {
    const $ = cheerio.load(html);

    title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      $('h1').first().text().trim() ||
      $('title').first().text().trim() ||
      '';

    description =
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="description"]').attr('content')?.trim() ||
      undefined;

    const rawImage =
      $('meta[property="og:image"]').attr('content')?.trim() ||
      $('meta[name="twitter:image"]').attr('content')?.trim();

    if (rawImage) {
      try {
        imageUrl = new URL(rawImage, safeUrl).toString();
      } catch {
        imageUrl = undefined;
      }
    }

    const rawOgPrice =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[property="og:price:amount"]').attr('content') ||
      $('[itemprop="price"]').attr('content') ||
      $('[itemprop="price"]').first().text();

    price = extractNumericPrice(rawOgPrice);

    const rawCurrency =
      $('meta[property="product:price:currency"]').attr('content') ||
      $('meta[property="og:price:currency"]').attr('content') ||
      $('[itemprop="priceCurrency"]').attr('content');

    if (rawCurrency && rawCurrency.trim().length === 3) {
      currency = rawCurrency.trim().toUpperCase();
    }

    // Спроба витягнути дані з JSON-LD (Schema.org Product), якщо ціна або назва відсутні
    if (!price || !title) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonText = $(el).contents().text();
          const parsedJson = JSON.parse(jsonText) as Record<string, unknown>;
          const items = Array.isArray(parsedJson) ? parsedJson : [parsedJson];

          for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            const record = item as Record<string, unknown>;
            if (!title && typeof record.name === 'string') {
              title = record.name.trim();
            }
            if (!imageUrl && typeof record.image === 'string') {
              imageUrl = new URL(record.image, safeUrl).toString();
            }
            const offers = record.offers as Record<string, unknown> | undefined;
            if (!price && offers && typeof offers === 'object') {
              const offerPrice = offers.price ?? offers.lowPrice;
              if (typeof offerPrice === 'number' || typeof offerPrice === 'string') {
                price = extractNumericPrice(String(offerPrice));
              }
              if (typeof offers.priceCurrency === 'string') {
                currency = offers.priceCurrency.toUpperCase();
              }
            }
          }
        } catch {
          // Ігноруємо невалідний JSON-LD
        }
      });
    }

    pageSnippet = [
      title,
      description,
      $('h1').text().trim(),
      $('[class*="price"], [id*="price"]').first().text().trim(),
    ]
      .filter(Boolean)
      .join('\n');
  }

  // Gemini AI Fallback: якщо OpenGraph не повернув назву або ціну
  let parsedViaAiFallback = false;
  if (!title || price === undefined) {
    const aiMetadata = await extractProductMetadataWithAi({
      url: safeUrl.toString(),
      pageSnippet,
    });

    if (aiMetadata) {
      parsedViaAiFallback = true;
      if (!title && aiMetadata.title) {
        title = aiMetadata.title;
      }
      if (aiMetadata.emoji) {
        emoji = aiMetadata.emoji;
      }
      if (!description && aiMetadata.description) {
        description = aiMetadata.description;
      }
      if (price === undefined && aiMetadata.price !== undefined) {
        price = aiMetadata.price;
      }
      if (aiMetadata.currency) {
        currency = aiMetadata.currency;
      }
    }
  }

  if (!title) {
    title = deriveTitleFromUrlSlug(safeUrl);
  }

  if (!emoji) {
    emoji = inferCategoryEmoji(title);
  }

  const instagramHandle = extractInstagramHandle(safeUrl, `${title} ${description ?? ''}`);

  return {
    title,
    emoji,
    description,
    price,
    currency: currency || 'UAH',
    imageUrl,
    originalUrl: safeUrl.toString(),
    affiliateUrl,
    instagramHandle,
    parsedViaAiFallback,
  };
}
