import crypto from 'node:crypto';
import { connectToDatabase } from '@/lib/mongodb';
import AnalyticsEvent, {
  type AnalyticsEventType,
  type IAnalyticsEventMetadata,
} from '@/models/AnalyticsEvent';
import CreatorCohort, { type CreatorCohortStatus } from '@/models/CreatorCohort';
import Wishlist from '@/models/Wishlist';

export type MetricsPeriod = '7d' | '30d' | 'all';

export interface HealthRuleAlert {
  id: 'RULE-01' | 'RULE-02' | 'RULE-03' | 'RULE-04' | 'RULE-05' | 'RULE-06';
  title: string;
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
  diagnosis: string;
  actionPlan: string[];
  metricValueText: string;
  thresholdText: string;
}

export interface CreatorCohortRowDTO {
  id: string;
  instagramHandle: string;
  followersCount: number;
  niche: string;
  wishlistSlug: string;
  status: CreatorCohortStatus;
  daysSinceInvite: number;
  bioClicks: number;
  igOrders: number;
  bookingsAndJars: number;
  affiliateClicks: number;
  gmvUah: number;
  notes?: string;
}

export interface ScenarioBenchmarkRow {
  key: string;
  label: string;
  pessimistic: string;
  base: string;
  optimistic: string;
  actual: string;
  status: 'green' | 'yellow' | 'red';
}

export interface MetricsDashboardDTO {
  period: MetricsPeriod;
  isSimulated: boolean;
  generatedAt: string;
  totals: {
    ownersCount: number;
    uniqueGuestsCount: number;
    wishlistViewsCount: number;
    bookingsCount: number;
    affiliateClicksCount: number;
    jarClicksCount: number;
    igDmCopiesCount: number;
    aiUsesCount: number;
    growthLoopClicksCount: number;
    rawGmvUah: number;
  };
  runRate100: {
    creatorSharePct: number;
    eventsPerYear: number;
    giftsPerEvent: number;
    aovUah: number;
    bookingToClickCrPct: number;
    affiliateGmvSharePct: number;
    avgCpaRatePct: number;
    effectiveTakeRatePct: number;
    kFactor: number;
    annualGmvUah: number;
    monthlyRevenueUah: number;
    annualRevenueUah: number;
    stage2MonthlyPotentialUah: number;
  };
  benchmarks: {
    pessimisticMonthlyUah: number;
    baseMonthlyUah: number;
    optimisticMonthlyUah: number;
    pessimisticAnnualUah: number;
    baseAnnualUah: number;
    optimisticAnnualUah: number;
    stage2BaseMonthlyUah: number;
  };
  matrixRows: ScenarioBenchmarkRow[];
  healthAlerts: HealthRuleAlert[];
  creatorExperiment: {
    targetTotal: number;
    targetValidated: number;
    invitedCount: number;
    showcaseReadyCount: number;
    placedInBioCount: number;
    tenPlusVisitsCount: number;
    validatedCount: number;
    rows: CreatorCohortRowDTO[];
    topShopHandles: Array<{ handle: string; count: number }>;
  };
}

export function hashVisitor(ip: string, userAgent: string): string {
  const now = new Date();
  const monthSalt = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return crypto
    .createHash('sha256')
    .update(`${ip}|${userAgent}|${monthSalt}`)
    .digest('hex');
}

export function resolveMerchantCpa(url?: string): {
  merchantDomain: string;
  estimatedCpaRate: number;
} {
  if (!url) {
    return { merchantDomain: 'direct-store', estimatedCpaRate: 0.055 };
  }
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    if (host.includes('makeup.com.ua')) {
      return { merchantDomain: 'makeup.com.ua', estimatedCpaRate: 0.075 };
    }
    if (host.includes('brocard.ua') || host.includes('aromateque')) {
      return { merchantDomain: host, estimatedCpaRate: 0.075 };
    }
    if (host.includes('rozetka.com.ua')) {
      return { merchantDomain: 'rozetka.com.ua', estimatedCpaRate: 0.025 };
    }
    if (host.includes('comfy.ua') || host.includes('foxtrot.com.ua')) {
      return { merchantDomain: host, estimatedCpaRate: 0.035 };
    }
    if (host.includes('prom.ua') || host.includes('kasta.ua')) {
      return { merchantDomain: host, estimatedCpaRate: 0.06 };
    }
    return { merchantDomain: host, estimatedCpaRate: 0.055 };
  } catch {
    return { merchantDomain: 'unknown', estimatedCpaRate: 0.055 };
  }
}

