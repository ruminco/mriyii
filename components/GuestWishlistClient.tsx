'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, X, CheckCircle2, Camera, Image as ImageIcon } from 'lucide-react';
import type { ThemePreset } from '@/models/User';
import { THEME_TOKENS, DEMO_WISHLISTS } from '@/lib/theme-data';
import {
  SmokedGiftCard,
  buildInstagramDirectOrderMessage,
  type UnifiedGiftCardItem,
} from '@/components/SmokedGiftCard';
import { AiGiftAssistantWidget } from '@/components/AiGiftAssistantWidget';
import { AffiliateDisclosureBadge } from '@/components/AffiliateDisclosureBadge';
import {
  bookGiftItem,
  cancelGiftBooking,
  attachMonoJar,
  syncMonoJarProgress,
} from '@/actions/booking';

const GUEST_TOKENS_STORAGE_KEY = 'mriyii_guest_booking_tokens_v1';

interface GuestWishlistClientProps {
  slug: string;
  initialTitle: string;
  initialThemePreset: ThemePreset;
  ownerName: string;
  ownerInstagramHandle?: string;
  flowerAndGiftNotes?: string;
  initialItems: UnifiedGiftCardItem[];
}

export function GuestWishlistClient({
  slug,
  initialTitle,
  initialThemePreset,
  ownerName,
  ownerInstagramHandle,
  flowerAndGiftNotes,
  initialItems,
}: GuestWishlistClientProps) {
  const [themePreset, setThemePreset] = useState<ThemePreset>(initialThemePreset);
  const [locale, setLocale] = useState<'ua' | 'en'>('ua');
  const [items, setItems] = useState<UnifiedGiftCardItem[]>(initialItems);
  const [bookingTokensMap, setBookingTokensMap] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [forceFallbackPoster, setForceFallbackPoster] = useState(false);
  const [showFullAiGenerator, setShowFullAiGenerator] = useState(false);

  // Модалка бронювання
  const [activeBookingItem, setActiveBookingItem] =
    useState<UnifiedGiftCardItem | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Модалка прив'язки Банки Monobank
  const [activeJarItem, setActiveJarItem] = useState<UnifiedGiftCardItem | null>(null);
  const [monoJarUrlInput, setMonoJarUrlInput] = useState('');

  // Віральний Growth Loop поп-ап після бронювання
  const [showGrowthModal, setShowGrowthModal] = useState(false);

  // COPY-08: Fan Suggestions (ідея подарунка від друга, прихована Сюрприз-режимом від власника)
  const [showFanSuggestModal, setShowFanSuggestModal] = useState(false);
  const [fanTitle, setFanTitle] = useState('');
  const [fanPrice, setFanPrice] = useState('');
  const [fanUrl, setFanUrl] = useState('');
  const [fanGuestName, setFanGuestName] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUEST_TOKENS_STORAGE_KEY);
      if (raw) {
        setBookingTokensMap(JSON.parse(raw) as Record<string, string>);
      }
    } catch {
      // Ігноруємо
    }
  }, []);

  const persistBookingToken = (itemId: string, token: string) => {
    setBookingTokensMap((prev) => {
      const next = { ...prev, [itemId]: token };
      try {
        localStorage.setItem(GUEST_TOKENS_STORAGE_KEY, JSON.stringify(next));
        document.cookie = `mriyii_booking_${itemId}=${token}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {
        // Ігноруємо
      }
      return next;
    });
  };

  const removeBookingToken = (itemId: string) => {
    setBookingTokensMap((prev) => {
      const next = { ...prev };
      delete next[itemId];
      try {
        localStorage.setItem(GUEST_TOKENS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ігноруємо
      }
      return next;
    });
  };

  const existingBrowserTokens = Object.values(bookingTokensMap);
  const tokens = THEME_TOKENS[themePreset];
  const demoProfile = DEMO_WISHLISTS[themePreset];
  const resolvedOwnerIg = ownerInstagramHandle || demoProfile.ownerInstagramHandle;
  const resolvedFlowerNotes = flowerAndGiftNotes || demoProfile.flowerAndGiftNotes;

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookingItem) return;

    if (existingBrowserTokens.length >= 2) {
      setModalError(
        'Один гість може забронювати не більше 2 подарунків в одному вішлісті (захист від випадкового блокування списку). Спочатку скасуйте попередню бронь.'
      );
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await bookGiftItem(
        activeBookingItem.id,
        guestName.trim(),
        guestEmail.trim(),
        existingBrowserTokens
      );

      persistBookingToken(activeBookingItem.id, res.bookingToken);
      setItems((prev) =>
        prev.map((it) =>
          it.id === activeBookingItem.id
            ? { ...it, isBooked: true, bookedByName: guestName.trim() }
            : it
        )
      );
      setActiveBookingItem(null);
      setTimeout(() => setShowGrowthModal(true), 1200);
    } catch (err) {
      if (err instanceof Error && err.message.includes('не більше 2')) {
        setModalError(err.message);
      } else {
        const fallbackToken = `local_tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        persistBookingToken(activeBookingItem.id, fallbackToken);
        setItems((prev) =>
          prev.map((it) =>
            it.id === activeBookingItem.id
              ? { ...it, isBooked: true, bookedByName: guestName.trim() }
              : it
          )
        );
        setActiveBookingItem(null);
        setTimeout(() => setShowGrowthModal(true), 1200);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (item: UnifiedGiftCardItem) => {
    const token = bookingTokensMap[item.id];
    if (!token) return;

    try {
      await cancelGiftBooking(item.id, token);
    } catch {
      // Демо-фолбек
    }

    removeBookingToken(item.id);
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, isBooked: false, bookedByName: undefined } : it
      )
    );
  };

  const handleAttachMonoJar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJarItem) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      const jarStatus = await attachMonoJar(activeJarItem.id, monoJarUrlInput.trim());
      setItems((prev) =>
        prev.map((it) =>
          it.id === activeJarItem.id
            ? {
                ...it,
                monoJarUrl: jarStatus.monoJarUrl,
                jarCurrentAmount: jarStatus.jarCurrentAmount,
                jarTargetAmount: jarStatus.jarTargetAmount ?? it.price,
                isBooked: jarStatus.isGoalReached ? true : it.isBooked,
              }
            : it
        )
      );
      setActiveJarItem(null);
      setMonoJarUrlInput('');
      setTimeout(() => setShowGrowthModal(true), 1200);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('send.monobank.ua') || err.message.includes('HTTPS'))
      ) {
        setModalError(err.message);
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === activeJarItem.id
              ? {
                  ...it,
                  monoJarUrl: monoJarUrlInput.trim(),
                  jarCurrentAmount: 0,
                  jarTargetAmount: it.price ?? 5000,
                }
              : it
          )
        );
        setActiveJarItem(null);
        setMonoJarUrlInput('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncJar = async (item: UnifiedGiftCardItem) => {
    try {
      const synced = await syncMonoJarProgress(item.id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                jarCurrentAmount: synced.jarCurrentAmount,
                jarTargetAmount: synced.jarTargetAmount ?? it.jarTargetAmount,
                isBooked: synced.isGoalReached ? true : it.isBooked,
              }
            : it
        )
      );
    } catch {
      const step = 2000;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== item.id) return it;
          const target = it.jarTargetAmount ?? it.price ?? 10000;
          const nextAmount = Math.min(target, (it.jarCurrentAmount ?? 0) + step);
          return {
            ...it,
            jarCurrentAmount: nextAmount,
            isBooked: nextAmount >= target ? true : it.isBooked,
          };
        })
      );
      triggerToast('🐈‍⬛ Баланс Монобанки оновлено (+2 000 ₴ у демо)!');
    }
  };

  const featuredFlowerShop =
    themePreset === 'rose_luxury' ? 'kamelia_flowers' : 'foundation.coffee';

  return (
    <div className={`min-h-screen ${tokens.meshClass} text-white spring-transition pb-24`}>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950/95 backdrop-blur-xl rounded-2xl px-4 py-3 border border-emerald-400/50 shadow-2xl flex items-center gap-2.5 text-sm font-extrabold text-emerald-300">
          <span>💌</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Компактна верхня панель */}
      <header className="sticky top-0 z-30 border-b border-white/15 bg-[#090e1a]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px]`}
            >
              <div className="w-full h-full bg-[#161324] rounded-[10px] flex items-center justify-center text-base">
                🎁
              </div>
            </div>
            <span className="text-sm font-black text-white">mriyii.app/{slug}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center rounded-xl bg-white/10 border border-white/15 p-0.5">
              <button
                type="button"
                onClick={() => setLocale('ua')}
                className={`px-2.5 py-1 rounded-lg text-sm font-extrabold transition ${
                  locale === 'ua' ? 'bg-white text-slate-950' : 'text-slate-200 hover:text-white'
                }`}
              >
                UA
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1 rounded-lg text-sm font-extrabold transition ${
                  locale === 'en' ? 'bg-white text-slate-950' : 'text-slate-200 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => setForceFallbackPoster((p) => !p)}
              className="py-1.5 px-2.5 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-1"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
              <span>{forceFallbackPoster ? '✨ Smart Постер' : '🖼️ З фото'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next =
                  themePreset === 'rose_luxury' ? 'cyber_titanium' : 'rose_luxury';
                setThemePreset(next);
                setItems(DEMO_WISHLISTS[next].items);
              }}
              className="py-1.5 px-2.5 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15"
            >
              {tokens.label}
            </button>

            <Link
              href="/"
              className="py-1.5 px-3 rounded-xl text-sm font-extrabold bg-white text-slate-950 shadow"
            >
              {locale === 'en' ? '✨ Create wishlist' : '✨ Створити свій вішліст'}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        {/* =================================================================== */}
        {/* 1. PROFILE HEADER (Аватарка + 2px кільце, ім'я, коротке біо)        */}
        {/* =================================================================== */}
        <section className="bg-[#171D30]/95 backdrop-blur-xl border border-white/15 rounded-[26px] p-5 sm:p-6 flex flex-col justify-between text-center sm:text-left shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Кругла аватарка з 2px кільцем */}
            <div className="relative shrink-0">
              <div
                className={`w-20 h-20 rounded-full ${tokens.avatarRingClass} p-[2px] shadow-xl`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={demoProfile.ownerAvatarUrl}
                  alt={ownerName}
                  className="w-full h-full rounded-full object-cover border-2 border-[#0E1324]"
                />
              </div>
              <span className="absolute -bottom-1 right-0 text-sm font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow">
                VIP ✨
              </span>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm font-extrabold">
                <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  🎂 До свята {demoProfile.daysLeft} днів
                </span>
                <span className="px-3 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
                  @{resolvedOwnerIg}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  🤫 Сюрприз-режим
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {initialTitle}
              </h1>
              <p className="text-sm font-semibold text-slate-200 leading-snug">
                {demoProfile.ownerBio}
              </p>
            </div>
          </div>

          {/* 3 кольорові чіпси-факти з анкети іменинника */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4 pt-4 border-t border-white/10 text-sm font-extrabold">
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              📏 {demoProfile.aiSizes}
            </span>
            <span className="px-3 py-1 rounded-xl bg-indigo-500/25 text-indigo-100 border border-indigo-400/30">
              💖 Люблю: {demoProfile.aiHobbies.slice(0, 3).join(', ')}
            </span>
            <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-400/30">
              🚫 Табу: {demoProfile.aiAntiGifts[0]}
            </span>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 2. AI TEASER (згорнутий за замовчуванням, розгортається по кліку)   */}
        {/* =================================================================== */}
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowFullAiGenerator((p) => !p)}
            aria-expanded={showFullAiGenerator}
            className="w-full min-h-[56px] rounded-[22px] bg-[#171D30]/95 hover:bg-[#1E2640] border border-amber-400/35 px-5 py-3.5 flex items-center justify-between gap-3 text-left shadow-lg spring-transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-xl shrink-0">
                ✨
              </div>
              <div>
                <div className="text-sm sm:text-base font-extrabold text-white">
                  ✨ Хочеш, допоможу з ідеєю на основі інтересів?
                </div>
                <div className="text-sm font-semibold text-slate-300">
                  ШІ підбере подарунки зі списку або в магазинах під твій бюджет
                </div>
              </div>
            </div>
            <span className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 text-sm font-black">
              {showFullAiGenerator ? 'Згорнути ▴' : 'Підібрати ▾'}
            </span>
          </button>

          {showFullAiGenerator && (
            <AiGiftAssistantWidget
              wishlistSlug={slug}
              wishlistTitle={initialTitle}
              themePreset={themePreset}
              existingBrowserTokens={existingBrowserTokens}
              wishlistItems={items}
              hasOwnerInterests={true}
              onSelectWishlistItem={() => {
                setShowFullAiGenerator(false);
                triggerToast('🎁 Оберіть підсвічений лот зі списку нижче!');
              }}
              onSurpriseBooked={(surprise) => {
                persistBookingToken(surprise.id, surprise.bookingToken);
                setItems((prev) => [
                  {
                    id: surprise.id,
                    title: surprise.title,
                    emoji: surprise.emoji,
                    description: surprise.description,
                    price: surprise.price,
                    currency: 'UAH',
                    affiliateUrl: surprise.affiliateUrl,
                    isBooked: true,
                    bookedByName: surprise.bookedByName,
                    isAiSurprise: true,
                  },
                  ...prev,
                ]);
                setTimeout(() => setShowGrowthModal(true), 1200);
              }}
            />
          )}
        </section>

        {/* =================================================================== */}
        {/* 3. FREE APP NOTE                                                    */}
        {/* =================================================================== */}
        <section className="rounded-2xl bg-[#171D30]/85 border border-white/10 px-4 py-3 flex items-center justify-center sm:justify-start gap-2.5 text-sm font-semibold text-amber-200">
          <span>💡</span>
          <span>Користуйся посиланнями — застосунок безкоштовний</span>
        </section>

        {/* =================================================================== */}
        {/* 4. OWNER-CHOSEN ITEMS WITH STATUSES (Білі картки #FFFFFF)           */}
        {/* =================================================================== */}
        <section id="wishlist-grid" className="grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <SmokedGiftCard
              key={item.id}
              item={item}
              themePreset={themePreset}
              viewMode="guest"
              locale={locale}
              ownerInstagramHandle={resolvedOwnerIg}
              forceFallbackPoster={forceFallbackPoster}
              isBookedByCurrentVisitor={Boolean(bookingTokensMap[item.id])}
              onInstagramOrderToast={triggerToast}
              onBookClick={(target) => {
                setModalError(null);
                setActiveBookingItem(target);
              }}
              onCancelBookingClick={handleCancelBooking}
              onAttachJarClick={(target) => {
                setModalError(null);
                setActiveJarItem(target);
              }}
              onSyncJarClick={handleSyncJar}
            />
          ))}
        </section>

        {/* =================================================================== */}
        {/* COPY-08: FAN SUGGESTIONS (Ідея подарунка від друга)                 */}
        {/* =================================================================== */}
        <section className="rounded-[24px] bg-[#171D30]/90 border border-indigo-400/25 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm sm:text-base font-extrabold text-white">
              💡 Маєш власну круту ідею подарунка?
            </div>
            <p className="text-sm text-slate-300">
              Запропонуй її іншим гостям — іменинник не побачить сюрприз до дати свята.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFanSuggestModal(true)}
            className="min-h-[48px] px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-extrabold shrink-0 transition"
          >
            💡 Запропонувати ідею подарунка
          </button>
        </section>

        {/* =================================================================== */}
        {/* 5. FLOWERS / INSTAGRAM BANNER (Zero Home Address Storage)           */}
        {/* =================================================================== */}
        {resolvedFlowerNotes && (
          <section className="bg-[#171D30]/95 backdrop-blur-xl rounded-[24px] p-5 border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/35">
                  🌸 Які квіти я люблю та мої побажання
                </span>
                <span className="text-sm font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  🔒 Доставка через Direct @{resolvedOwnerIg} (без домашньої адреси)
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200 leading-relaxed pt-1">
                {resolvedFlowerNotes}
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                const msg = buildInstagramDirectOrderMessage(
                  resolvedOwnerIg,
                  'Улюблений букет квітів за списком побажань 🌸'
                );
                try {
                  await navigator.clipboard.writeText(msg);
                } catch {
                  // Fallback
                }
                triggerToast('Текст замовлення скопійовано в буфер обміну! 💌');
                window.open(
                  `https://ig.me/m/${featuredFlowerShop}?ref=mriyii`,
                  '_blank',
                  'noopener,noreferrer'
                );
              }}
              className={`min-h-[48px] py-2.5 px-5 rounded-xl text-sm font-extrabold ${
                themePreset === 'rose_luxury'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-emerald-400 hover:bg-emerald-500 text-slate-950'
              } shadow-lg shrink-0 flex items-center gap-2`}
            >
              <Camera className="w-4 h-4" />
              <span>Замовити в Instagram @{featuredFlowerShop} 📸</span>
            </button>
          </section>
        )}

        <AffiliateDisclosureBadge />
      </main>

      {/* Модальне вікно бронювання подарунка гостем (Суцільне біле) */}
      {activeBookingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="solid-white-card rounded-[28px] w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-sm font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  🤫 Сюрприз для іменинника
                </span>
                <h3 className="text-lg font-black text-slate-950 mt-1.5">
                  {activeBookingItem.emoji} {activeBookingItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveBookingItem(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm font-bold text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Ваше ім’я або нікнейм (бачитимуть лише інші гості):
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Наприклад: Олексій"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-950"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Ваш Email (для можливості скасувати бронь):
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-950"
                />
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-900 flex items-center gap-2">
                <span>💡</span>
                <span>Користуйся посиланнями — застосунок безкоштовний</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full min-h-[48px] py-3 px-4 rounded-xl text-sm font-extrabold ${
                  themePreset === 'rose_luxury'
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-emerald-400 hover:bg-emerald-500 text-slate-950'
                } spring-transition active:scale-95`}
              >
                {isSubmitting ? 'Бронюємо...' : '💎 Підтвердити бронювання'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Модальне вікно прив'язки Банки Monobank */}
      {activeJarItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="solid-white-card rounded-[28px] w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-sm font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  🫙 Організація спільного збору
                </span>
                <h3 className="text-lg font-black text-slate-950 mt-1.5">
                  Прив’язати Банку Monobank
                </h3>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  Вставте посилання на вашу Банку для лота «{activeJarItem.title}», щоб інші гості могли скинутися разом з вами.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveJarItem(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm font-bold text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAttachMonoJar} className="space-y-3">
              <input
                type="url"
                required
                value={monoJarUrlInput}
                onChange={(e) => setMonoJarUrlInput(e.target.value)}
                placeholder="https://send.monobank.ua/jar/XXXXXXXX"
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-950"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              >
                🫙 Запустити спільний збір
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Віральний Growth Loop поп-ап після бронювання */}
      {showGrowthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="solid-white-card rounded-[28px] w-full max-w-md p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto text-emerald-700">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-950">
              💎 Вау! Ваш внесок у мрію зафіксовано.
            </h3>
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">
              Хочете такий самий Linktree-вішліст із Монобанкою та ШІ для свого свята? Створіть його безкоштовно за 30 секунд!
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link
                href="/"
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} text-white flex items-center justify-center gap-1.5`}
              >
                <Sparkles className="w-4 h-4" />
                <span>✨ Створити мій вішліст</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowGrowthModal(false)}
                className="py-3 px-4 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальне вікно Fan Suggestions (COPY-08) */}
      {showFanSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="solid-white-card rounded-[28px] w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-sm font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                  💡 Ідея від друга (Сюрприз-режим)
                </span>
                <h3 className="text-lg font-black text-slate-950 mt-1.5">
                  Запропонувати подарунок
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFanSuggestModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!fanTitle.trim()) return;
                const guestLabel = fanGuestName.trim() || 'Друг';
                const newSuggestion: UnifiedGiftCardItem = {
                  id: `fan-suggest-${Date.now()}`,
                  title: fanTitle.trim(),
                  emoji: '💡',
                  description: `Ідея від гостя (${guestLabel}) — приховано від іменинника до свята 🤫`,
                  price: Number.parseInt(fanPrice, 10) || undefined,
                  currency: 'UAH',
                  originalUrl: fanUrl.trim() || undefined,
                  affiliateUrl: fanUrl.trim() || undefined,
                  isBooked: true,
                  bookedByName: guestLabel,
                  isAiSurprise: true,
                };
                setItems((prev) => [newSuggestion, ...prev]);
                setFanTitle('');
                setFanPrice('');
                setFanUrl('');
                setFanGuestName('');
                setShowFanSuggestModal(false);
                triggerToast('💡 Ідею додано для інших гостей! Іменинник не побачить сюрприз.');
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Що пропонуєте подарувати?
                </label>
                <input
                  type="text"
                  required
                  value={fanTitle}
                  onChange={(e) => setFanTitle(e.target.value)}
                  placeholder="Наприклад: Вініловий програвач Audio-Technica"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Орієнтовна ціна (₴):
                  </label>
                  <input
                    type="number"
                    value={fanPrice}
                    onChange={(e) => setFanPrice(e.target.value)}
                    placeholder="4500"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Ваше ім’я:
                  </label>
                  <input
                    type="text"
                    required
                    value={fanGuestName}
                    onChange={(e) => setFanGuestName(e.target.value)}
                    placeholder="Максим"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Посилання на товар (опціонально):
                </label>
                <input
                  type="url"
                  value={fanUrl}
                  onChange={(e) => setFanUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-950"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[48px] py-3 px-4 rounded-xl text-sm font-extrabold bg-indigo-500 hover:bg-indigo-400 text-white transition"
              >
                💡 Опублікувати ідею для гостей
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
