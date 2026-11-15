'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ExternalLink, Plus, ArrowLeft } from 'lucide-react';
import {
  CURATED_IDEAS,
  IDEA_CATEGORIES,
  IDEA_FILTER_CHIPS,
  type IdeaFilterTag,
  type IdeaGiftItem,
  type IdeaSlug,
} from '@/lib/ideas-data';
import { AffiliateDisclosureBadge } from '@/components/AffiliateDisclosureBadge';

const DRAFT_STORAGE_KEY = 'mriyii_delayed_auth_draft_v1';

interface IdeasHubClientProps {
  initialCategorySlug?: IdeaSlug;
}

export function IdeasHubClient({ initialCategorySlug }: IdeasHubClientProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<IdeaFilterTag>('all');
  const [toast, setToast] = useState<string | null>(null);

  const categoryMeta = initialCategorySlug ? IDEA_CATEGORIES[initialCategorySlug] : null;

  const filteredIdeas = useMemo(() => {
    const base = initialCategorySlug
      ? CURATED_IDEAS.filter((item) => item.categorySlug === initialCategorySlug)
      : CURATED_IDEAS;

    if (activeFilter === 'all') return base;
    return base.filter((item) => item.tags.includes(activeFilter));
  }, [initialCategorySlug, activeFilter]);

  const handleAddToMyWishlist = (idea: IdeaGiftItem) => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as {
            themePreset?: string;
            items?: Array<Record<string, unknown>>;
          })
        : { themePreset: 'rose_luxury', items: [] };

      const nextItem = {
        id: `idea_${Date.now()}`,
        title: idea.title,
        emoji: idea.emoji,
        price: idea.price,
        url: idea.originalUrl,
        imageUrl: idea.imageUrl,
        description: idea.description,
      };

      const nextDraft = {
        themePreset: parsed.themePreset || 'rose_luxury',
        items: [nextItem, ...(parsed.items || [])],
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    } catch {
      // ignore storage errors
    }

    setToast(`✨ «${idea.title}» додано у твій вішліст!`);
    setTimeout(() => {
      router.push('/dashboard?added=1');
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-slate-950 border border-emerald-400/50 px-4 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1120]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-base">
                M
              </span>
              <span className="font-black text-lg tracking-tight text-white">Mriyii</span>
            </Link>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-white/10 text-sm font-bold text-slate-200">
              💡 Ідеї подарунків
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-extrabold bg-white text-slate-950 hover:bg-slate-100 transition inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-rose-600" />
              <span>Мій вішліст</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14 space-y-10">
        {/* Hero */}
        <section className="space-y-4">
          {categoryMeta && (
            <Link
              href="/ideas"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Усі категорії ідей</span>
            </Link>
          )}
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-200 text-sm font-bold">
            ✨ Трендові ідеї з реальних вішлістів • ₴ UAH
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {categoryMeta ? `${categoryMeta.emoji} ${categoryMeta.title}` : '💡 Ідеї подарунків, про які справді мріють'}
          </h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-3xl leading-relaxed">
            {categoryMeta
              ? categoryMeta.subtitle
              : 'Готова добірка подарунків з цінами в гривні (₴): замовляйте одразу або додавайте у свій вішліст за 1 клік.'}
          </p>

          {/* Category SEO Links */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {(Object.keys(IDEA_CATEGORIES) as IdeaSlug[]).map((slugKey) => {
              const cat = IDEA_CATEGORIES[slugKey];
              const isCurrent = initialCategorySlug === slugKey;
              return (
                <Link
                  key={slugKey}
                  href={`/ideas/${slugKey}`}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold border transition inline-flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-[#171D30] text-slate-200 border-white/15 hover:border-white/35'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.title}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Filter Chips */}
        <section className="flex flex-wrap gap-2">
          {IDEA_FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              className={`min-h-[48px] px-4 py-2 rounded-xl text-sm font-extrabold transition ${
                activeFilter === chip.key
                  ? 'bg-emerald-400 text-slate-950 shadow-lg'
                  : 'bg-[#171D30] text-slate-200 border border-white/15 hover:border-white/35'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </section>

        {/* Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIdeas.map((idea) => (
            <article
              key={idea.id}
              className="rounded-3xl bg-white text-slate-950 overflow-hidden shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="relative h-52 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={idea.imageUrl}
                    alt={idea.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/85 text-white text-sm font-bold">
                    {idea.trendingCountLabel}
                  </span>
                </div>

                <div className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-600">
                    <span>{idea.shopName}</span>
                    <span className="text-lg font-black text-emerald-700 tabular-nums">
                      {idea.price.toLocaleString('uk-UA')} ₴
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-950 leading-snug">
                    {idea.emoji} {idea.title}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{idea.description}</p>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-2.5">
                <a
                  href={`/api/out?url=${encodeURIComponent(idea.originalUrl)}&title=${encodeURIComponent(idea.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-sm font-extrabold flex items-center justify-center gap-2 transition"
                >
                  <span>🎁 Подарувати</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => handleAddToMyWishlist(idea)}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>✨ Додати у свій вішліст</span>
                </button>
              </div>
            </article>
          ))}
        </section>

        {filteredIdeas.length === 0 && (
          <div className="rounded-3xl bg-[#171D30] border border-white/15 p-8 text-center space-y-3">
            <div className="text-xl font-black text-white">За цим фільтром ідей поки немає</div>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-extrabold"
            >
              Показати всі ідеї
            </button>
          </div>
        )}

        <div className="pt-4">
          <AffiliateDisclosureBadge />
        </div>
      </main>
    </div>
  );
}
