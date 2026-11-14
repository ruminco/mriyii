/**
 * Модуль підміни оригінальних посилань на партнерські (Affiliate Proxy / Deeplink Generator).
 *
 * Поточна архітектура побудована як розширюваний адаптер:
 * - Якщо в .env.local задані ключі партнерських мереж (ROZETKA_AFFILIATE_TAG, ADMITAD_PUBLISHER_ID),
 *   посилання автоматично конвертується у відповідний партнерський deeplink.
 * - Якщо для домену ще не підключена партнерська програма або ключі не задані,
 *   додаються акуратні UTM-мітки Mriyii (mriyii_ref), не ламаючи оригінальний URL магазину.
 */

export type AffiliateNetwork = 'rozetka' | 'admitad' | 'direct_utm' | 'none';

export interface AffiliateConversionResult {
  originalUrl: string;
  affiliateUrl: string;
  network: AffiliateNetwork;
  merchantDomain: string;
}

const ADMITAD_SUPPORTED_DOMAINS = [
  'allo.ua',
  'comfy.ua',
  'foxtrot.com.ua',
  'moyo.ua',
  'epicentrk.ua',
  'answear.ua',
  'intertop.ua',
  'kasta.ua',
  'yakaboo.ua',
  'aliexpress.com',
];

function normalizeDomain(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Конвертує оригінальний URL товару на партнерське посилання.
 */
export function buildAffiliateUrl(rawUrl: string): AffiliateConversionResult {
  const trimmed = rawUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      originalUrl: trimmed,
      affiliateUrl: trimmed,
      network: 'none',
      merchantDomain: '',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      originalUrl: trimmed,
      affiliateUrl: trimmed,
      network: 'none',
      merchantDomain: '',
    };
  }

  const domain = normalizeDomain(parsed.hostname);
  const rozetkaTag = process.env.ROZETKA_AFFILIATE_TAG?.trim();
  const admitadCampaignBase = process.env.ADMITAD_PUBLISHER_ID?.trim();

  // 1. Пряма партнерська програма Rozetka
  if (domain === 'rozetka.com.ua' || domain.endsWith('.rozetka.com.ua')) {
    const target = new URL(parsed.toString());
    if (rozetkaTag) {
      target.searchParams.set('utm_source', 'mriyii');
      target.searchParams.set('utm_medium', 'affiliate');
      target.searchParams.set('aff_id', rozetkaTag);
      return {
        originalUrl: trimmed,
        affiliateUrl: target.toString(),
        network: 'rozetka',
        merchantDomain: domain,
      };
    }
  }

  // 2. Мережа Admitad / SalesDoubler (через deeplink-обгортку, якщо заданий ADMITAD_PUBLISHER_ID)
  const isAdmitadDomain = ADMITAD_SUPPORTED_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );

  if (isAdmitadDomain && admitadCampaignBase) {
    const encodedulp = encodeURIComponent(parsed.toString());
    const deeplink = `https://ad.admitad.com/g/${encodeURIComponent(
      admitadCampaignBase
    )}/?ulp=${encodedulp}&subid=mriyii`;
    return {
      originalUrl: trimmed,
      affiliateUrl: deeplink,
      network: 'admitad',
      merchantDomain: domain,
    };
  }

  // 3. Базовий реферальний трекінг Mriyii (безпечні UTM-параметри)
  const fallbackUrl = new URL(parsed.toString());
  if (!fallbackUrl.searchParams.has('utm_source')) {
    fallbackUrl.searchParams.set('utm_source', 'mriyii');
  }

  return {
    originalUrl: trimmed,
    affiliateUrl: fallbackUrl.toString(),
    network: 'direct_utm',
    merchantDomain: domain,
  };
}

/**
 * Допоміжна функція для генерації пошукового партнерського посилання (наприклад, для ідей від ШІ-асистента).
 */
export function buildSearchAffiliateUrl(searchQuery: string): string {
  const encodedQuery = encodeURIComponent(searchQuery.trim());
  const rozetkaSearchUrl = `https://rozetka.com.ua/ua/search/?text=${encodedQuery}`;
  return buildAffiliateUrl(rozetkaSearchUrl).affiliateUrl;
}
