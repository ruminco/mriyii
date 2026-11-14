'use server';

import crypto from 'node:crypto';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';
import { parseProductUrl, type ParsedProductResult } from '@/lib/parser';
import { buildAffiliateUrl } from '@/lib/affiliate';
import User, {
  resolveThemePresetByGender,
  type IAiPreferences,
  type ThemePreset,
  type UserGender,
} from '@/models/User';
import Wishlist from '@/models/Wishlist';
import GiftItem, { SURPRISE_MODE_EXCLUDED_FIELDS } from '@/models/GiftItem';
import { trackEvent } from '@/lib/analytics';

// ==========================================
// 1. DTO Типи (Суворе розмежування Сюрприз-режиму)
// ==========================================

/**
 * Безпечний DTO подарунка для ВЛАСНИКА у Сюрприз-режимі.
 * Жодних полів bookedByName, bookedByEmail, bookingToken, bookedByFingerprint, jarCurrentAmount, jarLastSyncedAt!
 */
export interface OwnerGiftItemDTO {
  id: string;
  wishlistId: string;
  title: string;
  emoji: string;
  description?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  originalUrl?: string;
  affiliateUrl?: string;
  instagramHandle?: string;
  isBooked: boolean;
  hasMonoJar: boolean;
  jarTargetAmount?: number;
  createdAt: string;
}

/**
 * Повний DTO подарунка для ГОСТЯ (без bookingToken, bookedByEmail та bookedByFingerprint у публічній видачі!).
 */
export interface GuestGiftItemDTO {
  id: string;
  wishlistId: string;
  title: string;
  emoji: string;
  description?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  originalUrl?: string;
  affiliateUrl?: string;
  instagramHandle?: string;
  isBooked: boolean;
  bookedByName?: string;
  monoJarUrl?: string;
  monoJarId?: string;
  jarTargetAmount?: number;
  jarCurrentAmount?: number;
  jarLastSyncedAt?: string;
  isAiSurprise: boolean;
  createdAt: string;
}

export interface WishlistViewDTO {
  id: string;
  slug: string;
  title: string;
  themePreset: ThemePreset;
  flowerAndGiftNotes?: string;
  eventDate?: string;
  isSurpriseActive: boolean;
  isOwnerViewer: boolean;
  ownerName?: string;
  ownerAvatar?: string;
  ownerInstagramHandle?: string;
  ownerGender?: UserGender;
  items: OwnerGiftItemDTO[] | GuestGiftItemDTO[];
}

// ==========================================
// 2. Схеми валідації Zod
// ==========================================

const GenderZodEnum = z.enum(['female', 'male']);
const ThemePresetZodEnum = z.enum(['rose_luxury', 'cyber_titanium']);

const AiPreferencesZodSchema = z.object({
  hobbies: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  flowerPreferences: z.string().trim().max(300).optional(),
  clothingSize: z.string().trim().max(40).optional(),
  shoeSize: z.string().trim().max(40).optional(),
  antiGifts: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  notes: z.string().trim().max(500).optional(),
});

const CreateWishlistZodSchema = z.object({
  ownerId: z.string().trim().min(1, 'Необхідний ідентифікатор власника'),
  title: z
    .string()
    .trim()
    .min(2, 'Назва вішліста має містити щонайменше 2 символи')
    .max(140, 'Назва вішліста занадто довга'),
  themePreset: ThemePresetZodEnum.optional(),
  flowerAndGiftNotes: z.string().trim().max(600).optional(),
  eventDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  isSurpriseActive: z.boolean().default(true),
  aiPreferences: AiPreferencesZodSchema.optional(),
});

