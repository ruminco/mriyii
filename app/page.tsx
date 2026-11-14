'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Copy,
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
  const sandboxInputRef = useRef<HTMLInputElement | null>(null);

  const [themePreset, setThemePreset] = useState<ThemePreset>('rose_luxury');
  const [rolePreview, setRolePreview] = useState<'guest' | 'owner'>('guest');
  const [forceFallbackPoster, setForceFallbackPoster] = useState(false);

  // Інтерактивний стан ШІ-консьєржа
  const [aiDemoIdea, setAiDemoIdea] = useState<{
    budget: string;
    title: string;
    price: string;
    reason: string;
    booked: boolean;
  } | null>({
    budget: '~1 500 ₴',
    title: 'Термокружка Fellow Carter Move Mug White + Дріп-сет MadHeads',
    price: '1 650 ₴',
    reason: 'Враховано хобі: спешелті кава та естетика білого мінімалізму',
    booked: false,
  });

  // Поля Delayed Auth капсули (додавання бажань без логіну)
  const [urlInput, setUrlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [draftItems, setDraftItems] = useState<UnifiedGiftCardItem[]>([]);
  const [wishlistTitle, setWishlistTitle] = useState(DEMO_WISHLISTS.rose_luxury.title);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Живий інтерактивний стан для головної демо-картки
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
    setTimeout(() => setToastMessage(null), 3800);
  };

  const scrollToSandbox = (prefillText?: string) => {
    if (prefillText) {
      setUrlInput(prefillText);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      sandboxInputRef.current?.focus();
    }, 350);
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
    setAiDemoIdea(
      nextPreset === 'rose_luxury'
        ? {
            budget: '~1 500 ₴',
            title: 'Термокружка Fellow Carter Move Mug White + Дріп-сет MadHeads',
            price: '1 650 ₴',
            reason: 'Враховано хобі: спешелті кава та естетика білого мінімалізму',
            booked: false,
          }
        : {
            budget: '~1 500 ₴',
            title: 'Зарядна станція MagSafe Ugreen Qi2 3-in-1 Aluminum',
            price: '1 850 ₴',
            reason: 'Враховано сетап: Apple Pro Desk та мінімалізм без кабелів',
            booked: false,
          }
    );
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
    if (!raw) {
      sandboxInputRef.current?.focus();
      return;
    }

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
          currency: 'UAH',
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
          emoji: isFlowers ? '💐' : themePreset === 'rose_luxury' ? '✨' : '⚡',
          description: isFlowers
            ? 'Магазин сам уточнить час та місце доставки в Direct — без розкриття домашньої адреси!'
            : 'Можна забронювати або відкрити спільний збір на рідну Монобанку у гривні (₴ UAH) ✨',
          price: isFlowers ? 4200 : themePreset === 'rose_luxury' ? 5400 : 4900,
          currency: 'UAH',
          imageUrl: isFlowers
            ? 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=700&q=80'
            : undefined,
          originalUrl: candidateUrl.startsWith('http') ? candidateUrl : undefined,
          affiliateUrl: candidateUrl.startsWith('http') ? candidateUrl : undefined,
          instagramHandle: igMatch?.[1] ?? (isFlowers ? 'kamelia_flowers_kyiv' : undefined),
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
  const flowerDemoItem =
    currentDemoWishlist.items.find((i) => i.instagramHandle) ?? currentDemoWishlist.items[1]!;

  const liveHeroCard: UnifiedGiftCardItem = {
    ...heroDemoItem,
    jarCurrentAmount: demoBooked[themePreset]
      ? heroDemoItem.jarTargetAmount
      : demoJarAmount[themePreset],
    isBooked: demoBooked[themePreset],
    bookedByName: demoBooked[themePreset] ? 'Вами щойно! 💎' : undefined,
  };

  const highlightCapsClass =
    themePreset === 'rose_luxury'
      ? 'bg-gradient-to-r from-amber-200 via-pink-300 to-amber-300 bg-clip-text text-transparent font-black uppercase tracking-tight'
      : 'bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent font-black uppercase tracking-tight';

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
      <header className="sticky top-0 z-30 border-b border-white/15 bg-[#090e1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px]`}
            >
              <div className="w-full h-full bg-[#161324] rounded-[14px] flex items-center justify-center text-lg">
                🎁
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">Mriyii</span>
              <span className="hidden md:inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/35">
                ₴ Тільки гривня (UAH) • 0% комісії
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className="py-2 px-3 rounded-xl text-xs font-extrabold bg-white/10 hover:bg-white/20 text-white border border-white/20 spring-transition"
            >
              👀 Приклад вішліста
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

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-16 sm:space-y-24">
        {/* ================================================================= */}
        {/* СЕКЦІЯ 1: HERO + ІНТЕРАКТИВНА ПІСОЧНИЦЯ ЗА 30 СЕК (DELAYED AUTH)  */}
        {/* ================================================================= */}
        <section id="section-1-hero" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ЛІВА КОЛОНКА (5 cols): Великий емоційний офер + Біла Капсула Пісочниці */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[10px] sm:text-[11px] font-extrabold text-amber-300 uppercase tracking-wider">
                ✨ РОЗУМНИЙ ВІШЛІСТ НОВОГО ПОКОЛІННЯ • МОНОБАНКА • INSTAGRAM • ШІ
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-[10px] font-black text-emerald-200">
                ₴ Тільки гривня (UAH)
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-[1.12]">
              Отримуй те, про що <span className={highlightCapsClass}>СПРАВДІ МРІЄШ</span>. Даруй
              те, від чого <span className={highlightCapsClass}>СЯЮТЬ ОЧІ</span>.
            </h1>

            <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
              Зроби тих, кого любиш, по-справжньому щасливими. Створи красивий список своїх бажань
              за 30 секунд — від улюблених квітів та речей з Instagram-шоурумів до спільного збору
              на Монобанку.
            </p>

            {/* Перемикач теми: Для неї / Для нього */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-extrabold text-white">
                <span>1. Обери свій стиль:</span>
                <span className="text-emerald-300">Спробуй прямо тут за 10 секунд ↓</span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/40 border border-white/20">
                <button
                  type="button"
                  onClick={() => handleSwitchTheme('rose_luxury')}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold spring-transition ${
                    themePreset === 'rose_luxury'
                      ? 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 text-white shadow-lg'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  👩 Для неї • Rose Luxury
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTheme('cyber_titanium')}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold spring-transition ${
                    themePreset === 'cyber_titanium'
                      ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 text-white shadow-lg'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  👨 Для нього • Cyber Titanium
                </button>
              </div>
            </div>

            {/* СУЦІЛЬНА БІЛА КАПСУЛА ВВОДУ (Delayed Auth Sandbox) */}
            <div className="space-y-2.5">
              <form
                onSubmit={handleAddDraftByUrl}
                className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col gap-2 border-2 border-white"
              >
                <input
                  ref={sandboxInputRef}
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Встав посилання з будь-якого сайту або Instagram-магазину..."
                  className="w-full px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-950 placeholder:text-slate-500 bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isParsing}
                  className={`w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-black ${tokens.primaryCtaGradient} text-white shrink-0 spring-transition active:scale-95 flex items-center justify-center gap-2 shadow-lg`}
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Розпізнаємо товар та ціну в ₴...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>✨ Загадати перше бажання</span>
                    </>
                  )}
                </button>
              </form>

              {/* Швидкі чіпси для тесту в 1 клік */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-slate-200">
                  Швидкі чіпси у 1 клік:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    addDraftItemDirect({
                      ...DEMO_WISHLISTS.rose_luxury.items[0]!,
                      id: `draft-dyson-${Date.now()}`,
                      isBooked: false,
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-extrabold border border-white/20 spring-transition active:scale-95"
                >
                  ✨ Стайлер Dyson Airwrap
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addDraftItemDirect({
                      id: `draft-airpods-${Date.now()}`,
                      title: 'Навушники Apple AirPods Max Midnight USB-C',
                      emoji: '🎧',
                      description: 'Оригінальні бездротові навушники з активним шумозаглушенням.',
                      price: 23999,
                      currency: 'UAH',
                      imageUrl:
                        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=80',
                      jarTargetAmount: 23999,
                      jarCurrentAmount: 14500,
                      isBooked: false,
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-extrabold border border-white/20 spring-transition active:scale-95"
                >
                  🎧 Навушники AirPods Max
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addDraftItemDirect({
                      ...DEMO_WISHLISTS.rose_luxury.items[1]!,
                      id: `draft-peonies-${Date.now()}`,
                      isBooked: false,
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-extrabold border border-white/20 spring-transition active:scale-95"
                >
                  💐 Білі півонії з Instagram
                </button>
              </div>

              {/* Мікро-підпис довіри під інпутом */}
              <div className="text-[11px] font-bold text-slate-200 bg-black/30 border border-white/15 rounded-xl px-3 py-2 leading-snug">
                🔒 Без реєстрації для старту • 0% комісії сервісу • Для друзів бронювання без входу
                на сайт • <span className="text-emerald-300 font-black">₴ Тільки гривня (UAH)</span>
              </div>
            </div>
          </div>

          {/* ПРАВА КОЛОНКА (7 cols): ЖИВИЙ ІНТЕРАКТИВНИЙ ПРОФІЛЬ (Linktree + ШІ + Картка з Фото) */}
          <div className="lg:col-span-7 bg-[#0f111a]/80 backdrop-blur-2xl rounded-[30px] p-3.5 sm:p-5 border border-white/25 shadow-2xl space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/15 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-dot" />
                <span className="font-extrabold text-white">
                  📱 Жива демонстрація (поклацай кнопки гостя та іменинника!):
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
                      <span>🎁 Очима Гостя</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>👀 Очима Іменинника</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
              {/* Linktree Міні-Профіль + ШІ-Асистент на старті */}
              <div className="sm:col-span-5 space-y-2.5">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] p-3.5 text-center text-white">
                  <div className="flex items-center justify-between text-[10px] font-bold text-white mb-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-white/15">
                      mriyii.app/{currentDemoWishlist.slug}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-400/25 text-emerald-200 border border-emerald-400/30">
                      🎂 До ДН {currentDemoWishlist.daysLeft} днів
                    </span>
                  </div>

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

                  <h2 className="text-sm font-black mt-2 tracking-tight text-white">
                    {currentDemoWishlist.title}
                  </h2>
                  <p className="text-[11px] text-slate-200 font-semibold mt-0.5 leading-snug">
                    {currentDemoWishlist.ownerBio}
                  </p>

                  <div className="flex flex-wrap justify-center gap-1 mt-2.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                      📏 {currentDemoWishlist.aiSizes}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-pink-400/25 text-pink-100 border border-pink-400/30">
                      🌸 {currentDemoWishlist.aiFlowerPreferences?.split('.')[0]}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/25 text-rose-200 border border-rose-400/30">
                      🚫 {currentDemoWishlist.aiAntiGifts[0]}
                    </span>
                  </div>
                </div>

                {/* Віджет ШІ-Асистента прямо під профілем */}
                <div
                  className={`${tokens.aiBannerGradient} rounded-[24px] p-3.5 text-white shadow-xl border border-white/25 space-y-2 spring-transition`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-base shrink-0">
                      🤖
                    </div>
                    <div>
                      <div className="text-xs font-black tracking-tight flex items-center gap-1">
                        <span>ШІ-Агент подарунків</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-300 text-slate-950 font-black">
                          Gemini
                        </span>
                      </div>
                      <div className="text-[10px] text-white/95 font-semibold">
                        Таємний сюрприз за 10 сек під бюджет гостя:
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAiDemoIdea({
                          budget: 'До 1 000 ₴',
                          title:
                            themePreset === 'rose_luxury'
                              ? 'Дріп-кава MadHeads Specialty Set'
                              : 'Пуровер Hario V60 Craft Set',
                          price: '750 ₴',
                          reason: '100% збіг із анкетою смаків іменинника',
                          booked: false,
                        })
                      }
                      className="py-1.5 px-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-[11px] font-extrabold spring-transition active:scale-95"
                    >
                      До 1 000 ₴
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAiDemoIdea({
                          budget: 'До 3 000 ₴',
                          title:
                            themePreset === 'rose_luxury'
                              ? 'Термокружка Fellow Carter Mug White'
                              : 'Підставка MagSafe Ugreen Qi2',
                          price: '1 650 ₴',
                          reason: 'Враховано улюблений стиль і табу',
                          booked: false,
                        })
                      }
                      className="py-1.5 px-2 rounded-xl bg-white text-slate-950 text-[11px] font-extrabold shadow spring-transition active:scale-95"
                    >
                      ✨ До 3 000 ₴
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
                          reason: 'Топовий сюрприз із вау-ефектом',
                          booked: false,
                        })
                      }
                      className="py-1.5 px-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-[11px] font-extrabold spring-transition active:scale-95"
                    >
                      VIP 💎
                    </button>
                  </div>

                  {aiDemoIdea && (
                    <div className="bg-slate-950/75 backdrop-blur-md rounded-xl p-2.5 border border-white/20 flex items-center justify-between gap-2 text-[11px]">
                      <div className="min-w-0">
                        <div className="text-amber-300 font-extrabold truncate">
                          💡 {aiDemoIdea.title}
                        </div>
                        <div className="text-slate-200 font-semibold text-[10px] tabular-nums">
                          {aiDemoIdea.price} • Таємний лот (isAiSurprise)
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

              {/* Картка товару з фото на суцільному білому фоні */}
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
          <section className="bg-[#0f111a]/90 backdrop-blur-2xl rounded-[30px] p-5 sm:p-6 border-2 border-emerald-400/60 space-y-4 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                  Delayed Auth • Чернетка збережена в браузері
                </span>
                <h2 className="text-lg sm:text-2xl font-black text-white mt-1">
                  🎉 Ваш список бажань готовий ({draftItems.length}{' '}
                  {draftItems.length === 1 ? 'мрія' : 'мрії'})
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-200">
                  Збережіть вішліст у 1 клік, щоб отримати своє посилання mriyii.app/ваш-нік для
                  Instagram Bio та друзів!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-xl spring-transition active:scale-95 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Зберегти та отримати посилання</span>
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
        {/* СЕКЦІЯ 2: УДАР У ГОЛОВНИЙ БІЛЬ — АНТИ-ХАОС У TELEGRAM (ДО / ПІСЛЯ) */}
        {/* ================================================================= */}
        <section
          id="section-2-anti-chaos"
          className="bg-[#0f111a]/80 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 border border-white/20 shadow-2xl space-y-8"
        >
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-xs font-black uppercase tracking-wider text-rose-200">
              💥 ПРОЩАВАЙ, СТАРИЙ ХАОС
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Більше <span className={highlightCapsClass}>ЖОДНИХ ТАЄМНИХ ЧАТІВ У TELEGRAM</span>{' '}
              «То що даруємо?» та <span className={highlightCapsClass}>НЕЗРУЧНИХ НАТЯКІВ</span>.
            </h2>
            <p className="text-sm sm:text-base font-semibold text-slate-200 leading-relaxed">
              Одне естетичне посилання в профілі чи сторіс замінює 100 повідомлень, рятує друзів
              від ступору, а тебе — від двох однакових подарунків.
            </p>
          </div>

          {/* 2 Контрастні Картки «До / Після» (Uklon Split-Screen) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Ліва картка — Як було раніше 😩 */}
            <div className="rounded-[28px] p-6 bg-gradient-to-br from-rose-950/80 via-[#1f0d1d]/90 to-slate-950/90 border border-rose-500/40 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-rose-400/25">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30">
                      Як було раніше 😩
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-2">
                      Чат «🤫 ДН Ані (БЕЗ АНІ!)» • 15 учасників
                    </h3>
                  </div>
                  <span className="text-2xl">🤦‍♀️</span>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm font-semibold text-slate-200">
                  <li className="flex items-start gap-3 bg-black/35 rounded-2xl p-3.5 border border-rose-400/20">
                    <span className="text-base shrink-0">❌</span>
                    <span>
                      Новий чат у Telegram на 15 людей за два дні до свята:{' '}
                      <strong className="text-white">
                        «По скільки скидаємось? Хто збирає на карту?»
                      </strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3 bg-black/35 rounded-2xl p-3.5 border border-rose-400/20">
                    <span className="text-base shrink-0">❌</span>
                    <span>
                      Незручне питання в лоб{' '}
                      <strong className="text-white">«Що тобі подарувати?»</strong> і відповідь{' '}
                      <strong className="text-rose-200">«Та мені нічого не треба...»</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3 bg-black/35 rounded-2xl p-3.5 border border-rose-400/20">
                    <span className="text-base shrink-0">❌</span>
                    <span>
                      Подаровані навмання сертифікати, сувеніри або не той колір і розмір.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="text-xs font-extrabold text-rose-300 bg-rose-500/15 border border-rose-400/30 rounded-xl px-4 py-2.5 text-center">
                Результат: стрес для друзів та натягнута посмішка іменинника 😬
              </div>
            </div>

            {/* Права картка — Як працює Mriyii ✨ */}
            <div className="rounded-[28px] p-6 bg-gradient-to-br from-emerald-950/75 via-[#0f1f26]/90 to-slate-950/95 border-2 border-emerald-400/50 shadow-2xl flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-emerald-400/25">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                      Як працює Mriyii ✨
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-2">
                      Один преміальний лінк mriyii.app/твоє-імя
                    </h3>
                  </div>
                  <span className="text-2xl">🥂</span>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm font-semibold text-slate-200">
                  <li className="flex items-start gap-3 bg-white/10 rounded-2xl p-3.5 border border-emerald-400/30">
                    <span className="text-base shrink-0">✅</span>
                    <span>
                      <strong className="text-emerald-300 font-black uppercase">
                        ДРУЗЯМ НЕ ТРЕБА РЕЄСТРУВАТИСЯ
                      </strong>{' '}
                      — відкрили твоє посилання і забронювали подарунок за 1 клік.
                    </span>
                  </li>
                  <li className="flex items-start gap-3 bg-white/10 rounded-2xl p-3.5 border border-emerald-400/30">
                    <span className="text-base shrink-0">✅</span>
                    <span>
                      Ти отримуєш <strong className="text-white font-black">100% бажані речі</strong>{' '}
                      у точному кольорі та розмірі без почуття провини.
                    </span>
                  </li>
                  <li className="flex items-start gap-3 bg-white/10 rounded-2xl p-3.5 border border-emerald-400/30">
                    <span className="text-base shrink-0">✅</span>
                    <span>
                      Інші гості миттєво бачать, що лот уже зайнятий —{' '}
                      <strong className="text-amber-300 font-black">
                        нуль шансів на дублікати
                      </strong>
                      .
                    </span>
                  </li>
                </ul>
              </div>

              <div className="text-xs font-extrabold text-emerald-200 bg-emerald-400/20 border border-emerald-400/40 rounded-xl px-4 py-2.5 text-center">
                Результат: 100% попадання в мрію та справжні емоції без спойлерів ✨
              </div>
            </div>
          </div>

          {/* Кнопка дії Секції 2 */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => scrollToSandbox()}
              className={`py-4 px-8 rounded-2xl text-sm sm:text-base font-black ${tokens.primaryCtaGradient} text-white shadow-2xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>🚀 Створити 1 лінк замість 100 натяків →</span>
            </button>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 3: СПІЛЬНИЙ ЗБІР НА РІДНУ МОНОБАНКУ (0% КОМІСІЇ)           */}
        {/* ================================================================= */}
        <section
          id="section-3-monobank"
          className="bg-[#0f111a]/80 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 border border-white/20 shadow-2xl space-y-8"
        >
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="inline-flex flex-wrap items-center justify-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-xs font-black uppercase tracking-wider text-emerald-200">
                🐈‍⬛ ІНТЕГРАЦІЯ З MONOBANK
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider">
                ₴ Тільки гривня (UAH)
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Великі мрії здійснюються <span className={highlightCapsClass}>РАЗОМ</span>. Прямо на
              твою Монобанку —{' '}
              <span className={highlightCapsClass}>0% КОМІСІЇ — ГРОШІ НАПРЯМУ НА ТВОЮ БАНКУ</span>.
            </h2>

            <p className="text-sm sm:text-base font-semibold text-slate-200 leading-relaxed">
              Соромно просити стайлер Dyson, камеру чи подорож за 25 000 ₴ в однієї людини? Для
              компанії з 10 друзів або твоїх підписників — це комфортний комплімент по 500 – 1 500 ₴
              у пару дотиків через Apple Pay.
            </p>
          </div>

          {/* Наочний візуал живого прогрес-бару Монобанки */}
          <div className="max-w-3xl mx-auto bg-white rounded-[28px] p-5 sm:p-7 text-slate-950 shadow-2xl border-2 border-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-2xl shadow">
                  🐈‍⬛
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                    Жива синхронізація Monobank Jar API
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 mt-0.5">
                    Стайлер Dyson Airwrap Multi-Styler Complete Long
                  </h3>
                </div>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-xs font-extrabold text-slate-600 uppercase">Ціль збору</div>
                <div className="text-xl font-black text-slate-950">26 000 ₴</div>
              </div>
            </div>

            <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-black tabular-nums">
                <span className="text-emerald-800">
                  🫙 Зібрано в Банці: {demoJarAmount[themePreset].toLocaleString('uk-UA')} ₴ із 26
                  000 ₴
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                  {Math.min(100, Math.round((demoJarAmount[themePreset] / 26000) * 100))}%
                </span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-slate-200 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 spring-transition`}
                  style={{
                    width: `${Math.min(100, Math.round((demoJarAmount[themePreset] / 26000) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-700 pt-1">
                <span>⚡ Оновлюється кожні 60 секунд автоматично</span>
                <button
                  type="button"
                  onClick={() => {
                    setDemoJarAmount((prev) => ({
                      ...prev,
                      [themePreset]: Math.min(26000, prev[themePreset] + 1500),
                    }));
                    triggerToast('🐈‍⬛ +1 500 ₴ зараховано напряму у Монобанку (0% комісії)!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-extrabold spring-transition active:scale-95"
                >
                  + Закинути +1 500 ₴ у демо-Банку
                </button>
              </div>
            </div>
          </div>

          {/* 3 Факт-картки у стилі Apple Spec Sheet */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/20 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                ⚡ МИТТЄВИЙ ПРОГРЕС
              </div>
              <div className="text-lg sm:text-xl font-black text-white tabular-nums">
                60 СЕКУНД АВТО-ОНОВЛЕННЯ
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                Автоматичне оновлення живого прогрес-бару на сайті після кожного поповнення Банки.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/20 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                ₴ ТІЛЬКИ ГРИВНЯ (UAH)
              </div>
              <div className="text-lg sm:text-xl font-black text-white tabular-nums">
                100% ТВОЇ ГРОШІ (0% КОМІСІЇ)
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                Кошти йдуть напряму у твій додаток Monobank у гривні (₴ UAH). Mriyii не бере жодної
                комісії з переказів.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/20 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-pink-300">
                🤫 ТАЄМНИЦЯ ЗБЕРЕЖЕНА
              </div>
              <div className="text-lg sm:text-xl font-black text-white">БЕЗ СПОЙЛЕРІВ</div>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                Гості бачать, скільки гривень залишилось зібрати, а ти бачиш лише інтригу до свята.
              </p>
            </div>
          </div>

          {/* Кнопка дії Секції 3 */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => scrollToSandbox('https://rozetka.com.ua/dyson-airwrap-complete-long')}
              className={`py-4 px-8 rounded-2xl text-sm sm:text-base font-black ${tokens.primaryCtaGradient} text-white shadow-2xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>🫙 Додати велику мрію з Монобанкою →</span>
            </button>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 4: INSTAGRAM-ШОУРУМИ ТА УЛЮБЛЕНІ КВІТИ БЕЗ АДРЕСИ          */}
        {/* ================================================================= */}
        <section
          id="section-4-instagram-flowers"
          className="bg-[#0f111a]/80 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 border border-white/20 shadow-2xl space-y-8"
        >
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-xs font-black uppercase tracking-wider text-pink-200">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>🌸 СТВОРЕНО ДЛЯ УКРАЇНСЬКИХ РЕАЛІЙ • ZERO HOME ADDRESS STORAGE</span>
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Улюблені <span className={highlightCapsClass}>КВІТИ ТА БРЕНДИ З INSTAGRAM</span> — без
              розкриття твоєї <span className={highlightCapsClass}>ДОМАШНЬОЇ АДРЕСИ</span>.
            </h2>

            <p className="text-sm sm:text-base font-semibold text-slate-200 leading-relaxed">
              Найкращі сукні, прикраси, свічки та букети в Україні купують в Instagram. Додавай
              пости улюблених шоурумів та заповнюй картку{' '}
              <strong className="text-white">«🌸 Які квіти я люблю та мої побажання»</strong>, не
              хвилюючись за свою приватність.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Ліва частина (6 cols): Жива картка «🌸 Які квіти я люблю та мої побажання» */}
            <div className="lg:col-span-6 space-y-4">
              <div className="solid-white-card rounded-[28px] p-5 sm:p-6 border-2 border-white space-y-4 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                      🌸
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-900">
                        Картка побажань та квітів • IG-FLOW-01
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-950 mt-1">
                        🌸 Які квіти я люблю та мої побажання
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-3.5 space-y-2 text-xs font-bold text-slate-900">
                  <div>
                    💐 <strong className="font-black">Улюблені квіти:</strong>{' '}
                    {currentDemoWishlist.aiFlowerPreferences}
                  </div>
                  <div>
                    👗 <strong className="font-black">Розміри та побажання:</strong>{' '}
                    {currentDemoWishlist.aiSizes} • Улюблений бутік:{' '}
                    <span className="text-pink-700 font-black">@kamelia_flowers_kyiv</span>
                  </div>
                  <div className="text-emerald-900 bg-emerald-100/90 border border-emerald-300 rounded-xl px-3 py-2 text-[11px] font-extrabold">
                    🔒 Приватна доставка: Дарувальник НЕ бачить домашню адресу — бутік сам напише
                    іменинниці у Direct!
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const orderMsg = `Привіт! Хочу замовити та оплатити подарунок із вішліста для @${currentDemoWishlist.ownerInstagramHandle}: «${flowerDemoItem.title}» (${(flowerDemoItem.price ?? 0).toLocaleString('uk-UA')} ₴). Напишіть, будь ласка, отримувачу в Direct для узгодження зручного часу та адреси доставки 🌸`;
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(orderMsg).catch(() => {});
                    }
                    triggerToast(
                      '📋 Готовий текст замовлення скопійовано! Бутік сам уточнить адресу доставки в Direct.'
                    );
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white shadow-lg flex items-center justify-center gap-2 spring-transition active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  <span>Замовити в Instagram @kamelia_flowers_kyiv 📸</span>
                </button>
              </div>
            </div>

            {/* Права частина (6 cols): Схема з 3 простих кроків */}
            <div className="lg:col-span-6 space-y-3.5">
              <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/20 space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-pink-300">
                  КРОК 1 • ТВОЇ УЛЮБЛЕНІ БУТІКИ ТА СМАКИ
                </div>
                <div className="text-base sm:text-lg font-black text-white">
                  Вказуєш улюблені квіти, бренд та розміри
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                  Наприклад: «Білі півонії без целофану від @kamelia_flowers_kyiv» та розміри S /
                  взуття 37.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/20 space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                  КРОК 2 • ЗАМОВЛЕННЯ В 1 КЛІК
                </div>
                <div className="text-base sm:text-lg font-black text-white">
                  Дарувальник тисне «Замовити в Instagram @shop 📸»
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                  Ми автоматично копіюємо гостю готовий текст замовлення для{' '}
                  <strong className="text-white">@{currentDemoWishlist.ownerInstagramHandle}</strong>{' '}
                  та відкриваємо профіль магазину.
                </p>
              </div>

              <div className="bg-emerald-950/60 backdrop-blur-xl rounded-[24px] p-5 border-2 border-emerald-400/50 space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  КРОК 3 • ZERO HOME ADDRESS STORAGE
                </div>
                <div className="text-base sm:text-lg font-black text-white">
                  МАГАЗИН САМ УТОЧНЮЄ ДОСТАВКУ В DIRECT
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                  Після оплати бутік пише особисто тобі у Direct, і ти сама обираєш, куди прийняти
                  кур&apos;єра. <strong className="text-emerald-300">Ніхто не знає твоєї домашньої адреси!</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Кнопка дії Секції 4 */}
          <div className="text-center pt-2">
            <Link
              href={`/dashboard?theme=${themePreset}`}
              className={`py-4 px-8 rounded-2xl text-sm sm:text-base font-black ${tokens.primaryCtaGradient} text-white shadow-2xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>💐 Налаштувати картку улюблених квітів та шоурумів →</span>
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 5: ШІ-АГЕНТ ПОДАРУНКІВ GEMINI                              */}
        {/* ================================================================= */}
        <section
          id="section-5-gemini-ai"
          className="bg-[#0f111a]/80 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 border border-white/20 shadow-2xl space-y-8"
        >
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-purple-500/25 border border-purple-400/40 text-xs font-black uppercase tracking-wider text-purple-200">
              🤖 POWERED BY GEMINI AI
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              У вішлісті все зайнято або <span className={highlightCapsClass}>НЕМАЄ ІДЕЙ</span>?
              ШІ-Агент підбере{' '}
              <span className={highlightCapsClass}>ТАЄМНИЙ СЮРПРИЗ ЗА 10 СЕКУНД</span>.
            </h2>

            <p className="text-sm sm:text-base font-semibold text-slate-200 leading-relaxed">
              Твоїм друзям чи коханій людині більше не треба ламати голову. Ти один раз заповнюєш
              коротку анкету своїх смаків та анти-подарунків, а наш ШІ-консьєрж генерує влучні ідеї
              рівно під бюджет гостя.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-[28px] p-6 border border-white/20 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                🎯 ПІД БУДЬ-ЯКИЙ БЮДЖЕТ У ГРИВНІ (₴ UAH)
              </div>
              <h3 className="text-xl font-black text-white">
                До 1 000 ₴, До 3 000 ₴ або VIP 💎
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                Гість обирає комфортний бюджет у гривні і за секунду отримує 3 ідеальні варіанти,
                які точно підійдуть тобі за стилем, хобі та списком табу.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-xs font-extrabold">
                <span className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-white">
                  ☕ До 1 000 ₴ • Дріп-кава & Свічки
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-white">
                  🎧 До 3 000 ₴ • Гаджети & Декор
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-amber-300 text-slate-950">
                  💎 VIP • Ювелірка & Подорожі
                </span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-[28px] p-6 border border-white/20 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                🕵️‍♀️ 100% ТАЄМНИЙ ЛОТ (isAiSurprise)
              </div>
              <h3 className="text-xl font-black text-white">
                Справжня несподіванка, якої не було у списку
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                Коли гість бронює пораду від ШІ, вона зберігається як прихований сюрприз-лот: інші
                друзі не подарують те саме, а для тебе це буде справжнє відкриття у день свята!
              </p>
              <div className="bg-slate-950/70 rounded-2xl p-3.5 border border-emerald-400/30 text-xs font-bold text-emerald-200">
                🔒 Захист Сюрприз-режиму: власник вішліста ніколи не бачить лоти з прапорцем{' '}
                <code className="text-amber-300">isAiSurprise: true</code> до свята.
              </div>
            </div>
          </div>

          {/* Кнопка дії Секції 5 */}
          <div className="text-center pt-2">
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className={`py-4 px-8 rounded-2xl text-sm sm:text-base font-black ${tokens.primaryCtaGradient} text-white shadow-2xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>🤖 Протестувати ШІ-Агента подарунків →</span>
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 6: РЕЖИМ СЮРПРИЗУ — ІНТЕРАКТИВНЕ ПОРІВНЯННЯ «ДВА СВІТИ»    */}
        {/* ================================================================= */}
        <section
          id="section-6-surprise-mode"
          className="bg-[#0f111a]/80 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 border border-white/20 shadow-2xl space-y-8"
        >
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-xs font-black uppercase tracking-wider text-amber-200">
              🤫 МАГІЯ НЕСПОДІВАНКИ
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Жодних спойлерів до свята: ти бачиш <span className={highlightCapsClass}>ІНТРИГУ</span>{' '}
              — друзі бачать <span className={highlightCapsClass}>ЧІТКИЙ ПЛАН</span>.
            </h2>

            {/* Великий перемикач двох світів */}
            <div className="inline-flex p-1.5 rounded-2xl bg-black/50 border border-white/20 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setRolePreview('owner')}
                className={`py-2.5 px-5 rounded-xl text-xs sm:text-sm font-black spring-transition ${
                  rolePreview === 'owner'
                    ? 'bg-amber-300 text-slate-950 shadow-lg'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                👀 Очима Іменинника
              </button>
              <button
                type="button"
                onClick={() => setRolePreview('guest')}
                className={`py-2.5 px-5 rounded-xl text-xs sm:text-sm font-black spring-transition ${
                  rolePreview === 'guest'
                    ? 'bg-emerald-400 text-slate-950 shadow-lg'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                🎁 Очима Гостя
              </button>
            </div>
          </div>

          {/* Порівняння двох станів поруч */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className={`rounded-[28px] p-6 border-2 spring-transition space-y-3 ${
                rolePreview === 'owner'
                  ? 'bg-amber-500/15 border-amber-300 shadow-2xl'
                  : 'bg-white/5 border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-300 text-slate-950">
                  👀 Режим Іменинника (Власник)
                </span>
                <span className="text-xl">🤫</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                «🤫 Інтрига збережена! Хтось уже готує цей сюрприз ✨»
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                Імена дарувальників (<code className="text-amber-200">bookedByName</code>), сума в
                Банці (<code className="text-amber-200">jarCurrentAmount</code>) та таємні ШІ-лоти
                відсікаються прямо на сервері до дня свята.
              </p>
            </div>

            <div
              className={`rounded-[28px] p-6 border-2 spring-transition space-y-3 ${
                rolePreview === 'guest'
                  ? 'bg-emerald-500/15 border-emerald-400 shadow-2xl'
                  : 'bg-white/5 border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-400 text-slate-950">
                  🎁 Режим Гостя (Друзі)
                </span>
                <span className="text-xl">🎯</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tabular-nums">
                «Зібрано 19 500 / 26 000 ₴ (75%) • Поповнити Банку / Купити в магазині»
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                Друзі бачать точний прогрес збору в гривні, вільні та вже заброньовані подарунки,
                посилання на офіційний магазин та кнопку замовлення у Direct.
              </p>
            </div>
          </div>

          {/* Живі картки у обраному режимі */}
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

          {/* Кнопка дії Секції 6 */}
          <div className="text-center pt-2">
            <Link
              href="/w/olena-vip"
              className={`py-4 px-8 rounded-2xl text-sm sm:text-base font-black ${tokens.primaryCtaGradient} text-white shadow-2xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>👀 Відкрити живий приклад вішліста (/w/olena-vip) →</span>
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 7: ФІНАЛЬНИЙ APPLE KEYNOTE МАНІФЕСТ + ПОДВІЙНИЙ CTA        */}
        {/* ================================================================= */}
        <section
          id="section-7-final-manifesto"
          className="bg-gradient-to-br from-[#16132b]/95 via-[#0f111a]/95 to-[#0b1324]/95 backdrop-blur-2xl rounded-[36px] p-8 sm:p-14 border-2 border-white/25 shadow-2xl text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs font-black uppercase tracking-wider text-amber-300">
            ✨ MRIYII • APPLE × UKLON PRODUCT EXPERIENCE • ₴ UAH
          </div>

          <h2 className="text-2xl sm:text-5xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.12]">
            Твої мрії <span className={highlightCapsClass}>ВАРТІ ТОГО, ЩОБ ЗБУТИСЯ</span> саме так,
            як ти хочеш. Зроби свої бажання{' '}
            <span className={highlightCapsClass}>ВИДИМИМИ ЗА 30 СЕКУНД</span>.
          </h2>

          <p className="text-sm sm:text-lg font-semibold text-slate-200 max-w-2xl mx-auto">
            Повністю безкоштовно. Працює у кожному браузері, в Instagram Bio, Telegram та TikTok.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => scrollToSandbox()}
              className={`w-full sm:w-auto py-4 px-8 rounded-2xl text-sm sm:text-base font-black ${tokens.primaryCtaGradient} text-white shadow-2xl spring-transition active:scale-95 flex items-center justify-center gap-2`}
            >
              <span>✨ Створити свій список мрій безкоштовно</span>
            </button>

            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className="w-full sm:w-auto py-4 px-7 rounded-2xl text-sm sm:text-base font-black bg-white/15 hover:bg-white/25 text-white border border-white/25 spring-transition flex items-center justify-center gap-2"
            >
              <span>Переглянути приклад вішліста →</span>
            </Link>
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
                  Ваша тема ({tokens.label}) та додані мрії ({draftItems.length} шт.) миттєво
                  перенесуться у ваш персональний лінк.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Назва вашого свята або списку:
              </label>
              <input
                type="text"
                value={wishlistTitle}
                onChange={(e) => setWishlistTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-950 focus:outline-none focus:border-slate-950"
              />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleCompleteOnboarding('google')}
                className={`w-full py-3.5 px-4 rounded-xl text-sm font-black ${tokens.primaryCtaGradient} text-white flex items-center justify-center gap-2`}
              >
                <span>Продовжити з Google (1 клік)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleCompleteOnboarding('apple')}
                className="w-full py-3 px-4 rounded-xl text-xs font-extrabold bg-slate-950 text-white hover:bg-slate-800"
              >
                 Увійти з Apple ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
