'use server';

import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { generateGiftIdeas, type GeneratedGiftIdea } from '@/lib/gemini';
import { buildSearchAffiliateUrl } from '@/lib/affiliate';
import { assertGuestBookingQuota } from '@/actions/booking';
import Wishlist from '@/models/Wishlist';
import User from '@/models/User';
import GiftItem from '@/models/GiftItem';

const AskGiftAssistantZodSchema = z.object({
  wishlistSlug: z.string().trim().min(1),
  budgetUah: z.number().min(100, 'Мінімальний бюджет для підбору — 100 грн').max(500_000),
  guestQuery: z.string().trim().max(300).optional(),
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
 * Аналізує стать (`gender`: 'female' | 'male') та приховану анкету `aiPreferences` іменинника
 * (не розкриваючи її текст клієнту), враховує існуючі лоти вішліста та повертає 3 структуровані
 * рекомендації з емодзі та партнерськими посиланнями.
 * Захищено Rate Limiter-ом (макс. 5 запитів / хвилину з однієї IP-адреси).
 */
export async function askGiftAssistant(
  wishlistSlug: string,
  budgetUah: number,
  guestQuery?: string
): Promise<AiGiftRecommendationDTO[]> {
  const input = AskGiftAssistantZodSchema.parse({
    wishlistSlug,
    budgetUah,
    guestQuery,
  });

  const clientIp = await resolveClientIp();
  await connectToDatabase();

  const wishlist = await Wishlist.findOne({ slug: input.wishlistSlug.toLowerCase() }).lean();
  if (!wishlist) {
    throw new Error('Вішліст не знайдено.');
  }

  const [owner, existingItems] = await Promise.all([
    User.findById(wishlist.ownerId).select('gender aiPreferences').lean(),
    GiftItem.find({ wishlistId: wishlist._id }).select('title').lean(),
  ]);

  const existingGiftTitles = existingItems.map((item) => item.title);
  const fallbackGender =
    wishlist.themePreset === 'cyber_titanium' ? 'male' : 'female';

  const ideas = await generateGiftIdeas({
    wishlistTitle: wishlist.title,
    budgetUah: input.budgetUah,
    guestQuery: input.guestQuery,
    ownerGender: owner?.gender ?? fallbackGender,
    aiPreferences: owner?.aiPreferences,
    existingGiftTitles,
    clientIdentifier: clientIp,
  });

  return ideas.map((idea) => ({
    ...idea,
    affiliateSearchUrl: buildSearchAffiliateUrl(idea.searchQuery || idea.title),
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

  return {
    itemId: String(surpriseItem._id),
    bookingToken,
    affiliateUrl,
  };
}