const CreateGiftItemZodSchema = z.object({
  wishlistId: z.string().trim().min(1),
  ownerId: z.string().trim().min(1),
  title: z.string().trim().min(1, 'Вкажіть назву подарунка').max(200),
  emoji: z.string().trim().max(12).default('✨'),
  description: z.string().trim().max(1000).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().trim().length(3).default('UAH'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  originalUrl: z.string().url().optional().or(z.literal('')),
  instagramHandle: z.string().trim().max(40).optional(),
});

const DraftItemMigrationZodSchema = z.object({
  title: z.string().trim().min(1).max(200),
  emoji: z.string().trim().max(12).default('✨'),
  description: z.string().trim().max(1000).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().trim().length(3).default('UAH'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  originalUrl: z.string().url().optional().or(z.literal('')),
  instagramHandle: z.string().trim().max(40).optional(),
});

const MigrateDraftWishlistZodSchema = z.object({
  idToken: z.string().trim().min(10),
  gender: GenderZodEnum,
  wishlistTitle: z.string().trim().min(2).max(140).default('My Birthday Wishlist ✨'),
  flowerAndGiftNotes: z.string().trim().max(600).optional(),
  eventDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  draftItems: z.array(DraftItemMigrationZodSchema).max(30).default([]),
});

// ==========================================
// 3. Допоміжна генерація унікального slug
// ==========================================

const UKR_TO_LATIN_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh',
  з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
};

function generateSlugBase(title: string): string {
  const transliterated = title
    .toLowerCase()
    .split('')
    .map((ch) => (ch in UKR_TO_LATIN_MAP ? UKR_TO_LATIN_MAP[ch] : ch))
    .join('');

  const cleaned = transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return cleaned || 'my-wishlist';
}

// ==========================================
// 4. Server Actions
// ==========================================

export interface SyncedUserDTO {
  id: string;
  firebaseUid: string;
  email: string;
  name?: string;
  image?: string;
  instagramHandle?: string;
  gender: UserGender;
  themePreset: ThemePreset;
  aiPreferences: IAiPreferences;
}

/**
 * Перевіряє Firebase ID Token через firebase-admin та створює або оновлює профіль User у MongoDB.
 */
export async function syncUserWithMongo(
  idToken: string,
  gender?: UserGender,
  instagramHandle?: string
): Promise<SyncedUserDTO> {
  const verified = await verifyFirebaseIdToken(idToken);
  const validatedGender = gender ? GenderZodEnum.parse(gender) : undefined;
  const resolvedPreset = validatedGender
    ? resolveThemePresetByGender(validatedGender)
    : undefined;
  const cleanIg = instagramHandle?.trim().replace(/^@/, '') || undefined;

  await connectToDatabase();

  const userDoc = await User.findOneAndUpdate(
    { firebaseUid: verified.uid },
    {
      $set: {
        email: verified.email,
        ...(verified.name ? { name: verified.name } : {}),
        ...(verified.picture ? { image: verified.picture } : {}),
        ...(cleanIg ? { instagramHandle: cleanIg } : {}),
        ...(validatedGender ? { gender: validatedGender } : {}),
        ...(resolvedPreset ? { themePreset: resolvedPreset } : {}),
      },
      $setOnInsert: {
        firebaseUid: verified.uid,
        ...(!validatedGender ? { gender: 'female' as UserGender } : {}),
        ...(!resolvedPreset ? { themePreset: 'rose_luxury' as ThemePreset } : {}),
        aiPreferences: { hobbies: [], antiGifts: [] },
      },
    },
    { upsert: true, new: true }
  ).lean();

  if (!userDoc) {
    throw new Error('Не вдалося синхронізувати профіль користувача з базою даних.');
  }

  return {
    id: String(userDoc._id),
    firebaseUid: userDoc.firebaseUid,
    email: userDoc.email,
    name: userDoc.name,
    image: userDoc.image,
    instagramHandle: userDoc.instagramHandle,
    gender: userDoc.gender,
    themePreset: userDoc.themePreset,
    aiPreferences: userDoc.aiPreferences,
  };
}

/**
 * Підтримка Delayed Auth (Відкладеної реєстрації з лендінгу `/`).
 */
export async function migrateDraftWishlistOnAuth(
  rawInput: z.input<typeof MigrateDraftWishlistZodSchema>
): Promise<{ user: SyncedUserDTO; wishlistId: string; slug: string; themePreset: ThemePreset }> {
  const input = MigrateDraftWishlistZodSchema.parse(rawInput);
  const syncedUser = await syncUserWithMongo(input.idToken, input.gender);

  const createdWishlist = await createWishlist({
    ownerId: syncedUser.id,
    title: input.wishlistTitle,
    themePreset: syncedUser.themePreset,
    flowerAndGiftNotes: input.flowerAndGiftNotes,
    eventDate: input.eventDate,
    isSurpriseActive: true,
  });

  if (input.draftItems.length > 0) {
    const docsToInsert = input.draftItems.map((item) => {
      const cleanOriginalUrl = item.originalUrl?.trim() || undefined;
      const affiliateUrl = cleanOriginalUrl
        ? buildAffiliateUrl(cleanOriginalUrl).affiliateUrl
        : undefined;

      return {
        wishlistId: createdWishlist.wishlistId,
        title: item.title,
        emoji: item.emoji || '✨',
        description: item.description,
        price: item.price,
        currency: 'UAH',
        imageUrl: item.imageUrl?.trim() || undefined,
        originalUrl: cleanOriginalUrl,
        affiliateUrl,
        instagramHandle: item.instagramHandle?.replace(/^@/, '') || undefined,
        isBooked: false,
        isAiSurprise: false,
      };
    });

    await GiftItem.insertMany(docsToInsert);
  }

  return {
    user: syncedUser,
    wishlistId: createdWishlist.wishlistId,
    slug: createdWishlist.slug,
    themePreset: createdWishlist.themePreset,
  };
}

/**
 * Оновлює анкету інтересів для ШІ-асистента (aiPreferences), flowerPreferences та instagramHandle власника.
 */
export async function updateUserAiPreferences(
  userId: string,
  preferences: z.infer<typeof AiPreferencesZodSchema>,
  gender?: UserGender,
  instagramHandle?: string
): Promise<{
  aiPreferences: IAiPreferences;
  gender: UserGender;
  themePreset: ThemePreset;
  instagramHandle?: string;
}> {
  const validatedPrefs = AiPreferencesZodSchema.parse(preferences);
  const validatedGender = gender ? GenderZodEnum.parse(gender) : undefined;
  const resolvedTheme = validatedGender
    ? resolveThemePresetByGender(validatedGender)
    : undefined;
  const cleanIg = instagramHandle?.trim().replace(/^@/, '');

  await connectToDatabase();

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        aiPreferences: validatedPrefs,
        ...(validatedGender ? { gender: validatedGender } : {}),
        ...(resolvedTheme ? { themePreset: resolvedTheme } : {}),
        ...(cleanIg !== undefined ? { instagramHandle: cleanIg } : {}),
      },
    },
    { new: true }
  ).lean();

  if (!updated) {
    throw new Error('Користувача не знайдено.');
  }

  return {
    aiPreferences: updated.aiPreferences,
    gender: updated.gender,
    themePreset: updated.themePreset,
    instagramHandle: updated.instagramHandle,
  };
}

