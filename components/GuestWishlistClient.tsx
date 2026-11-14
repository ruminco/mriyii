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
  const [items, setItems] = useState<UnifiedGiftCardItem[]>(initialItems);
  const [bookingTokensMap, setBookingTokensMap] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [forceFallbackPoster, setForceFallbackPoster] = useState(false);
  const [quickAiResult, setQuickAiResult] = useState<{
    budget: string;
    title: string;
    price: number;
    emoji: string;
    booked: boolean;
  } | null>(null);
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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950/95 backdrop-blur-xl rounded-2xl px-4 py-3 border border-emerald-400/50 shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-extrabold text-emerald-300">
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
            <button
              type="button"
              onClick={() => setForceFallbackPoster((p) => !p)}
              className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-1"
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
              className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15"
            >
              {tokens.label}
            </button>

            <Link
              href="/"
              className="py-1.5 px-3 rounded-xl text-xs font-extrabold bg-white text-slate-950 shadow"
            >
              ✨ Створити свій вішліст
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        {/* =================================================================== */}
        {/* БЛОК 1 (LINKTREE МІНІ-ПРОФІЛЬ ІЗ КОЛЬОРОВИМИ ЧІПСАМИ АНКЕТИ)         */}
        {/* ТА БЛОК 2 (ШІ-АСИСТЕНТ НА САМОМУ ПОЧАТКУ ПІД ПРОФІЛЕМ!)             */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Блок 1 (7 cols): Linktree Mini-Profile */}
          <div className="lg:col-span-7 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[26px] p-5 flex flex-col justify-between text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Кругла аватарка у живому градієнтному кільці */}
              <div className="relative shrink-0">
                <div
                  className={`w-20 h-20 rounded-full ${tokens.avatarRingClass} p-[3px] shadow-xl`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={demoProfile.ownerAvatarUrl}
                    alt={ownerName}
                    className="w-full h-full rounded-full object-cover border-2 border-slate-950"
                  />
                </div>
                <span className="absolute -bottom-1 right-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 shadow">
                  VIP ✨
                </span>
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[11px] font-extrabold">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/25 text-emerald-200 border border-emerald-400/30">
                    🎂 До свята {demoProfile.daysLeft} днів
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white">
                    @{resolvedOwnerIg}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                    🤫 Сюрприз-режим
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {initialTitle}
                </h1>
                <p className="text-xs font-semibold text-white/85 leading-snug">
                  {demoProfile.ownerBio}
                </p>
              </div>
            </div>

            {/* 3 кольорові чіпси-факти з анкети іменинника (видимі без зайвих кліків!) */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-4 pt-3.5 border-t border-white/15 text-xs font-extrabold">
              <span className="px-3 py-1 rounded-xl bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                📏 {demoProfile.aiSizes}
              </span>
              <span className="px-3 py-1 rounded-xl bg-pink-400/25 text-pink-100 border border-pink-400/30">
                💖 Люблю: {demoProfile.aiHobbies.slice(0, 3).join(', ')}
              </span>
              <span className="px-3 py-1 rounded-xl bg-rose-500/25 text-rose-200 border border-rose-400/30">
                🚫 Табу: {demoProfile.aiAntiGifts[0]}
              </span>
            </div>
          </div>

          {/* Блок 2 (5 cols): Акцентний віджет «🤖 ШІ-Асистент подарунків» прямо на старті! */}
          <div
            className={`lg:col-span-5 ${tokens.aiBannerGradient} rounded-[26px] p-5 text-white shadow-2xl border border-white/25 flex flex-col justify-between space-y-3`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shrink-0">
                    🤖
                  </div>
                  <div>
                    <div className="text-sm font-black tracking-tight flex items-center gap-1.5">
                      <span>ШІ-Асистент подарунків</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-300 text-slate-950 font-black">
                        Gemini 2.5
                      </span>
                    </div>
                    <div className="text-xs text-white/90 font-semibold">
                      Врахує розміри й табу та підбере сюрприз під твій бюджет:
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 кнопки швидкого вибору бюджету в 1 клік прямо на екрані */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setQuickAiResult({
                      budget: 'до 1 000 ₴',
                      title:
                        themePreset === 'rose_luxury'
                          ? 'Дріп-кава MadHeads Specialty Set'
                          : 'Пуровер Hario V60 Craft Set',
                      price: 750,
                      emoji: '☕',
                      booked: false,
                    })
                  }
                  className="py-2 px-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-extrabold spring-transition active:scale-95"
                >
                  до 1 000 ₴
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQuickAiResult({
                      budget: '~1 500 ₴',
                      title:
                        themePreset === 'rose_luxury'
                          ? 'Термокружка Fellow Carter Mug White'
                          : 'Док-станція MagSafe Ugreen Qi2',
                      price: 1650,
                      emoji: '✨',
                      booked: false,
                    })
                  }
                  className="py-2 px-2 rounded-xl bg-white text-slate-950 text-xs font-extrabold shadow spring-transition active:scale-95"
                >
                  ✨ ~1 500 ₴
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQuickAiResult({
                      budget: 'VIP 💎',
                      title:
                        themePreset === 'rose_luxury'
                          ? 'Нішевий сет Maison Francis Kurkdjian'
                          : 'Кастомні кейкапи PBTfans Set',
                      price: 4800,
                      emoji: '💎',
                      booked: false,
                    })
                  }
                  className="py-2 px-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-extrabold spring-transition active:scale-95"
                >
                  VIP 💎
                </button>
              </div>
            </div>

            {quickAiResult ? (
              <div className="bg-slate-950/75 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="text-amber-300 font-extrabold truncate">
                    {quickAiResult.emoji} {quickAiResult.title}
                  </div>
                  <div className="text-white/85 text-[11px] font-semibold">
                    {quickAiResult.price.toLocaleString('uk-UA')} ₴ • Точний збіг з анкетою!
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const tok = `ai_tok_${Date.now()}`;
                    const newId = `ai-quick-${Date.now()}`;
                    persistBookingToken(newId, tok);
                    setItems((prev) => [
                      {
                        id: newId,
                        title: quickAiResult.title,
                        emoji: quickAiResult.emoji,
                        description: 'Таємний сюрприз, підібраний ШІ Gemini 2.5 під інтереси іменинника!',
                        price: quickAiResult.price,
                        currency: 'UAH',
                        isBooked: true,
                        bookedByName: 'Таємний Санта (AI 🤫)',
                        isAiSurprise: true,
                      },
                      ...prev,
                    ]);
                    setQuickAiResult({ ...quickAiResult, booked: true });
                    triggerToast(
                      '🤫 Таємний ШІ-сюрприз додано! Іменинник не бачить його у своєму кабінеті.'
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-black text-xs shrink-0"
                >
                  {quickAiResult.booked ? '✅ Додано!' : '🎁 Подарувати'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowFullAiGenerator((p) => !p)}
                className="w-full py-2 px-3 rounded-xl bg-black/25 hover:bg-black/35 border border-white/20 text-xs font-extrabold text-white flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {showFullAiGenerator
                    ? 'Сховати розширений генератор ШІ'
                    : 'Або відкрити повний підбір Gemini AI →'}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* Розширений віджет Gemini 2.5 Flash (за кліком) */}
        {showFullAiGenerator && (
          <AiGiftAssistantWidget
            wishlistSlug={slug}
            wishlistTitle={initialTitle}
            themePreset={themePreset}
            existingBrowserTokens={existingBrowserTokens}
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

        {/* Компактна картка «🌸 Які квіти я люблю та мої побажання» (Zero Home Address Storage) */}
        {resolvedFlowerNotes && (
          <section className="bg-white/10 backdrop-blur-xl rounded-[24px] p-4 sm:p-5 border border-pink-400/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-500/25 text-pink-200 border border-pink-400/40">
                  🌸 Які квіти я люблю та мої побажання
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  🔒 Доставка через Direct @{resolvedOwnerIg} (без домашньої адреси)
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white/90 leading-relaxed pt-1">
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
              className="py-2.5 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:brightness-110 text-white shadow-lg shrink-0 flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Замовити в Instagram @{featuredFlowerShop} 📸</span>
            </button>
          </section>
        )}

        {/* =================================================================== */}
        {/* БЛОК 3: СІТКА НАСИЧЕНИХ КАРТОК БАЖАНЬ НА СУЦІЛЬНОМУ БІЛОМУ ТЛІ      */}
        {/* =================================================================== */}
        <section className="grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <SmokedGiftCard
              key={item.id}
              item={item}
              themePreset={themePreset}
              viewMode="guest"
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

        <AffiliateDisclosureBadge />
      </main>

      {/* Модальне вікно бронювання подарунка гостем (Суцільне біле) */}
      {activeBookingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="solid-white-card rounded-[28px] w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
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
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold ${tokens.primaryCtaGradient} text-white spring-transition active:scale-95`}
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
                <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  🫙 Організація спільного збору
                </span>
                <h3 className="text-lg font-black text-slate-950 mt-1.5">
                  Прив’язати Банку Monobank
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-1">
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
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
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
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
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
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
              Хочете такий самий Linktree-вішліст із Монобанкою та ШІ для свого свята? Створіть його безкоштовно за 30 секунд!
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link
                href="/"
                className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold ${tokens.primaryCtaGradient} text-white flex items-center justify-center gap-1.5`}
              >
                <Sparkles className="w-4 h-4" />
                <span>✨ Створити мій вішліст</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowGrowthModal(false)}
                className="py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
