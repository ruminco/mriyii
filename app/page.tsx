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
  Check,
} from 'lucide-react';
import type { ThemePreset, UserGender } from '@/models/User';
import { THEME_TOKENS, DEMO_WISHLISTS } from '@/lib/theme-data';
import { SmokedGiftCard, type UnifiedGiftCardItem } from '@/components/SmokedGiftCard';
import { AffiliateDisclosureBadge } from '@/components/AffiliateDisclosureBadge';
import { LikeBurst } from '@/components/LikeBurst';
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

  // Поля Delayed Auth капсули (додавання бажань без логіну) + Issue #21 states
  const [urlInput, setUrlInput] = useState('');
  const [capsuleState, setCapsuleState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [jarBurstKey, setJarBurstKey] = useState(0);
  const [bioLinkCopied, setBioLinkCopied] = useState(false);
  const [draftItems, setDraftItems] = useState<UnifiedGiftCardItem[]>([]);
  const [wishlistTitle, setWishlistTitle] = useState(DEMO_WISHLISTS.rose_luxury.title);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locale, setLocale] = useState<'ua' | 'en'>('ua');
  const [heroPillIndex, setHeroPillIndex] = useState<number>(0);
  const [claimSlug, setClaimSlug] = useState<string>('olena-vip');
  const [aiChip, setAiChip] = useState<'beauty' | 'coffee' | 'gadgets' | 'flowers'>('beauty');
  const [cssVersion, setCssVersion] = useState<'aurora' | 'smoked' | 'editorial'>('aurora');
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  const [comparePos, setComparePos] = useState<number>(52);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const HERO_PLACEHOLDERS = [
    'Встав посилання з rozetka.com.ua або @instagram-шоурум...',
    'Або з apple.com / brocard.ua / sephora...',
    'Або просто напиши: «Хочу Dyson Airwrap» ✨',
  ];

  const HERO_PILL_CASES = [
    {
      dotColor: 'bg-rose-400',
      pillClass: 'bg-rose-500/15 border border-rose-400/35 text-rose-100',
      before: '💬 Ще один чат у Telegram і зіпсована інтрига?',
      after: '🎁 Одне посилання: бронь у 1 клік і Монобанка 0%',
    },
    {
      dotColor: 'bg-amber-400',
      pillClass: 'bg-amber-500/15 border border-amber-400/35 text-amber-100',
      before: '🤫 Хочу зробити таємний luxury-сюрприз, але не знаю що?',
      after: '✨ ШІ підбере ідею + доставка без адреси',
    },
    {
      dotColor: 'bg-emerald-400',
      pillClass: 'bg-emerald-500/15 border border-emerald-400/35 text-emerald-100',
      before: '🌸 Хочу подарувати квіти, але не знаю адреси?',
      after: '📸 Замовлення в Instagram Direct за 1 клік',
    },
  ];

  const AI_SPOTLIGHT_SAMPLES: Record<
    'beauty' | 'coffee' | 'gadgets' | 'flowers',
    { label: string; title: string; price: string; shop: string; img: string }
  > = {
    beauty: {
      label: '💄 Бʼюті та догляд',
      title: 'Стайлер Dyson Airwrap i.d. Rose Gold',
      price: '25 999 ₴',
      shop: 'Brocard / Rozetka',
      img: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=700&q=80',
    },
    coffee: {
      label: '☕ Кава та затишок',
      title: 'Кавоварка DeLonghi Dedica Arte + набір спешелті зерен',
      price: '8 499 ₴',
      shop: 'Comfy • ₴ UAH',
      img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=80',
    },
    gadgets: {
      label: '🎧 Гаджети та аудіо',
      title: 'Навушники Apple AirPods Max USB-C Midnight',
      price: '23 999 ₴',
      shop: 'Citrus / Apple',
      img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=80',
    },
    flowers: {
      label: '🌸 Квіти без адреси',
      title: 'Монобукет білих півоній (15 шт) у крафті',
      price: '2 850 ₴',
      shop: '@kamelia_flowers_kyiv',
      img: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=700&q=80',
    },
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroPillIndex((prev) => (prev + 1) % 3);
      setPlaceholderIndex((prev) => (prev + 1) % 3);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Живий інтерактивний стан Монобанки у Секції 5 + Number Ticker + Confetti
  const [demoJarAmount, setDemoJarAmount] = useState<Record<ThemePreset, number>>({
    rose_luxury: 23000,
    cyber_titanium: 24500,
  });
  const [displayJarAmount, setDisplayJarAmount] = useState<number>(23000);
  const displayJarRef = useRef<number>(23000);

  useEffect(() => {
    const target = demoJarAmount[themePreset];
    const startVal = displayJarRef.current;
    if (startVal === target) return;
    const startTime = performance.now();
    let rafId = 0;
    const step = (now: number) => {
      const p = Math.min((now - startTime) / 480, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(startVal + (target - startVal) * eased);
      displayJarRef.current = val;
      setDisplayJarAmount(val);
      if (p < 1) {
        rafId = requestAnimationFrame(step);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [demoJarAmount, themePreset]);

  const fireConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const accent = themePreset === 'rose_luxury' ? '#FB7185' : '#34D399';
    const colors = [accent, '#FFFFFF', '#FDE047', '#38BDF8'];
    const parts = Array.from({ length: 55 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 14,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      alpha: 1,
    }));
    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.alpha -= 0.018;
        if (p.alpha > 0) {
          alive = true;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }
      if (alive) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    requestAnimationFrame(frame);
  };

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
    triggerToast('✨ Мрію додано! Відкриваємо редактор з Live Preview...');
    router.push(`/dashboard?theme=${themePreset}&added=1`);
  };

  const handleAddDraftByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) {
      setCapsuleState('error');
      sandboxInputRef.current?.focus();
      setTimeout(() => setCapsuleState('idle'), 1600);
      return;
    }

    setCapsuleState('loading');
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

      const updated = [newItem, ...draftItems];
      setDraftItems(updated);
      saveDraftToStorage(themePreset, wishlistTitle, updated);
      setUrlInput('');
      setCapsuleState('success');
      triggerToast('✓ Додано! Відкриваємо редактор з Live Preview...');
      setTimeout(() => {
        setCapsuleState('idle');
        router.push(`/dashboard?theme=${themePreset}&added=1`);
      }, 1100);
    } catch {
      setCapsuleState('error');
      setTimeout(() => setCapsuleState('idle'), 1600);
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
    themePreset === 'rose_luxury' ? 'text-rose-300' : 'text-emerald-300';

  const sectionBadgeClass =
    themePreset === 'rose_luxury'
      ? 'bg-rose-500/15 border border-rose-400/35 text-rose-200'
      : 'bg-emerald-500/15 border border-emerald-400/35 text-emerald-200';

  const activePill = HERO_PILL_CASES[heroPillIndex] ?? HERO_PILL_CASES[0]!;

  const isRose = themePreset === 'rose_luxury';
  const styleVars = {
    '--aurora-accent': isRose ? 'rgba(251, 113, 133, 0.22)' : 'rgba(52, 211, 153, 0.2)',
    '--spotlight-accent': isRose ? 'rgba(251, 113, 133, 0.14)' : 'rgba(52, 211, 153, 0.14)',
    '--beam-color': isRose ? '#FB7185' : '#34D399',
    '--beam-soft': isRose ? '#FDA4AF' : '#6EE7B7',
  } as React.CSSProperties;

  return (
    <div
      data-style={cssVersion}
      style={styleVars}
      className={`min-h-screen ${tokens.meshClass} text-white spring-transition`}
    >
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        aria-hidden="true"
      />

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
              href="/ideas"
              className="hidden md:inline-block text-sm font-bold text-slate-200 hover:text-white spring-transition"
            >
              💡 Ідеї подарунків
            </Link>
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

      <main className="w-full">
        {/* ================================================================= */}
        {/* СЕКЦІЯ 1: HERO (AURORA + SPOTLIGHT + 3 CSS VERSIONS + PILL)       */}
        {/* ================================================================= */}
        <section
          id="section-1-hero"
          ref={heroSectionRef}
          onMouseMove={(e) => {
            if (!heroSectionRef.current || !spotlightRef.current) return;
            const rect = heroSectionRef.current.getBoundingClientRect();
            spotlightRef.current.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            spotlightRef.current.style.setProperty('--my', `${e.clientY - rect.top}px`);
          }}
          className="relative w-full py-10 sm:py-16 overflow-hidden"
        >
          <div className="aurora-bg" aria-hidden="true" />
          <div ref={spotlightRef} className="spotlight-layer" aria-hidden="true" />

          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center space-y-5 sm:space-y-6">
            {/* 3-кліковий перемикач CSS-версій (Issue #20) */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm font-semibold text-slate-300 mr-1">Стиль:</span>
              {(
                [
                  { id: 'aurora', label: '✨ Aurora' },
                  { id: 'smoked', label: '🪟 Smoked Glass' },
                  { id: 'editorial', label: '📰 Editorial' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setCssVersion(v.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-sm font-bold border spring-transition ${
                    cssVersion === v.id
                      ? isRose
                        ? 'bg-rose-400 text-slate-950 border-rose-300 shadow-lg'
                        : 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg'
                      : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="min-h-[48px] flex items-center justify-center">
              <button
                type="button"
                onClick={() => setHeroPillIndex((prev) => (prev + 1) % 3)}
                className={`inline-flex flex-wrap items-center justify-center gap-2 min-h-[44px] px-4 sm:px-5 py-2 rounded-full text-sm sm:text-base font-bold backdrop-blur-xl transition-all duration-500 ${activePill.pillClass}`}
                title="Натисни, щоб перемкнути сценарій"
              >
                <span
                  className={`w-2 h-2 rounded-full ${activePill.dotColor} animate-pulse shrink-0`}
                />
                <span>{activePill.before}</span>
                <span aria-hidden="true">➔</span>
                <span className="text-white font-extrabold">{activePill.after}</span>
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
                    ? 'bg-rose-400 text-slate-950 shadow-lg'
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
                id="capsule-input"
                ref={sandboxInputRef}
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={HERO_PLACEHOLDERS[placeholderIndex]}
                className="flex-1 px-4 py-3 text-base font-semibold text-slate-950 placeholder:text-slate-400 bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                disabled={capsuleState === 'loading'}
                aria-live="polite"
                className={`w-full sm:w-[244px] min-h-[48px] sm:h-14 px-5 rounded-xl text-base font-bold shrink-0 spring-transition active:scale-95 flex items-center justify-center gap-2 ${
                  capsuleState === 'success'
                    ? 'bg-emerald-400 text-slate-950'
                    : capsuleState === 'error'
                    ? 'bg-rose-500 text-white shake-2px'
                    : tokens.primaryCtaGradient
                }`}
              >
                {capsuleState === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span>Додаємо...</span>
                  </>
                ) : capsuleState === 'success' ? (
                  <>
                    <Check className="w-5 h-5 shrink-0" />
                    <span>✓ Додано</span>
                  </>
                ) : capsuleState === 'error' ? (
                  <span className="text-sm font-extrabold">Не вдалося, спробуй ще</span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 shrink-0" />
                    <span>✨ Створити вішліст</span>
                  </>
                )}
              </button>
            </form>

            {/* Inline Claim Link Preview (#17) */}
            <div className="max-w-lg mx-auto flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-200">
              <span>Твій майбутній лінк:</span>
              <span className="inline-flex items-center px-3 py-1 rounded-xl bg-white/10 border border-white/15 font-bold text-white">
                mriyii.app/w/
                <input
                  type="text"
                  value={claimSlug}
                  onChange={(e) =>
                    setClaimSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))
                  }
                  aria-label="Твій нікнейм для посилання"
                  className="w-24 bg-transparent text-rose-300 font-black focus:outline-none ml-0.5"
                />
              </span>
            </div>

            {/* 4 чисті пігулки швидкого тесту */}
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
              <button
                type="button"
                onClick={() =>
                  addDraftItemDirect({
                    id: `draft-vip-bio-${Date.now()}`,
                    title: 'VIP-подарунок із доставкою через @instagram Direct',
                    emoji: '💎',
                    description: 'Для Instagram Bio: 100% без домашньої адреси, анонімні подарунки 🕶️',
                    price: 6500,
                    currency: 'UAH',
                    instagramHandle: 'kamelia_flowers_kyiv',
                    imageUrl:
                      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=700&q=80',
                    isBooked: false,
                  })
                }
                className="min-h-[48px] px-4 rounded-full bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 text-sm font-semibold border border-amber-400/35 spring-transition"
              >
                💎 Для Instagram Bio (100% без адреси)
              </button>
            </div>

            <p className="text-sm font-medium text-slate-300">
              Без реєстрації для старту • 0% комісії • Тільки ₴ UAH
            </p>
          </div>
        </section>

        {/* Чернетка Delayed Auth (з'являється лише після додавання першої мрії) */}
        {draftItems.length > 0 && (
          <section className="w-full py-12 bg-[#0F172A] border-y border-white/15">
            <div className="mx-auto max-w-5xl px-4 space-y-6">
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
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* СЕКЦІЯ 2: ДО / ПІСЛЯ — SOLID FILL (#0F172A)                       */}
        {/* ================================================================= */}
        <section id="section-before-after" className="w-full bg-[#0F172A] border-y border-white/5 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 space-y-8">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Досить <span className={accentTextClass}>здогадок</span> у месенджерах
              </h2>
              <p className="text-base sm:text-lg text-slate-200">
                Порівняй, як свято виглядає в чатах і як — із твоїм посиланням Mriyii.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="style-surface rounded-3xl p-6 sm:p-7 bg-[#171D30] border border-rose-400/30 space-y-4">
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

              <div className="style-surface rounded-3xl p-6 sm:p-7 bg-[#171D30] border border-emerald-400/35 space-y-4">
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

            {/* Інтерактивний Compare Slider (21st.dev Compare) */}
            <div className="max-w-3xl mx-auto space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm font-bold text-slate-300 px-1">
                <span>↔ Потягни слайдер: Хаос у чаті vs Вітрина Mriyii</span>
                <span className="tabular-nums text-white">{comparePos}%</span>
              </div>
              <div className="relative h-52 sm:h-44 rounded-3xl overflow-hidden border border-white/15 bg-[#0B1120] select-none">
                {/* Right layer: After */}
                <div className="absolute inset-0 p-6 flex flex-col justify-center bg-gradient-to-br from-[#0F172A] to-[#0E242C]">
                  <span className="inline-flex w-fit px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-bold mb-2">
                    ✅ Стало: Mriyii Вітрина
                  </span>
                  <p className="text-lg sm:text-xl font-black text-white">
                    1 посилання • Бронь за 5 сек • Монобанка 0% • Сюрприз 🕶️
                  </p>
                  <p className="text-sm text-slate-200 mt-1">
                    Жодних дублів і незручних питань у Direct.
                  </p>
                </div>
                {/* Left layer: Before (clipped) */}
                <div
                  className="absolute inset-0 p-6 flex flex-col justify-center bg-[#1F1221] border-r-2 border-white"
                  style={{ clipPath: `inset(0 ${100 - comparePos}% 0 0)` }}
                >
                  <span className="inline-flex w-fit px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 text-sm font-bold mb-2">
                    ❌ Було: «То що даруємо?» у Telegram
                  </span>
                  <p className="text-lg sm:text-xl font-black text-white">
                    48 повідомлень • 2 однакові подарунки • Зіпсований сюрприз
                  </p>
                  <p className="text-sm text-rose-100 mt-1">
                    Гола картка Монобанку без фото й контексту.
                  </p>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={comparePos}
                  onChange={(e) => setComparePos(Number(e.target.value))}
                  aria-label="Порівняння До і Після"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10"
                  style={{ left: `${comparePos}%` }}
                >
                  <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white text-slate-950 font-black text-sm flex items-center justify-center shadow-2xl">
                    ↔
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 3: ЯК ЦЕ ПРАЦЮЄ ЗА 3 КРОКИ — GRADIENT BAND + ANIMATED BEAM */}
        {/* ================================================================= */}
        <section
          id="section-2-how-it-works"
          className="w-full py-16 sm:py-24"
          style={{ background: 'linear-gradient(180deg, #111c33 0%, #0e242c 100%)' }}
        >
          <div className="mx-auto max-w-5xl px-4 space-y-10">
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

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
              {/* SVG Animated Beam між 3 кроками */}
              <svg
                className="hidden md:block absolute top-6 left-[18%] w-[64%] h-6 pointer-events-none"
                viewBox="0 0 600 24"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M0 12 L600 12"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="3"
                />
                <path
                  d="M0 12 L600 12"
                  stroke={isRose ? '#FB7185' : '#34D399'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="beam-path-pulse"
                />
              </svg>

              <div className="relative flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#171D30] border-2 border-rose-400/50 flex items-center justify-center text-2xl font-black text-rose-300 shadow-lg z-10">
                  01
                </div>
                <h3 className="text-xl font-black text-white">🔗 Встав лінк або @instagram</h3>
                <p className="text-base text-slate-200 leading-relaxed max-w-xs">
                  Ми автоматично підтягнемо фото, ціну в гривні (₴) та назву з будь-якого українського магазину.
                </p>
              </div>

              <div className="relative flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#171D30] border-2 border-indigo-400/50 flex items-center justify-center text-2xl font-black text-indigo-300 shadow-lg z-10">
                  02
                </div>
                <h3 className="text-xl font-black text-white">📲 Поділись одним лінком</h3>
                <p className="text-base text-slate-200 leading-relaxed max-w-xs">
                  Додай посилання в Instagram Bio, Telegram або сторіс. Друзям не потрібна реєстрація.
                </p>
              </div>

              <div className="relative flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#171D30] border-2 border-emerald-400/50 flex items-center justify-center text-2xl font-black text-emerald-300 shadow-lg z-10">
                  03
                </div>
                <h3 className="text-xl font-black text-white">🎁 Друзі бронюють без спойлерів</h3>
                <p className="text-base text-slate-200 leading-relaxed max-w-xs">
                  Гості бачать вільні мрії та скидаються на Банку, а ти отримуєш сюрприз без дублікатів.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 4: PRODUCT SHOWCASE — SOLID FILL (#0B1120)                 */}
        {/* ================================================================= */}
        <section id="section-3-showcase" className="w-full bg-[#0B1120] border-y border-white/5 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 space-y-10">
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

            <div className="style-surface max-w-4xl mx-auto rounded-[28px] bg-[#171D30] border border-white/15 p-5 sm:p-8 shadow-2xl space-y-5">
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

              {/* 4. Міні-лоти (білі картки, 1-й лот із Border Beam) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentDemoWishlist.items.slice(0, 2).map((item, idx) =>
                  idx === 0 ? (
                    <div key={`showcase-${item.id}`} className="border-beam-wrap">
                      <div className="border-beam-inner">
                        <SmokedGiftCard
                          item={item}
                          themePreset={themePreset}
                          viewMode="guest"
                          ownerInstagramHandle={currentDemoWishlist.ownerInstagramHandle}
                          onInstagramOrderToast={triggerToast}
                          onBookClick={() =>
                            triggerToast('💎 Подарунок заброньовано у прев’ю! Спробуй на /w/olena-vip.')
                          }
                        />
                      </div>
                    </div>
                  ) : (
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
                  )
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href={`/w/${currentDemoWishlist.slug}`}
                  className={`w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-2xl text-base font-extrabold ${tokens.primaryCtaGradient} inline-flex items-center justify-center gap-2 spring-transition active:scale-95`}
                >
                  <span>Відкрити повний живий приклад →</span>
                </Link>
                <Link
                  href={`/dashboard?theme=${themePreset}`}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl text-base font-bold bg-[#0E1324] hover:bg-[#1E2640] text-white border border-white/20 inline-flex items-center justify-center gap-2 spring-transition active:scale-95"
                >
                  <span>✏️ Спробувати редактор з Live Preview</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 5: СПІЛЬНИЙ ЗБІР НА МОНОБАНКУ + IG STORIES 9:16 MOCKUP     */}
        {/* ================================================================= */}
        <section
          id="section-4-monobank"
          className="w-full py-16 sm:py-24"
          style={{ background: 'linear-gradient(135deg, #0b1120 0%, #0e242c 100%)' }}
        >
          <div className="mx-auto max-w-6xl px-4 space-y-12">
            {/* Before / After: Гола Монобанка vs Вітрина мрії */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="rounded-3xl p-6 bg-[#171D30]/85 border border-rose-400/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-rose-300">❌ Було: Гола Монобанка в сторіс</span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-200 text-sm font-bold">0 контексту</span>
                </div>
                <div className="rounded-2xl bg-[#0E1324] border border-white/10 p-4 space-y-2 text-sm text-slate-300">
                  <p className="font-mono text-emerald-300">send.monobank.ua/jar/4x9k...</p>
                  <p className="text-slate-200">«Кидайте сюди на ДР, хто скільки може 😅»</p>
                </div>
                <p className="text-sm text-slate-300">
                  Гості не розуміють, на що саме збираєте, скільки не вистачає і чи не краще купити подарунок окремо.
                </p>
              </div>

              <div className="rounded-3xl p-6 bg-[#171D30] border border-emerald-400/40 space-y-3 shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-emerald-300">✅ Стало: Вітрина мрії з коментарем</span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-sm font-bold">Конверсія ×2.4</span>
                </div>
                <div className="rounded-2xl bg-white p-4 text-slate-950 space-y-2">
                  <div className="flex items-center justify-between text-sm font-black">
                    <span>🎧 Dyson Airwrap • 26 000 ₴</span>
                    <span className="text-emerald-700">68% зібрано</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full w-[68%] rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    «Друзі, мрію про цей стайлер на ДР! Кожен донат наближає мрію ✨»
                  </p>
                </div>
                <p className="text-sm text-slate-200">
                  Людина бачить фото, мету в ₴ та живий прогрес-бар — і з радістю скидається через Apple Pay за 5 секунд.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5 space-y-5">
                <span
                  className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${sectionBadgeClass}`}
                >
                  🐈‍⬛ Інтеграція з Monobank • ₴ UAH
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-[1.12]">
                  Великі мрії здійснюються <span className={accentTextClass}>разом</span> — 0% комісії
                </h2>
                <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
                  Для компанії з 10 друзів дорогий подарунок перетворюється на комфортний комплімент через Apple Pay прямо на твою Банку або Конверт Приват24.
                </p>

                <ul className="space-y-3 pt-1 text-base text-slate-200">
                  <li className="flex items-start gap-3">
                    <span className="text-lg shrink-0">⏱️</span>
                    <span>
                      <strong className="text-white font-bold">60 секунд авто-оновлення:</strong> живий прогрес-бар оновлюється після кожного донату.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg shrink-0">₴</span>
                    <span>
                      <strong className="text-white font-bold">100% твої гроші (UAH):</strong> кошти йдуть напряму у твій Monobank або Приват24.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg shrink-0">🔒</span>
                    <span>
                      <strong className="text-white font-bold">Без паролів і токенів:</strong> просто встав публічний лінк <code className="text-emerald-300 font-semibold">send.monobank.ua/jar/...</code>
                    </span>
                  </li>
                </ul>

                {/* Інтерактивна картка Банки */}
                <div className="bg-white rounded-3xl p-5 text-slate-950 shadow-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Стайлер Dyson Airwrap Multi-Styler
                      </h3>
                      <p className="text-sm font-medium text-slate-600">
                        Спільний збір на Монобанку (₴ UAH)
                      </p>
                    </div>
                    <div className="text-xl font-black text-slate-950 tabular-nums">26 000 ₴</div>
                  </div>
                  <div className="bg-slate-100 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-sm font-extrabold tabular-nums">
                      <span className="text-emerald-800">
                        Зібрано: {displayJarAmount.toLocaleString('uk-UA')} ₴
                      </span>
                      <span className="text-emerald-700">
                        {Math.min(100, Math.round((demoJarAmount[themePreset] / 26000) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 spring-transition"
                        style={{
                          width: `${Math.min(100, Math.round((demoJarAmount[themePreset] / 26000) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="relative flex gap-2">
                      <LikeBurst burstKey={jarBurstKey} themePreset={themePreset} />
                      <button
                        type="button"
                        onClick={() => {
                          setJarBurstKey((k) => k + 1);
                          const nextVal = Math.min(26000, demoJarAmount[themePreset] + 1500);
                          setDemoJarAmount((prev) => ({
                            ...prev,
                            [themePreset]: nextVal,
                          }));
                          if (nextVal >= 26000) {
                            fireConfetti();
                            triggerToast('🎉 Банка зібрана на 100%! Мрія здійснилась!');
                          } else {
                            triggerToast('🐈‍⬛ +1 500 ₴ додано у Монобанку (0% комісії)!');
                          }
                        }}
                        className="flex-1 min-h-[48px] px-5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold spring-transition active:scale-95"
                      >
                        + Закинути 1 500 ₴ (демо)
                      </button>
                      {demoJarAmount[themePreset] >= 26000 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDemoJarAmount((prev) => ({
                              ...prev,
                              [themePreset]: 23000,
                            }))
                          }
                          className="min-h-[48px] px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-bold spring-transition"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Вертикальний IG Stories 9:16 Mockup */}
              <div className="lg:col-span-7 flex justify-center">
                <div className="w-full max-w-[280px] rounded-[28px] bg-[#0B1120] border-2 border-white/20 p-3 shadow-2xl space-y-3">
                  {/* Story Progress Bars */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div className="h-1 rounded-full bg-white" />
                    <div className="h-1 rounded-full bg-white/75" />
                    <div className="h-1 rounded-full bg-white/30" />
                  </div>
                  {/* Story Author */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentDemoWishlist.ownerAvatarUrl}
                        alt={currentDemoWishlist.ownerName}
                        className="w-8 h-8 rounded-full object-cover border border-rose-400"
                      />
                      <span className="text-sm font-bold text-white">@{currentDemoWishlist.ownerInstagramHandle}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-300">2 год</span>
                  </div>
                  {/* Story Visual Canvas */}
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#1E1433] to-[#0F172A] border border-white/15 p-4 space-y-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=500&q=80"
                      alt="Dyson Airwrap"
                      className="w-full h-44 rounded-xl object-cover"
                    />
                    <div className="text-center space-y-1">
                      <div className="text-sm font-black text-white">Мій вішліст до ДР 🎂✨</div>
                      <div className="text-sm text-slate-200">Жодних дублікатів — усе тут 👇</div>
                    </div>
                    {/* Instagram Link Sticker */}
                    <Link
                      href={`/w/${currentDemoWishlist.slug}`}
                      className="block w-full min-h-[48px] rounded-xl bg-white text-slate-950 px-3 py-2.5 text-center font-black text-sm shadow-lg hover:bg-slate-100 spring-transition"
                    >
                      🔗 mriyii.app/w/{claimSlug || currentDemoWishlist.slug}
                    </Link>
                  </div>
                  <div className="text-center text-sm font-semibold text-slate-300 pb-1">
                    📱 Готовий формат для IG Stories 9:16
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 6: КВІТИ ТА INSTAGRAM-ШОУРУМИ БЕЗ АДРЕСИ (PHOTO + OVERLAY) */}
        {/* ================================================================= */}
        <section
          id="section-5-instagram-flowers"
          className="relative w-full overflow-hidden py-16 sm:py-24"
        >
          {/* Full-bleed Floral Photo + Deep Slate Overlay */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1600&q=80"
            alt="Флористичний фон"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0B1120]/82 backdrop-blur-[2px]" />

          <div className="relative z-10 mx-auto max-w-6xl px-4 space-y-10">
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=400&q=80"
                    alt="Букет білих півоній"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <span className="text-sm font-bold text-rose-700">Бутік @kamelia_flowers_kyiv</span>
                    <h3 className="text-xl font-black text-slate-950">
                      🌸 Які квіти я люблю та мої побажання
                    </h3>
                  </div>
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
                <div className="rounded-3xl p-6 bg-[#171D30]/95 border border-white/15 space-y-1.5">
                  <div className="text-lg font-black text-white">
                    1. Вказуєш улюблені квіти та розміри
                  </div>
                  <p className="text-base text-slate-200">
                    Наприклад: «Білі півонії без целофану від @kamelia_flowers_kyiv» та розміри S / 37.
                  </p>
                </div>
                <div className="rounded-3xl p-6 bg-[#171D30]/95 border border-white/15 space-y-1.5">
                  <div className="text-lg font-black text-white">
                    2. Дарувальник замовляє в 1 клік
                  </div>
                  <p className="text-base text-slate-200">
                    Ми автоматично копіюємо готовий текст замовлення для @
                    {currentDemoWishlist.ownerInstagramHandle}.
                  </p>
                </div>
                <div className="rounded-3xl p-6 bg-[#171D30]/95 border border-emerald-400/40 space-y-1.5">
                  <div className="text-lg font-black text-white">
                    3. Доставка через Direct — 100% приватно
                  </div>
                  <p className="text-base text-slate-200">
                    Після оплати бутік пише особисто тобі у Direct, і ти сама обираєш, куди прийняти кур&apos;єра.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 7: ШІ-ПОМІЧНИК GEMINI — SOLID INDIGO SLATE (#13192E)       */}
        {/* ================================================================= */}
        <section id="section-6-gemini-ai" className="w-full bg-[#13192E] border-y border-white/5 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 space-y-10">
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

            <div className="rounded-[28px] bg-[#171D30] border border-white/15 p-6 sm:p-8 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {(['beauty', 'coffee', 'gadgets', 'flowers'] as const).map((chipKey) => (
                    <button
                      key={chipKey}
                      type="button"
                      onClick={() => setAiChip(chipKey)}
                      className={`min-h-[48px] px-4 rounded-xl text-sm font-bold spring-transition ${
                        aiChip === chipKey
                          ? `${tokens.primaryCtaGradient} shadow-lg`
                          : 'bg-[#0E1324] text-slate-200 border border-white/15 hover:border-white/35'
                      }`}
                    >
                      {AI_SPOTLIGHT_SAMPLES[chipKey].label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white">
                    Під будь-який бюджет у гривні та з 100% таємним сюрпризом
                  </h3>
                  <p className="text-base text-slate-200 leading-relaxed">
                    Натисни на інтерес вище — і побачиш, як ШІ миттєво підбирає влучний лот. Заброньована порада ховається від іменинника до дня свята, але інші друзі бачать, що ідея вже зайнята.
                  </p>
                </div>

                <div className="pt-1">
                  <Link
                    href={`/w/${currentDemoWishlist.slug}`}
                    className={`min-h-[48px] px-7 py-3.5 rounded-2xl text-base font-extrabold ${tokens.primaryCtaGradient} shadow-xl spring-transition active:scale-95 inline-flex items-center gap-2`}
                  >
                    <span>🤖 Протестувати ШІ-Помічника →</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-3xl p-5 text-slate-950 shadow-xl space-y-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={AI_SPOTLIGHT_SAMPLES[aiChip].img}
                  alt={AI_SPOTLIGHT_SAMPLES[aiChip].title}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  className="w-full h-44 rounded-2xl object-cover bg-slate-100"
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-600">
                    <span>✨ Порада ШІ</span>
                    <span>{AI_SPOTLIGHT_SAMPLES[aiChip].shop}</span>
                  </div>
                  <div className="text-lg font-black text-slate-950 leading-snug">
                    {AI_SPOTLIGHT_SAMPLES[aiChip].title}
                  </div>
                  <div className="text-xl font-black text-emerald-700 tabular-nums">
                    {AI_SPOTLIGHT_SAMPLES[aiChip].price}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 8: РЕЖИМ СЮРПРИЗУ — PHOTO + DEEP OVERLAY (#0B1120/85)      */}
        {/* ================================================================= */}
        <section
          id="section-7-surprise-mode"
          className="relative w-full overflow-hidden py-16 sm:py-24"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1600&q=80"
            alt="Атмосфера свята"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0B1120]/85" />

          <div className="relative z-10 mx-auto max-w-6xl px-4 space-y-10">
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
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 9: SOCIAL PROOF — LIGHT CONTRASTING BAND (#FAF7F5)         */}
        {/* ================================================================= */}
        <section
          id="section-8-social-proof"
          className="w-full bg-[#FAF7F5] text-slate-950 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-rose-100 text-rose-800 border border-rose-200">
                💛 Живі історії спільноти
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                Уже обирають для <span className="text-rose-600">свят</span> в Україні
              </h2>
              <p className="text-base sm:text-lg text-slate-700">
                Від дня народження в Києві до таємного VIP-букета чи спільного збору на PlayStation 5.
              </p>
            </div>

            {/* 3 живі метрики */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-lg space-y-1">
                <div className="text-3xl font-black text-rose-600 tabular-nums">1 200+</div>
                <div className="text-base font-extrabold text-slate-950">створених вішлістів</div>
                <p className="text-sm text-slate-600">Дні народження, новосілля та Таємний Санта</p>
              </div>
              <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-lg space-y-1">
                <div className="text-3xl font-black text-emerald-600 tabular-nums">0%</div>
                <div className="text-base font-extrabold text-slate-950">комісії на Банку</div>
                <p className="text-sm text-slate-600">Усі донати йдуть напряму у твій Monobank</p>
              </div>
              <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-lg space-y-1">
                <div className="text-3xl font-black text-indigo-600 tabular-nums">30 сек</div>
                <div className="text-base font-extrabold text-slate-950">на перший лінк</div>
                <p className="text-sm text-slate-600">Без реєстрації для старту та гостям</p>
              </div>
            </div>

            {/* 3 Story Social Proof картки з портретами */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-lg space-y-4">
                <div className="inline-flex px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-sm font-bold border border-rose-200">
                  🎂 День народження
                </div>
                <p className="text-base text-slate-800 leading-relaxed font-medium">
                  «Кинула лінк у сторіс за тиждень до ДР — подруги самі закрили Банку на Dyson Airwrap і жодна не повторилась!»
                </p>
                <div className="flex items-center gap-3 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80"
                    alt="Олена, Київ"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-black text-slate-950">Олена</div>
                    <div className="text-sm font-bold text-rose-700">@olena.muse • Київ</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-lg space-y-4">
                <div className="inline-flex px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-sm font-bold border border-amber-200">
                  🌸 VIP-букет без адреси
                </div>
                <p className="text-base text-slate-800 leading-relaxed font-medium">
                  «Поставила лінк у Instagram Bio. Прихильник оплатив букет півоній анонімно, а флорист сам написав мені в Direct!»
                </p>
                <div className="flex items-center gap-3 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80"
                    alt="Катя, Львів"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-black text-slate-950">Катя</div>
                    <div className="text-sm font-bold text-emerald-700">@katya.style • Львів</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-lg space-y-4">
                <div className="inline-flex px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold border border-indigo-200">
                  🎮 Груповий збір PS5
                </div>
                <p className="text-base text-slate-800 leading-relaxed font-medium">
                  «Хлопці скинулись на Монобанку за два дні без жодних табличок у Excel. Іменинник до останнього не знав, що буде PS5!»
                </p>
                <div className="flex items-center gap-3 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80"
                    alt="Максим, Дніпро"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-black text-slate-950">Максим</div>
                    <div className="text-sm font-bold text-indigo-700">@max.dev • Дніпро</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Marquee (21st.dev) — живі події спільноти (пауза при наведенні) */}
            <div className="marquee-wrap py-2" aria-label="Живі події спільноти Mriyii">
              <div className="marquee-track">
                {[
                  '🎂 Оля, Київ • Зібрали 26 000 ₴ на Dyson Airwrap',
                  '🌸 Софія, Львів • Анонімний букет півоній 🕶️',
                  '🎮 Ігор, Дніпро • Спільний збір на PS5 Pro',
                  '☕ Марина, Одеса • Кавоварка DeLonghi за 2 дні',
                  '💎 Аліна • Вішліст у Instagram Bio без адреси',
                  '🎂 Оля, Київ • Зібрали 26 000 ₴ на Dyson Airwrap',
                  '🌸 Софія, Львів • Анонімний букет півоній 🕶️',
                  '🎮 Ігор, Дніпро • Спільний збір на PS5 Pro',
                  '☕ Марина, Одеса • Кавоварка DeLonghi за 2 дні',
                  '💎 Аліна • Вішліст у Instagram Bio без адреси',
                ].map((story, idx) => (
                  <span
                    key={`mq-${idx}`}
                    className="inline-flex items-center px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-800 whitespace-nowrap"
                  >
                    {story}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                aria-live="polite"
                onClick={() => {
                  const link = `https://mriyii.app/w/${claimSlug || currentDemoWishlist.slug}`;
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(link).catch(() => {});
                  }
                  setBioLinkCopied(true);
                  setTimeout(() => setBioLinkCopied(false), 1500);
                  triggerToast(`🔗 Скопійовано ${link} — додавай в Instagram Bio!`);
                }}
                className={`min-h-[48px] min-w-[272px] px-7 py-3.5 rounded-2xl text-base font-extrabold shadow-xl inline-flex items-center justify-center gap-2 spring-transition active:scale-95 ${
                  bioLinkCopied
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-slate-950 hover:bg-slate-800 text-white'
                }`}
              >
                {bioLinkCopied ? (
                  <>
                    <Check className="w-5 h-5 shrink-0" />
                    <span>✓ Скопійовано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 shrink-0" />
                    <span>🔗 Скопіювати мій лінк у Bio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 10: FAQ — SOLID DEEP SLATE (#0F172A)                       */}
        {/* ================================================================= */}
        <section id="section-9-faq" className="w-full bg-[#0F172A] text-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Часті <span className={accentTextClass}>питання</span>
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              <details className="group rounded-2xl bg-[#171D30] border border-white/10 p-5 sm:p-6" open>
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>💡 Чи справді Mriyii безкоштовний?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Так! Створення вішліста, бронювання, ШІ-підбір і збір на Монобанку безкоштовні. Ми заробляємо лише на партнерській комісії магазинів, коли гості переходять за посиланнями.
                </p>
              </details>

              <details className="group rounded-2xl bg-[#171D30] border border-white/10 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>💳 Як проходять оплати в Монобанці?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Mriyii не приймає гроші на свій рахунок. Кнопка веде напряму на вашу Банку Monobank або Конверт Приват24 з 0% комісії платформи.
                </p>
              </details>

              <details className="group rounded-2xl bg-[#171D30] border border-white/10 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>🔒 Чи бачить хтось мою домашню адресу?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Ні! Ми принципово не зберігаємо домашні адреси. Для квітів та шоурумів гість передає магазину ваш @instagram, і кур&apos;єр узгоджує доставку напряму з вами.
                </p>
              </details>

              <details className="group rounded-2xl bg-[#171D30] border border-white/10 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>📲 Чи потрібен Telegram або реєстрація?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Гостям реєстрація не потрібна взагалі. Ви можете додати перші мрії прямо зараз, а увійти через Google/Apple лише при збереженні свого посилання.
                </p>
              </details>

              <details className="group rounded-2xl bg-[#171D30] border border-white/10 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>🔄 А якщо гість передумає або захоче скасувати бронь?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Бронь скасовується в 1 клік, і подарунок одразу стає вільним. Діє анти-спам ліміт: не більше 2 активних бронювань на одного гостя, щоб ніхто не заблокував увесь список.
                </p>
              </details>

              <details className="group rounded-2xl bg-[#171D30] border border-white/10 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>✈️ Чи можна додати бажання без посилання — подорож або сертифікат?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Звісно! Можна додати будь-яку мрію текстом — квитки, враження, благодійний донат чи просто спільний збір на Монобанку без конкретного магазину.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 11: ФІНАЛЬНИЙ CTA + FOOTER — AURORA GRADIENT              */}
        {/* ================================================================= */}
        <section
          id="section-10-final-cta"
          className="w-full py-16 sm:py-24"
          style={{ background: 'linear-gradient(180deg, #111c33 0%, #0b1120 100%)' }}
        >
          <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12]">
              Створи свій вішліст за <span className={accentTextClass}>30 секунд</span>
            </h2>
            <p className="text-base sm:text-xl text-slate-200">
              Повністю безкоштовно. Працює в Instagram Bio, Telegram та TikTok.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => scrollToSandbox()}
                className={`w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-extrabold ${tokens.primaryCtaGradient} shadow-2xl spring-transition active:scale-95`}
              >
                ✨ Створити свій список мрій безкоштовно
              </button>
              <Link
                href={`/dashboard?theme=${themePreset}`}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl text-base font-bold bg-[#171D30] hover:bg-[#1E2640] text-white border border-white/20 spring-transition flex items-center justify-center"
              >
                ✏️ Спробувати редактор з Live Preview
              </Link>
              <Link
                href="/ideas"
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl text-base font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 spring-transition flex items-center justify-center"
              >
                💡 Ідеї подарунків
              </Link>
              <Link
                href={`/w/${currentDemoWishlist.slug}`}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl text-base font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 spring-transition flex items-center justify-center"
              >
                Переглянути приклад →
              </Link>
            </div>

            <div className="pt-8">
              <AffiliateDisclosureBadge />
            </div>
          </div>
        </section>
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