/**
 * Створює новий вішліст із підтримкою `flowerAndGiftNotes` (без домашніх адрес).
 */
export async function createWishlist(
  rawInput: z.input<typeof CreateWishlistZodSchema>
): Promise<{ wishlistId: string; slug: string; themePreset: ThemePreset }> {
  const input = CreateWishlistZodSchema.parse(rawInput);
  await connectToDatabase();

  const owner = await User.findById(input.ownerId).select('themePreset gender').lean();
  const effectiveThemePreset: ThemePreset =
    input.themePreset ??
    owner?.themePreset ??
    resolveThemePresetByGender(owner?.gender);

  if (input.aiPreferences) {
    await User.findByIdAndUpdate(input.ownerId, {
      $set: { aiPreferences: input.aiPreferences },
    });
  }

  const baseSlug = generateSlugBase(input.title);
  const shortHash = crypto.randomBytes(3).toString('hex');
  const slug = `${baseSlug}-${shortHash}`;

  const created = await Wishlist.create({
    ownerId: input.ownerId,
    slug,
    title: input.title,
    themePreset: effectiveThemePreset,
    flowerAndGiftNotes: input.flowerAndGiftNotes,
    eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
    isSurpriseActive: input.isSurpriseActive,
  });

  void trackEvent({
    eventType: 'wishlist_created',
    wishlistId: String(created._id),
    wishlistSlug: created.slug,
    metadata: {
      segment: 'mass_b2c',
      themePreset: created.themePreset,
      fromGrowthLoop: false,
    },
  });

  return {
    wishlistId: String(created._id),
    slug: created.slug,
    themePreset: created.themePreset,
  };
}

