'use server';

import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { fetchMonoJarStatus, type MonoJarStatus } from '@/lib/monobank';
import { markCreatorGiftValidated, trackEvent } from '@/lib/analytics';
import GiftItem from '@/models/GiftItem';

/**
 * Максимальна кількість активних бронювань на один guestEmail або bookedByFingerprint
 * у межах одного wishlistId (Захист від тролінгу / масового блокування списку).
 */
const MAX_ACTIVE_BOOKINGS_PER_GUEST = 2;

/**
 * Мінімальний інтервал між зверненнями до публічного API Monobank для однієї Банки (60 секунд),
 * щоб уникнути блокування 429 Too Many Requests.
 */
const MONO_JAR_SYNC_COOLDOWN_MS = 60_000;

const BookGiftItemZodSchema = z.object({
  itemId: z.string().trim().min(1, 'Необхідний ID подарунка'),
  guestName: z
    .string()
    .trim()
    .min(2, "Вкажіть ваше ім'я (мінімум 2 символи)")
    .max(80, "Ім'я занадто довге"),
  guestEmail: z.string().trim().email('Вкажіть коректний email для можливості скасування броні'),
  existingBrowserTokens: z.array(z.string().trim()).max(20).optional(),
  clientFingerprint: z.string().trim().max(128).optional(),
});

const CancelBookingZodSchema = z.object({
  itemId: z.string().trim().min(1),
  bookingToken: z.string().trim().min(16, 'Недійсний токен бронювання'),
});

const AttachMonoJarZodSchema = z.object({
  itemId: z.string().trim().min(1),
  jarUrl: z.string().trim().url('Введіть коректне посилання на Банку Monobank'),
});

export interface BookGiftItemResult {
  success: boolean;
  bookingToken: string;
  itemId: string;
}

export interface MonoJarSyncResult extends MonoJarStatus {
  cached: boolean;
  jarLastSyncedAt: string;
  affiliateUrl?: string;
}

/**
 * Генерує SHA-256 відбиток сесії/браузера гостя (`bookedByFingerprint`) для захисту від тролінгу.
 */
