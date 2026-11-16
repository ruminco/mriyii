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
import { THEME_TOKENS, DEMO_WISHLISTS, type LandingPreset } from '@/lib/theme-data';
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

interface AiCutoutItem {
  title: string;
  price: string;
  shop: string;
  img: string;
  pos?: string;
}

const PRESET_META: Record<
  LandingPreset,
  {
    label: string;
    heroImg: string;
    heroAlt: string;
    storyImg: string;
    inviteEmoji: string;
    inviteTitle: string;
    inviteSub: string;
    starburstLine1: string;
    starburstLine2: string;
    socialCount: string;
    jarGoalTitle: string;
    jarGoalAmount: number;
    jarDefaultVal: number;
    storyTitle: string;
    storySub: string;
    storySlug: string;
    instagramHandle: string;
    safeNote?: string;
  }
> = {
  rose_luxury: {
    label: '👩 Для неї',
    heroImg:
      'https://images.pexels.com/photos/5910931/pexels-photo-5910931.jpeg?auto=compress&cs=tinysrgb&w=900',
    heroAlt: 'Щаслива іменинниця з букетом квітів',
    storyImg:
      'https://images.pexels.com/photos/6641330/pexels-photo-6641330.jpeg?auto=compress&cs=tinysrgb&w=600',
    inviteEmoji: '🎂',
    inviteTitle: 'День народження Олени',
    inviteSub: '12 днів до свята • Без спойлерів',
    starburstLine1: '0% комісії',
    starburstLine2: 'Монобанка',
    socialCount: '+14 друзів уже збираються на свято',
    jarGoalTitle: 'Стайлер Dyson Airwrap i.d.',
    jarGoalAmount: 26000,
    jarDefaultVal: 19500,
    storyTitle: 'Мій вішліст до ДР',
    storySub: 'Обери мрію або додай частку в подарунку на Банку без повторів',
    storySlug: 'olena-vip',
    instagramHandle: 'olena.muse',
  },
  cyber_titanium: {
    label: '👨 Для нього',
    heroImg:
      'https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=900',
    heroAlt: 'Іменинник святкує день народження з друзями',
    storyImg:
      'https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=600',
    inviteEmoji: '🎮',
    inviteTitle: 'ДР Максима • Збір на PS5',
    inviteSub: '9 друзів уже в команді • Без дублів',
    starburstLine1: '0% комісії',
    starburstLine2: 'Pro Titanium',
    socialCount: '+9 друзів уже скинулись на спільний подарунок',
    jarGoalTitle: 'Ігрова консоль Sony PlayStation 5 Pro',
    jarGoalAmount: 32999,
    jarDefaultVal: 24500,
    storyTitle: 'Спільний збір Максима',
    storySub: 'Закидай частку в подарунку на Монобанку або бронюй лот у 1 клік',
    storySlug: 'max-cyber',
    instagramHandle: 'max.tech',
  },
  creator_bio: {
    label: '💎 Creator Bio',
    heroImg:
      'https://images.pexels.com/photos/36425425/pexels-photo-36425425.jpeg?auto=compress&cs=tinysrgb&w=900',
    heroAlt: 'Креаторка з подарунками у стилі Creator Safe Mode',
    storyImg:
      'https://images.pexels.com/photos/36425425/pexels-photo-36425425.jpeg?auto=compress&cs=tinysrgb&w=600',
    inviteEmoji: '💎',
    inviteTitle: 'Safe Mode • @olena.muse',
    inviteSub: 'Доставка через @шоурум • 0% адреси',
    starburstLine1: 'Без адреси',
    starburstLine2: 'та ПІБ',
    socialCount: '🛡️ Приватність адреси та картки на 100%',
    jarGoalTitle: 'Стайлер Dyson Airwrap i.d.',
    jarGoalAmount: 26000,
    jarDefaultVal: 19500,
    storyTitle: 'Wishlist у Bio • Safe',
    storySub: 'Подарунки та букети без розкриття домашньої адреси',
    storySlug: 'olena-vip',
    instagramHandle: 'olena.muse',
  },
};