/**
 * Server Action для безпечного парсингу товару за посиланням (OpenGraph + Anti-SSRF + Gemini Fallback + Affiliate + Instagram @shop).
 */
export async function parseProductUrlAction(url: string): Promise<ParsedProductResult> {
  const validatedUrl = z.string().url('Введіть коректне посилання на товар').parse(url.trim());
  return parseProductUrl(validatedUrl);
}

/**
 * Додає новий бажаний подарунок до вішліста (іменинником).
 * Повертає виключно безпечний OwnerGiftItemDTO.
 */
export async function addGiftItem(
  rawInput: z.input<typeof CreateGiftItemZodSchema>
): Promise<OwnerGiftItemDTO> {
  const input = CreateGiftItemZodSchema.parse(rawInput);
  await connectToDatabase();

  const wishlist = await Wishlist.findOne({
    _id: input.wishlistId,
    ownerId: input.ownerId,
  }).lean();

  if (!wishlist) {
    throw new Error('Вішліст не знайдено або у вас немає прав на його редагування.');
  }

  const cleanOriginalUrl = input.originalUrl?.trim() || undefined;
  const affiliateUrl = cleanOriginalUrl
    ? buildAffiliateUrl(cleanOriginalUrl).affiliateUrl
    : undefined;
  const cleanIgShop = input.instagramHandle?.trim().replace(/^@/, '') || undefined;

  const createdItem = await GiftItem.create({
    wishlistId: wishlist._id,
    title: input.title,
    emoji: input.emoji || '✨',
    description: input.description,
    price: input.price,
    currency: 'UAH',
    imageUrl: input.imageUrl?.trim() || undefined,
    originalUrl: cleanOriginalUrl,
    affiliateUrl,
    instagramHandle: cleanIgShop,
    isBooked: false,
    isAiSurprise: false,
  });

  return {
    id: String(createdItem._id),
    wishlistId: String(createdItem.wishlistId),
    title: createdItem.title,
    emoji: createdItem.emoji || '✨',
    description: createdItem.description,
    price: createdItem.price,
    currency: createdItem.currency,
    imageUrl: createdItem.imageUrl,
    originalUrl: createdItem.originalUrl,
    affiliateUrl: createdItem.affiliateUrl,
    instagramHandle: createdItem.instagramHandle,
    isBooked: createdItem.isBooked,
    hasMonoJar: Boolean(createdItem.monoJarUrl),
    jarTargetAmount: createdItem.jarTargetAmount,
    createdAt: createdItem.createdAt.toISOString(),
  };
}

/**
 * Видаляє подарунок із вішліста (доступно лише власнику вішліста).
 */
export async function deleteGiftItem(
  itemId: string,
  ownerId: string
): Promise<{ success: boolean }> {
  await connectToDatabase();

  const item = await GiftItem.findById(itemId).select('wishlistId').lean();
  if (!item) {
    throw new Error('Подарунок не знайдено.');
  }

  const wishlist = await Wishlist.findOne({
    _id: item.wishlistId,
    ownerId,
  }).lean();

  if (!wishlist) {
    throw new Error('Недостатньо прав для видалення цього подарунка.');
  }

  await GiftItem.deleteOne({ _id: itemId });
  return { success: true };
}

/**
 * Отримує вішліст за slug із СУВОРИМ ДОТРИМАННЯМ ПРАВИЛА 1 (Сюрприз-режим / Privacy Guard).
 *
 * Якщо viewerUserId збігається з wishlist.ownerId ТА isSurpriseActive === true:
 * Сервер суворо вирізає поля: bookedByName, bookedByEmail, bookingToken, bookedByFingerprint,
 * jarCurrentAmount, jarLastSyncedAt, а також усі документи з isAiSurprise: true.
 */
