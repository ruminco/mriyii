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

  // Максимум 2 акцентні кольори на тему (Rose+Gold для rose_luxury, Indigo+Emerald для cyber_titanium)
  const accentTextClass =
    themePreset === 'rose_luxury'
      ? 'bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 bg-clip-text text-transparent'
      : 'bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent';

  const sectionBadgeClass =
    themePreset === 'rose_luxury'
      ? 'bg-pink-500/15 border border-pink-400/35 text-pink-200'
      : 'bg-indigo-500/15 border border-indigo-400/35 text-indigo-200';

  return (
    <div className={`min-h-screen ${tokens.meshClass} text-white spring-transition`}>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950/95 backdrop-blur-xl rounded-2xl px-5 py-3.5 border border-emerald-400/50 shadow-2xl flex items-center gap-2.5 text-sm font-bold text-emerald-300">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Спрощений Sticky Header (56–64px, чистий на 390px) */}
      <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-[#090e1a]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px]`}
            >
              <div className="w-full h-full bg-[#161324] rounded-[10px] flex items-center justify-center text-lg">
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
              className={`h-11 px-5 rounded-xl text-sm font-bold ${tokens.primaryCtaGradient} text-white inline-flex items-center spring-transition active:scale-95`}
            >
              {locale === 'en' ? 'Dashboard →' : 'Мій кабінет →'}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* ================================================================= */}
        {/* СЕКЦІЯ 1: ЧИСТИЙ ЦЕНТРОВАНИЙ HERO V2 (HERO_V2_PROPOSAL.md)        */}
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
                  <span>🤫 Таємний чат у Telegram «То що даруємо?»</span>
                  <span aria-hidden="true">➔</span>
                </>
              ) : (
                <>
                  <span>✨ 1 лінк Mriyii без спойлерів і натяків</span>
                  <span className="font-black text-emerald-300" aria-hidden="true">
                    ✓
                  </span>
                </>
              )}
            </button>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-white leading-[1.08]">
            Твої мрії <span className={accentTextClass}>ВАРТІ ТОГО,</span> щоб збутися
          </h1>

          <p className="text-base sm:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed font-medium">
            Більше жодних таємних чатів у Telegram і незручних натяків. Додай лінк на подарунок —
            отримай стильну вітрину за <strong className="text-white font-bold">30 секунд</strong>.
          </p>

          {/* Компактний перемикач стилю */}
          <div className="max-w-xs mx-auto grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/35 border border-white/15">
            <button
              type="button"
              onClick={() => handleSwitchTheme('rose_luxury')}
              className={`min-h-[48px] rounded-xl text-sm font-bold spring-transition ${
                themePreset === 'rose_luxury'
                  ? 'bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-lg'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              👩 Для неї
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTheme('cyber_titanium')}
              className={`min-h-[48px] rounded-xl text-sm font-bold spring-transition ${
                themePreset === 'cyber_titanium'
                  ? 'bg-gradient-to-r from-indigo-600 to-emerald-500 text-white shadow-lg'
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
        {/* СЕКЦІЯ 2: ЯК ЦЕ ЗМІНЮЄ ПІДГОТОВКУ ДО СВЯТА (ДО / ПІСЛЯ)           */}
        {/* ================================================================= */}
        <section id="section-2-anti-chaos" className="py-20 sm:py-28 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Більше жодних <span className={accentTextClass}>таємних чатів у Telegram</span> «То що
              даруємо?»
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Одне естетичне посилання в профілі чи сторіс замінює 100 незручних натяків і рятує від
              двох однакових подарунків.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Картка До */}
            <div className="rounded-3xl p-7 bg-[#0f111a]/75 backdrop-blur-2xl border border-white/15 space-y-5">
              <h3 className="text-xl font-black text-white">
                Як було раніше: чат «ДН Ані (БЕЗ АНІ!)»
              </h3>
              <ul className="space-y-4 text-base text-slate-200 leading-relaxed">
                <li>
                  ❌ Новий чат у Telegram на 15 людей за два дні до свята: «По скільки скидаємось?
                  Хто збирає на карту?»
                </li>
                <li>
                  ❌ Незручне питання в лоб «Що тобі подарувати?» і відповідь «Та мені нічого не
                  треба...»
                </li>
                <li>❌ Подаровані навмання сертифікати, сувеніри або не той колір і розмір.</li>
              </ul>
            </div>

            {/* Картка Після */}
            <div className="rounded-3xl p-7 bg-[#0f111a]/75 backdrop-blur-2xl border border-emerald-400/40 space-y-5">
              <h3 className="text-xl font-black text-white">
                Як працює Mriyii: один стильний лінк
              </h3>
              <ul className="space-y-4 text-base text-slate-200 leading-relaxed">
                <li>
                  ✅ <strong className="text-white font-extrabold">ДРУЗЯМ БЕЗ РЕЄСТРАЦІЇ</strong>{' '}
                  — відкрили посилання і забронювали подарунок за 1 клік.
                </li>
                <li>
                  ✅ Ти отримуєш 100% бажані речі у точному кольорі та розмірі без почуття провини.
                </li>
                <li>
                  ✅ Інші гості миттєво бачать, що лот уже зайнятий —{' '}
                  <strong className="text-white font-extrabold">нуль шансів на дублікати</strong>.
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => scrollToSandbox()}
              className={`min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-bold ${tokens.primaryCtaGradient} text-white shadow-xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>Створити 1 лінк замість 100 натяків →</span>
            </button>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 3: СПІЛЬНИЙ ЗБІР НА МОНОБАНКУ (0% КОМІСІЇ)                 */}
        {/* ================================================================= */}
        <section id="section-3-monobank" className="py-20 sm:py-28 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              🐈‍⬛ Інтеграція з Monobank • ₴ UAH
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Великі мрії здійснюються <span className={accentTextClass}>РАЗОМ</span> — 0% комісії
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Соромно просити стайлер Dyson чи камеру за 25 000 ₴ в однієї людини? Для компанії з 10
              друзів це комфортний комплімент через Apple Pay прямо на твою Банку.
            </p>
          </div>

          {/* Живий прогрес-бар Монобанки */}
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
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 spring-transition"
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
            <div className="rounded-3xl p-6 bg-[#0f111a]/75 backdrop-blur-2xl border border-white/15 space-y-2">
              <div className="text-lg font-black text-white tabular-nums">
                60 секунд авто-оновлення
              </div>
              <p className="text-base text-slate-200 leading-relaxed">
                Живий прогрес-бар на сайті оновлюється автоматично після кожного поповнення Банки.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#0f111a]/75 backdrop-blur-2xl border border-white/15 space-y-2">
              <div className="text-lg font-black text-white tabular-nums">
                100% твої гроші (₴ UAH)
              </div>
              <p className="text-base text-slate-200 leading-relaxed">
                Кошти йдуть напряму у твій додаток Monobank. Mriyii не бере жодної комісії.
              </p>
            </div>
            <div className="rounded-3xl p-6 bg-[#0f111a]/75 backdrop-blur-2xl border border-white/15 space-y-2">
              <div className="text-lg font-black text-white">Без спойлерів до свята</div>
              <p className="text-base text-slate-200 leading-relaxed">
                Гості бачать, скільки гривень залишилось зібрати, а ти бачиш лише інтригу.
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => scrollToSandbox('https://rozetka.com.ua/dyson-airwrap-complete-long')}
              className={`min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-bold ${tokens.primaryCtaGradient} text-white shadow-xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>🫙 Додати велику мрію з Монобанкою →</span>
            </button>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 4: INSTAGRAM-ШОУРУМИ ТА УЛЮБЛЕНІ КВІТИ БЕЗ АДРЕСИ          */}
        {/* ================================================================= */}
        <section id="section-4-instagram-flowers" className="py-20 sm:py-28 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              🌸 Без розкриття домашньої адреси
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Улюблені <span className={accentTextClass}>КВІТИ ТА БРЕНДИ З INSTAGRAM</span> без
              адреси
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Заповнюй картку «🌸 Які квіти я люблю та мої побажання» — дарувальник оплачує букет чи
              сукню, а магазин сам уточнює доставку в Direct.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 text-slate-950 shadow-2xl space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-amber-400 text-white flex items-center justify-center text-2xl shrink-0">
                  🌸
                </div>
                <h3 className="text-xl font-black text-slate-950">
                  🌸 Які квіти я люблю та мої побажання
                </h3>
              </div>

              <div className="bg-rose-50 rounded-2xl p-4 space-y-2.5 text-base font-medium text-slate-900">
                <p>
                  <strong className="font-extrabold">Квіти:</strong>{' '}
                  {currentDemoWishlist.aiFlowerPreferences}
                </p>
                <p>
                  <strong className="font-extrabold">Розміри:</strong>{' '}
                  {currentDemoWishlist.aiSizes} • Бутік{' '}
                  <span className="text-pink-700 font-bold">@kamelia_flowers_kyiv</span>
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
                className="w-full min-h-[48px] px-5 py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-pink-600 to-amber-500 text-white shadow-lg flex items-center justify-center gap-2 spring-transition active:scale-95"
              >
                <Copy className="w-5 h-5" />
                <span>Замовити в Instagram @kamelia_flowers_kyiv</span>
              </button>
            </div>

            <div className="lg:col-span-6 space-y-5">
              <div className="rounded-3xl p-6 bg-[#0f111a]/75 backdrop-blur-2xl border border-white/15 space-y-1.5">
                <div className="text-lg font-black text-white">
                  1. Вказуєш улюблені квіти та розміри
                </div>
                <p className="text-base text-slate-200">
                  Наприклад: «Білі півонії без целофану від @kamelia_flowers_kyiv» та розміри S / 37.
                </p>
              </div>
              <div className="rounded-3xl p-6 bg-[#0f111a]/75 backdrop-blur-2xl border border-white/15 space-y-1.5">
                <div className="text-lg font-black text-white">
                  2. Дарувальник замовляє в 1 клік
                </div>
                <p className="text-base text-slate-200">
                  Ми автоматично копіюємо готовий текст замовлення для @
                  {currentDemoWishlist.ownerInstagramHandle}.
                </p>
              </div>
              <div className="rounded-3xl p-6 bg-[#0f111a]/75 backdrop-blur-2xl border border-emerald-400/40 space-y-1.5">
                <div className="text-lg font-black text-white">
                  3. Доставка через Direct — 100% приватно
                </div>
                <p className="text-base text-slate-200">
                  Після оплати бутік пише особисто тобі у Direct, і ти сама обираєш, куди прийняти
                  кур&apos;єра.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href={`/dashboard?theme=${themePreset}`}
              className={`min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-bold ${tokens.primaryCtaGradient} text-white shadow-xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>💐 Налаштувати картку квітів та шоурумів →</span>
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 5: ШІ-АГЕНТ ПОДАРУНКІВ GEMINI                              */}
        {/* ================================================================= */}
        <section id="section-5-gemini-ai" className="py-20 sm:py-28 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
            >
              🤖 Powered by Gemini AI
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Немає ідей? ШІ-Агент підбере{' '}
              <span className={accentTextClass}>ТАЄМНИЙ СЮРПРИЗ</span> за 10 секунд
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Ти один раз заповнюєш коротку анкету смаків і анти-подарунків, а наш ШІ-консьєрж
              генерує влучні ідеї рівно під бюджет гостя.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl p-7 bg-[#0f111a]/75 backdrop-blur-2xl border border-white/15 space-y-3">
              <h3 className="text-xl font-black text-white">
                🎯 Під будь-який бюджет у гривні
              </h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Гість обирає комфортну суму (До 1 000 ₴, До 3 000 ₴ або VIP) і за секунду отримує 3
                ідеальні варіанти під твій стиль і табу.
              </p>
            </div>
            <div className="rounded-3xl p-7 bg-[#0f111a]/75 backdrop-blur-2xl border border-white/15 space-y-3">
              <h3 className="text-xl font-black text-white">🕵️‍♀️ 100% таємний сюрприз-лот</h3>
              <p className="text-base text-slate-200 leading-relaxed">
                Заброньована порада ШІ ховається від власника вішліста до дня свята, але інші друзі
                бачать, що ідея вже зайнята.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className={`min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-bold ${tokens.primaryCtaGradient} text-white shadow-xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>🤖 Протестувати ШІ-Агента подарунків →</span>
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 6: РЕЖИМ СЮРПРИЗУ — «ДВА СВІТИ»                            */}
        {/* ================================================================= */}
        <section id="section-6-surprise-mode" className="py-20 sm:py-28 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ти бачиш <span className={accentTextClass}>ІНТРИГУ</span> — друзі бачать чіткий план
            </h2>

            <div className="inline-flex p-1.5 rounded-2xl bg-black/40 border border-white/15 gap-2">
              <button
                type="button"
                onClick={() => setRolePreview('owner')}
                className={`min-h-[48px] px-5 rounded-xl text-base font-bold spring-transition ${
                  rolePreview === 'owner'
                    ? 'bg-amber-300 text-slate-950 shadow-lg'
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

          <div className="text-center">
            <Link
              href="/w/olena-vip"
              className={`min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-bold ${tokens.primaryCtaGradient} text-white shadow-xl spring-transition active:scale-95 inline-flex items-center gap-2`}
            >
              <span>👀 Відкрити живий приклад (/w/olena-vip) →</span>
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 7: ФІНАЛЬНИЙ МАНІФЕСТ + CTA                                */}
        {/* ================================================================= */}
        <section
          id="section-7-final-manifesto"
          className="py-20 sm:py-28 text-center space-y-6 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12]">
            Створи свій вішліст за <span className={accentTextClass}>30 секунд</span> — безкоштовно
          </h2>
          <p className="text-base sm:text-xl text-slate-200">
            Повністю безкоштовно. Працює в Instagram Bio, Telegram та TikTok.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => scrollToSandbox()}
              className={`w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-bold ${tokens.primaryCtaGradient} text-white shadow-2xl spring-transition active:scale-95`}
            >
              ✨ Створити свій список мрій безкоштовно
            </button>
            <Link
              href={`/w/${currentDemoWishlist.slug}`}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 rounded-2xl text-base font-bold bg-white/15 hover:bg-white/25 text-white border border-white/25 spring-transition flex items-center justify-center"
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