const AI_PACKS: Record<'beauty' | 'coffee' | 'gadgets' | 'flowers', AiCutoutItem[][]> = {
  coffee: [
    [
      {
        title: 'Дріп-бокс + Sony WH',
        price: '3 800 ₴',
        shop: 'Foundation / Rozetka',
        img: 'https://images.pexels.com/photos/29687786/pexels-photo-29687786.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Ігровий вечір PS5',
        price: '3 199 ₴',
        shop: 'PlayStation Store',
        img: 'https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center 25%',
      },
      {
        title: 'Нішевий дифузор',
        price: '2 450 ₴',
        shop: 'Brocard • ₴ UAH',
        img: 'https://images.pexels.com/photos/4938265/pexels-photo-4938265.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
    ],
    [
      {
        title: 'Кавовий спа-бокс',
        price: '2 950 ₴',
        shop: 'Rituals / Rozetka',
        img: 'https://images.pexels.com/photos/31449823/pexels-photo-31449823.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Півонії в стрічці',
        price: '2 200 ₴',
        shop: '@kamelia_flowers',
        img: 'https://images.pexels.com/photos/12615496/pexels-photo-12615496.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Сюрприз-коробка',
        price: '3 400 ₴',
        shop: 'Safe Direct 🕶️',
        img: 'https://images.pexels.com/photos/15176450/pexels-photo-15176450.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
    ],
  ],
  beauty: [
    [
      {
        title: 'Dyson Airwrap (частка)',
        price: '3 500 ₴',
        shop: 'Монобанка 0%',
        img: 'https://images.pexels.com/photos/31449823/pexels-photo-31449823.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Delina Eau de Parfum',
        price: '9 400 ₴',
        shop: 'Brocard • ₴ UAH',
        img: 'https://images.pexels.com/photos/4938265/pexels-photo-4938265.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Сюрприз без адреси',
        price: '3 400 ₴',
        shop: '@kamelia_flowers',
        img: 'https://images.pexels.com/photos/15176450/pexels-photo-15176450.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
    ],
    [
      {
        title: 'Дріп-бокс + музика',
        price: '3 800 ₴',
        shop: 'Citrus / Apple',
        img: 'https://images.pexels.com/photos/29687786/pexels-photo-29687786.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Вечір із друзями',
        price: '3 200 ₴',
        shop: 'Сертифікат',
        img: 'https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center 25%',
      },
      {
        title: 'Букет у стрічці',
        price: '2 850 ₴',
        shop: '@kamelia_flowers',
        img: 'https://images.pexels.com/photos/12615496/pexels-photo-12615496.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
    ],
  ],
  gadgets: [
    [
      {
        title: 'Sony WH + Дріп-бокс',
        price: '14 500 ₴',
        shop: 'Rozetka • ₴ UAH',
        img: 'https://images.pexels.com/photos/29687786/pexels-photo-29687786.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Кооператив на PS5',
        price: '3 199 ₴',
        shop: 'Монобанка 0%',
        img: 'https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center 25%',
      },
      {
        title: 'Аромат для дому',
        price: '2 450 ₴',
        shop: 'Brocard • ₴ UAH',
        img: 'https://images.pexels.com/photos/4938265/pexels-photo-4938265.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
    ],
    [
      {
        title: 'Догляд & стайлінг',
        price: '4 200 ₴',
        shop: 'Citrus / Rozetka',
        img: 'https://images.pexels.com/photos/31449823/pexels-photo-31449823.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Подарунковий бокс',
        price: '3 400 ₴',
        shop: 'Direct @шоурум',
        img: 'https://images.pexels.com/photos/15176450/pexels-photo-15176450.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Квіти в шовку',
        price: '2 850 ₴',
        shop: '@kamelia_flowers',
        img: 'https://images.pexels.com/photos/12615496/pexels-photo-12615496.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
    ],
  ],
  flowers: [
    [
      {
        title: 'Півонії в стрічці',
        price: '2 850 ₴',
        shop: '@kamelia_flowers',
        img: 'https://images.pexels.com/photos/12615496/pexels-photo-12615496.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Сюрприз без адреси',
        price: '3 400 ₴',
        shop: 'Direct доставка',
        img: 'https://images.pexels.com/photos/15176450/pexels-photo-15176450.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Парфум Delina',
        price: '9 400 ₴',
        shop: 'Brocard • ₴ UAH',
        img: 'https://images.pexels.com/photos/4938265/pexels-photo-4938265.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
    ],
    [
      {
        title: 'Дріп-бокс + Sony',
        price: '3 800 ₴',
        shop: 'Rozetka • ₴ UAH',
        img: 'https://images.pexels.com/photos/29687786/pexels-photo-29687786.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
      {
        title: 'Свято з друзями',
        price: '3 200 ₴',
        shop: 'Сертифікат',
        img: 'https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center 25%',
      },
      {
        title: 'Стайлер Dyson (частка)',
        price: '2 950 ₴',
        shop: 'Монобанка 0%',
        img: 'https://images.pexels.com/photos/31449823/pexels-photo-31449823.jpeg?auto=compress&cs=tinysrgb&w=500',
        pos: 'center center',
      },
    ],
  ],
};

export default function LandingPage() {
  const router = useRouter();
  const sandboxInputRef = useRef<HTMLInputElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [landingPreset, setLandingPreset] = useState<LandingPreset>('rose_luxury');
  const [rolePreview, setRolePreview] = useState<'guest' | 'owner'>('guest');

  // Поля Delayed Auth капсули + Issue #21 states
  const [urlInput, setUrlInput] = useState('');
  const [capsuleState, setCapsuleState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [activeTemplate, setActiveTemplate] = useState<'bday' | 'vip' | 'him'>('bday');
  const [jarBurstKey, setJarBurstKey] = useState(0);
  const [bioLinkCopied, setBioLinkCopied] = useState(false);
  const [claimCopied, setClaimCopied] = useState(false);
  const [draftItems, setDraftItems] = useState<UnifiedGiftCardItem[]>([]);
  const [wishlistTitle, setWishlistTitle] = useState(DEMO_WISHLISTS.rose_luxury.title);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locale, setLocale] = useState<'ua' | 'en'>('ua');
  const [heroPillIndex, setHeroPillIndex] = useState<number>(0);
  const [claimSlug, setClaimSlug] = useState<string>('olena-vip');
  const [comparePos, setComparePos] = useState<number>(52);

  // Живий ШІ-помічник на сторінці (Секція 7) + Goo thinking + Stagger
  const [aiQuery, setAiQuery] = useState(
    'Любить specialty каву, спорт і красиву музику до 4 000 ₴'
  );
  const [aiChip, setAiChip] = useState<'beauty' | 'coffee' | 'gadgets' | 'flowers'>('coffee');
  const [aiPackIdx, setAiPackIdx] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);

  const themePreset: ThemePreset =
    landingPreset === 'cyber_titanium' ? 'cyber_titanium' : 'rose_luxury';

  const HERO_PILL_CASES = [
    {
      before: '💬 Хаос у чатах «То що даруємо?»',
      after: '🎁 Одне посилання: бронь у 1 клік і 0%',
    },
    {
      before: '🤫 Таємний luxury-сюрприз без адреси?',
      after: '✨ ШІ підбере ідею + доставка в Direct',
    },
    {
      before: '🌸 Подарувати квіти, не знаючи адреси?',
      after: '📸 Замовлення в Instagram Direct за 1 клік',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroPillIndex((prev) => (prev + 1) % 3);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Живий інтерактивний стан Монобанки у Секції 5 + Number Ticker + Confetti
  const [demoJarAmount, setDemoJarAmount] = useState<Record<LandingPreset, number>>({
    rose_luxury: 19500,
    cyber_titanium: 24500,
    creator_bio: 19500,
  });
  const [displayJarAmount, setDisplayJarAmount] = useState<number>(19500);
  const displayJarRef = useRef<number>(19500);

  useEffect(() => {
    const target = demoJarAmount[landingPreset];
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
  }, [demoJarAmount, landingPreset]);

  const fireConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const accent = landingPreset === 'cyber_titanium' ? '#34D399' : '#F4FF7A';
    const colors = [accent, '#FFFFFF', '#DECFFC', '#5B50EC'];
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
        if (parsed.themePreset === 'cyber_titanium') {
          setLandingPreset('cyber_titanium');
          setClaimSlug('max-cyber');
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

  const handleSwitchPreset = (nextPreset: LandingPreset) => {
    setLandingPreset(nextPreset);
    const dbTheme: ThemePreset = nextPreset === 'cyber_titanium' ? 'cyber_titanium' : 'rose_luxury';
    const defaultTitle = DEMO_WISHLISTS[dbTheme].title;
    setWishlistTitle(defaultTitle);
    setClaimSlug(PRESET_META[nextPreset].storySlug);
    saveDraftToStorage(dbTheme, defaultTitle, draftItems);
  };

  const handleApplyTemplate = (tpl: 'bday' | 'vip' | 'him') => {
    setActiveTemplate(tpl);
    if (tpl === 'bday') {
      handleSwitchPreset('rose_luxury');
      setUrlInput('rozetka.com.ua/ua/dyson-airwrap/');
      triggerToast('🎂 Обрано шаблон «День народження» — натисніть «Зібрати вішліст»!');
    } else if (tpl === 'vip') {
      handleSwitchPreset('creator_bio');
      setUrlInput('instagram.com/kamelia_flowers/');
      triggerToast('💎 Активовано Creator Safe Mode без адреси та ПІБ!');
    } else {
      handleSwitchPreset('cyber_titanium');
      setUrlInput('rozetka.com.ua/ua/playstation-5-pro/');
      triggerToast('🎮 Обрано шаблон «Хлопцю / ДР» у темі Pro Titanium!');
    }
    sandboxInputRef.current?.focus();
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
          emoji: parsed.emoji === '💇‍♀️' ? '✨' : parsed.emoji || '✨',
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
          raw.toLowerCase().includes('півон') ||
          raw.toLowerCase().includes('букет') ||
          raw.toLowerCase().includes('flower');
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
            ? 'https://images.pexels.com/photos/12775959/pexels-photo-12775959.jpeg?auto=compress&cs=tinysrgb&w=700'
            : undefined,
          originalUrl: candidateUrl.startsWith('http') ? candidateUrl : undefined,
          affiliateUrl: candidateUrl.startsWith('http') ? candidateUrl : undefined,
          instagramHandle: igMatch?.[1] ?? (isFlowers ? 'kamelia_flowers' : undefined),
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

  const runLiveAiSearch = (nextChip?: 'beauty' | 'coffee' | 'gadgets' | 'flowers') => {
    if (nextChip) {
      setAiChip(nextChip);
    }
    setAiThinking(true);
    setTimeout(() => {
      setAiPackIdx((prev) => (prev + 1) % 2);
      setAiThinking(false);
    }, 420);
  };

  const tokens = THEME_TOKENS[themePreset];
  const currentDemoWishlist = DEMO_WISHLISTS[themePreset];
  const presetMeta = PRESET_META[landingPreset];
  const flowerDemoItem =
    currentDemoWishlist.items.find((i) => i.instagramHandle) ?? currentDemoWishlist.items[1]!;

  const isCyber = landingPreset === 'cyber_titanium';
  const isCreator = landingPreset === 'creator_bio';
  const activePill = HERO_PILL_CASES[heroPillIndex] ?? HERO_PILL_CASES[0]!;

  const jarAmount = demoJarAmount[landingPreset];
  const jarTarget = presetMeta.jarGoalAmount;
  const jarPct = Math.min(100, Math.round((jarAmount / jarTarget) * 100));
  const waveEnd = Math.max(40, Math.round((jarPct / 100) * 392));

  const aiItems = AI_PACKS[aiChip][aiPackIdx] ?? AI_PACKS.coffee[0]!;

  return (
    <div data-preset={landingPreset} className="min-h-screen spring-transition">
      {/* Hidden SVG Organic Masks (M3 Expressive: scallop-10 & clover-4) */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <clipPath id="scallop10" clipPathUnits="objectBoundingBox">
            <path d="M0.5,0.02 C0.56,0.02,0.59,0.07,0.65,0.09 C0.71,0.11,0.77,0.08,0.82,0.12 C0.87,0.16,0.85,0.23,0.89,0.28 C0.93,0.33,0.98,0.35,0.98,0.41 C0.98,0.47,0.93,0.5,0.93,0.56 C0.93,0.62,0.98,0.65,0.96,0.71 C0.94,0.77,0.87,0.77,0.83,0.82 C0.79,0.87,0.8,0.94,0.74,0.96 C0.68,0.98,0.63,0.93,0.57,0.93 C0.51,0.93,0.49,0.98,0.43,0.98 C0.37,0.98,0.34,0.93,0.28,0.91 C0.22,0.89,0.16,0.92,0.12,0.87 C0.08,0.82,0.11,0.75,0.08,0.7 C0.05,0.65,0.01,0.62,0.02,0.56 C0.03,0.5,0.07,0.47,0.07,0.41 C0.07,0.35,0.02,0.32,0.04,0.26 C0.06,0.2,0.13,0.2,0.17,0.15 C0.21,0.1,0.2,0.04,0.26,0.02 C0.32,0.0,0.37,0.05,0.43,0.05 C0.47,0.05,0.48,0.02,0.5,0.02 Z" />
          </clipPath>
          <clipPath id="clover4" clipPathUnits="objectBoundingBox">
            <path d="M0.5,0.04 C0.72,0.04,0.78,0.22,0.78,0.22 C0.78,0.22,0.96,0.28,0.96,0.5 C0.96,0.72,0.78,0.78,0.78,0.78 C0.78,0.78,0.72,0.96,0.5,0.96 C0.28,0.96,0.22,0.78,0.22,0.78 C0.22,0.78,0.04,0.72,0.04,0.5 C0.04,0.28,0.22,0.22,0.22,0.22 C0.22,0.22,0.28,0.04,0.5,0.04 Z" />
          </clipPath>
        </defs>
      </svg>

      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        aria-hidden="true"
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141218]/95 backdrop-blur-xl rounded-2xl px-5 py-3.5 border border-[#34D399]/50 shadow-2xl flex items-center gap-2.5 text-sm font-bold text-[#34D399]">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Чистий Sticky Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-[#141218]/92 backdrop-blur-xl text-white">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 gap-3">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md"
              style={{ backgroundColor: 'rgba(222, 207, 252, 0.16)' }}
            >
              🎁
            </div>
            <span className="text-xl font-black tracking-tight text-white">Mriyii</span>
          </Link>

          <nav className="flex items-center gap-2.5 sm:gap-3">
            <div className="inline-flex items-center rounded-xl bg-white/10 border border-white/15 p-0.5">
              <button
                type="button"
                onClick={() => setLocale('ua')}
                className={`px-2.5 py-1 rounded-lg text-sm font-extrabold transition ${
                  locale === 'ua' ? 'bg-white text-[#141218]' : 'text-slate-200 hover:text-white'
                }`}
              >
                UA
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1 rounded-lg text-sm font-extrabold transition ${
                  locale === 'en' ? 'bg-white text-[#141218]' : 'text-slate-200 hover:text-white'
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
              style={{
                backgroundColor: 'var(--cta-pop-bg)',
                color: 'var(--cta-pop-ink)',
              }}
              className="min-h-[48px] px-5 rounded-2xl text-sm font-extrabold inline-flex items-center shadow-lg spring-transition active:scale-95"
            >
              {locale === 'en' ? 'Create wishlist' : 'Створити вішліст'}
            </a>
          </nav>
        </div>
      </header>

      <main className="w-full">
        {/* ================================================================= */}
        {/* СЕКЦІЯ 1: HERO (DS V3 M3 EXPRESSIVE + MERGE CONTRACT)             */}
        {/* ================================================================= */}
        <section id="section-1-hero" className="band-hero w-full py-12 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-5">
              {/* Анімована 3-кейсова Hero-пігулка До/Після */}
              <div className="min-h-[48px] flex items-center">
                <button
                  type="button"
                  onClick={() => setHeroPillIndex((prev) => (prev + 1) % 3)}
                  className={`inline-flex flex-wrap items-center gap-2 min-h-[44px] px-4 py-2 rounded-full text-sm font-bold border spring-transition text-left ${
                    isCreator
                      ? 'bg-[#DECFFC]/15 border-[#DECFFC]/35 text-[#DECFFC]'
                      : isCyber
                      ? 'bg-[#4F46E5]/10 border-[#4F46E5]/30 text-[#15161D]'
                      : 'bg-[#5B50EC]/12 border-[#5B50EC]/30 text-[#141218]'
                  }`}
                  title="Натисни, щоб перемкнути сценарій"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: isCyber ? '#4F46E5' : isCreator ? '#F4FF7A' : '#5B50EC' }}
                  />
                  <span>{activePill.before}</span>
                  <span aria-hidden="true">➔</span>
                  <span className="font-extrabold">{activePill.after}</span>
                </button>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.06]">
                Твої мрії{' '}
                <span className="serif-accent" style={{ color: 'var(--accent-strong)' }}>
                  варті того,
                </span>{' '}
                щоб збутися
              </h1>

              <p
                className="text-base sm:text-lg max-w-xl leading-relaxed font-medium"
                style={{ color: 'var(--bg-hero-sub)' }}
              >
                Одне посилання для друзів: бронювання в 1 клік без дублів, пряма Монобанка 0% та
                доставка квітів без розкриття адреси — готова вітрина за{' '}
                <strong className="font-extrabold">30 секунд</strong>.
              </p>

              {/* 3-пресетний перемикач тем (Без dev-контролів Стиль) */}
              <div
                role="tablist"
                aria-label="Обери стиль вішліста"
                className={`inline-flex flex-wrap gap-1.5 p-1.5 rounded-full border ${
                  isCreator
                    ? 'bg-white/10 border-white/15'
                    : 'bg-white/85 border-[#141218]/10 shadow-sm'
                }`}
              >
                {(['rose_luxury', 'cyber_titanium', 'creator_bio'] as const).map((presetId) => {
                  const active = landingPreset === presetId;
                  return (
                    <button
                      key={presetId}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleSwitchPreset(presetId)}
                      className={`min-h-[44px] px-4 rounded-full text-sm font-extrabold spring-transition ${
                        active
                          ? isCreator
                            ? 'bg-[#F4FF7A] text-[#141218] shadow-md'
                            : 'bg-[#141218] text-white shadow-md'
                          : isCreator
                          ? 'text-slate-200 hover:text-white'
                          : 'text-[#141218] hover:bg-black/5'
                      }`}
                    >
                      {PRESET_META[presetId].label}
                    </button>
                  );
                })}
              </div>

              {/* Суцільна капсула вводу (Issue #21 Loading -> Success / Error + Shake) */}
              <form
                onSubmit={handleAddDraftByUrl}
                className={`max-w-xl rounded-2xl p-2 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border ${
                  isCreator
                    ? 'bg-white/10 border-white/20 backdrop-blur-lg'
                    : 'bg-white border-[#141218]/10'
                }`}
              >
                <input
                  id="capsule-input"
                  ref={sandboxInputRef}
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Посилання з Rozetka, Instagram чи Apple..."
                  className={`flex-1 px-4 py-3 text-base font-semibold bg-transparent focus:outline-none min-w-0 ${
                    isCreator
                      ? 'text-white placeholder:text-slate-300'
                      : 'text-[#141218] placeholder:text-slate-500'
                  }`}
                />
                <button
                  type="submit"
                  disabled={capsuleState === 'loading'}
                  aria-live="polite"
                  style={
                    capsuleState === 'idle'
                      ? {
                          backgroundColor: isCreator ? 'var(--cta-pop-bg)' : 'var(--cta-main-bg)',
                          color: isCreator ? 'var(--cta-pop-ink)' : 'var(--cta-main-ink)',
                        }
                      : undefined
                  }
                  className={`w-full sm:w-[228px] min-h-[48px] px-5 rounded-xl text-base font-bold shrink-0 spring-transition active:scale-95 flex items-center justify-center gap-2 ${
                    capsuleState === 'success'
                      ? 'bg-emerald-400 text-[#0B1120]'
                      : capsuleState === 'error'
                      ? 'bg-rose-600 text-white shake-2px'
                      : ''
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
                      <span>Зібрати вішліст</span>
                    </>
                  )}
                </button>
              </form>

              {/* Inline Claim Link Preview */}
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span style={{ color: 'var(--bg-hero-sub)' }}>Твій майбутній лінк:</span>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-xl border font-bold ${
                    isCreator
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white border-[#141218]/15 text-[#141218]'
                  }`}
                >
                  mriyii.app/w/
                  <input
                    type="text"
                    value={claimSlug}
                    onChange={(e) =>
                      setClaimSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))
                    }
                    aria-label="Твій нікнейм для посилання"
                    className="w-24 bg-transparent font-black focus:outline-none ml-0.5"
                    style={{ color: isCreator ? '#F4FF7A' : 'var(--accent-strong)' }}
                  />
                </span>
                <button
                  type="button"
                  aria-live="polite"
                  onClick={() => {
                    const url = `https://mriyii.app/w/${claimSlug || presetMeta.storySlug}`;
                    navigator.clipboard?.writeText(url).catch(() => {});
                    setClaimCopied(true);
                    setTimeout(() => setClaimCopied(false), 1500);
                  }}
                  className={`min-h-[40px] min-w-[144px] px-3.5 rounded-xl text-sm font-bold border inline-flex items-center justify-center gap-1.5 spring-transition ${
                    claimCopied
                      ? 'bg-emerald-400 text-[#0B1120] border-transparent'
                      : isCreator
                      ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      : 'bg-white text-[#141218] border-[#141218]/15 hover:bg-slate-50'
                  }`}
                >
                  {claimCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{claimCopied ? '✓ Скопійовано' : 'Скопіювати'}</span>
                </button>
              </div>

              {/* 1-Клік шаблони вішлістів */}
              <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Готові шаблони">
                <span className="text-sm font-bold" style={{ color: 'var(--bg-hero-sub)' }}>
                  Швидкий старт:
                </span>
                {(
                  [
                    { id: 'bday', label: '🎂 День народження' },
                    { id: 'vip', label: '💎 Люкс без адреси' },
                    { id: 'him', label: '🎮 Хлопцю / ДР' },
                  ] as const
                ).map((tpl) => {
                  const active = activeTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.id)}
                      className={`min-h-[44px] px-4 rounded-full text-sm font-bold border spring-transition ${
                        active
                          ? isCreator
                            ? 'bg-[#DECFFC] text-[#141218] border-transparent'
                            : 'bg-[#141218] text-white border-transparent'
                          : isCreator
                          ? 'bg-white/10 text-white border-[#DECFFC]/30 hover:bg-white/20'
                          : 'bg-white/80 text-[#141218] border-[#141218]/15 hover:bg-white'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>

              {/* Щит Creator Safe Mode (активний у пресеті creator_bio) */}
              {isCreator && (
                <div
                  role="region"
                  aria-label="Creator Safe Mode"
                  className="max-w-xl rounded-[22px] p-4 sm:p-5 bg-[#DECFFC]/12 border border-[#DECFFC]/40 backdrop-blur-lg flex items-center gap-4"
                >
                  <div className="diia-box bg-[#DECFFC]/20 text-white">🛡️</div>
                  <div className="space-y-0.5">
                    <div className="text-base font-black text-[#F4FF7A]">
                      Creator Safe Mode активовано
                    </div>
                    <div className="text-sm font-medium text-slate-200">
                      0% адреси • реальні ПІБ на картці приховані • доставка через @шоурум • таємне
                      бронювання 🕶️
                    </div>
                  </div>
                </div>
              )}

              {/* Кластер аватарок друзів */}
              <div className="flex items-center gap-3.5 pt-2 flex-wrap">
                <div className="avatar-cluster">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/5910931/pexels-photo-5910931.jpeg?auto=compress&cs=tinysrgb&w=120"
                    alt="Подруга Олена"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/6641330/pexels-photo-6641330.jpeg?auto=compress&cs=tinysrgb&w=120"
                    alt="Подруга Аліна"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=120"
                    alt="Друг Максим"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/36425425/pexels-photo-36425425.jpeg?auto=compress&cs=tinysrgb&w=120"
                    alt="Друг Софія"
                  />
                </div>
                <span className="text-sm sm:text-base font-bold">{presetMeta.socialCount}</span>
              </div>
            </div>

            {/* Right Column: Scallop-10 Emotion Photo + Starburst-12 + Apple Invites Pill */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[400px] aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={presetMeta.heroImg}
                  alt={presetMeta.heroAlt}
                  className="scallop-photo"
                />
                <div className="starburst-badge absolute top-2 right-1 rotate-6 shadow-xl rounded-full">
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M50,2 L59,16 L75,9 L77,25 L94,26 L88,41 L99,52 L87,62 L92,78 L76,80 L73,96 L58,88 L48,99 L39,87 L23,94 L22,78 L6,75 L14,60 L3,49 L15,39 L10,23 L26,21 L29,5 L44,13 Z" />
                  </svg>
                  <span>
                    {presetMeta.starburstLine1}
                    <br />
                    {presetMeta.starburstLine2}
                  </span>
                </div>
                <div className="absolute bottom-3 left-2 right-6 sm:right-auto bg-white text-[#141218] rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
                  <div className="diia-box !w-11 !h-11 !text-xl !rounded-xl bg-[#EFEAFF]">
                    {presetMeta.inviteEmoji}
                  </div>
                  <div>
                    <div className="text-sm font-black leading-tight">{presetMeta.inviteTitle}</div>
                    <div className="text-sm font-semibold text-slate-600">
                      {presetMeta.inviteSub}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Чернетка Delayed Auth (з'являється лише після додавання першої мрії) */}
        {draftItems.length > 0 && (
          <section className="band-obsidian w-full py-12 border-y border-white/15">
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
                  style={{
                    backgroundColor: 'var(--cta-pop-bg)',
                    color: 'var(--cta-pop-ink)',
                  }}
                  className="min-h-[48px] px-6 rounded-2xl text-base font-extrabold shadow-xl spring-transition active:scale-95 flex items-center gap-2"
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
        {/* СЕКЦІЯ 2: ДО / ПІСЛЯ («Досить здогадок у месенджерах»)            */}
        {/* ================================================================= */}
        <section id="section-before-after" className="band-cream w-full py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Досить{' '}
                <span
                  className="serif-accent"
                  style={{ color: isCyber ? '#34D399' : '#5B50EC' }}
                >
                  здогадок
                </span>{' '}
                у месенджерах
              </h2>
              <p className="text-base sm:text-lg opacity-85">
                Порівняй, як свято виглядає в чатах і як — із твоїм посиланням Mriyii.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className={`rounded-[28px] p-6 sm:p-8 space-y-4 border ${
                  isCyber
                    ? 'bg-[#1F222D] border-rose-400/35 text-white'
                    : 'bg-white border-[#141218]/10 text-[#141218] shadow-lg'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="diia-box bg-[#FEE2E2]">💬</div>
                  <div>
                    <div
                      className={`text-sm font-extrabold ${
                        isCyber ? 'text-rose-300' : 'text-rose-700'
                      }`}
                    >
                      До Mriyii
                    </div>
                    <h3 className="text-xl font-black">
                      Ще один чат у Telegram і руйнування інтриги
                    </h3>
                  </div>
                </div>
                <ul className="space-y-2.5 text-base opacity-90">
                  <li>• Друзі створюють окремий чат і все одно губляться в ідеях</li>
                  <li>• Хтось дарує два однакові сертифікати чи не той колір</li>
                  <li>• Хтось збирає гроші на картку вручну й плутається в сумах</li>
                </ul>
              </div>

              <div
                className={`rounded-[28px] p-6 sm:p-8 space-y-4 border-2 ${
                  isCyber
                    ? 'bg-[#1F222D] border-[#34D399] text-white'
                    : 'bg-white border-[#5B50EC] text-[#141218] shadow-xl'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="diia-box"
                    style={{ backgroundColor: isCyber ? 'rgba(52,211,153,0.18)' : '#EFEAFF' }}
                  >
                    🎁
                  </div>
                  <div>
                    <div
                      className="text-sm font-extrabold"
                      style={{ color: isCyber ? '#34D399' : '#5B50EC' }}
                    >
                      З Mriyii
                    </div>
                    <h3 className="text-xl font-black">
                      Одне посилання без зайвих чатів і спойлерів
                    </h3>
                  </div>
                </div>
                <ul className="space-y-2.5 text-base opacity-90">
                  <li>• Бронювання подарунка в 1 клік без реєстрації для гостей</li>
                  <li>• Спільний збір на Банку Monobank або Приват24 з 0% комісії</li>
                  <li>• Сюрприз-режим: ти не бачиш, хто що обрав, до самого свята</li>
                </ul>
              </div>
            </div>

            {/* Інтерактивний Compare Slider */}
            <div className="max-w-3xl mx-auto space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm font-bold px-1">
                <span>↔ Потягни слайдер: Хаос у чаті vs Вітрина Mriyii</span>
                <span className="tabular-nums font-black">{comparePos}%</span>
              </div>
              <div className="relative h-52 sm:h-44 rounded-3xl overflow-hidden border border-black/10 bg-[#141218] select-none shadow-xl">
                <div className="absolute inset-0 p-6 flex flex-col justify-center bg-[#141218] text-white">
                  <span className="inline-flex w-fit px-3 py-1 rounded-full bg-[#34D399]/20 text-[#34D399] text-sm font-bold mb-2">
                    ✅ Стало: Mriyii Вітрина
                  </span>
                  <p className="text-lg sm:text-xl font-black text-white">
                    1 посилання • Бронь за 5 сек • Монобанка 0% • Сюрприз 🕶️
                  </p>
                  <p className="text-sm text-slate-200 mt-1">
                    Жодних дублів і незручних питань у Direct.
                  </p>
                </div>

                <div
                  className="absolute inset-0 p-6 flex flex-col justify-center bg-[#FAF6F0] text-[#141218] border-r-2 border-[#5B50EC]"
                  style={{ clipPath: `inset(0 ${100 - comparePos}% 0 0)` }}
                >
                  <span className="inline-flex w-fit px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-sm font-bold mb-2">
                    ❌ Було: «То що даруємо?» у Telegram
                  </span>
                  <p className="text-lg sm:text-xl font-black text-[#141218]">
                    48 повідомлень • 2 однакові подарунки • Зіпсований сюрприз
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
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
                  className="absolute top-0 bottom-0 w-0.5 bg-[#5B50EC] pointer-events-none z-10"
                  style={{ left: `${comparePos}%` }}
                >
                  <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white text-[#141218] font-black text-sm flex items-center justify-center shadow-2xl border border-slate-200">
                    ↔
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 3: ЯК ЦЕ ПРАЦЮЄ ЗА 3 КРОКИ (TONAL ICE-SKY + BEAM)          */}
        {/* ================================================================= */}
        <section id="section-2-how-it-works" className="band-ai w-full py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 space-y-12">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-white text-[#141218] border border-black/10 shadow-sm">
                ⚡ Простий старт за 30 секунд
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-[#141218] tracking-tight leading-tight">
                Як це{' '}
                <span className="serif-accent" style={{ color: '#4F46E5' }}>
                  працює
                </span>{' '}
                за 3 кроки
              </h2>
              <p className="text-base sm:text-lg text-[#3A3546] leading-relaxed">
                Замість 100 натяків і таємних чатів — один естетичний лінк у профілі чи сторіс.
              </p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
              <svg
                className="hidden md:block absolute top-7 left-[18%] w-[64%] h-6 pointer-events-none"
                viewBox="0 0 600 24"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 12 L600 12" stroke="rgba(20,18,24,0.12)" strokeWidth="3" />
                <path
                  d="M0 12 L600 12"
                  stroke="#4F46E5"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="beam-path-pulse"
                />
              </svg>

              <div className="relative flex flex-col items-center text-center space-y-3 bg-white rounded-[28px] p-6 shadow-md border border-black/5">
                <div className="diia-box diia-box-lg bg-[#EFEAFF] text-[#141218] z-10">🔗</div>
                <div className="text-sm font-black text-[#4F46E5]">Крок 01</div>
                <h3 className="text-xl font-black text-[#141218]">Встав лінк або @instagram</h3>
                <p className="text-base text-[#3A3546] leading-relaxed">
                  Ми автоматично підтягнемо фото, ціну в гривні (₴) та назву з будь-якого
                  українського магазину.
                </p>
              </div>

              <div className="relative flex flex-col items-center text-center space-y-3 bg-white rounded-[28px] p-6 shadow-md border border-black/5">
                <div className="diia-box diia-box-lg bg-[#EAF1FF] text-[#141218] z-10">📲</div>
                <div className="text-sm font-black text-[#4F46E5]">Крок 02</div>
                <h3 className="text-xl font-black text-[#141218]">Поділись одним лінком</h3>
                <p className="text-base text-[#3A3546] leading-relaxed">
                  Додай посилання в Instagram Bio, Telegram або сторіс. Друзям не потрібна
                  реєстрація.
                </p>
              </div>

              <div className="relative flex flex-col items-center text-center space-y-3 bg-white rounded-[28px] p-6 shadow-md border border-black/5">
                <div className="diia-box diia-box-lg bg-[#FFE8EE] text-[#141218] z-10">🎁</div>
                <div className="text-sm font-black text-[#4F46E5]">Крок 03</div>
                <h3 className="text-xl font-black text-[#141218]">Друзі бронюють без спойлерів</h3>
                <p className="text-base text-[#3A3546] leading-relaxed">
                  Гості бачать вільні мрії та скидаються на Банку, а ти отримуєш сюрприз без
                  дублікатів.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 4: LIVE PRODUCT SHOWCASE (BAND-OBSIDIAN, БЕЗ BORDER-BEAM)  */}
        {/* ================================================================= */}
        <section id="section-3-showcase" className="band-obsidian w-full py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-white/10 text-white border border-white/15">
                👀 Як виглядає твій вішліст для друзів
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Жива{' '}
                <span className="serif-accent" style={{ color: 'var(--cta-pop-bg)' }}>
                  вітрина
                </span>{' '}
                твоїх мрій
              </h2>
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
                Саме так друзі бачать твою сторінку: профіль, підказка ШІ, безкоштовні посилання,
                статуси лотів та Банка.
              </p>
            </div>

            <div className="max-w-4xl mx-auto rounded-[28px] bg-[#1E1C2A] border border-white/15 p-5 sm:p-8 shadow-2xl space-y-5">
              {/* 1. Міні-хедер профілю з Scallop-10 аватаром */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pb-5 border-b border-white/10 text-center sm:text-left">
                <div className="w-20 h-20 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentDemoWishlist.ownerAvatarUrl}
                    alt={currentDemoWishlist.ownerName}
                    className="scallop-photo"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm font-bold">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                      🎂 До свята {currentDemoWishlist.daysLeft} днів
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-slate-200">
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
                className="w-full min-h-[52px] rounded-2xl bg-[#141218] hover:bg-black/60 border border-white/15 px-4 py-3 flex items-center justify-between gap-3 spring-transition"
              >
                <span className="text-sm sm:text-base font-bold text-white">
                  ✨ Хочеш, допоможу з ідеєю на основі інтересів?
                </span>
                <span
                  style={{
                    backgroundColor: 'var(--cta-pop-bg)',
                    color: 'var(--cta-pop-ink)',
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-sm font-black shrink-0"
                >
                  Підібрати ▾
                </span>
              </Link>

              {/* 3. Free App Note */}
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span>✨</span>
                <span>
                  Mriyii безкоштовний для тебе і гостей — магазини платять нам невеликий %
                  партнерської винагороди за перехід.
                </span>
              </div>

              {/* 4. Міні-лоти без border-beam-wrap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {currentDemoWishlist.items.slice(0, 2).map((item) => (
                  <SmokedGiftCard
                    key={`showcase-${item.id}`}
                    item={item}
                    themePreset={themePreset}
                    viewMode="guest"
                    ownerInstagramHandle={currentDemoWishlist.ownerInstagramHandle}
                    onInstagramOrderToast={triggerToast}
                    onBookClick={() =>
                      triggerToast(
                        `💎 Подарунок заброньовано у прев’ю! Спробуй на /w/${currentDemoWishlist.slug}.`
                      )
                    }
                  />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href={`/w/${currentDemoWishlist.slug}`}
                  style={{
                    backgroundColor: 'var(--cta-pop-bg)',
                    color: 'var(--cta-pop-ink)',
                  }}
                  className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-2xl text-base font-extrabold inline-flex items-center justify-center gap-2 spring-transition active:scale-95"
                >
                  <span>Відкрити повний живий приклад →</span>
                </Link>
                <Link
                  href={`/dashboard?theme=${themePreset}`}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl text-base font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 inline-flex items-center justify-center gap-2 spring-transition active:scale-95"
                >
                  <span>✏️ Спробувати редактор з Live Preview</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 5: СПІЛЬНИЙ ЗБІР НА МОНОБАНКУ (WAVY) + IG STORIES 9:16     */}
        {/* ================================================================= */}
        <section id="section-4-monobank" className="band-periwinkle w-full py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 space-y-12">
            {/* Before / After: Гола Монобанка vs Вітрина мрії */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="rounded-3xl p-6 bg-[#141218]/45 border border-white/15 space-y-3 backdrop-blur-lg">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-rose-200">
                    ❌ Було: Гола Монобанка в сторіс
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-100 text-sm font-bold">
                    0 контексту
                  </span>
                </div>
                <div className="rounded-2xl bg-[#141218]/75 border border-white/10 p-4 space-y-2 text-sm text-slate-200">
                  <p className="font-mono text-[#34D399]">send.monobank.ua/jar/4x9k...</p>
                  <p className="text-white">«Кидайте сюди на ДР, хто скільки може 😅»</p>
                </div>
                <p className="text-sm text-slate-100">
                  Гості не розуміють, на що саме збираєте, скільки не вистачає і чи не краще купити
                  подарунок окремо.
                </p>
              </div>

              <div className="rounded-3xl p-6 bg-[#141218]/65 border border-white/25 space-y-3 shadow-xl backdrop-blur-lg">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-[#34D399]">
                    ✅ Стало: Вітрина мрії з коментарем
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#34D399]/20 text-[#34D399] text-sm font-bold">
                    Конверсія ×2.4
                  </span>
                </div>
                <div className="rounded-2xl bg-white p-4 text-[#141218] space-y-2">
                  <div className="flex items-center justify-between text-sm font-black">
                    <span>✨ Dyson Airwrap • 26 000 ₴</span>
                    <span className="text-emerald-700">75% зібрано</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full w-[75%] rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    «Друзі, мрію про цей стайлер на ДР! Кожен внесок наближає мрію ✨»
                  </p>
                </div>
                <p className="text-sm text-slate-100">
                  Людина бачить фото, мету в ₴ та живий прогрес-бар — і з радістю додає свою частку
                  через Apple Pay за 5 секунд.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="diia-box diia-box-lg bg-white/15">🫙</div>
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-white/15 text-white mb-2">
                      🐈‍⬛ Інтеграція з Monobank • ₴ UAH
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-[1.12]">
                      Великі мрії здійснюються{' '}
                      <span className="serif-accent" style={{ color: 'var(--cta-pop-bg)' }}>
                        разом
                      </span>{' '}
                      — 0% комісії
                    </h2>
                  </div>
                </div>
                <p className="text-base sm:text-lg text-slate-100 leading-relaxed">
                  Для компанії з 10 друзів дорогий подарунок перетворюється на комфортну частку
                  через Apple Pay прямо на твою Банку або Конверт Приват24.
                </p>

                <ul className="space-y-3 pt-1 text-base text-slate-100">
                  <li className="flex items-start gap-3">
                    <span className="text-lg shrink-0">⏱️</span>
                    <span>
                      <strong className="text-white font-bold">60 секунд авто-оновлення:</strong>{' '}
                      живий прогрес-бар оновлюється після кожного внеску на мрію.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg shrink-0">₴</span>
                    <span>
                      <strong className="text-white font-bold">100% твої гроші (UAH):</strong> кошти
                      йдуть напряму у твій Monobank або Приват24.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg shrink-0">🔒</span>
                    <span>
                      <strong className="text-white font-bold">Без паролів і токенів:</strong>{' '}
                      просто встав публічний лінк{' '}
                      <code className="text-[#F4FF7A] font-semibold">send.monobank.ua/jar/...</code>
                    </span>
                  </li>
                </ul>

                {/* Інтерактивна картка Банки з M3 Expressive wavy-progress + кластер друзів */}
                <div className="rounded-[30px] bg-[#141218]/45 backdrop-blur-xl border border-white/25 p-6 text-white shadow-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        Мета: {presetMeta.jarGoalTitle}
                      </h3>
                      <p className="text-sm font-medium text-slate-200">
                        Спільний подарунок від друзів (₴ UAH)
                      </p>
                    </div>
                    <div
                      className="text-2xl font-black tabular-nums"
                      style={{ color: 'var(--cta-pop-bg)' }}
                    >
                      {jarPct}%
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black tabular-nums text-white">
                      {displayJarAmount.toLocaleString('uk-UA')} ₴
                    </span>
                    <span className="text-base font-semibold tabular-nums text-slate-200">
                      із {jarTarget.toLocaleString('uk-UA')} ₴
                    </span>
                  </div>

                  {/* Wavy Progress (M3 Expressive) */}
                  <svg className="w-full h-7" viewBox="0 0 400 26" preserveAspectRatio="none">
                    <defs>
                      <clipPath id="jarWaveClip">
                        <rect x="0" y="0" width={waveEnd} height="26" />
                      </clipPath>
                    </defs>
                    <path
                      d="M 4 13 L 396 13"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M 4 13 Q 16 4 28 13 T 52 13 T 76 13 T 100 13 T 124 13 T 148 13 T 172 13 T 196 13 T 220 13 T 244 13 T 268 13 T 292 13 T 316 13 T 340 13 T 364 13 T 388 13"
                      stroke="var(--wave-stroke)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                      clipPath="url(#jarWaveClip)"
                    />
                  </svg>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="avatar-cluster">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.pexels.com/photos/5910931/pexels-photo-5910931.jpeg?auto=compress&cs=tinysrgb&w=100"
                        alt="Учасник 1"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.pexels.com/photos/6641330/pexels-photo-6641330.jpeg?auto=compress&cs=tinysrgb&w=100"
                        alt="Учасник 2"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=100"
                        alt="Учасник 3"
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-100">
                      11 друзів зробили внесок на мрію
                    </span>
                  </div>

                  <div className="relative flex flex-wrap gap-2.5 pt-1">
                    <LikeBurst burstKey={jarBurstKey} themePreset={themePreset} />
                    <button
                      type="button"
                      onClick={() => {
                        setJarBurstKey((k) => k + 1);
                        const nextVal = Math.min(jarTarget, jarAmount + 1500);
                        setDemoJarAmount((prev) => ({
                          ...prev,
                          [landingPreset]: nextVal,
                        }));
                        if (nextVal >= jarTarget) {
                          fireConfetti();
                          triggerToast('🎉 Банка зібрана на 100%! Мрія здійснилась!');
                        } else {
                          triggerToast('🐈‍⬛ +1 500 ₴ додано у Монобанку (0% комісії)!');
                        }
                      }}
                      style={{
                        backgroundColor: 'var(--cta-pop-bg)',
                        color: 'var(--cta-pop-ink)',
                      }}
                      className="flex-1 min-h-[48px] px-5 rounded-2xl text-sm font-extrabold spring-transition active:scale-95"
                    >
                      Додати частку +1 500 ₴ (демо)
                    </button>
                    {jarAmount >= jarTarget && (
                      <button
                        type="button"
                        onClick={() =>
                          setDemoJarAmount((prev) => ({
                            ...prev,
                            [landingPreset]: presetMeta.jarDefaultVal,
                          }))
                        }
                        className="min-h-[48px] px-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold spring-transition"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Вертикальний IG Stories 9:16 Mockup (Динамічний на всі 3 теми) */}
              <div className="lg:col-span-6 flex justify-center">
                <div
                  style={{ backgroundColor: 'var(--stories-bg)' }}
                  className="w-full max-w-[320px] rounded-[34px] border border-white/25 p-6 text-white text-center shadow-2xl space-y-4 spring-transition"
                >
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="h-1 rounded-full bg-white" />
                    <div className="h-1 rounded-full bg-white/75" />
                    <div className="h-1 rounded-full bg-white/30" />
                  </div>
                  <div className="text-sm font-bold opacity-90">Готово для IG Stories 9:16</div>
                  <div className="w-40 h-40 mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={presetMeta.storyImg}
                      alt={presetMeta.storyTitle}
                      className="scallop-photo"
                    />
                  </div>
                  <div className="serif-accent text-4xl leading-none text-white">
                    {presetMeta.storyTitle}
                  </div>
                  <p className="text-sm text-slate-100 leading-snug">{presetMeta.storySub}</p>
                  <Link
                    href={`/w/${currentDemoWishlist.slug}`}
                    style={{
                      backgroundColor: 'var(--stories-pill-bg)',
                      color: 'var(--stories-pill-ink)',
                    }}
                    className="flex items-center justify-center w-full min-h-[48px] rounded-full px-4 py-3 font-black text-sm shadow-lg spring-transition hover:opacity-95"
                  >
                    🔗 mriyii.app/w/{claimSlug || presetMeta.storySlug}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 6: КВІТИ БЕЗ АДРЕСИ (CLOVER-4, ZERO DARK PHOTO OVERLAY)   */}
        {/* ================================================================= */}
        <section id="section-5-instagram-flowers" className="band-blush w-full py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-white text-[#141218] border border-black/10 shadow-sm">
                🌸 Без розкриття домашньої адреси
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-[#141218] tracking-tight leading-tight">
                Улюблені{' '}
                <span
                  className="serif-accent"
                  style={{ color: isCyber ? '#4F46E5' : '#5B50EC' }}
                >
                  квіти
                </span>{' '}
                та шоуруми з Instagram
              </h2>
              <p className="text-base sm:text-lg text-[#3A3546] leading-relaxed">
                Заповнюй картку побажань — дарувальник оплачує букет чи сукню, а магазин сам
                уточнює доставку в Direct.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="max-w-[380px] mx-auto lg:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/5410144/pexels-photo-5410144.jpeg?auto=compress&cs=tinysrgb&w=900"
                    alt="Букет квітів без розкриття адреси"
                    className="clover-photo shadow-xl"
                  />
                </div>

                <div className="bg-white rounded-3xl p-6 text-[#141218] shadow-xl border border-black/5 space-y-4">
                  <div>
                    <span className="text-sm font-bold text-[#5B50EC]">
                      Бутік @kamelia_flowers
                    </span>
                    <h3 className="text-xl font-black text-[#141218] mt-0.5">
                      🌸 Які квіти я люблю та мої побажання
                    </h3>
                  </div>

                  <div className="bg-[#FAF6F0] border border-black/10 rounded-2xl p-4 space-y-2 text-base font-medium text-[#141218]">
                    <p>
                      <strong className="font-extrabold">Квіти:</strong>{' '}
                      {currentDemoWishlist.aiFlowerPreferences}
                    </p>
                    <p>
                      <strong className="font-extrabold">Розміри:</strong>{' '}
                      {currentDemoWishlist.aiSizes} • Бутік{' '}
                      <span className="text-[#4F46E5] font-bold">@kamelia_flowers</span>
                    </p>
                    <p className="text-emerald-800 font-bold">
                      🔒 Магазин сам уточнює адресу доставки в Direct.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const orderMsg = `Привіт! Хочу замовити та оплатити подарунок із вішліста для @${currentDemoWishlist.ownerInstagramHandle}: «${flowerDemoItem.title}» (${(flowerDemoItem.price ?? 0).toLocaleString('uk-UA')} ₴). Напишіть, будь ласка, отримувачу в Direct для узгодження зручного часу та адреси доставки 🌸`;
                      navigator.clipboard?.writeText(orderMsg).catch(() => {});
                      triggerToast(
                        '📋 Текст замовлення скопійовано! Бутік сам уточнить адресу доставки в Direct.'
                      );
                    }}
                    className="w-full min-h-[48px] px-5 py-3.5 rounded-2xl text-base font-extrabold bg-[#141218] hover:bg-slate-800 text-white shadow-lg flex items-center justify-center gap-2 spring-transition active:scale-95"
                  >
                    <Copy className="w-5 h-5" />
                    <span>Замовити в Instagram @kamelia_flowers</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-3xl p-6 bg-white border border-black/5 shadow-md flex items-start gap-4">
                  <div className="diia-box bg-[#FFE8EE]">🌸</div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-[#141218]">
                      1. Вказуєш улюблені квіти та розміри
                    </h3>
                    <p className="text-base text-[#3A3546]">
                      Наприклад: «Білі півонії без целофану від @kamelia_flowers» та розміри S / 37.
                    </p>
                  </div>
                </div>
                <div className="rounded-3xl p-6 bg-white border border-black/5 shadow-md flex items-start gap-4">
                  <div className="diia-box bg-[#EFEAFF]">📲</div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-[#141218]">
                      2. Дарувальник замовляє в 1 клік
                    </h3>
                    <p className="text-base text-[#3A3546]">
                      Ми автоматично копіюємо готовий текст замовлення для @
                      {currentDemoWishlist.ownerInstagramHandle}.
                    </p>
                  </div>
                </div>
                <div className="rounded-3xl p-6 bg-white border-2 border-[#5B50EC] shadow-md flex items-start gap-4">
                  <div className="diia-box bg-[#EAF1FF]">🛡️</div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-[#141218]">
                      3. Доставка через Direct — 100% приватно
                    </h3>
                    <p className="text-base text-[#3A3546]">
                      Після оплати бутік пише особисто тобі у Direct, і ти сама обираєш, куди
                      прийняти кур&apos;єра.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 7: ШІ-ПОМІЧНИК GEMINI (#EAF1FF + LIVE INPUT + GOO)         */}
        {/* ================================================================= */}
        <section id="section-6-gemini-ai" className="band-ai w-full py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="diia-box bg-white">🧠</div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-white text-[#141218] border border-black/10 mb-1.5">
                    Персональний ШІ-стиліст подарунків
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-[#141218] tracking-tight leading-tight">
                    ШІ-помічник підбере{' '}
                    <span className="serif-accent" style={{ color: '#4F46E5' }}>
                      сюрприз
                    </span>{' '}
                    за 10 секунд
                  </h2>
                </div>
              </div>

              <p className="text-base sm:text-lg text-[#3A3546] leading-relaxed">
                Гість обирає чіпси інтересів та бюджет — ШІ пропонує 3 влучні подарунки зі списку
                або з українських магазинів. Заброньована порада ховається від іменинника до дня
                свята.
              </p>

              {/* Живий ШІ-рядок запиту прямо на сторінці */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runLiveAiSearch();
                }}
                className="flex flex-col sm:flex-row gap-2.5 bg-white rounded-2xl p-2 shadow-lg border border-black/5"
              >
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  aria-label="Запит до ШІ-помічника"
                  className="flex-1 px-4 py-3 text-base font-semibold text-[#141218] bg-transparent focus:outline-none min-w-0"
                />
                <button
                  type="submit"
                  disabled={aiThinking}
                  className="min-h-[48px] px-6 rounded-xl text-base font-extrabold bg-[#4F46E5] hover:bg-indigo-700 text-white shrink-0 spring-transition active:scale-95"
                >
                  {aiThinking ? 'Думаю...' : 'Підібрати'}
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'beauty', label: '💄 Бʼюті та догляд' },
                    { key: 'coffee', label: '☕ Кава та затишок' },
                    { key: 'gadgets', label: '🎧 Гаджети та аудіо' },
                    { key: 'flowers', label: '🌸 Квіти без адреси' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => runLiveAiSearch(c.key)}
                    className={`min-h-[44px] px-4 rounded-xl text-sm font-bold border spring-transition ${
                      aiChip === c.key
                        ? 'bg-[#141218] text-white border-transparent shadow-md'
                        : 'bg-white text-[#141218] border-black/10 hover:bg-slate-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <Link
                  href={`/w/${currentDemoWishlist.slug}`}
                  className="min-h-[48px] px-7 py-3.5 rounded-2xl text-base font-extrabold bg-[#141218] hover:bg-slate-800 text-white shadow-xl spring-transition active:scale-95 inline-flex items-center gap-2"
                >
                  <span>Протестувати ШІ-Помічника →</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              {aiThinking ? (
                <div className="rounded-3xl bg-white p-8 shadow-xl flex flex-col items-center justify-center gap-3 min-h-[240px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full bg-[#4F46E5] goo-dot"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-3 h-3 rounded-full bg-[#4F46E5] goo-dot"
                      style={{ animationDelay: '160ms' }}
                    />
                    <span
                      className="w-3 h-3 rounded-full bg-[#4F46E5] goo-dot"
                      style={{ animationDelay: '320ms' }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#3A3546]">
                    ШІ підбирає 3 влучні подарунки в ₴...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {aiItems.map((card, idx) => (
                    <div
                      key={`${aiChip}-${aiPackIdx}-${idx}`}
                      style={{ animationDelay: `${idx * 120}ms` }}
                      className="stagger-card bg-white rounded-3xl p-3.5 shadow-xl border border-black/5 text-center space-y-2.5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.img}
                        alt={card.title}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        style={{ objectPosition: card.pos || 'center center' }}
                        className="w-full h-32 rounded-2xl object-cover bg-slate-100"
                      />
                      <div className="text-sm font-black text-[#141218] leading-snug">
                        {card.title}
                      </div>
                      <div className="text-sm font-extrabold text-[#4F46E5] tabular-nums">
                        {card.price}
                      </div>
                      <div className="text-sm font-semibold text-slate-600">{card.shop}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 8: РЕЖИМ СЮРПРИЗУ (BAND-OBSIDIAN, ZERO DARK PHOTO OVERLAY) */}
        {/* ================================================================= */}
        <section id="section-7-surprise-mode" className="band-obsidian w-full py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-5">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Ти бачиш{' '}
                <span className="serif-accent" style={{ color: 'var(--cta-pop-bg)' }}>
                  інтригу
                </span>{' '}
                — друзі бачать план
              </h2>

              <div className="inline-flex p-1.5 rounded-2xl bg-white/10 border border-white/15 gap-2">
                <button
                  type="button"
                  onClick={() => setRolePreview('owner')}
                  className={`min-h-[48px] px-5 rounded-xl text-base font-bold spring-transition ${
                    rolePreview === 'owner'
                      ? 'bg-[#F4FF7A] text-[#141218] shadow-lg'
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
                      ? 'bg-[#34D399] text-[#0B1120] shadow-lg'
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
        {/* СЕКЦІЯ 9: SOCIAL PROOF (EDITORIAL GRID, NO MARQUEE)               */}
        {/* ================================================================= */}
        <section id="section-8-social-proof" className="band-cream w-full py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-white text-[#141218] border border-black/10 shadow-sm">
                💛 Живі історії спільноти
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Уже обирають для{' '}
                <span
                  className="serif-accent"
                  style={{ color: isCyber ? '#34D399' : '#5B50EC' }}
                >
                  свят
                </span>{' '}
                в Україні
              </h2>
              <p className="text-base sm:text-lg opacity-85">
                Від дня народження в Києві до таємного VIP-букета чи спільного збору на PlayStation
                5.
              </p>
            </div>

            {/* 3 живі метрики */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="rounded-3xl p-6 bg-white text-[#141218] border border-black/5 shadow-lg space-y-1">
                <div className="text-3xl font-black text-[#5B50EC] tabular-nums">1 200+</div>
                <div className="text-base font-extrabold">створених вішлістів</div>
                <p className="text-sm text-slate-600">Дні народження, новосілля та Таємний Санта</p>
              </div>
              <div className="rounded-3xl p-6 bg-white text-[#141218] border border-black/5 shadow-lg space-y-1">
                <div className="text-3xl font-black text-emerald-700 tabular-nums">0%</div>
                <div className="text-base font-extrabold">комісії на Банку</div>
                <p className="text-sm text-slate-600">
                  Усі внески на мрію йдуть напряму у твій Monobank
                </p>
              </div>
              <div className="rounded-3xl p-6 bg-white text-[#141218] border border-black/5 shadow-lg space-y-1">
                <div className="text-3xl font-black text-indigo-700 tabular-nums">30 сек</div>
                <div className="text-base font-extrabold">на перший лінк</div>
                <p className="text-sm text-slate-600">Без реєстрації для старту та гостям</p>
              </div>
            </div>

            {/* 3 чисті журнальні картки відгуків з портретами Pexels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl p-6 bg-white text-[#141218] border border-black/5 shadow-lg space-y-4">
                <div className="inline-flex px-3 py-1 rounded-full bg-[#EFEAFF] text-[#5B50EC] text-sm font-bold">
                  🎂 День народження
                </div>
                <p className="text-base text-slate-800 leading-relaxed font-medium">
                  «Кинула лінк у сторіс за тиждень до ДР — подруги самі закрили Банку на Dyson
                  Airwrap і жодна не повторилась!»
                </p>
                <div className="flex items-center gap-3 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/5910931/pexels-photo-5910931.jpeg?auto=compress&cs=tinysrgb&w=160"
                    alt="Олена, Київ"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover object-top border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-black text-[#141218]">Олена</div>
                    <div className="text-sm font-bold text-[#5B50EC]">@olena.muse • Київ</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl p-6 bg-white text-[#141218] border border-black/5 shadow-lg space-y-4">
                <div className="inline-flex px-3 py-1 rounded-full bg-[#FFE8EE] text-rose-800 text-sm font-bold">
                  🌸 VIP-букет без адреси
                </div>
                <p className="text-base text-slate-800 leading-relaxed font-medium">
                  «Поставила лінк у Instagram Bio. Прихильник оплатив букет півоній анонімно, а
                  флорист сам написав мені в Direct!»
                </p>
                <div className="flex items-center gap-3 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/6641330/pexels-photo-6641330.jpeg?auto=compress&cs=tinysrgb&w=160"
                    alt="Катя, Львів"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover object-top border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-black text-[#141218]">Катя</div>
                    <div className="text-sm font-bold text-emerald-700">@katya.style • Львів</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl p-6 bg-white text-[#141218] border border-black/5 shadow-lg space-y-4">
                <div className="inline-flex px-3 py-1 rounded-full bg-[#EAF1FF] text-[#4F46E5] text-sm font-bold">
                  🎮 Груповий збір PS5
                </div>
                <p className="text-base text-slate-800 leading-relaxed font-medium">
                  «Хлопці скинулись на Монобанку за два дні без жодних табличок у Excel. Іменинник до
                  останнього не знав, що буде PS5!»
                </p>
                <div className="flex items-center gap-3 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/4669901/pexels-photo-4669901.jpeg?auto=compress&cs=tinysrgb&w=160"
                    alt="Максим, Дніпро"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover object-top border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-black text-[#141218]">Максим</div>
                    <div className="text-sm font-bold text-[#4F46E5]">@max.dev • Дніпро</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                aria-live="polite"
                onClick={() => {
                  const link = `https://mriyii.app/w/${claimSlug || currentDemoWishlist.slug}`;
                  navigator.clipboard?.writeText(link).catch(() => {});
                  setBioLinkCopied(true);
                  setTimeout(() => setBioLinkCopied(false), 1500);
                  triggerToast(`🔗 Скопійовано ${link} — додавай в Instagram Bio!`);
                }}
                className={`min-h-[48px] min-w-[272px] px-7 py-3.5 rounded-2xl text-base font-extrabold shadow-xl inline-flex items-center justify-center gap-2 spring-transition active:scale-95 ${
                  bioLinkCopied
                    ? 'bg-emerald-400 text-[#0B1120]'
                    : 'bg-[#141218] hover:bg-slate-800 text-white'
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
        {/* СЕКЦІЯ 10: FAQ (BAND-OBSIDIAN)                                    */}
        {/* ================================================================= */}
        <section id="section-9-faq" className="band-obsidian w-full py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Часті{' '}
                <span className="serif-accent" style={{ color: 'var(--cta-pop-bg)' }}>
                  питання
                </span>
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              <details
                className="group rounded-2xl bg-white/5 border border-white/12 p-5 sm:p-6"
                open
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>💡 Чи справді Mriyii безкоштовний?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Так! Створення вішліста, бронювання, ШІ-підбір і збір на Монобанку безкоштовні. Ми
                  заробляємо лише на партнерській комісії магазинів, коли гості переходять за
                  посиланнями.
                </p>
              </details>

              <details className="group rounded-2xl bg-white/5 border border-white/12 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>💳 Як проходять оплати в Монобанці?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Mriyii не приймає гроші на свій рахунок. Кнопка веде напряму на вашу Банку
                  Monobank або Конверт Приват24 з 0% комісії платформи.
                </p>
              </details>

              <details className="group rounded-2xl bg-white/5 border border-white/12 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>🔒 Чи бачить хтось мою домашню адресу?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Ні! Ми принципово не зберігаємо домашні адреси. Для квітів та шоурумів гість
                  передає магазину ваш @instagram, і кур&apos;єр узгоджує доставку напряму з вами.
                </p>
              </details>

              <details className="group rounded-2xl bg-white/5 border border-white/12 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>📲 Чи потрібен Telegram або реєстрація?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Гостям реєстрація не потрібна взагалі. Ви можете додати перші мрії прямо зараз, а
                  увійти через Google/Apple лише при збереженні свого посилання.
                </p>
              </details>

              <details className="group rounded-2xl bg-white/5 border border-white/12 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>🔄 А якщо гість передумає або захоче скасувати бронь?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Бронь скасовується в 1 клік, і подарунок одразу стає вільним. Діє анти-спам
                  ліміт: не більше 2 активних бронювань на одного гостя, щоб ніхто не заблокував
                  увесь список.
                </p>
              </details>

              <details className="group rounded-2xl bg-white/5 border border-white/12 p-5 sm:p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-black text-white">
                  <span>✈️ Чи можна додати бажання без посилання — подорож або сертифікат?</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-base text-slate-200 leading-relaxed">
                  Звісно! Можна додати будь-яку мрію текстом — квитки, враження, благодійний внесок
                  на мрію чи просто спільний збір на Монобанку без конкретного магазину.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* СЕКЦІЯ 11: КОМПАКТНИЙ ФІНАЛЬНИЙ CTA + FOOTER                      */}
        {/* ================================================================= */}
        <section
          id="section-10-final-cta"
          className="w-full bg-[#141218] text-white border-t border-white/10 py-14 sm:py-18"
        >
          <div className="mx-auto max-w-4xl px-4 text-center space-y-5">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12]">
              Створи свій вішліст за{' '}
              <span className="serif-accent" style={{ color: 'var(--cta-pop-bg)' }}>
                30 секунд
              </span>
            </h2>
            <p className="text-base sm:text-lg text-slate-200">
              Безкоштовно • 0% комісії на Монобанку • Працює в Instagram Bio, Telegram та TikTok.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => scrollToSandbox()}
                style={{
                  backgroundColor: 'var(--cta-pop-bg)',
                  color: 'var(--cta-pop-ink)',
                }}
                className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl text-base font-extrabold shadow-2xl spring-transition active:scale-95"
              >
                Створити свій лінк Mriyii
              </button>
              <Link
                href={`/dashboard?theme=${themePreset}`}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl text-base font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 spring-transition flex items-center justify-center"
              >
                ✏️ Редактор з Live Preview
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

            <div className="pt-6">
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
                <h3 className="text-xl font-black text-[#141218]">Збережіть ваш вішліст ✨</h3>
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
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-semibold text-[#141218] focus:outline-none focus:border-[#141218]"
              />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleCompleteOnboarding('google')}
                style={{
                  backgroundColor: 'var(--cta-pop-bg)',
                  color: 'var(--cta-pop-ink)',
                }}
                className="w-full min-h-[48px] px-4 rounded-xl text-base font-extrabold flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Продовжити з Google (1 клік)</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleCompleteOnboarding('apple')}
                className="w-full min-h-[48px] px-4 rounded-xl text-base font-bold bg-[#141218] text-white hover:bg-slate-800"
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
