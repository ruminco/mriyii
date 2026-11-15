'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Loader2,
  ArrowRight,
  CheckCircle2,
  X,
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

  // Поля Delayed Auth капсули (додавання бажань без логіну)
  const [urlInput, setUrlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [draftItems, setDraftItems] = useState<UnifiedGiftCardItem[]>([]);
  const [wishlistTitle, setWishlistTitle] = useState(DEMO_WISHLISTS.rose_luxury.title);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locale, setLocale] = useState<'ua' | 'en'>('ua');
  const [heroPillState, setHeroPillState] = useState<'before' | 'after'>('before');

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroPillState((prev) => (prev === 'before' ? 'after' : 'before'));
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Живий інтерактивний стан Монобанки у Секції 3
  const [demoJarAmount, setDemoJarAmount] = useState<Record<ThemePreset, number>>({
    rose_luxury: 19500,
    cyber_titanium: 24500,
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
  const flowerDemoItem =
    currentDemoWishlist.items.find((i) => i.instagramHandle) ?? currentDemoWishlist.items[1]!;

  const accentTextClass =
    themePreset === 'rose_luxury' ? 'text-amber-300' : 'text-emerald-300';

  const sectionBadgeClass =
    themePreset === 'rose_luxury'
      ? 'bg-amber-500/15 border border-amber-400/35 text-amber-200'
      : 'bg-emerald-500/15 border border-emerald-400/35 text-emerald-200';

  return (
    <div className={`min-h-screen ${tokens.meshClass} text-white spring-transition`}>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#171D30]/95 backdrop-blur-xl rounded-2xl px-5 py-3.5 border border-emerald-400/50 shadow-2xl flex items-center gap-2.5 text-sm font-bold text-emerald-300">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Спрощений Sticky Header (56–64px, чистий на 390px) */}
      <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-[#0E1324]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px]`}
            >
              <div className="w-full h-full bg-[#171D30] rounded-[10px] flex items-center justify-center text-lg">
                🎁
              </div>
            </div>
            <span className="text-xl font-black tracking-tight text-white">Mriyii</span>
          </Link>

          <nav className="flex items-center gap-3">
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
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className="hidden sm:inline-block text-sm font-bold text-slate-200 hover:text-white spring-transition"
            >
              {locale === 'en' ? 'Demo' : 'Приклад'}
            </Link>
            <Link
              href={`/dashboard?theme=${themePreset}`}
              className="hidden sm:inline-block text-sm font-bold text-slate-200 hover:text-white spring-transition"
            >
              {locale === 'en' ? 'My Dashboard' : 'Мій кабінет'}
            </Link>
            <a
              href="#section-1-hero"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('capsule-input')?.focus();
              }}
              className={`min-h-[48px] px-5 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} inline-flex items-center spring-transition active:scale-95`}
            >
              {locale === 'en' ? '✨ Create wishlist' : '✨ Створити вішліст'}
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* ================================================================= */}
        {/* СЕКЦІЯ 1: HERO (DS V2 Option 2 + Before->After + Capsule)         */}
        {/* ================================================================= */}
        <section
          id="section-1-hero"
          className="max-w-3xl mx-auto text-center py-12 sm:py-20 space-y-5 sm:space-y-6"
        >
          <div className="h-11 sm:h-12 overflow-hidden flex items-center justify-center">
            <button
              type="button"
              onClick={() =>
                setHeroPillState((prev) => (prev === 'before' ? 'after' : 'before'))
              }
              className={`inline-flex items-center justify-center gap-2.5 min-h-[44px] px-4 sm:px-5 rounded-full text-sm sm:text-base font-bold backdrop-blur-xl transition-all duration-500 ${
                heroPillState === 'before'
                  ? 'bg-rose-500/15 border border-rose-400/35 text-rose-200'
                  : 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-200'
              }`}
              title="Натисни, щоб перемкнути До → Після"
            >
              {heroPillState === 'before' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
                  <span>💬 Ще один чат у Telegram і зіпсована інтрига?</span>
                  <span aria-hidden="true">➔</span>
                </>
              ) : (
                <>
                  <span>🎁 Одне посилання: бронь у 1 клік, Монобанка 0% і сюрприз</span>
                  <span className="font-black text-emerald-300" aria-hidden="true">
                    ✓
                  </span>
                </>
              )}
            </button>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-white leading-[1.08]">
            Твої мрії <span className={accentTextClass}>варті того,</span> щоб збутися
          </h1>

          <p className="text-base sm:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed font-medium">
            Більше жодного зайвого чату в Telegram і руйнування інтриги. Додай лінк на подарунок —
            отримай стильну вітрину за <strong className="text-white font-bold">30 секунд</strong>.
          </p>

          {/* Компактний перемикач стилю (Solid активний стан) */}
          <div className="max-w-xs mx-auto grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#171D30] border border-white/15">
            <button
              type="button"
              onClick={() => handleSwitchTheme('rose_luxury')}
              className={`min-h-[48px] rounded-xl text-sm font-extrabold spring-transition ${
                themePreset === 'rose_luxury'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              👩 Для неї
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTheme('cyber_titanium')}
              className={`min-h-[48px] rounded-xl text-sm font-extrabold spring-transition ${
                themePreset === 'cyber_titanium'
                  ? 'bg-emerald-400 text-slate-950 shadow-lg'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              👨 Для нього
            </button>
          </div>

          {/* Суцільна біла капсула вводу */}
          <form
            onSubmit={handleAddDraftByUrl}
            className="max-w-2xl mx-auto bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <input
              ref={sandboxInputRef}
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Встав посилання або @instagram-шоурум..."
              className="flex-1 px-4 py-3 text-base font-semibold text-slate-950 placeholder:text-slate-400 bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              disabled={isParsing}
              className={`w-full sm:w-auto min-h-[48px] sm:h-14 px-6 rounded-xl text-base font-bold ${tokens.primaryCtaGradient} text-white shrink-0 spring-transition active:scale-95 flex items-center justify-center gap-2`}
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Додаємо...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>✨ Створити вішліст</span>
                </>
              )}
            </button>
          </form>

          {/* 3 чисті пігулки швидкого тесту */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                addDraftItemDirect({
                  ...DEMO_WISHLISTS.rose_luxury.items[0]!,
                  id: `draft-dyson-${Date.now()}`,
                  isBooked: false,
                })
              }
              className="min-h-[48px] px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 spring-transition"
            >
              ✨ Dyson
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
              className="min-h-[48px] px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 spring-transition"
            >
              🎧 AirPods Max
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
              className="min-h-[48px] px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 spring-transition"
            >
              💐 Півонії з Instagram
            </button>
          </div>

          {/* 1 чистий рядок довіри без темної коробки */}
          <p className="text-sm font-medium text-slate-300">
            Без реєстрації для старту • 0% комісії • Тільки ₴ UAH
          </p>
        </section>

        {/* Чернетка Delayed Auth (з'являється лише після додавання першої мрії) */}
        {draftItems.length > 0 && (
          <section className="py-12 border-y border-white/15 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Ваш список готовий ({draftItems.length}{' '}
                  {draftItems.length === 1 ? 'мрія' : 'мрії'})
                </h2>
                <p className="text-base text-slate-200 mt-1">
                  Збережіть вішліст, щоб отримати своє посилання для Instagram Bio та друзів.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="min-h-[48px] px-6 rounded-2xl text-base font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-xl spring-transition active:scale-95 flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Зберегти та отримати лінк</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        {/* ДО / ПІСЛЯ: TELEGRAM ЧАТ VS ОДНЕ ПОСИЛАННЯ MRIYII (#12)           */}
        {/* ================================================================= */}
        <section id="section-before-after" className="py-12 sm:py-16 space-y-8">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Досить <span className={accentTextClass}>здогадок</span> у месенджерах
            </h2>
            <p className="text-base sm:text-lg text-slate-200">
              Порівняй, як свято виглядає в чатах і як — із твоїм посиланням Mriyii.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl p-6 sm:p-7 bg-[#171D30] border border-rose-400/30 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center text-3xl shrink-0">
                  💬
                </div>
                <div>
                  <div className="text-sm font-extrabold text-rose-300">До Mriyii</div>
                  <h3 className="text-xl font-black text-white">
                    Ще один чат у Telegram і руйнування інтриги
                  </h3>
                </div>
              </div>
              <ul className="space-y-2.5 text-base text-slate-200">
                <li>• Друзі створюють окремий чат і все одно губляться в ідеях</li>
                <li>• Хтось дарує два однакові сертифікати чи не той колір</li>
                <li>• Хтось збирає гроші на картку вручну й плутається в сумах</li>
              </ul>
            </div>

            <div className="rounded-3xl p-6 sm:p-7 bg-[#171D30] border border-emerald-400/35 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-3xl shrink-0">
                  🎁
                </div>
                <div>
                  <div className="text-sm font-extrabold text-emerald-300">З Mriyii</div>
                  <h3 className="text-xl font-black text-white">
                    Одне посилання без зайвих чатів і спойлерів
                  </h3>
                </div>
              </div>
              <ul className="space-y-2.5 text-base text-slate-200">
                <li>• Бронювання подарунка в 1 клік без реєстрації для гостей</li>
                <li>• Спільний збір на Банку Monobank або Приват24 з 0% комісії</li>
                <li>• Сюрприз-режим: ти не бачиш, хто що обрав, до самого свята</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 2: ЯК ЦЕ ПРАЦЮЄ ЗА 3 КРОКИ                                 */}
        {/* ================================================================= */}
        <section id="section-2-how-it-works" className="py-16 sm:py-24 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              ⚡ Простий старт за 30 секунд
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Як це <span className={accentTextClass}>працює</span> за 3 кроки
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Замість 100 натяків і таємних чатів — один естетичний лінк у профілі чи сторіс.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl p-7 bg-[#171D30] border border-white/10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-3xl">
                🔗
              </div>
              <div className="text-sm font-extrabold text-amber-300">Крок 1</div>
              <h3 className="text-xl font-black text-white">Встав лінк або @instagram</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Ми автоматично підтягнемо фото, ціну в гривні (₴) та назву з будь-якого українського магазину.
              </p>
            </div>

            <div className="rounded-3xl p-7 bg-[#171D30] border border-white/10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-400/15 border border-indigo-400/35 flex items-center justify-center text-3xl">
                📲
              </div>
              <div className="text-sm font-extrabold text-indigo-300">Крок 2</div>
              <h3 className="text-xl font-black text-white">Поділись одним лінком</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Додай посилання в Instagram Bio, Telegram або сторіс. Друзям не потрібна реєстрація.
              </p>
            </div>

            <div className="rounded-3xl p-7 bg-[#171D30] border border-white/10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-400/15 border border-emerald-400/35 flex items-center justify-center text-3xl">
                🎁
              </div>
              <div className="text-sm font-extrabold text-emerald-300">Крок 3</div>
              <h3 className="text-xl font-black text-white">Друзі бронюють без спойлерів</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Гості бачать вільні мрії та скидаються на Банку, а ти отримуєш сюрприз без дублікатів.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 3: PRODUCT SHOWCASE — ЖИВИЙ МІНІ-ПРОФІЛЬ                   */}
        {/* ================================================================= */}
        <section id="section-3-showcase" className="py-16 sm:py-24 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              👀 Як виглядає твій вішліст для друзів
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Жива <span className={accentTextClass}>вітрина</span> твоїх мрій
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Саме так друзі бачать твою сторінку: профіль, підказка ШІ, безкоштовні посилання, статуси лотів та Банка.
            </p>
          </div>

          <div className="max-w-4xl mx-auto rounded-[28px] bg-[#171D30] border border-white/15 p-5 sm:p-8 shadow-2xl space-y-5">
            {/* 1. Міні-хедер профілю */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pb-5 border-b border-white/10 text-center sm:text-left">
              <div className={`w-16 h-16 rounded-full ${tokens.avatarRingClass} p-[2px] shrink-0`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentDemoWishlist.ownerAvatarUrl}
                  alt={currentDemoWishlist.ownerName}
                  className="w-full h-full rounded-full object-cover border-2 border-[#171D30]"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    🎂 До свята {currentDemoWishlist.daysLeft} днів
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200">
                    @{currentDemoWishlist.ownerInstagramHandle}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">{currentDemoWishlist.title}</h3>
                <p className="text-sm text-slate-200">{currentDemoWishlist.ownerBio}</p>
              </div>
            </div>

            {/* 2. Згорнутий AI-тізер */}
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className="w-full min-h-[52px] rounded-2xl bg-[#0E1324]/80 hover:bg-[#0E1324] border border-amber-400/35 px-4 py-3 flex items-center justify-between gap-3 spring-transition"
            >
              <span className="text-sm sm:text-base font-bold text-white">
                ✨ Хочеш, допоможу з ідеєю на основі інтересів?
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 text-sm font-black shrink-0">
                Підібрати ▾
              </span>
            </Link>

            {/* 3. Free App Note */}
            <div className="rounded-xl bg-[#0E1324]/60 border border-white/10 px-4 py-2.5 text-sm font-semibold text-amber-200 flex items-center gap-2">
              <span>✨</span>
              <span>
                Mriyii безкоштовний для тебе і гостей — магазини платять нам невеликий % партнерської винагороди за перехід.
              </span>
            </div>

            {/* 4. Міні-лоти (білі картки) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentDemoWishlist.items.slice(0, 2).map((item) => (
                <SmokedGiftCard
                  key={`showcase-${item.id}`}
                  item={item}
                  themePreset={themePreset}
                  viewMode="guest"
                  ownerInstagramHandle={currentDemoWishlist.ownerInstagramHandle}
                  onInstagramOrderToast={triggerToast}
                  onBookClick={() =>
                    triggerToast('💎 Подарунок заброньовано у прев’ю! Спробуй на /w/olena-vip.')
                  }
                />
              ))}
            </div>

            <div className="text-center pt-2">
              <Link
                href={`/w/${currentDemoWishlist.slug}`}
                className={`min-h-[48px] px-7 py-3 rounded-2xl text-base font-extrabold ${tokens.primaryCtaGradient} inline-flex items-center gap-2 spring-transition active:scale-95`}
              >
                <span>Відкрити повний живий приклад →</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 4: СПІЛЬНИЙ ЗБІР НА МОНОБАНКУ (0% КОМІСІЇ)                 */}
        {/* ================================================================= */}
        <section id="section-4-monobank" className="py-16 sm:py-24 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              🐈‍⬛ Інтеграція з Monobank • ₴ UAH
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Великі мрії здійснюються <span className={accentTextClass}>разом</span> — 0% комісії
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Для компанії з 10 друзів дорогий подарунок перетворюється на комфортний комплімент через Apple Pay прямо на твою Банку або Конверт Приват24.
            </p>
            <p className="text-sm font-bold text-emerald-300">
              🔒 Просто встав публічне посилання на свою Банку (send.monobank.ua/jar/...) — без паролів, токенів і доступу до картки.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 text-slate-950 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-950">
                  Стайлер Dyson Airwrap Multi-Styler
                </h3>
                <p className="text-base font-medium text-slate-600">
                  Спільний збір на Монобанку у гривні (₴ UAH)
                </p>
              </div>
              <div className="text-2xl font-black text-slate-950 tabular-nums">26 000 ₴</div>
            </div>

            <div className="bg-slate-100 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-base font-extrabold tabular-nums">
                <span className="text-emerald-800">
                  Зібрано: {demoJarAmount[themePreset].toLocaleString('uk-UA')} ₴
                </span>
                <span className="text-emerald-700">
                  {Math.min(100, Math.round((demoJarAmount[themePreset] / 26000) * 100))}%
                </span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 spring-transition"
                  style={{
                    width: `${Math.min(100, Math.round((demoJarAmount[themePreset] / 26000) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-sm font-semibold text-slate-600">
                  Авто-оновлення кожні 60 секунд
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDemoJarAmount((prev) => ({
                      ...prev,
                      [themePreset]: Math.min(26000, prev[themePreset] + 1500),
                    }));
                    triggerToast('🐈‍⬛ +1 500 ₴ додано у Монобанку (0% комісії)!');
                  }}
                  className="min-h-[48px] px-5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold spring-transition active:scale-95"
                >
                  + Закинути 1 500 ₴ (демо)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <div className="text-lg font-black text-white tabular-nums">
                ⏱️ 60 секунд авто-оновлення
              </div>
              <p className="text-base text-slate-200 leading-relaxed">
                Живий прогрес-бар оновлюється автоматично після кожного поповнення Банки.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <div className="text-lg font-black text-white tabular-nums">
                ₴ 100% твої гроші (UAH)
              </div>
              <p className="text-base text-slate-200 leading-relaxed">
                Кошти йдуть напряму у твій додаток Monobank або Приват24. Mriyii не бере комісії.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <div className="text-lg font-black text-white">🤫 Без спойлерів до свята</div>
              <p className="text-base text-slate-200 leading-relaxed">
                Гості бачать прогрес збору, а ти бачиш лише інтригу до дати події.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 5: INSTAGRAM-ШОУРУМИ ТА УЛЮБЛЕНІ КВІТИ БЕЗ АДРЕСИ          */}
        {/* ================================================================= */}
        <section id="section-5-instagram-flowers" className="py-16 sm:py-24 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              🌸 Без розкриття домашньої адреси
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Улюблені <span className={accentTextClass}>квіти</span> та шоуруми з Instagram
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Заповнюй картку побажань — дарувальник оплачує букет чи сукню, а магазин сам уточнює доставку в Direct.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 text-slate-950 shadow-2xl space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-slate-950 flex items-center justify-center text-2xl shrink-0">
                  🌸
                </div>
                <h3 className="text-xl font-black text-slate-950">
                  🌸 Які квіти я люблю та мої побажання
                </h3>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-base font-medium text-slate-900">
                <p>
                  <strong className="font-extrabold">Квіти:</strong>{' '}
                  {currentDemoWishlist.aiFlowerPreferences}
                </p>
                <p>
                  <strong className="font-extrabold">Розміри:</strong>{' '}
                  {currentDemoWishlist.aiSizes} • Бутік{' '}
                  <span className="text-indigo-700 font-bold">@kamelia_flowers_kyiv</span>
                </p>
                <p className="text-emerald-800 font-bold">
                  🔒 Магазин сам уточнює адресу доставки в Direct.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const orderMsg = `Привіт! Хочу замовити та оплатити подарунок із вішліста для @${currentDemoWishlist.ownerInstagramHandle}: «${flowerDemoItem.title}» (${(flowerDemoItem.price ?? 0).toLocaleString('uk-UA')} ₴). Напишіть, будь ласка, отримувачу в Direct для узгодження зручного часу та адреси доставки 🌸`;
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(orderMsg).catch(() => {});
                  }
                  triggerToast(
                    '📋 Текст замовлення скопійовано! Бутік сам уточнить адресу доставки в Direct.'
                  );
                }}
                className={`w-full min-h-[48px] px-5 py-3.5 rounded-2xl text-base font-extrabold ${tokens.primaryCtaGradient} shadow-lg flex items-center justify-center gap-2 spring-transition active:scale-95`}
              >
                <Copy className="w-5 h-5" />
                <span>Замовити в Instagram @kamelia_flowers_kyiv</span>
              </button>
            </div>

            <div className="lg:col-span-6 space-y-5">
              <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-1.5">
                <div className="text-lg font-black text-white">
                  1. Вказуєш улюблені квіти та розміри
                </div>
                <p className="text-base text-slate-200">
                  Наприклад: «Білі півонії без целофану від @kamelia_flowers_kyiv» та розміри S / 37.
                </p>
              </div>
              <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-1.5">
                <div className="text-lg font-black text-white">
                  2. Дарувальник замовляє в 1 клік
                </div>
                <p className="text-base text-slate-200">
                  Ми автоматично копіюємо готовий текст замовлення для @
                  {currentDemoWishlist.ownerInstagramHandle}.
                </p>
              </div>
              <div className="rounded-3xl p-6 bg-[#171D30] border border-emerald-400/35 space-y-1.5">
                <div className="text-lg font-black text-white">
                  3. Доставка через Direct — 100% приватно
                </div>
                <p className="text-base text-slate-200">
                  Після оплати бутік пише особисто тобі у Direct, і ти сама обираєш, куди прийняти кур&apos;єра.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 6: ШІ-ПОМІЧНИК ПОДАРУНКІВ GEMINI                          */}
        {/* ================================================================= */}
        <section id="section-6-gemini-ai" className="py-16 sm:py-24 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              🤖 Персональний ШІ-стиліст подарунків
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              ШІ-помічник підбере <span className={accentTextClass}>сюрприз</span> за 10 секунд
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Гість обирає чіпси інтересів та бюджет — ШІ пропонує 3 влучні подарунки зі списку або з українських магазинів.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl p-7 bg-[#171D30] border border-white/10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-3xl">
                🎯
              </div>
              <h3 className="text-xl font-black text-white">
                Під будь-який бюджет у гривні
              </h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Чіпси інтересів (☕ Кава, 💄 Б&apos;юті, 🎧 Гаджети, 🌸 Квіти) та фільтр бюджету миттєво оновлюють 3 готові картки з кнопками.
              </p>
            </div>
            <div className="rounded-3xl p-7 bg-[#171D30] border border-white/10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-400/15 border border-indigo-400/35 flex items-center justify-center text-3xl">
                🤫
              </div>
              <h3 className="text-xl font-black text-white">100% таємний сюрприз-лот</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Заброньована порада ШІ ховається від власника вішліста до дня свята, але інші друзі бачать, що ідея вже зайнята.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className={`min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-extrabold ${tokens.primaryCtaGradient} shadow-xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>🤖 Протестувати ШІ-Помічника →</span>
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 7: РЕЖИМ СЮРПРИЗУ — «ДВА СВІТИ»                            */}
        {/* ================================================================= */}
        <section id="section-7-surprise-mode" className="py-16 sm:py-24 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ти бачиш <span className={accentTextClass}>інтригу</span> — друзі бачать план
            </h2>

            <div className="inline-flex p-1.5 rounded-2xl bg-[#171D30] border border-white/15 gap-2">
              <button
                type="button"
                onClick={() => setRolePreview('owner')}
                className={`min-h-[48px] px-5 rounded-xl text-base font-bold spring-transition ${
                  rolePreview === 'owner'
                    ? 'bg-amber-400 text-slate-950 shadow-lg'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                👀 Очима Іменинника
              </button>
              <button
                type="button"
                onClick={() => setRolePreview('guest')}
                className={`min-h-[48px] px-5 rounded-xl text-base font-bold spring-transition ${
                  rolePreview === 'guest'
                    ? 'bg-emerald-400 text-slate-950 shadow-lg'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                🎁 Очима Гостя
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentDemoWishlist.items.slice(1, 4).map((item) => (
              <SmokedGiftCard
                key={item.id}
                item={item}
                themePreset={themePreset}
                viewMode={rolePreview}
                ownerInstagramHandle={currentDemoWishlist.ownerInstagramHandle}
                onInstagramOrderToast={triggerToast}
                onBookClick={() =>
                  triggerToast('💎 Подарунок заброньовано! Сюрприз-захист увімкнено.')
                }
              />
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 8: SOCIAL PROOF (КРЕАТОРИ ТА ЦИФРИ)                        */}
        {/* ================================================================= */}
        <section id="section-8-social-proof" className="py-16 sm:py-24 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              💛 Довіра спільноти
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Уже обирають для <span className={accentTextClass}>свят</span> в Україні
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-1">
              <div className="text-3xl font-black text-amber-300 tabular-nums">1 200+</div>
              <div className="text-base font-bold text-white">створених вішлістів</div>
              <p className="text-sm text-slate-300">Дні народження, новосілля та Таємний Санта</p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-1">
              <div className="text-3xl font-black text-emerald-300 tabular-nums">0%</div>
              <div className="text-base font-bold text-white">комісії на Банку</div>
              <p className="text-sm text-slate-300">Усі донати йдуть напряму у твій Monobank</p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-1">
              <div className="text-3xl font-black text-indigo-300 tabular-nums">30 сек</div>
              <div className="text-base font-bold text-white">на перший лінк</div>
              <p className="text-sm text-slate-300">Без реєстрації для старту та гостям</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl px-5 py-4 bg-[#171D30]/80 border border-white/10 text-base text-slate-200">
              «Кинула лінк у сторіс за тиждень до ДР — друзі самі закрили Банку на AirPods Max!»{' '}
              <strong className="text-amber-300">@alina.kyiv</strong>
            </div>
            <div className="rounded-2xl px-5 py-4 bg-[#171D30]/80 border border-white/10 text-base text-slate-200">
              «Нарешті жодних 5 однакових свічок і незручних питань про адресу.»{' '}
              <strong className="text-emerald-300">Оля, Київ</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-3">
              <p className="text-base text-slate-200 leading-relaxed">
                «Замість 20 запитань в Instagram просто кинула лінк у сторіс — подруги самі скинулись на Dyson!»
              </p>
              <div className="text-sm font-extrabold text-amber-300">@olena.muse • Київ</div>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-3">
              <p className="text-base text-slate-200 leading-relaxed">
                «Фішка з квітами через Direct без домашньої адреси — просто топ. Букет приїхав вчасно.»
              </p>
              <div className="text-sm font-extrabold text-emerald-300">@katya.style • Львів</div>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-3">
              <p className="text-base text-slate-200 leading-relaxed">
                «Зручно, що гостям не треба логінитись. Відкрили, натиснули “Забронювати” і жодних дублікатів.»
              </p>
              <div className="text-sm font-extrabold text-indigo-300">@max.dev • Дніпро</div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 9: FAQ                                                     */}
        {/* ================================================================= */}
        <section id="section-9-faq" className="py-16 sm:py-24 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Часті <span className={accentTextClass}>питання</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <h3 className="text-lg font-black text-white">💡 Чи справді Mriyii безкоштовний?</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Так! Створення вішліста, бронювання, ШІ-підбір і збір на Монобанку безкоштовні. Ми заробляємо лише на партнерській комісії магазинів, коли гості переходять за посиланнями.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <h3 className="text-lg font-black text-white">💳 Як проходять оплати в Монобанці?</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Mriyii не приймає гроші на свій рахунок. Кнопка веде напряму на вашу Банку Monobank або Конверт Приват24 з 0% комісії платформи.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <h3 className="text-lg font-black text-white">🔒 Чи бачить хтось мою домашню адресу?</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Ні! Ми принципово не зберігаємо домашні адреси. Для квітів та шоурумів гість передає магазину ваш @instagram, і кур&apos;єр узгоджує доставку напряму з вами.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <h3 className="text-lg font-black text-white">📲 Чи потрібен Telegram або реєстрація?</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Гостям реєстрація не потрібна взагалі. Ви можете додати перші мрії прямо зараз, а увійти через Google/Apple лише при збереженні свого посилання.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <h3 className="text-lg font-black text-white">🔄 А якщо гість передумає або захоче скасувати бронь?</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Бронь скасовується в 1 клік, і подарунок одразу стає вільним. Діє анти-спам ліміт: не більше 2 активних бронювань на одного гостя, щоб ніхто не заблокував увесь список.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#171D30] border border-white/10 space-y-2">
              <h3 className="text-lg font-black text-white">✈️ Чи можна додати бажання без посилання — подорож або сертифікат?</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Звісно! Можна додати будь-яку мрію текстом — квитки, враження, благодійний донат чи просто спільний збір на Монобанку без конкретного магазину.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 10: ФІНАЛЬНИЙ CTA                                          */}
        {/* ================================================================= */}
        <section
          id="section-10-final-cta"
          className="py-16 sm:py-24 text-center space-y-6 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12]">
            Створи свій вішліст за <span className={accentTextClass}>30 секунд</span>
          </h2>
          <p className="text-base sm:text-xl text-slate-200">
            Повністю безкоштовно. Працює в Instagram Bio, Telegram та TikTok.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => scrollToSandbox()}
              className={`w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-extrabold ${tokens.primaryCtaGradient} shadow-2xl spring-transition active:scale-95`}
            >
              ✨ Створити свій список мрій безкоштовно
            </button>
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 rounded-2xl text-base font-bold bg-[#171D30] hover:bg-[#1E2640] text-white border border-white/20 spring-transition flex items-center justify-center"
            >
              Переглянути приклад →
            </Link>
          </div>
        </section>

        <div className="pb-12">
          <AffiliateDisclosureBadge />
        </div>
      </main>

      {/* Модалка Delayed Auth */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="solid-white-card rounded-3xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-950">Збережіть ваш вішліст ✨</h3>
                <p className="text-sm font-medium text-slate-600 mt-1">
                  Ваша тема ({tokens.label}) та додані мрії ({draftItems.length} шт.) миттєво
                  перенесуться у ваш персональний лінк.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Назва вашого свята або списку:
              </label>
              <input
                type="text"
                value={wishlistTitle}
                onChange={(e) => setWishlistTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-semibold text-slate-950 focus:outline-none focus:border-slate-950"
              />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleCompleteOnboarding('google')}
                className={`w-full min-h-[48px] px-4 rounded-xl text-base font-bold ${tokens.primaryCtaGradient} text-white flex items-center justify-center gap-2`}
              >
                <span>Продовжити з Google (1 клік)</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleCompleteOnboarding('apple')}
                className="w-full min-h-[48px] px-4 rounded-xl text-base font-bold bg-slate-950 text-white hover:bg-slate-800"
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
