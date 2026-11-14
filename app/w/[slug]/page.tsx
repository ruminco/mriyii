import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getWishlistBySlug, type GuestGiftItemDTO } from '@/actions/wishlist';
import { DEMO_WISHLISTS } from '@/lib/theme-data';
import { hashVisitor, recordBioVisitDetection, trackEvent } from '@/lib/analytics';
import { GuestWishlistClient } from '@/components/GuestWishlistClient';
import type { UnifiedGiftCardItem } from '@/components/SmokedGiftCard';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function resolveWishlistData(slug: string) {
  const cleanSlug = slug.trim().toLowerCase();

  // Перевірка живих демо-слагів або запит у MongoDB
  if (cleanSlug === 'max-cyber' || cleanSlug.includes('cyber') || cleanSlug.includes('max')) {
    return {
      wishlistId: undefined,
      slug: cleanSlug,
      title: DEMO_WISHLISTS.cyber_titanium.title,
      themePreset: 'cyber_titanium' as const,
      ownerName: DEMO_WISHLISTS.cyber_titanium.ownerName,
      ownerInstagramHandle: DEMO_WISHLISTS.cyber_titanium.ownerInstagramHandle,
      flowerAndGiftNotes: DEMO_WISHLISTS.cyber_titanium.flowerAndGiftNotes,
      items: DEMO_WISHLISTS.cyber_titanium.items as UnifiedGiftCardItem[],
    };
  }

  try {
    const dbWishlist = await getWishlistBySlug(cleanSlug);
    if (dbWishlist) {
      return {
        wishlistId: dbWishlist.id,
        slug: dbWishlist.slug,
        title: dbWishlist.title,
        themePreset: dbWishlist.themePreset,
        ownerName: dbWishlist.ownerName || 'Іменинник',
        ownerInstagramHandle: dbWishlist.ownerInstagramHandle,
        flowerAndGiftNotes: dbWishlist.flowerAndGiftNotes,
        items: (dbWishlist.items as GuestGiftItemDTO[]).map((item) => ({
          ...item,
        })),
      };
    }
  } catch {
    // Якщо MONGODB_URI ще не підключено, використовуємо преміум демо-вішліст
  }

  return {
    wishlistId: undefined,
    slug: cleanSlug,
    title: DEMO_WISHLISTS.rose_luxury.title,
    themePreset: 'rose_luxury' as const,
    ownerName: DEMO_WISHLISTS.rose_luxury.ownerName,
    ownerInstagramHandle: DEMO_WISHLISTS.rose_luxury.ownerInstagramHandle,
    flowerAndGiftNotes: DEMO_WISHLISTS.rose_luxury.flowerAndGiftNotes,
    items: DEMO_WISHLISTS.rose_luxury.items as UnifiedGiftCardItem[],
  };
}

/**
 * Динамічна генерація OpenGraph мета-тегів (generateMetadata) для красивого прев'ю у Telegram, Viber, Instagram.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await resolveWishlistData(slug);

  return {
    title: `${data.title} — Вішліст ${data.ownerName} на Mriyii`,
    description: `Перегляньте список бажань ${data.ownerName}, долучіться до спільного збору на Монобанку або підберіть таємний сюрприз за допомогою ШІ-асистента Mriyii!`,
    openGraph: {
      title: `${data.title} ✨ Mriyii Wishlist`,
      description: `Оберіть подарунок без спойлерів або закиньте на мрію у Банку Monobank.`,
      type: 'website',
    },
  };
}

export default async function PublicWishlistPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const data = await resolveWishlistData(slug);

  // Server-side non-blocking analytics (AdBlock-proof, без PII)
  try {
    const headerList = await headers();
    const ip =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headerList.get('x-real-ip') ||
      'unknown-ip';
    const ua = headerList.get('user-agent') || 'unknown-ua';
    const referer = (headerList.get('referer') || '').toLowerCase();
    const refParam = typeof resolvedSearch.ref === 'string' ? resolvedSearch.ref.toLowerCase() : '';
    const utmParam =
      typeof resolvedSearch.utm_source === 'string' ? resolvedSearch.utm_source.toLowerCase() : '';

    const utmSource: 'ig_bio' | 'tg_chat' | 'direct' =
      refParam === 'bio' || utmParam === 'ig_bio' || referer.includes('instagram.com')
        ? 'ig_bio'
        : utmParam.includes('tg') || referer.includes('t.me')
        ? 'tg_chat'
        : 'direct';

    const visitorHash = hashVisitor(ip, ua);
    void trackEvent({
      eventType: 'wishlist_viewed',
      wishlistId: data.wishlistId,
      wishlistSlug: data.slug,
      visitorHash,
      metadata: {
        utmSource,
        themePreset: data.themePreset,
      },
    }).then(() => recordBioVisitDetection(data.slug, utmSource));
  } catch {
    // Ignore header read errors during static generation
  }

  return (
    <GuestWishlistClient
      slug={data.slug}
      initialTitle={data.title}
      initialThemePreset={data.themePreset}
      ownerName={data.ownerName}
      ownerInstagramHandle={data.ownerInstagramHandle}
      flowerAndGiftNotes={data.flowerAndGiftNotes}
      initialItems={data.items}
    />
  );
}
