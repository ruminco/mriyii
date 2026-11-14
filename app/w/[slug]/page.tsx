import type { Metadata } from 'next';
import { getWishlistBySlug, type GuestGiftItemDTO } from '@/actions/wishlist';
import { DEMO_WISHLISTS } from '@/lib/theme-data';
import { GuestWishlistClient } from '@/components/GuestWishlistClient';
import type { UnifiedGiftCardItem } from '@/components/SmokedGiftCard';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function resolveWishlistData(slug: string) {
  const cleanSlug = slug.trim().toLowerCase();

  // Перевірка живих демо-слагів або запит у MongoDB
  if (cleanSlug === 'max-cyber' || cleanSlug.includes('cyber') || cleanSlug.includes('max')) {
    return {
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

export default async function PublicWishlistPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await resolveWishlistData(slug);

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
