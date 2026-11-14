import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashVisitor, resolveMerchantCpa, trackEvent } from '@/lib/analytics';
import GiftItem from '@/models/GiftItem';

function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId')?.trim() || '';
  const fallbackUrl = searchParams.get('url')?.trim() || '';
  const srcParam = searchParams.get('src')?.trim();
  const clickSource: 'post_booking_modal' | 'card_button' | 'owner_jar_payout' =
    srcParam === 'post_booking_modal' || srcParam === 'owner_jar_payout'
      ? srcParam
      : 'card_button';

  let targetUrl = isSafeHttpUrl(fallbackUrl) ? fallbackUrl : '';
  let wishlistId: string | undefined;
  let priceUah: number | undefined;

  if (itemId && /^[a-f\d]{24}$/i.test(itemId)) {
    try {
      await connectToDatabase();
      const item = await GiftItem.findById(itemId)
        .select('wishlistId price affiliateUrl originalUrl')
        .lean();

      if (item) {
        wishlistId = String(item.wishlistId);
        priceUah = item.price;
        const dbUrl = item.affiliateUrl || item.originalUrl;
        if (dbUrl && isSafeHttpUrl(dbUrl)) {
          targetUrl = dbUrl;
        }
      }
    } catch {
      // Fallback to query param URL if DB lookup fails
    }
  }

  if (!targetUrl) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown-ip';
  const ua = request.headers.get('user-agent') || 'unknown-ua';
  const visitorHash = hashVisitor(ip, ua);
  const { merchantDomain, estimatedCpaRate } = resolveMerchantCpa(targetUrl);

  // Логуємо клік на сервері ДО редіректу (100% захист від AdBlock)
  await trackEvent({
    eventType: 'affiliate_clicked',
    wishlistId,
    itemId: /^[a-f\d]{24}$/i.test(itemId) ? itemId : undefined,
    visitorHash,
    metadata: {
      priceUah,
      merchantDomain,
      estimatedCpaRate,
      clickSource,
    },
  });

  return NextResponse.redirect(targetUrl, { status: 302 });
}