export async function computeGuestFingerprint(customSeed?: string): Promise<string> {
  try {
    const headerList = await headers();
    const ip =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headerList.get('x-real-ip') ||
      'unknown-ip';
    const ua = headerList.get('user-agent') || 'unknown-ua';
    const raw = `${ip}|${ua}|${customSeed ?? ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  } catch {
    return crypto
      .createHash('sha256')
      .update(customSeed || 'fallback-fingerprint')
      .digest('hex');
  }
}

/**
 * Перевіряє правило анти-тролінгу: не більше 2 активних бронювань на один guestEmail,
 * bookedByFingerprint або на масив bookingToken з браузера гостя у межах одного wishlistId.
 */
export async function assertGuestBookingQuota(params: {
  wishlistId: unknown;
  guestEmail: string;
  bookedByFingerprint?: string;
  existingBrowserTokens?: string[];
}): Promise<void> {
  const normalizedEmail = params.guestEmail.trim().toLowerCase();
  const validTokens = (params.existingBrowserTokens ?? []).filter((t) => t.length >= 16);

  const orConditions: Array<Record<string, unknown>> = [{ bookedByEmail: normalizedEmail }];
  if (params.bookedByFingerprint) {
    orConditions.push({ bookedByFingerprint: params.bookedByFingerprint });
  }
  if (validTokens.length > 0) {
    orConditions.push({ bookingToken: { $in: validTokens } });
  }

  const activeBookingsCount = await GiftItem.countDocuments({
    wishlistId: params.wishlistId,
    isBooked: true,
    $or: orConditions,
  });

  if (activeBookingsCount >= MAX_ACTIVE_BOOKINGS_PER_GUEST) {
    throw new Error(
      `Один гість може забронювати не більше ${MAX_ACTIVE_BOOKINGS_PER_GUEST} подарунків в одному вішлісті. Щоб обрати інший лот, спочатку скасуйте попереднє бронювання.`
    );
  }
}

/**
 * ПРАВИЛО 2 [Tech Lead]: Атомарне бронювання подарунка гостем + Анти-тролінг (макс. 2 броні на гостя за email або fingerprint).
 */
export async function bookGiftItem(
  itemId: string,
  guestName: string,
  guestEmail: string,
  existingBrowserTokens?: string[],
  clientFingerprint?: string
): Promise<BookGiftItemResult> {
  const input = BookGiftItemZodSchema.parse({
    itemId,
    guestName,
    guestEmail,
    existingBrowserTokens,
    clientFingerprint,
  });
  await connectToDatabase();

  const targetItem = await GiftItem.findById(input.itemId)
    .select('wishlistId isBooked')
    .lean();

  if (!targetItem) {
    throw new Error('Подарунок не знайдено.');
  }

  if (targetItem.isBooked) {
    throw new Error(
      'Цей подарунок щойно забронював інший гість! Будь ласка, оберіть іншу позицію у списку.'
    );
  }

  const fingerprint = await computeGuestFingerprint(input.clientFingerprint);

  // Перевірка ліміту анти-тролінгу (не більше 2 активних бронювань у цьому вішлісті)
  await assertGuestBookingQuota({
    wishlistId: targetItem.wishlistId,
    guestEmail: input.guestEmail,
    bookedByFingerprint: fingerprint,
    existingBrowserTokens: input.existingBrowserTokens,
  });

  const bookingToken = crypto.randomBytes(24).toString('hex');

  const updatedItem = await GiftItem.findOneAndUpdate(
    { _id: input.itemId, isBooked: false },
    {
      $set: {
        isBooked: true,
        bookedByName: input.guestName,
        bookedByEmail: input.guestEmail.toLowerCase(),
        bookingToken,
        bookedByFingerprint: fingerprint,
      },
    },
    { new: true }
  ).lean();

  if (!updatedItem) {
    throw new Error(
      'Цей подарунок щойно забронював інший гість! Будь ласка, оберіть іншу позицію у списку.'
    );
  }

  const itemType = updatedItem.instagramHandle
    ? 'instagram_shop'
    : updatedItem.affiliateUrl
    ? 'affiliate'
    : 'regular';

  void trackEvent({
    eventType: 'gift_booked',
    wishlistId: String(updatedItem.wishlistId),
    itemId: String(updatedItem._id),
    visitorHash: fingerprint,
    metadata: {
      priceUah: updatedItem.price ?? 0,
      itemType,
      isAiSurprise: Boolean(updatedItem.isAiSurprise),
    },
  }).then(() => markCreatorGiftValidated(String(updatedItem.wishlistId)));

  return {
    success: true,
    bookingToken,
    itemId: String(updatedItem._id),
  };
}

/**
 * Скасування бронювання подарунка за збереженим `bookingToken` (з localStorage/cookies) без реєстрації.
 */
export async function cancelGiftBooking(
  itemId: string,
  bookingToken: string
): Promise<{ success: boolean }> {
  const input = CancelBookingZodSchema.parse({ itemId, bookingToken });
  await connectToDatabase();

  const unbookedItem = await GiftItem.findOneAndUpdate(
    {
      _id: input.itemId,
      isBooked: true,
      bookingToken: input.bookingToken,
    },
    {
      $set: {
        isBooked: false,
      },
      $unset: {
        bookedByName: 1,
        bookedByEmail: 1,
        bookingToken: 1,
        bookedByFingerprint: 1,
      },
    },
    { new: true }
  ).lean();

  if (!unbookedItem) {
    throw new Error('Не вдалося скасувати бронювання: невірний токен або подарунок уже вільний.');
  }

  return { success: true };
}

/**
 * Прив'язує «Банку» Monobank до дорогого лота для спільного збору коштів та виконує первинну синхронізацію балансу.
 */
export async function attachMonoJar(
  itemId: string,
  jarUrl: string
): Promise<MonoJarSyncResult> {
  const input = AttachMonoJarZodSchema.parse({ itemId, jarUrl });
  await connectToDatabase();

  const existingItem = await GiftItem.findById(input.itemId)
    .select('price jarTargetAmount isBooked affiliateUrl originalUrl')
    .lean();

  if (!existingItem) {
    throw new Error('Подарунок не знайдено.');
  }

  const fallbackTarget = existingItem.jarTargetAmount ?? existingItem.price;
  const jarStatus = await fetchMonoJarStatus(input.jarUrl, fallbackTarget);
  const now = new Date();

  await GiftItem.findByIdAndUpdate(input.itemId, {
    $set: {
      monoJarUrl: jarStatus.monoJarUrl,
      monoJarId: jarStatus.monoJarId,
      jarCurrentAmount: jarStatus.jarCurrentAmount,
      jarLastSyncedAt: now,
      ...(jarStatus.jarTargetAmount ? { jarTargetAmount: jarStatus.jarTargetAmount } : {}),
      ...(jarStatus.isGoalReached ? { isBooked: true } : {}),
    },
  });

  return {
    ...jarStatus,
    cached: false,
    jarLastSyncedAt: now.toISOString(),
    affiliateUrl: existingItem.affiliateUrl ?? existingItem.originalUrl,
  };
}

/**
 * Оновлює поточний баланс прив'язаної Банки Monobank із обов'язковим 60-секундним кешуванням (`jarLastSyncedAt`).
 */
export async function syncMonoJarProgress(itemId: string): Promise<MonoJarSyncResult> {
  const cleanItemId = z.string().trim().min(1).parse(itemId);
  await connectToDatabase();

  const item = await GiftItem.findById(cleanItemId)
    .select(
      'monoJarUrl monoJarId jarCurrentAmount jarTargetAmount jarLastSyncedAt price isBooked affiliateUrl originalUrl'
    )
    .lean();

  if (!item || !item.monoJarUrl || !item.monoJarId) {
    throw new Error('До цього подарунка ще не прив’язано Банку Monobank.');
  }

  const now = new Date();
  const targetAmount = item.jarTargetAmount ?? item.price;

  if (item.jarLastSyncedAt) {
    const elapsedMs = now.getTime() - new Date(item.jarLastSyncedAt).getTime();
    if (elapsedMs < MONO_JAR_SYNC_COOLDOWN_MS) {
      const currentAmount = item.jarCurrentAmount ?? 0;
      const isGoalReached =
        typeof targetAmount === 'number' && targetAmount > 0 && currentAmount >= targetAmount;

      return {
        monoJarUrl: item.monoJarUrl,
        monoJarId: item.monoJarId,
        jarCurrentAmount: currentAmount,
        jarTargetAmount: targetAmount,
        currency: 'UAH',
        isGoalReached,
        cached: true,
        jarLastSyncedAt: new Date(item.jarLastSyncedAt).toISOString(),
        affiliateUrl: item.affiliateUrl ?? item.originalUrl,
      };
    }
  }

  const jarStatus = await fetchMonoJarStatus(item.monoJarUrl, targetAmount);

  await GiftItem.findByIdAndUpdate(cleanItemId, {
    $set: {
      jarCurrentAmount: jarStatus.jarCurrentAmount,
      jarLastSyncedAt: now,
      ...(jarStatus.jarTargetAmount ? { jarTargetAmount: jarStatus.jarTargetAmount } : {}),
      ...(jarStatus.isGoalReached ? { isBooked: true } : {}),
    },
  });

  return {
    ...jarStatus,
    cached: false,
    jarLastSyncedAt: now.toISOString(),
    affiliateUrl: item.affiliateUrl ?? item.originalUrl,
  };
}
