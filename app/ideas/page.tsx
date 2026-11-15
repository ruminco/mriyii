import type { Metadata } from 'next';
import { IdeasHubClient } from '@/components/IdeasHubClient';

export const metadata: Metadata = {
  title: 'Ідеї подарунків в Україні (₴ UAH) — Mriyii',
  description:
    'Трендові ідеї подарунків для неї, для нього, друзів та VIP-сюрпризів без адреси. Додавайте будь-яку мрію у свій вішліст за 1 клік.',
};

export default function IdeasPage() {
  return <IdeasHubClient />;
}
