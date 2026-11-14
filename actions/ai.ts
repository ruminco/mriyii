'use server';

import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import {
  generateGiftIdeas,
  type AiAssistantMode,
  type GeneratedGiftIdea,
} from '@/lib/gemini';
import { buildSearchAffiliateUrl } from '@/lib/affiliate';
import { assertGuestBookingQuota } from '@/actions/booking';
import { markCreatorGiftValidated, trackEvent } from '@/lib/analytics';
import Wishlist from '@/models/Wishlist';
import User from '@/models/User';
import GiftItem from '@/models/GiftItem';

const AskGiftAssistantZodSchema = z.object({
  wishlistSlug: z.string().trim().min(1),
  budgetUah: z.number().min(100, 'Мінімальний бюджет для підбору — 100 грн').max(500_000),
  guestQuery: z.string().trim().max(300).optional(),
  mode: z.enum(['from_wishlist', 'web_search']).default('web_search'),
});

const CommitAiSurpriseGiftZodSchema = z.object({
  wishlistSlug: z.string().trim().min(1),
  title: z.string().trim().min(2).max(200),
  emoji: z.string().trim().max(12).default('✨'),
  description: z.string().trim().max(1000).optional(),
  estimatedPrice: z.number().min(0),
  searchQuery: z.string().trim().min(1).max(200),
  guestName: z.string().trim().min(2).max(80),
  guestEmail: z.string().trim().email(),
  existingBrowserTokens: z.array(z.string().trim()).max(20).optional(),
});

export interface AiGiftRecommendationDTO extends GeneratedGiftIdea {
  affiliateSearchUrl: string;
}

async function resolveClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim() || 'unknown-ip';
    }
    return headerList.get('x-real-ip') || 'unknown-ip';
  } catch {
    return 'server-action-client';
  }
}

/**
 * Server Action ШІ-асистента подарунків для гостей (`askGiftAssistant`).
 * Підтримує два режими:
 * - `'from_wishlist'`: підбирає вільні лоти зі списку іменинника (або пропонує докинути у Монобанку);
 * - `'web_search'`: шукає реальні товари в інтернеті через Gemini Google Search Grounding
 *   з урахуванням прихованої анкети `aiPreferences` (не розкриваючи її текст клієнту).
 * Захищено Rate Limiter-ом (макс. 5 запитів / хвилину з однієї IP-адреси).
 */
export async function askGiftAssistant(
  wishlistSlug: string,
  budgetUah: number,
  guestQuery?: string,
  mode: AiAssistantMode = 'web_search'
): Promise<AiGiftRecommendationDTO[]> {
  const input = AskGiftAssistantZodSchema.parse({
    wishlistSlug,
    budgetUah,
    guestQuery,
    mode,
  });

  const clientIp = await resolveClientIp();
  await connectToDatabase();

  const wishlist = await Wishlist.findOne({ slug: input.wishlistSlug.toLowerCase() }).lean();
  if (!wishlist) {
    throw new Error('Вішліст не знайдено.');
  }

  const [owner, existingItems] = await Promise.all([
    User.findById(wishlist.ownerId).select('gender aiPreferences').lean(),
    GiftItem.find({ wishlistId: wishlist._id, isAiSurprise: { $ne: true } })
      .select('title price description isBooked monoJarUrl jarCurrentAmount jarTargetAmount emoji')
      .lean(),
  ]);

  const existingGiftTitles = existingItems.map((item) => item.title);
  const availableWishlistItems = existingItems
    .filter((item) => !item.isBooked)
    .map((item) => ({
      id: String(item._id),
      title: item.title,
      emoji: item.emoji,
      price: item.price,
      description: item.description,
      hasMonoJar: Boolean(item.monoJarUrl),
      jarCurrentAmount: item.jarCurrentAmount,
      jarTargetAmount: item.jarTargetAmount,
    }));

  const fallbackGender =
    wishlist.themePreset === 'cyber_titanium' ? 'male' : 'female';

  const ideas = await generateGiftIdeas({
    wishlistTitle: wishlist.title,
    budgetUah: input.budgetUah,
    mode: input.mode,
    guestQuery: input.guestQuery,
    ownerGender: owner?.gender ?? fallbackGender,
    aiPreferences: owner?.aiPreferences,
    existingGiftTitles,
    availableWishlistItems,
    clientIdentifier: clientIp,
  });

  const budgetTier: 'up_to_1000' | 'around_1500' | 'vip' =
    input.budgetUah <= 1000 ? 'up_to_1000' : input.budgetUah <= 5000 ? 'around_1500' : 'vip';

  void trackEvent({
    eventType: 'ai_assistant_used',
    wishlistId: String(wishlist._id),
    wishlistSlug: wishlist.slug,
    metadata: {
      budgetTier,
      convertedToSurpriseBooking: false,
    },
  });

  return ideas.map((idea) => ({
    ...idea,
    mode: input.mode,
    affiliateSearchUrl:
      idea.sourceUrl && /^https?:\/\//i.test(idea.sourceUrl)
        ? idea.sourceUrl
        : buildSearchAffiliateUrl(idea.searchQuery || idea.title),
  }));
}

/**
 * Дозволяє гостю зафіксувати обрану ідею від ШІ як «Подарунок-сюрприз» (`isAiSurprise: true`).
 * Інші гості бачитимуть цей слот, щоб не купити те саме, але власник вішліста у Сюрприз-режимі
 * НІКОЛИ не побачить цей лот завдяки фільтру `{ isAiSurprise: { $ne: true } }` у `getWishlistBySlug`.
 * Також застосовується ліміт анти-тролінгу (не більше 2 активних бронювань на гостя у вішлісті).
 */
export async function bookAiSurpriseGift(
  rawInput: z.input<typeof CommitAiSurpriseGiftZodSchema>
): Promise<{ itemId: string; bookingToken: string; affiliateUrl: string }> {
  const input = CommitAiSurpriseGiftZodSchema.parse(rawInput);
  await connectToDatabase();

  const wishlist = await Wishlist.findOne({ slug: input.wishlistSlug.toLowerCase() }).lean();
  if (!wishlist) {
    throw new Error('Вішліст не знайдено.');
  }

  await assertGuestBookingQuota({
    wishlistId: wishlist._id,
    guestEmail: input.guestEmail,
    existingBrowserTokens: input.existingBrowserTokens,
  });

  const bookingToken = crypto.randomBytes(24).toString('hex');
  const affiliateUrl = buildSearchAffiliateUrl(input.searchQuery);

  const surpriseItem = await GiftItem.create({
    wishlistId: wishlist._id,
    title: input.title,
    emoji: input.emoji || '✨',
    description: input.description,
    price: input.estimatedPrice,
    currency: 'UAH',
    affiliateUrl,
    isBooked: true,
    bookedByName: input.guestName,
    bookedByEmail: input.guestEmail.toLowerCase(),
    bookingToken,
    isAiSurprise: true,
  });

  void trackEvent({
    eventType: 'gift_booked',
    wishlistId: String(wishlist._id),
    wishlistSlug: wishlist.slug,
    itemId: String(surpriseItem._id),
    metadata: {
      priceUah: input.estimatedPrice,
      itemType: 'affiliate',
      isAiSurprise: true,
    },
  }).then(() => markCreatorGiftValidated(String(wishlist._id), wishlist.slug));

  return {
    itemId: String(surpriseItem._id),
    bookingToken,
    affiliateUrl,
  };
}