export async function getWishlistBySlug(
  slug: string,
  viewerUserId?: string
): Promise<WishlistViewDTO | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  await connectToDatabase();

  const wishlist = await Wishlist.findOne({ slug: cleanSlug }).lean();
  if (!wishlist) {
    return null;
  }

  const owner = await User.findById(wishlist.ownerId)
    .select('name image instagramHandle gender themePreset')
    .lean();

  const resolvedThemePreset: ThemePreset =
    wishlist.themePreset ?? owner?.themePreset ?? 'rose_luxury';

  const isOwnerViewer = Boolean(
    viewerUserId && String(wishlist.ownerId) === String(viewerUserId)
  );
  const enforceSurprisePrivacy = isOwnerViewer && wishlist.isSurpriseActive;

  if (enforceSurprisePrivacy) {
    // ПРАВИЛО 1 [Tech Lead]: Сувора фільтрація на рівні запиту Mongoose для власника
    const ownerRawItems = await GiftItem.find({
      wishlistId: wishlist._id,
      isAiSurprise: { $ne: true },
    })
      .select(SURPRISE_MODE_EXCLUDED_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    const ownerItemsDto: OwnerGiftItemDTO[] = ownerRawItems.map((item) => ({
      id: String(item._id),
      wishlistId: String(item.wishlistId),
      title: item.title,
      emoji: item.emoji || '✨',
      description: item.description,
      price: item.price,
      currency: item.currency,
      imageUrl: item.imageUrl,
      originalUrl: item.originalUrl,
      affiliateUrl: item.affiliateUrl,
      instagramHandle: item.instagramHandle,
      isBooked: Boolean(item.isBooked),
      hasMonoJar: Boolean(item.monoJarUrl),
      jarTargetAmount: item.jarTargetAmount,
      createdAt: new Date(item.createdAt).toISOString(),
    }));

    return {
      id: String(wishlist._id),
      slug: wishlist.slug,
      title: wishlist.title,
      themePreset: resolvedThemePreset,
      flowerAndGiftNotes: wishlist.flowerAndGiftNotes,
      eventDate: wishlist.eventDate ? new Date(wishlist.eventDate).toISOString() : undefined,
      isSurpriseActive: wishlist.isSurpriseActive,
      isOwnerViewer: true,
      ownerName: owner?.name,
      ownerAvatar: owner?.image,
      ownerInstagramHandle: owner?.instagramHandle,
      ownerGender: owner?.gender,
      items: ownerItemsDto,
    };
  }

  // Вибірка для Гостя (ніколи не віддаємо bookingToken, bookedByEmail та bookedByFingerprint!)
  const guestRawItems = await GiftItem.find({
    wishlistId: wishlist._id,
  })
    .select('-bookingToken -bookedByEmail -bookedByFingerprint')
    .sort({ createdAt: -1 })
    .lean();

  const guestItemsDto: GuestGiftItemDTO[] = guestRawItems.map((item) => ({
    id: String(item._id),
    wishlistId: String(item.wishlistId),
    title: item.title,
    emoji: item.emoji || '✨',
    description: item.description,
    price: item.price,
    currency: item.currency,
    imageUrl: item.imageUrl,
    originalUrl: item.originalUrl,
    affiliateUrl: item.affiliateUrl,
    instagramHandle: item.instagramHandle,
    isBooked: Boolean(item.isBooked),
    bookedByName: item.bookedByName,
    monoJarUrl: item.monoJarUrl,
    monoJarId: item.monoJarId,
    jarTargetAmount: item.jarTargetAmount,
    jarCurrentAmount: item.jarCurrentAmount ?? 0,
    jarLastSyncedAt: item.jarLastSyncedAt
      ? new Date(item.jarLastSyncedAt).toISOString()
      : undefined,
    isAiSurprise: Boolean(item.isAiSurprise),
    createdAt: new Date(item.createdAt).toISOString(),
  }));

  return {
    id: String(wishlist._id),
    slug: wishlist.slug,
    title: wishlist.title,
    themePreset: resolvedThemePreset,
    flowerAndGiftNotes: wishlist.flowerAndGiftNotes,
    eventDate: wishlist.eventDate ? new Date(wishlist.eventDate).toISOString() : undefined,
    isSurpriseActive: wishlist.isSurpriseActive,
    isOwnerViewer,
    ownerName: owner?.name,
    ownerAvatar: owner?.image,
    ownerInstagramHandle: owner?.instagramHandle,
    ownerGender: owner?.gender,
    items: guestItemsDto,
  };
}
