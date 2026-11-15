import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IdeasHubClient } from '@/components/IdeasHubClient';
import { IDEA_CATEGORIES, type IdeaSlug } from '@/lib/ideas-data';

interface IdeaCategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (Object.keys(IDEA_CATEGORIES) as IdeaSlug[]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: IdeaCategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = IDEA_CATEGORIES[slug as IdeaSlug];
  if (!meta) {
    return {
      title: 'Ідеї подарунків — Mriyii',
    };
  }
  return {
    title: meta.seoTitle,
    description: meta.seoDescription,
  };
}

export default async function IdeaCategoryPage({ params }: IdeaCategoryPageProps) {
  const { slug } = await params;
  if (!Object.prototype.hasOwnProperty.call(IDEA_CATEGORIES, slug)) {
    notFound();
  }
  return <IdeasHubClient initialCategorySlug={slug as IdeaSlug} />;
}
