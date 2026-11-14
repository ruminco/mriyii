import type { Metadata } from 'next';
import { getMetricsDashboardData } from '@/lib/analytics';
import { MetricsDashboardClient } from '@/components/MetricsDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mriyii Admin Metrics — Юніт-Економіка та CRM 30 Інфлюенсерок',
  description:
    'Внутрішній продуктовий дашборд Mriyii: порівняння Сценарій vs Факт, діагностика RULE-01..RULE-06 та трекер когорти інфлюенсерок.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminMetricsPage() {
  const adminEmailsEnv = process.env.ADMIN_EMAILS?.trim();
  const initialData = await getMetricsDashboardData('30d', false);

  const adminGuardNotice = adminEmailsEnv
    ? `Режим доступу фаундера (${adminEmailsEnv.split(',').length} адмін-акаунтів налаштовано в ADMIN_EMAILS).`
    : undefined;

  return (
    <MetricsDashboardClient
      initialData={initialData}
      adminGuardNotice={adminGuardNotice}
    />
  );
}