export async function trackEvent(params: {
  eventType: AnalyticsEventType;
  wishlistId?: string;
  wishlistSlug?: string;
  itemId?: string;
  visitorHash?: string;
  metadata?: IAnalyticsEventMetadata;
}): Promise<void> {
  try {
    await connectToDatabase();
    await AnalyticsEvent.create({
      eventType: params.eventType,
      wishlistId: params.wishlistId || undefined,
      wishlistSlug: params.wishlistSlug?.trim().toLowerCase() || undefined,
      itemId: params.itemId || undefined,
      visitorHash: params.visitorHash,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.warn('[Mriyii Analytics] trackEvent skipped:', err instanceof Error ? err.message : err);
  }
}

/**
 * Автоматично визначає, що інфлюенсерка поставила посилання у Bio (>= 3 унікальні переходи з ig_bio).
 */
export async function recordBioVisitDetection(
  wishlistSlug: string,
  utmSource?: 'ig_bio' | 'tg_chat' | 'direct'
): Promise<void> {
  if (utmSource !== 'ig_bio') return;
  try {
    await connectToDatabase();
    const cleanSlug = wishlistSlug.trim().toLowerCase();
    const cohort = await CreatorCohort.findOne({ wishlistSlug: cleanSlug });
    if (!cohort) return;

    if (cohort.status === 'invited' || cohort.status === 'showcase_ready') {
      const uniqueVisitors = await AnalyticsEvent.distinct('visitorHash', {
        wishlistSlug: cleanSlug,
        eventType: 'wishlist_viewed',
        'metadata.utmSource': 'ig_bio',
      });
      if (uniqueVisitors.length >= 3) {
        cohort.status = 'placed_in_bio';
        cohort.placedInBioAt = new Date();
        await cohort.save();
      }
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Автоматично переводить інфлюенсерку у статус `validated_gift_received` при першому бронюванні/замовленні.
 */
export async function markCreatorGiftValidated(wishlistId?: string, wishlistSlug?: string): Promise<void> {
  try {
    await connectToDatabase();
    const query = wishlistId
      ? { $or: [{ wishlistId }, ...(wishlistSlug ? [{ wishlistSlug: wishlistSlug.toLowerCase() }] : [])] }
      : wishlistSlug
      ? { wishlistSlug: wishlistSlug.toLowerCase() }
      : null;

    if (!query) return;

    const cohort = await CreatorCohort.findOne(query);
    if (!cohort) return;

    if (cohort.status !== 'validated_gift_received') {
      cohort.status = 'validated_gift_received';
      cohort.firstGiftAt = cohort.firstGiftAt || new Date();
      if (!cohort.placedInBioAt) {
        cohort.placedInBioAt = new Date();
      }
      await cohort.save();
    }
  } catch {
    // Non-blocking
  }
}

export function evaluateMetricsHealth(params: {
  bookingToClickCrPct: number;
  affiliateGmvSharePct: number;
  unbookedGuestsSaveRatePct: number;
  creatorBioValidated14d: number;
  kFactor: number;
  growthLoopToCreatedCrPct: number;
  aovUah: number;
  jarWishlistSharePct: number;
  igDmOrdersPerMonth: number;
}): HealthRuleAlert[] {
  const alerts: HealthRuleAlert[] = [];

  if (params.bookingToClickCrPct < 65 || params.affiliateGmvSharePct < 25) {
    alerts.push({
      id: 'RULE-01',
      title: 'Витік Affiliate-трафіку після броні',
      severity: 'CRITICAL',
      diagnosis:
        'Гості бронюють подарунок на Mriyii, але купують його самостійно в додатку Rozetka/Makeup або поза партнерським посиланням.',
      actionPlan: [
        'Зробити модалку після бронювання 2-кроковою з великою зеленою кнопкою «Крок 2: Перейти до офіційного магазину».',
        'Після 100% збору на Монобанку надсилати партнерський лінк імениннику в /dashboard («Банку зібрано! Купуй мрію тут»).',
      ],
      metricValueText: `CR ${params.bookingToClickCrPct.toFixed(1)}% · M_aff ${params.affiliateGmvSharePct.toFixed(1)}%`,
      thresholdText: 'Ціль: CR ≥ 65% та M_aff ≥ 25%',
    });
  }

  if (params.unbookedGuestsSaveRatePct < 15) {
    alerts.push({
      id: 'RULE-02',
      title: 'Втрата гостей на дорогих лотах',
      severity: 'WARNING',
      diagnosis:
        'Дешеві подарунки розібрали перші 3 гості, а решта бачать лише дорогі лоти й закривають сторінку без кліку по Банці чи ШІ-асистенту.',
      actionPlan: [
        'Закріпити плашку «🫙 Скинутися на спільну мрію від 200 ₴» першою карткою у списку.',
        'Автоматично підсвічувати ШІ-асистента («Не знаєш що обрати на свій бюджет? Підберу сюрприз за 10 с»), якщо гість скролить > 20 с.',
      ],
      metricValueText: `${params.unbookedGuestsSaveRatePct.toFixed(1)}% гостей без дешевих лотів`,
      thresholdText: 'Поріг: ≥ 15%',
    });
  }

  if (params.creatorBioValidated14d < 6) {
    alerts.push({
      id: 'RULE-03',
      title: 'Низька активація Creator-сегменту (Вішліст у Bio)',
      severity: 'CRITICAL',
      diagnosis:
        'Інфлюенсеркам ліньки самостійно заповнювати вішліст із нуля, тому частота подій F падає до 1.2 рази/рік.',
      actionPlan: [
        'Перейти на Concierge Onboarding: менеджер сам створює для інфлюенсерки готову Rose Luxury вітрину з 5 хітовими лотами (Dyson, Dior, Квіти).',
        'Додати у прев’ю бейдж «Твоя домашня адреса на 100% прихована — квіти замовляють через твій @handle».',
      ],
      metricValueText: `${params.creatorBioValidated14d} / 30 активних за 14 днів`,
      thresholdText: 'Ціль валідації: ≥ 6 / 30 (20%)',
    });
  }

  if (params.kFactor < 1.15 || params.growthLoopToCreatedCrPct < 8) {
    alerts.push({
      id: 'RULE-04',
      title: 'Недостатня віральність гостьової воронки (K-factor)',
      severity: 'WARNING',
      diagnosis:
        'Гості успішно бронюють подарунки для друзів, але закривають фінальний поп-ап і не створюють власні вішлісти.',
      actionPlan: [
        'У фінальному екрані після бронювання показати інтерактивний вибір 1 кліком: «А що подарувати ТОБІ? Обери першу мрію без реєстрації».',
        'Тримати помітний бейдж «Створено в Mriyii ✨» у футері кожного публічного вішліста /w/[slug].',
      ],
      metricValueText: `K = ${params.kFactor.toFixed(2)} · CR = ${params.growthLoopToCreatedCrPct.toFixed(1)}%`,
      thresholdText: 'Ціль: K ≥ 1.15 та CR ≥ 8%',
    });
  }

  if (params.aovUah < 1800 || params.jarWishlistSharePct < 30) {
    alerts.push({
      id: 'RULE-05',
      title: 'Низький середній чек (AOV) та частка Монобанок',
      severity: 'WARNING',
      diagnosis:
        'Користувачі додають лише дрібні товари (до 1 000 ₴) і рідко підключають Монобанку для великих мрій.',
      actionPlan: [
        'У /dashboard показувати слот «🌟 Додай 1 Велику Мрію для спільного збору (Dyson, iPhone або Подорож) — друзі скинуться по 300 ₴».',
      ],
      metricValueText: `AOV ${Math.round(params.aovUah).toLocaleString('uk-UA')} ₴ · Банки ${params.jarWishlistSharePct.toFixed(0)}%`,
      thresholdText: 'Поріг: AOV ≥ 1 800 ₴ та Банки ≥ 30%',
    });
  }

  if (params.igDmOrdersPerMonth >= 25) {
    alerts.push({
      id: 'RULE-06',
      title: 'Етап 2 Ready: час підключати B2B-комісію Квітів та Instagram-шопів!',
      severity: 'OPPORTUNITY',
      diagnosis:
        'Через платформу вже йде стабільний потік замовлень у квіткові бутіки та Instagram-шоуруми без прямої комісії.',
      actionPlan: [
        'Вивантажити топ-5 @shopHandle з таблиці нижче і підписати пряму B2B-комісію 12% за ліди з промокодом MRIYII.',
      ],
      metricValueText: `${params.igDmOrdersPerMonth} замовлень/міс у Direct`,
      thresholdText: 'Тригер: ≥ 25 замовлень/міс',
    });
  }

  return alerts;
}

function buildMatrixRows(runRate: MetricsDashboardDTO['runRate100']): ScenarioBenchmarkRow[] {
  const fmtUah = (n: number) => `${Math.round(n).toLocaleString('uk-UA')} ₴`;
  return [
    {
      key: 'creator_share',
      label: 'Частка Creator / Bio-сегменту (S_creator)',
      pessimistic: '5%',
      base: '15%',
      optimistic: '25–30%',
      actual: `${runRate.creatorSharePct.toFixed(1)}%`,
      status: runRate.creatorSharePct >= 15 ? 'green' : runRate.creatorSharePct >= 7 ? 'yellow' : 'red',
    },
    {
      key: 'freq',
      label: 'Частота подій на рік (F)',
      pessimistic: '1.2 / рік',
      base: '2.2 / рік',
      optimistic: '3.5 / рік',
      actual: `${runRate.eventsPerYear.toFixed(2)} / рік`,
      status: runRate.eventsPerYear >= 2.2 ? 'green' : runRate.eventsPerYear >= 1.3 ? 'yellow' : 'red',
    },
    {
      key: 'gifts_per_event',
      label: 'Подарунків на 1 подію (G)',
      pessimistic: '3 шт.',
      base: '5 шт.',
      optimistic: '7 шт.',
      actual: `${runRate.giftsPerEvent.toFixed(1)} шт.`,
      status: runRate.giftsPerEvent >= 5 ? 'green' : runRate.giftsPerEvent >= 3 ? 'yellow' : 'red',
    },
    {
      key: 'aov',
      label: 'Середній чек подарунка (AOV)',
      pessimistic: '1 800 ₴',
      base: '3 200 ₴',
      optimistic: '5 500 ₴',
      actual: fmtUah(runRate.aovUah),
      status: runRate.aovUah >= 3200 ? 'green' : runRate.aovUah >= 1800 ? 'yellow' : 'red',
    },
    {
      key: 'booking_to_click',
      label: 'Конверсія Бронь → Клік на магазин',
      pessimistic: '40%',
      base: '65%',
      optimistic: '80%+',
      actual: `${runRate.bookingToClickCrPct.toFixed(1)}%`,
      status: runRate.bookingToClickCrPct >= 65 ? 'green' : runRate.bookingToClickCrPct >= 45 ? 'yellow' : 'red',
    },
    {
      key: 'm_aff',
      label: 'Частка GMV через Affiliate (M_aff)',
      pessimistic: '25%',
      base: '40%',
      optimistic: '55%',
      actual: `${runRate.affiliateGmvSharePct.toFixed(1)}%`,
      status: runRate.affiliateGmvSharePct >= 40 ? 'green' : runRate.affiliateGmvSharePct >= 25 ? 'yellow' : 'red',
    },
    {
      key: 'cpa_rate',
      label: 'Середня чиста ставка CPA (R_cpa)',
      pessimistic: '3.5%',
      base: '5.5%',
      optimistic: '7.5%',
      actual: `${runRate.avgCpaRatePct.toFixed(2)}%`,
      status: runRate.avgCpaRatePct >= 5.5 ? 'green' : runRate.avgCpaRatePct >= 3.5 ? 'yellow' : 'red',
    },
    {
      key: 'take_rate',
      label: 'Ефективний Take Rate з усього GMV',
      pessimistic: '0.88%',
      base: '2.20%',
      optimistic: '4.13%',
      actual: `${runRate.effectiveTakeRatePct.toFixed(2)}%`,
      status: runRate.effectiveTakeRatePct >= 2.2 ? 'green' : runRate.effectiveTakeRatePct >= 0.88 ? 'yellow' : 'red',
    },
    {
      key: 'k_factor',
      label: 'Віральний K-factor (K)',
      pessimistic: '0.40',
      base: '1.15 – 1.50',
      optimistic: '1.80+',
      actual: runRate.kFactor.toFixed(2),
      status: runRate.kFactor >= 1.15 ? 'green' : runRate.kFactor >= 0.8 ? 'yellow' : 'red',
    },
    {
      key: 'annual_gmv',
      label: 'Загальний GMV (100 власників / рік)',
      pessimistic: '648 000 ₴',
      base: '3 520 000 ₴',
      optimistic: '13 475 000 ₴',
      actual: fmtUah(runRate.annualGmvUah),
      status: runRate.annualGmvUah >= 3_520_000 ? 'green' : runRate.annualGmvUah >= 648_000 ? 'yellow' : 'red',
    },
    {
      key: 'monthly_rev',
      label: '💰 Дохід на МІСЯЦЬ (Етап 1 MVP)',
      pessimistic: '472 ₴ / міс',
      base: '6 453 ₴ / міс',
      optimistic: '46 320 ₴ / міс',
      actual: `${fmtUah(runRate.monthlyRevenueUah)} / міс`,
      status: runRate.monthlyRevenueUah >= 6453 ? 'green' : runRate.monthlyRevenueUah >= 472 ? 'yellow' : 'red',
    },
    {
      key: 'annual_rev',
      label: '💰 Дохід на РІК (Етап 1 MVP)',
      pessimistic: '5 670 ₴ / рік',
      base: '77 440 ₴ / рік',
      optimistic: '555 844 ₴ / рік',
      actual: `${fmtUah(runRate.annualRevenueUah)} / рік`,
      status: runRate.annualRevenueUah >= 77440 ? 'green' : runRate.annualRevenueUah >= 5670 ? 'yellow' : 'red',
    },
    {
      key: 'stage2_potential',
      label: '💎 Потенціал Етапу 2 (Квіти 12% + Гейт 5%)',
      pessimistic: '3 510 ₴ / міс',
      base: '19 067 ₴ / міс',
      optimistic: '72 990 ₴ / міс',
      actual: `${fmtUah(runRate.stage2MonthlyPotentialUah)} / міс`,
      status: runRate.stage2MonthlyPotentialUah >= 19067 ? 'green' : 'yellow',
    },
  ];
}

function buildSimulatedDashboard(period: MetricsPeriod): MetricsDashboardDTO {
  const factor = period === '7d' ? 0.35 : period === '30d' ? 1 : 1.8;

  const runRate100 = {
    creatorSharePct: 18.0,
    eventsPerYear: 2.4,
    giftsPerEvent: 5.2,
    aovUah: 3450,
    bookingToClickCrPct: 68.4,
    affiliateGmvSharePct: 43.2,
    avgCpaRatePct: 5.65,
    effectiveTakeRatePct: 2.44,
    kFactor: 1.24,
    annualGmvUah: 4_305_600,
    monthlyRevenueUah: 8754,
    annualRevenueUah: 105_056,
    stage2MonthlyPotentialUah: 23_322,
  };

  const demoRows: CreatorCohortRowDTO[] = [
    {
      id: 'sim-1',
      instagramHandle: '@alina.luxury.kyiv',
      followersCount: 24500,
      niche: 'Lifestyle / IT-Girl',
      wishlistSlug: 'alina-luxury',
      status: 'validated_gift_received',
      daysSinceInvite: 5,
      bioClicks: 142,
      igOrders: 3,
      bookingsAndJars: 4,
      affiliateClicks: 6,
      gmvUah: 19200,
      notes: 'Топ-кейс: 3 букети півоній + Dyson Airwrap у Банці',
    },
    {
      id: 'sim-2',
      instagramHandle: '@daria.beauty.lviv',
      followersCount: 18900,
      niche: 'Beauty / Makeup',
      wishlistSlug: 'daria-muse',
      status: 'validated_gift_received',
      daysSinceInvite: 6,
      bioClicks: 96,
      igOrders: 2,
      bookingsAndJars: 3,
      affiliateClicks: 5,
      gmvUah: 12450,
    },
    {
      id: 'sim-3',
      instagramHandle: '@valeriia.stream',
      followersCount: 31200,
      niche: 'Streaming / Gaming',
      wishlistSlug: 'lera-gg',
      status: 'validated_gift_received',
      daysSinceInvite: 9,
      bioClicks: 215,
      igOrders: 1,
      bookingsAndJars: 5,
      affiliateClicks: 4,
      gmvUah: 16800,
    },
    {
      id: 'sim-4',
      instagramHandle: '@kateryna.muse',
      followersCount: 12800,
      niche: 'Model / Fashion',
      wishlistSlug: 'katya-rose',
      status: 'placed_in_bio',
      daysSinceInvite: 3,
      bioClicks: 38,
      igOrders: 0,
      bookingsAndJars: 0,
      affiliateClicks: 2,
      gmvUah: 0,
    },
    {
      id: 'sim-5',
      instagramHandle: '@sofiia.fit.ua',
      followersCount: 41000,
      niche: 'Fitness / Pilates',
      wishlistSlug: 'sofiia-fit',
      status: 'showcase_ready',
      daysSinceInvite: 8,
      bioClicks: 0,
      igOrders: 0,
      bookingsAndJars: 0,
      affiliateClicks: 0,
      gmvUah: 0,
    },
  ];

  const healthAlerts = evaluateMetricsHealth({
    bookingToClickCrPct: runRate100.bookingToClickCrPct,
    affiliateGmvSharePct: runRate100.affiliateGmvSharePct,
    unbookedGuestsSaveRatePct: 21.5,
    creatorBioValidated14d: 3, // Підсвітить RULE-03 як реальний робочий тригер!
    kFactor: runRate100.kFactor,
    growthLoopToCreatedCrPct: 9.4,
    aovUah: runRate100.aovUah,
    jarWishlistSharePct: 44,
    igDmOrdersPerMonth: 28, // Підсвітить RULE-06 (OPPORTUNITY)!
  });

  return {
    period,
    isSimulated: true,
    generatedAt: new Date().toISOString(),
    totals: {
      ownersCount: Math.round(100 * factor),
      uniqueGuestsCount: Math.round(840 * factor),
      wishlistViewsCount: Math.round(1420 * factor),
      bookingsCount: Math.round(124 * factor),
      affiliateClicksCount: Math.round(85 * factor),
      jarClicksCount: Math.round(67 * factor),
      igDmCopiesCount: Math.round(28 * factor),
      aiUsesCount: Math.round(54 * factor),
      growthLoopClicksCount: Math.round(39 * factor),
      rawGmvUah: Math.round(427800 * factor),
    },
    runRate100,
    benchmarks: {
      pessimisticMonthlyUah: 472,
      baseMonthlyUah: 6453,
      optimisticMonthlyUah: 46320,
      pessimisticAnnualUah: 5670,
      baseAnnualUah: 77440,
      optimisticAnnualUah: 555844,
      stage2BaseMonthlyUah: 19067,
    },
    matrixRows: buildMatrixRows(runRate100),
    healthAlerts,
    creatorExperiment: {
      targetTotal: 30,
      targetValidated: 6,
      invitedCount: 30,
      showcaseReadyCount: 22,
      placedInBioCount: 11,
      tenPlusVisitsCount: 7,
      validatedCount: 3,
      rows: demoRows,
      topShopHandles: [
        { handle: '@flower.bar.kyiv', count: 11 },
        { handle: '@silk.atelier.ua', count: 7 },
        { handle: '@peony.house.lviv', count: 6 },
        { handle: '@diptyque.boutique.ua', count: 4 },
      ],
    },
  };
}

export async function getMetricsDashboardData(
  period: MetricsPeriod = '30d',
  forceDemoSimulation = false
): Promise<MetricsDashboardDTO> {
  if (forceDemoSimulation) {
    return buildSimulatedDashboard(period);
  }

  try {
    await connectToDatabase();

    const now = new Date();
    const startDate =
      period === '7d'
        ? new Date(now.getTime() - 7 * 86_400_000)
        : period === '30d'
        ? new Date(now.getTime() - 30 * 86_400_000)
        : new Date(0);

    const dateFilter = period === 'all' ? {} : { createdAt: { $gte: startDate } };

    const [events, totalWishlistsCount, cohortDocs] = await Promise.all([
      AnalyticsEvent.find(dateFilter).lean(),
      Wishlist.countDocuments({}),
      CreatorCohort.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    if (events.length === 0 && cohortDocs.length === 0) {
      return buildSimulatedDashboard(period);
    }

    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 30;
    const annualizeFactor = 365 / periodDays;

    const createdEvents = events.filter((e) => e.eventType === 'wishlist_created');
    const viewedEvents = events.filter((e) => e.eventType === 'wishlist_viewed');
    const bookedEvents = events.filter((e) => e.eventType === 'gift_booked');
    const affClickEvents = events.filter((e) => e.eventType === 'affiliate_clicked');
    const jarClickEvents = events.filter((e) => e.eventType === 'jar_clicked');
    const igDmEvents = events.filter((e) => e.eventType === 'instagram_dm_copied');
    const aiEvents = events.filter((e) => e.eventType === 'ai_assistant_used');
    const growthEvents = events.filter((e) => e.eventType === 'growth_loop_clicked');

    const ownersCount = Math.max(totalWishlistsCount, createdEvents.length, 1);
    const uniqueGuestHashes = new Set(
      viewedEvents.map((e) => e.visitorHash).filter(Boolean)
    );
    const uniqueGuestsCount = Math.max(uniqueGuestHashes.size, 1);

    const creatorCreatedCount = createdEvents.filter(
      (e) => e.metadata?.segment === 'creator_bio'
    ).length;
    const creatorSharePct =
      createdEvents.length > 0
        ? (creatorCreatedCount / createdEvents.length) * 100
        : cohortDocs.length > 0
        ? (cohortDocs.length / ownersCount) * 100
        : 0;

    const eventsPerYear =
      (1 - creatorSharePct / 100) * 1.3 + (creatorSharePct / 100) * 8.0;

    const rawGmvUah = bookedEvents.reduce(
      (acc, e) => acc + (Number(e.metadata?.priceUah) || 0),
      0
    );

    const fulfilledCount = Math.max(bookedEvents.length, 1);
    const aovUah = rawGmvUah > 0 ? rawGmvUah / fulfilledCount : 0;

    const activeWishlistsInPeriod = Math.max(
      new Set(events.map((e) => e.wishlistSlug).filter(Boolean)).size,
      1
    );
    const giftsPerEvent = bookedEvents.length / activeWishlistsInPeriod;

    const bookingToClickCrPct =
      bookedEvents.length > 0
        ? Math.min(100, (affClickEvents.length / bookedEvents.length) * 100)
        : 0;

    const affGmvUah = affClickEvents.reduce(
      (acc, e) => acc + (Number(e.metadata?.priceUah) || 0),
      0
    );
    const affiliateGmvSharePct =
      rawGmvUah > 0 ? Math.min(100, (affGmvUah / rawGmvUah) * 100) : 0;

    const avgCpaRatePct =
      affClickEvents.length > 0
        ? (affClickEvents.reduce(
            (acc, e) => acc + (Number(e.metadata?.estimatedCpaRate) || 0.055),
            0
          ) /
            affClickEvents.length) *
          100
        : 5.5;

    const effectiveTakeRatePct =
      (affiliateGmvSharePct / 100) * (avgCpaRatePct / 100) * 100;

    const growthCreatedCount = createdEvents.filter(
      (e) => e.metadata?.fromGrowthLoop
    ).length;
    const guestsPerOwner = uniqueGuestsCount / ownersCount;
    const guestToOwnerCr = growthCreatedCount / uniqueGuestsCount;
    const kFactor = guestsPerOwner * guestToOwnerCr;

    const scale100 = 100 / ownersCount;
    const annualGmvUah = rawGmvUah * scale100 * annualizeFactor;
    const rawAffiliateRevenueUah = affClickEvents.reduce(
      (acc, e) =>
        acc +
        (Number(e.metadata?.priceUah) || 0) *
          (Number(e.metadata?.estimatedCpaRate) || 0.055) *
          0.75,
      0
    );
    const annualRevenueUah = rawAffiliateRevenueUah * scale100 * annualizeFactor;
    const monthlyRevenueUah = annualRevenueUah / 12;
    const stage2MonthlyPotentialUah = (annualGmvUah * 0.065) / 12;

    const runRate100 = {
      creatorSharePct,
      eventsPerYear,
      giftsPerEvent,
      aovUah,
      bookingToClickCrPct,
      affiliateGmvSharePct,
      avgCpaRatePct,
      effectiveTakeRatePct,
      kFactor,
      annualGmvUah,
      monthlyRevenueUah,
      annualRevenueUah,
      stage2MonthlyPotentialUah,
    };

    const cohortRows: CreatorCohortRowDTO[] = cohortDocs.map((doc) => {
      const slug = doc.wishlistSlug;
      const slugEvents = events.filter((e) => e.wishlistSlug === slug);
      const bioClicks = slugEvents.filter(
        (e) => e.eventType === 'wishlist_viewed' && e.metadata?.utmSource === 'ig_bio'
      ).length;
      const igOrders = slugEvents.filter(
        (e) => e.eventType === 'instagram_dm_copied'
      ).length;
      const bookingsAndJars = slugEvents.filter(
        (e) => e.eventType === 'gift_booked' || e.eventType === 'jar_clicked'
      ).length;
      const affiliateClicks = slugEvents.filter(
        (e) => e.eventType === 'affiliate_clicked'
      ).length;
      const gmvUah = slugEvents
        .filter((e) => e.eventType === 'gift_booked')
        .reduce((acc, e) => acc + (Number(e.metadata?.priceUah) || 0), 0);

      const daysSinceInvite = Math.max(
        1,
        Math.ceil((now.getTime() - new Date(doc.invitedAt).getTime()) / 86_400_000)
      );

      return {
        id: String(doc._id),
        instagramHandle: doc.instagramHandle.startsWith('@')
          ? doc.instagramHandle
          : `@${doc.instagramHandle}`,
        followersCount: doc.followersCount,
        niche: doc.niche,
        wishlistSlug: slug,
        status: doc.status,
        daysSinceInvite,
        bioClicks,
        igOrders,
        bookingsAndJars,
        affiliateClicks,
        gmvUah,
        notes: doc.notes,
      };
    });

    const shopCounter = new Map<string, number>();
    for (const ev of igDmEvents) {
      const handle = ev.metadata?.shopHandle;
      if (handle) {
        const clean = handle.startsWith('@') ? handle : `@${handle}`;
        shopCounter.set(clean, (shopCounter.get(clean) ?? 0) + 1);
      }
    }
    const topShopHandles = [...shopCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([handle, count]) => ({ handle, count }));

    const validatedCount = cohortRows.filter(
      (r) => r.status === 'validated_gift_received'
    ).length;

    const healthAlerts = evaluateMetricsHealth({
      bookingToClickCrPct,
      affiliateGmvSharePct,
      unbookedGuestsSaveRatePct:
        uniqueGuestsCount > 0
          ? ((aiEvents.length + jarClickEvents.length) / uniqueGuestsCount) * 100
          : 0,
      creatorBioValidated14d: validatedCount,
      kFactor,
      growthLoopToCreatedCrPct:
        growthEvents.length > 0 ? (growthCreatedCount / growthEvents.length) * 100 : 0,
      aovUah,
      jarWishlistSharePct:
        ownersCount > 0 ? Math.min(100, (jarClickEvents.length / ownersCount) * 100) : 0,
      igDmOrdersPerMonth: Math.round((igDmEvents.length / periodDays) * 30),
    });

    return {
      period,
      isSimulated: false,
      generatedAt: now.toISOString(),
      totals: {
        ownersCount,
        uniqueGuestsCount,
        wishlistViewsCount: viewedEvents.length,
        bookingsCount: bookedEvents.length,
        affiliateClicksCount: affClickEvents.length,
        jarClicksCount: jarClickEvents.length,
        igDmCopiesCount: igDmEvents.length,
        aiUsesCount: aiEvents.length,
        growthLoopClicksCount: growthEvents.length,
        rawGmvUah,
      },
      runRate100,
      benchmarks: {
        pessimisticMonthlyUah: 472,
        baseMonthlyUah: 6453,
        optimisticMonthlyUah: 46320,
        pessimisticAnnualUah: 5670,
        baseAnnualUah: 77440,
        optimisticAnnualUah: 555844,
        stage2BaseMonthlyUah: 19067,
      },
      matrixRows: buildMatrixRows(runRate100),
      healthAlerts,
      creatorExperiment: {
        targetTotal: 30,
        targetValidated: 6,
        invitedCount: cohortRows.length,
        showcaseReadyCount: cohortRows.filter((r) => r.status !== 'invited').length,
        placedInBioCount: cohortRows.filter(
          (r) => r.status === 'placed_in_bio' || r.status === 'validated_gift_received'
        ).length,
        tenPlusVisitsCount: cohortRows.filter((r) => r.bioClicks >= 10).length,
        validatedCount,
        rows: cohortRows,
        topShopHandles,
      },
    };
  } catch (err) {
    console.warn('[Mriyii Analytics] Falling back to simulated dashboard:', err);
    return buildSimulatedDashboard(period);
  }
}
