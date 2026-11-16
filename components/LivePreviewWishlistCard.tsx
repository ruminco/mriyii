'use client';

import React from 'react';
import Link from 'next/link';
import { Trash2, Sparkles, Lock, ExternalLink } from 'lucide-react';
import type { ThemePreset } from '@/models/User';

export interface LivePreviewDraftItem {
  id: string;
  title: string;
  emoji?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  originalUrl?: string;
  affiliateUrl?: string;
  hasMonoJar?: boolean;
  isBooked?: boolean;
}

interface LivePreviewWishlistCardProps {
  items: LivePreviewDraftItem[];
  landingPreset: 'rose_luxury' | 'cyber_titanium' | 'creator_bio';
  claimSlug: string;
  onRemoveItem: (id: string) => void;
  onSaveAndClaim: () => void;
}

export function LivePreviewWishlistCard({
  items,
  landingPreset,
  claimSlug,
  onRemoveItem,
  onSaveAndClaim,
}: LivePreviewWishlistCardProps) {
  const effectiveTheme: ThemePreset =
    landingPreset === 'cyber_titanium' ? 'cyber_titanium' : 'rose_luxury';
  const cleanSlug = claimSlug.trim() || 'my-wishes';

  const isCyber = effectiveTheme === 'cyber_titanium';
  const isCreator = landingPreset === 'creator_bio';

  return (
    <div
      className={`rounded-[28px] p-5 sm:p-6 shadow-2xl border space-y-4 text-left ${
        isCreator
          ? 'bg-[#1A1724] text-white border-[#DECFFC]/25'
          : isCyber
          ? 'bg-[#15161D] text-white border-[#34D399]/30'
          : 'bg-white text-[#141218] border-[#141218]/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-current/10">
        <div className="min-w-0">
          <div
            className={`text-sm font-extrabold flex items-center gap-1.5 ${
              isCreator
                ? 'text-[#DECFFC]'
                : isCyber
                ? 'text-[#34D399]'
                : 'text-[#5B50EC]'
            }`}
          >
            <span>✨ Моя жива вітрина</span>
            {isCreator && (
              <span className="px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#34D399] text-sm font-extrabold">
                🛡️ Safe Mode
              </span>
            )}
          </div>
          <div className="text-sm font-bold opacity-80 truncate">
            mriyii.app/w/{cleanSlug}
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-extrabold shrink-0 tabular-nums ${
            isCreator || isCyber
              ? 'bg-white/10 text-white'
              : 'bg-[#EFEAFF] text-[#141218]'
          }`}
        >
          {items.length} {items.length === 1 ? 'мрія' : items.length < 5 ? 'мрії' : 'мрій'}
        </span>
      </div>

      <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl p-3 border flex items-center gap-3 transition ${
              isCreator || isCyber
                ? 'bg-white/5 border-white/10 hover:border-white/25'
                : 'bg-[#FAF6F0] border-[#141218]/10 hover:border-[#5B50EC]/35'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 overflow-hidden ${
                isCreator || isCyber
                  ? 'bg-white/10 border border-white/15'
                  : 'bg-[#EFEAFF] border border-[#5B50EC]/20'
              }`}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{item.emoji || '🎁'}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold leading-snug truncate">
                {item.title}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm font-bold">
                <span
                  className={`tabular-nums ${
                    isCreator
                      ? 'text-[#F4FF7A]'
                      : isCyber
                      ? 'text-[#34D399]'
                      : 'text-[#5B50EC]'
                  }`}
                >
                  {typeof item.price === 'number' && item.price > 0
                    ? `${item.price.toLocaleString('uk-UA')} ₴`
                    : 'Ціна за посиланням'}
                </span>
                {item.originalUrl && (
                  <a
                    href={item.affiliateUrl || item.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 opacity-75 hover:opacity-100 underline"
                  >
                    <span>Магазин</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemoveItem(item.id)}
              aria-label={`Видалити ${item.title}`}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                isCreator || isCyber
                  ? 'bg-white/10 hover:bg-rose-500/25 text-slate-200 hover:text-rose-200'
                  : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-2 space-y-2.5">
        <button
          type="button"
          onClick={onSaveAndClaim}
          className={`w-full min-h-[48px] px-4 py-3 rounded-full text-sm font-extrabold inline-flex items-center justify-center gap-2 transition active:scale-95 shadow-lg ${
            isCreator
              ? 'bg-[#F4FF7A] hover:bg-[#ecff45] text-[#141218]'
              : isCyber
              ? 'bg-[#34D399] hover:bg-[#10B981] text-[#0B1120]'
              : 'bg-[#141218] hover:bg-slate-800 text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>✨ Зберегти та отримати лінк</span>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
          <Link
            href={`/dashboard?theme=${effectiveTheme}`}
            className="underline underline-offset-4 opacity-90 hover:opacity-100"
          >
            🎨 Зібрати свою вітрину наживо →
          </Link>
          <Link
            href={`/w/${encodeURIComponent(cleanSlug)}?preview=draft`}
            className="inline-flex items-center gap-1 underline underline-offset-4 opacity-90 hover:opacity-100"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Очима гостя</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
