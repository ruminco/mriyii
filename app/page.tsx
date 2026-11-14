'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Loader2,
  Eye,
  Lock,
  ArrowRight,
  CheckCircle2,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { ThemePreset, UserGender } from '@/models/User';
import { THEME_TOKENS, DEMO_WISHLISTS } from '@/lib/theme-data';
import { SmokedGiftCard, type UnifiedGiftCardItem } from '@/components/SmokedGiftCard';
import { AffiliateDisclosureBadge } from '@/components/AffiliateDisclosureBadge';
import { parseProductUrlAction } from '@/actions/wishlist';

const DRAFT_STORAGE_KEY = 'mriyii_delayed_auth_draft_v1';

interface DelayedAuthDraft {
  gender: UserGender;
  themePreset: ThemePreset;
  wishlistTitle: string;
  items: UnifiedGiftCardItem[];
}

export default function LandingPage() {
  const router = useRouter();
  const [themePreset, setThemePreset] = useState<ThemePreset>('rose_luxury');
  const [rolePreview, setRolePreview] = useState<'guest' | 'owner'>('guest');
  const [forceFallbackPoster, setForceFallbackPoster] = useState(false);

  // Інтерактивний стан ШІ-консьєржа на першому екрані
  const [aiDemoIdea, setAiDemoIdea] = useState<{
    budget: string;
    title: string;
    price: string;
    booked: boolean;
  } | null>(null);

  // Поля Delayed Auth капсули (додавання бажань без логіну)
  const [urlInput, setUrlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [draftItems, setDraftItems] = useState<UnifiedGiftCardItem[]>([]);
  const [wishlistTitle, setWishlistTitle] = useState(DEMO_WISHLISTS.rose_luxury.title);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Живий інтерактивний стан для головної демо-картки на першому екрані
  const [demoJarAmount, setDemoJarAmount] = useState<Record<ThemePreset, number>>({
    rose_luxury: 19500,
    cyber_titanium: 24500,
  });
  const [demoBooked, setDemoBooked] = useState<Record<ThemePreset, boolean>>({
    rose_luxury: false,
    cyber_titanium: false,
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DelayedAuthDraft;
        if (parsed.themePreset === 'rose_luxury' || parsed.themePreset === 'cyber_titanium') {
          setThemePreset(parsed.themePreset);
        }
        if (parsed.wishlistTitle) {
          setWishlistTitle(parsed.wishlistTitle);
        }
        if (Array.isArray(parsed.items)) {
          setDraftItems(parsed.items);
        }
      }
    } catch {
      // Ігноруємо помилки localStorage
    }
  }, []);

  const saveDraftToStorage = (
    nextPreset: ThemePreset,
    nextTitle: string,
    nextItems: UnifiedGiftCardItem[]
  ) => {
    try {
      const payload: DelayedAuthDraft = {
        gender: nextPreset === 'cyber_titanium' ? 'male' : 'female',
        themePreset: nextPreset,
        wishlistTitle: nextTitle,
        items: nextItems,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ігноруємо
    }
  };

  const handleSwitchTheme = (nextPreset: ThemePreset) => {
    setThemePreset(nextPreset);
    setAiDemoIdea(null);
    const defaultTitle = DEMO_WISHLISTS[nextPreset].title;
    setWishlistTitle(defaultTitle);
    saveDraftToStorage(nextPreset, defaultTitle, draftItems);
  };

  const addDraftItemDirect = (newItem: UnifiedGiftCardItem) => {
    const updated = [newItem, ...draftItems];
    setDraftItems(updated);
    saveDraftToStorage(themePreset, wishlistTitle, updated);
    triggerToast('✨ Мрію додано у ваш список! Можете одразу зберегти лінк для друзів.');
  };

  const handleAddDraftByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;

    setIsParsing(true);
    try {
      let candidateUrl = raw;
      const igMatch = raw.match(/@([a-zA-Z0-9._]{2,30})/);
      if (!/^https?:\/\//i.test(candidateUrl) && candidateUrl.includes('.')) {
        candidateUrl = `https://${candidateUrl}`;
      }

      let newItem: UnifiedGiftCardItem;
      try {
        const parsed = await parseProductUrlAction(candidateUrl);
        newItem = {
          id: `draft-${Date.now()}`,
          title: parsed.title,
          emoji: parsed.emoji || '✨',
          description:
            parsed.description || 'Додано за прямим посиланням з офіційного магазину ✨',
          price: parsed.price ?? (themePreset === 'rose_luxury' ? 4500 : 3999),
          currency: parsed.currency || 'UAH',
          imageUrl: parsed.imageUrl,
          originalUrl: parsed.originalUrl,
          affiliateUrl: parsed.affiliateUrl,
          instagramHandle: parsed.instagramHandle ?? igMatch?.[1],
          isBooked: false,
        };
      } catch {
        const isFlowers =
          raw.toLowerCase().includes('півон') || raw.toLowerCase().includes('букет');
        newItem = {
          id: `draft-${Date.now()}`,
          title: raw.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 90),
          emoji: isFlowers ? '🌸' : themePreset === 'rose_luxury' ? '✨' : '⚡',
          description: isFlowers
            ? 'Оплатіть у Direct магазину — вони самі узгодять час і місце доставки!'
            : 'Можна забронювати або відкрити спільний збір у Монобанку ✨',
          price: isFlowers ? 4200 : themePreset === 'rose_luxury' ? 5400 : 4900,
          currency: 'UAH',
          imageUrl: isFlowers
            ? 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=700&q=80'
            : undefined,
          originalUrl: candidateUrl.startsWith('http') ? candidateUrl : undefined,
          affiliateUrl: candidateUrl.startsWith('http') ? candidateUrl : undefined,
          instagramHandle: igMatch?.[1],
          isBooked: false,
        };
      }

      addDraftItemDirect(newItem);
      setUrlInput('');
    } finally {
      setIsParsing(false);
    }
  };

  const handleRemoveDraftItem = (item: UnifiedGiftCardItem) => {
    const updated = draftItems.filter((i) => i.id !== item.id);
    setDraftItems(updated);
    saveDraftToStorage(themePreset, wishlistTitle, updated);
  };

  const handleCompleteOnboarding = (providerName: string) => {
    saveDraftToStorage(themePreset, wishlistTitle, draftItems);
    setShowAuthModal(false);
    router.push(`/dashboard?theme=${themePreset}&auth=${providerName}`);
  };

  const tokens = THEME_TOKENS[themePreset];
  const currentDemoWishlist = DEMO_WISHLISTS[themePreset];
  const heroDemoItem = currentDemoWishlist.items[0]!;

  const liveHeroCard: UnifiedGiftCardItem = {
    ...heroDemoItem,
    jarCurrentAmount: demoBooked[themePreset]
      ? heroDemoItem.jarTargetAmount
      : demoJarAmount[themePreset],
    isBooked: demoBooked[themePreset],
    bookedByName: demoBooked[themePreset] ? 'Вами щойно! 💎' : undefined,
  };

  return (
    <div className={`min-h-screen ${tokens.meshClass} text-white spring-transition`}>
      {/* Спливаючий Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950/95 backdrop-blur-xl rounded-2xl px-4 py-3 border border-emerald-400/50 shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-extrabold text-emerald-300">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Компактна шапка навігації */}
      <header className="sticky top-0 z-30 border-b border-white/15 bg-[#090e1a]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px]`}
            >
              <div className="w-full h-full bg-[#161324] rounded-[14px] flex items-center justify-center text-lg">
                🎁
              </div>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white">Mriyii</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                100% Безкоштовно
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className="py-2 px-3 rounded-xl text-xs font-extrabold bg-white/10 hover:bg-white/20 text-white border border-white/20 spring-transition"
            >
              👀 Приклад профілю
            </Link>
            <Link
              href={`/dashboard?theme=${themePreset}`}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold ${tokens.primaryCtaGradient} text-white spring-transition active:scale-95`}
            >
              Мій кабінет →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-10">
        {/* ================================================================= */}
        {/* ЕКРАН 1 (SPLIT HERO): ОФЕР + БІЛА КАПСУЛА СТАРТУ (ЗЛІВА)          */}
        {/* ТА ЖИВИЙ ІНТЕРАКТИВНИЙ ПРОФІЛЬ З МОНОБАНКОЮ І ШІ (СПРАВА)        */}
        {/* ================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ЛІВА КОЛОНКА (5 cols): Проблема -> Рішення -> Миттєвий старт у Білій Капсулі */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-extrabold text-amber-300">
              <span>✨ Link-in-Bio для бажань • Як Linktree, але для подарунків</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-[1.12]">
              Тобі дарують саме те, про що ти мрієш — без незручних натяків і хаосу в чатах 🎁
            </h1>

            {/* Чітка структура: Проблема -> Рішення -> Сюрприз (без «води») */}
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-start gap-2.5">
                <span className="text-base shrink-0">❌</span>
                <div>
                  <span className="font-extrabold text-rose-200">Знайома проблема?</span>{' '}
                  <span className="text-white/90 font-medium">
                    Друзі питають «Що тобі подарувати?», дарують непотрібні сувеніри або губляться в табличках.
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-start gap-2.5">
                <span className="text-base shrink-0">✅</span>
                <div>
                  <span className="font-extrabold text-emerald-300">Рішення за 30 секунд:</span>{' '}
                  <span className="text-white/90 font-medium">
                    Один стильний лінк із твоїми розмірами, Монобанкою на дорогі мрії, квітами з Instagram та ШІ-консьєржем.
                  </span>
                </div>
              </div>
            </div>

            {/* Перемикач теми прямо над капсулою старту */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-white/90">
                <span>1. Обери стиль свого профілю:</span>
                <span className="text-emerald-300 font-extrabold">Без реєстрації для старту</span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/35 border border-white/15">
                <button
                  type="button"
                  onClick={() => handleSwitchTheme('rose_luxury')}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold spring-transition ${
                    themePreset === 'rose_luxury'
                      ? 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 text-white shadow-lg'
                      : 'text-white/75 hover:text-white'
                  }`}
                >
                  👩 Для неї (Rose)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTheme('cyber_titanium')}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold spring-transition ${
                    themePreset === 'cyber_titanium'
                      ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 text-white shadow-lg'
                      : 'text-white/75 hover:text-white'
                  }`}
                >
                  👨 Для нього (Cyber)
                </button>
              </div>
            </div>

            {/* СУЦІЛЬНА БІЛА КАПСУЛА ВВОДУ (Головний магніт уваги на першому екрані!) */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-white/90">
                2. Встав посилання на товар або натисни готовий приклад нижче:
              </div>
              <form
                onSubmit={handleAddDraftByUrl}
                className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-2 border-white"
              >
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Встав лінк (Rozetka, Apple, @instagram) або назву..."
                  className="flex-1 px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-950 placeholder:text-slate-400 bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isParsing}
                  className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-black ${tokens.primaryCtaGradient} text-white shrink-0 spring-transition active:scale-95 flex items-center justify-center gap-1.5`}
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Додаємо...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>+ Додати мрію</span>
                    </>
                  )}
                </button>
              </form>

              {/* Швидкі 1-клік демо-кнопки з wishjar.tsx */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-bold text-white/80">Тест у 1 клік:</span>
                {currentDemoWishlist.items.slice(0, 3).map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() =>
                      addDraftItemDirect({
                        ...sample,
                        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        isBooked: false,
                      })
                    }
                    className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-extrabold border border-white/20 spring-transition active:scale-95"
                  >
                    + {sample.emoji} {sample.title.split(' ').slice(0, 3).join(' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ПРАВА КОЛОНКА (7 cols): ЖИВА ІНТЕРАКТИВНА ДЕМОНСТРАЦІЯ ДОДАТКУ (Linktree + ШІ + Картка з Фото) */}
          <div className="lg:col-span-7 bg-black/30 backdrop-blur-xl rounded-[30px] p-3.5 sm:p-5 border border-white/20 shadow-2xl space-y-3.5">
            {/* Панель керування живим прев'ю */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/15 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
                <span className="font-extrabold text-white">
                  📱 Живе демо додатку (поклацай кнопки!):
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setForceFallbackPoster((p) => !p)}
                  className="px-2.5 py-1 rounded-full font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 flex items-center gap-1"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                  <span>{forceFallbackPoster ? '✨ Smart Постер' : '🖼️ З фото товару'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setRolePreview((prev) => (prev === 'guest' ? 'owner' : 'guest'))
                  }
                  className="px-3 py-1 rounded-full font-extrabold bg-amber-400 text-slate-950 shadow flex items-center gap-1"
                >
                  {rolePreview === 'guest' ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>👀 Очима Гостя</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>👑 Очима Іменинника</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Комбінований макет із linktree_wishjar_ultimate.html: Зліва Профіль + ШІ, Справа Насичена Картка з Фото */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
              {/* Блок 1 + Блок 2 (5 cols): Linktree Міні-Профіль + ШІ-Асистент на старті */}
              <div className="sm:col-span-5 space-y-2.5">
                {/* 1. Linktree Mini-Profile із кольоровими чіпсами анкети */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] p-3.5 text-center text-white">
                  <div className="flex items-center justify-between text-[10px] font-bold text-white/85 mb-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-white/15">
                      mriyii.app/{currentDemoWishlist.slug}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-400/25 text-emerald-200 border border-emerald-400/30">
                      🎂 До ДН {currentDemoWishlist.daysLeft} днів
                    </span>
                  </div>

                  {/* Кругла аватарка у градієнтному кільці */}
                  <div className="relative inline-block">
                    <div
                      className={`w-16 h-16 rounded-full ${tokens.avatarRingClass} p-[2.5px] shadow-lg mx-auto`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentDemoWishlist.ownerAvatarUrl}
                        alt={currentDemoWishlist.ownerName}
                        className="w-full h-full rounded-full object-cover border-2 border-slate-950"
                      />
                    </div>
                    <span className="absolute -bottom-1 right-0 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-300 text-slate-950 shadow">
                      VIP ✨
                    </span>
                  </div>

                  <h2 className="text-sm font-black mt-2 tracking-tight">
                    {currentDemoWishlist.title}
                  </h2>
                  <p className="text-[11px] text-white/85 mt-0.5 leading-snug">
                    {currentDemoWishlist.ownerBio}
                  </p>

                  {/* 3 Кольорові чіпси-факти про власника прямо під біо */}
                  <div className="flex flex-wrap justify-center gap-1 mt-2.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                      📏 {currentDemoWishlist.aiSizes}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-pink-400/25 text-pink-100 border border-pink-400/30">
                      💖 {currentDemoWishlist.aiHobbies.slice(0, 2).join(', ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/25 text-rose-200 border border-rose-400/30">
                      🚫 {currentDemoWishlist.aiAntiGifts[0]}
                    </span>
                  </div>
                </div>

                {/* 2. Віджет «🤖 ШІ-Асистент подарунків» прямо під профілем! */}
                <div
                  className={`${tokens.aiBannerGradient} rounded-[24px] p-3.5 text-white shadow-xl border border-white/25 space-y-2 spring-transition`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-base shrink-0">
                      🤖
                    </div>
                    <div>
                      <div className="text-xs font-black tracking-tight flex items-center gap-1">
                        <span>ШІ-Асистент подарунків</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-300 text-slate-950 font-black">
                          Gemini
                        </span>
                      </div>
                      <div className="text-[10px] text-white/90">
                        Врахує розміри й табу та запропонує сюрприз під твій бюджет:
                      </div>
                    </div>
                  </div>

                  {/* 3 кнопки швидкого вибору бюджету в 1 клік */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAiDemoIdea({
                          budget: 'до 1 000 ₴',
                          title:
                            themePreset === 'rose_luxury'
                              ? 'Дріп-кава MadHeads Specialty Set'
                              : 'Пуровер Hario V60 Craft Set',
                          price: '750 ₴',
                          booked: false,
                        })
                      }
                      className="py-1.5 px-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-[11px] font-extrabold spring-transition active:scale-95"
                    >
                      до 1 000 ₴
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAiDemoIdea({
                          budget: '~1 500 ₴',
                          title:
                            themePreset === 'rose_luxury'
                              ? 'Термокружка Fellow Carter Mug White'
                              : 'Підставка MagSafe Ugreen Qi2',
                          price: '1 650 ₴',
                          booked: false,
                        })
                      }
                      className="py-1.5 px-2 rounded-xl bg-white text-slate-950 text-[11px] font-extrabold shadow spring-transition active:scale-95"
                    >
                      ✨ ~1 500 ₴
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAiDemoIdea({
                          budget: 'VIP 💎',
                          title:
                            themePreset === 'rose_luxury'
                              ? 'Букет 25 білих півоній @kamelia_flowers'
                              : 'Кастомні кейкапи PBTfans Set',
                          price: '4 200 ₴',
                          booked: false,
                        })
                      }
                      className="py-1.5 px-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-[11px] font-extrabold spring-transition active:scale-95"
                    >
                      VIP 💎
                    </button>
                  </div>

                  {/* Миттєвий результат ШІ прямо в банері */}
                  {aiDemoIdea && (
                    <div className="bg-slate-950/70 backdrop-blur-md rounded-xl p-2.5 border border-white/20 flex items-center justify-between gap-2 text-[11px]">
                      <div className="min-w-0">
                        <div className="text-amber-300 font-extrabold truncate">
                          💡 {aiDemoIdea.title}
                        </div>
                        <div className="text-white/85 text-[10px]">
                          {aiDemoIdea.price} • Точний збіг з анкетою!
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAiDemoIdea({ ...aiDemoIdea, booked: true });
                          triggerToast(
                            '🤫 Таємний ШІ-сюрприз заброньовано! Іменинник не побачить його до свята.'
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] shrink-0 ${
                          aiDemoIdea.booked
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-amber-300 text-slate-950'
                        }`}
                      >
                        {aiDemoIdea.booked ? '✅ Заброньовано!' : '🎁 Подарувати'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Блок 3 (7 cols): Насичена Картка з Фото на Суцільному Білому Тлі */}
              <div className="sm:col-span-7">
                <SmokedGiftCard
                  item={liveHeroCard}
                  themePreset={themePreset}
                  viewMode={rolePreview}
                  ownerInstagramHandle={currentDemoWishlist.ownerInstagramHandle}
                  forceFallbackPoster={forceFallbackPoster}
                  isBookedByCurrentVisitor={demoBooked[themePreset]}
                  onInstagramOrderToast={triggerToast}
                  onDonateSimulateClick={() => {
                    const step = 2000;
                    const target = heroDemoItem.jarTargetAmount ?? 26000;
                    setDemoJarAmount((prev) => {
                      const nextVal = Math.min(target, prev[themePreset] + step);
                      if (nextVal >= target) {
                        setDemoBooked((b) => ({ ...b, [themePreset]: true }));
                        triggerToast('🎉 Монобанку зібрано на 100%!');
                      } else {
                        triggerToast('🐈‍⬛ +2 000 ₴ додано у Монобанку (демо)!');
                      }
                      return { ...prev, [themePreset]: nextVal };
                    });
                  }}
                  onCloseJar100SimulateClick={() => {
                    const target = heroDemoItem.jarTargetAmount ?? 26000;
                    setDemoJarAmount((prev) => ({ ...prev, [themePreset]: target }));
                    setDemoBooked((prev) => ({ ...prev, [themePreset]: true }));
                    triggerToast('👑 Ви закрили 100% збору на мрію!');
                  }}
                  onBookClick={() => {
                    setDemoBooked((prev) => ({ ...prev, [themePreset]: true }));
                    triggerToast('💎 Подарунок заброньовано!');
                  }}
                  onCancelBookingClick={() => {
                    setDemoBooked((prev) => ({ ...prev, [themePreset]: false }));
                    setDemoJarAmount((prev) => ({
                      ...prev,
                      [themePreset]: themePreset === 'rose_luxury' ? 19500 : 24500,
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Якщо користувач вже додав власні мрії в білу капсулу (Delayed Auth чернетка) */}
        {draftItems.length > 0 && (
          <section className="bg-white/10 backdrop-blur-xl rounded-[28px] p-5 border-2 border-emerald-400/50 space-y-4 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                  Готово до публікації
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                  🎉 Ваш власний список бажань ({draftItems.length}{' '}
                  {draftItems.length === 1 ? 'мрія' : 'мрії'})
                </h2>
                <p className="text-xs font-semibold text-white/85">
                  Збережіть вішліст у 1 клік, щоб отримати своє посилання mriyii.app/ваш-нік для Instagram Bio та друзів!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="py-3 px-6 rounded-2xl text-xs sm:text-sm font-black bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-xl spring-transition active:scale-95 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Зберегти та отримати лінк</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {draftItems.map((item) => (
                <SmokedGiftCard
                  key={item.id}
                  item={item}
                  themePreset={themePreset}
                  viewMode="owner"
                  ownerInstagramHandle={currentDemoWishlist.ownerInstagramHandle}
                  onDeleteClick={handleRemoveDraftItem}
                />
              ))}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* ЕКРАН 2: ЧОМУ ЦЕ ВАРТО — 3 КОНКРЕТНІ РІШЕННЯ НА СУЦІЛЬНОМУ БІЛОМУ */}
        {/* ================================================================= */}
        <section className="space-y-4">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Чому Mriyii замінює чати в Telegram, нотатки та старі вішлісти?
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-white/80">
              Кожна деталь створена під українські реалії: Монобанка, Instagram-шоуруми та 100% захист сюрпризу.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="solid-white-card rounded-[24px] p-5 space-y-2 border border-white">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-black">
                  🫙
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  Групові збори
                </span>
              </div>
              <h3 className="text-base font-black text-slate-950">
                1. Спільний збір на Монобанку
              </h3>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Мрієш про Dyson чи PS5 Pro за 26 000 ₴? Прикріпи Банку Monobank — друзі скидаються комфортною сумою і бачать живий прогрес збору без табличок.
              </p>
            </div>

            <div className="solid-white-card rounded-[24px] p-5 space-y-2 border border-white">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-800 flex items-center justify-center text-xl font-black">
                  🌸
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-900">
                  Instagram Direct
                </span>
              </div>
              <h3 className="text-base font-black text-slate-950">
                2. Квіти та шоуруми без твоєї адреси
              </h3>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Вкажи улюблені півонії чи сукню з @шоуруму. Гість оплачує подарунок у Direct магазину в 1 клік, а кур’єр сам спитає в тебе зручний час і місце доставки!
              </p>
            </div>

            <div className="solid-white-card rounded-[24px] p-5 space-y-2 border border-white">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center text-xl font-black">
                  🤖
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900">
                  Gemini 2.5 + Сюрприз
                </span>
              </div>
              <h3 className="text-base font-black text-slate-950">
                3. Жодних дублів і 100% інтрига
              </h3>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Гості бачать зайняті лоти або просять ШІ підібрати сюрприз за твоїми розмірами й табу. А для тебе імена дарувальників відкриються лише у день свята!
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* ЕКРАН 3: ЖИВІ ПРИКЛАДИ КАРТОК ІЗ ТЕКУЧОГО ВІШЛІСТА + 0% КОМІСІЇ   */}
        {/* ================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white">
                🔥 Приклад вішліста: {currentDemoWishlist.title}
              </h2>
              <p className="text-xs font-semibold text-white/80">
                Спробуй замовити букет у Direct або забронювати подарунок прямо тут:
              </p>
            </div>
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className="py-2 px-4 rounded-xl text-xs font-extrabold bg-white text-slate-950 shadow inline-flex items-center gap-1.5"
            >
              <span>Відкрити повну сторінку /w/{currentDemoWishlist.slug}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentDemoWishlist.items.slice(1, 4).map((item) => (
              <SmokedGiftCard
                key={item.id}
                item={item}
                themePreset={themePreset}
                viewMode={rolePreview}
                ownerInstagramHandle={currentDemoWishlist.ownerInstagramHandle}
                forceFallbackPoster={forceFallbackPoster}
                onInstagramOrderToast={triggerToast}
                onBookClick={() =>
                  triggerToast('💎 Подарунок заброньовано! Сюрприз-захист увімкнено.')
                }
              />
            ))}
          </div>
        </section>

        <AffiliateDisclosureBadge />
      </main>

      {/* Модалка Delayed Auth (Збереження чернетки за 1 клік) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="solid-white-card rounded-[28px] w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  Фінальний крок • 10 секунд
                </span>
                <h3 className="text-xl font-black text-slate-950 mt-2">
                  Збережіть ваш вішліст ✨
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  Ваша тема ({tokens.label}) та додані мрії ({draftItems.length} шт.) миттєво перенесуться у ваш персональний лінк.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleCompleteOnboarding('google')}
                className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold ${tokens.primaryCtaGradient} text-white flex items-center justify-center gap-2`}
              >
                <span>🚀 Продовжити з Google (1 клік)</span>
              </button>
              <button
                type="button"
                onClick={() => handleCompleteOnboarding('apple')}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-slate-950 text-white flex items-center justify-center gap-2"
              >
                <span>🍎 Продовжити з Apple ID</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Компактний футер */}
      <footer className="border-t border-white/15 bg-black/30 mt-10">
        <div className="mx-auto max-w-6xl px-4 py-5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-white/80">
          <span>© 2026 Mriyii — 100% безкоштовний Link-in-Bio вішліст із Монобанкою та ШІ</span>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="hover:text-white">
              Демо-стенд
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Конфіденційність
            </Link>
            <Link href="/terms" className="hover:text-white">
              Умови
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
