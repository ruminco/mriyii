'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import {
  getMetricsDashboardData,
  hashVisitor,
  markCreatorGiftValidated,
  trackEvent,
  type MetricsDashboardDTO,
  type MetricsPeriod,
} from '@/lib/analytics';
import CreatorCohort, { type CreatorCohortStatus } from '@/models/CreatorCohort';
import Wishlist from '@/models/Wishlist';

const ClientInteractionZodSchema = z.object({
  eventType: z.enum([
    'jar_clicked',
    'instagram_dm_copied',
    'growth_loop_clicked',
    'gift_purchased_elsewhere',
  ]),
  wishlistId: z.string().trim().optional(),
  wishlistSlug: z.string().trim().optional(),
  itemId: z.string().trim().optional(),
  priceUah: z.number().min(0).optional(),
  jarGoalUah: z.number().min(0).optional(),
  jarCurrentUah: z.number().min(0).optional(),
  shopHandle: z.string().trim().max(60).optional(),
  isFlowerPreferenceCard: z.boolean().optional(),
  sourceWishlistId: z.string().trim().optional(),
});

const AddCreatorZodSchema = z.object({
  instagramHandle: z.string().trim().min(2, 'Вкажіть Instagram @handle').max(60),
  followersCount: z.number().min(0).max(50_000_000).default(10000),
  niche: z.string().trim().min(2).max(80).default('Lifestyle / IT-Girl'),
  wishlistSlug: z.string().trim().min(2, 'Вкажіть slug вішліста').max(80),
  status: z
    .enum([
      'invited',
      'showcase_ready',
      'placed_in_bio',
      'validated_gift_received',
      'churned_14d',
    ])
    .default('showcase_ready'),
  notes: z.string().trim().max(500).optional(),
});

async function getRequestVisitorHash(): Promise<string> {
  try {
    const headerList = await headers();
    const ip =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headerList.get('x-real-ip') ||
      'unknown-ip';
    const ua = headerList.get('user-agent') || 'unknown-ua';
    return hashVisitor(ip, ua);
  } catch {
    return hashVisitor('server-action', 'unknown');
  }
}

/**
 * Легкий non-blocking Server Action для трекінгу клієнтських взаємодій:
 * `jar_clicked`, `instagram_dm_copied`, `growth_loop_clicked`.
 */
export async function trackClientInteraction(
  rawInput: z.input<typeof ClientInteractionZodSchema>
): Promise<{ ok: boolean }> {
  try {
    const input = ClientInteractionZodSchema.parse(rawInput);
    const visitorHash = await getRequestVisitorHash();

    await trackEvent({
      eventType: input.eventType,
      wishlistId: input.wishlistId,
      wishlistSlug: input.wishlistSlug,
      itemId: input.itemId,
      visitorHash,
      metadata: {
        priceUah: input.priceUah,
        jarGoalUah: input.jarGoalUah,
        jarCurrentUah: input.jarCurrentUah,
        shopHandle: input.shopHandle?.replace(/^@+/, ''),
        isFlowerPreferenceCard: input.isFlowerPreferenceCard,
        sourceWishlistId: input.sourceWishlistId,
      },
    });

    if (input.eventType === 'instagram_dm_copied' || input.eventType === 'jar_clicked') {
      await markCreatorGiftValidated(input.wishlistId, input.wishlistSlug);
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getMetricsDashboardAction(
  period: MetricsPeriod = '30d',
  forceDemoSimulation = false
): Promise<MetricsDashboardDTO> {
  return getMetricsDashboardData(period, forceDemoSimulation);
}

export async function addCreatorToCohortAction(
  rawInput: z.input<typeof AddCreatorZodSchema>
): Promise<{ success: boolean; id: string }> {
  const input = AddCreatorZodSchema.parse(rawInput);
  await connectToDatabase();

  const normalizedHandle = input.instagramHandle.startsWith('@')
    ? input.instagramHandle.toLowerCase()
    : `@${input.instagramHandle.toLowerCase()}`;
  const cleanSlug = input.wishlistSlug.trim().toLowerCase();

  const wishlist = await Wishlist.findOne({ slug: cleanSlug }).select('_id').lean();

  const doc = await CreatorCohort.findOneAndUpdate(
    { instagramHandle: normalizedHandle },
    {
      $set: {
        followersCount: input.followersCount,
        niche: input.niche,
        wishlistSlug: cleanSlug,
        ...(wishlist ? { wishlistId: wishlist._id } : {}),
        status: input.status,
        ...(input.status === 'placed_in_bio' ? { placedInBioAt: new Date() } : {}),
        ...(input.status === 'validated_gift_received' ? { firstGiftAt: new Date() } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
      },
      $setOnInsert: {
        instagramHandle: normalizedHandle,
        invitedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return { success: true, id: String(doc._id) };
}

export async function updateCreatorStatusAction(
  creatorId: string,
  status: CreatorCohortStatus
): Promise<{ success: boolean }> {
  await connectToDatabase();
  await CreatorCohort.findByIdAndUpdate(creatorId, {
    $set: {
      status,
      ...(status === 'placed_in_bio' ? { placedInBioAt: new Date() } : {}),
      ...(status === 'validated_gift_received' ? { firstGiftAt: new Date() } : {}),
    },
  });
  return { success: true };
}
