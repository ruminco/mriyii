'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Copy,
  Check,
  Plus,
  Sparkles,
  Loader2,
  Eye,
  SlidersHorizontal,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import type { ThemePreset } from '@/models/User';
import { THEME_TOKENS, DEMO_WISHLISTS } from '@/lib/theme-data';
import { SmokedGiftCard, type UnifiedGiftCardItem } from '@/components/SmokedGiftCard';
import { parseProductUrlAction } from '@/actions/wishlist';

const DRAFT_STORAGE_KEY = 'mriyii_delayed_auth_draft_v1';
const AI_PREFS_STORAGE_KEY = 'mriyii_ai_preferences_v1';

const INTEREST_CHIPS = [
  '☕ Specialty кава',
  "💄 Б'юті та парфуми",
  '🎧 Гаджети Apple',
  '✈️ Подорожі',
  '📚 Книги',
  '🕯️ Дім і затишок',
  '🏋️ Фітнес/Пілатес',
  '🎨 Творчість',
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialThemeParam = searchParams.get('theme');

  const [themePreset, setThemePreset] = useState<ThemePreset>(
    initialThemeParam === 'cyber_titanium' ? 'cyber_titanium' : 'rose_luxury'
  );
  const [wishlistTitle, setWishlistTitle] = useState(
    DEMO_WISHLISTS[themePreset].title
  );
  const [slug, setSlug] = useState(DEMO_WISHLISTS[themePreset].slug);
  const [ownerInstagramHandle, setOwnerInstagramHandle] = useState(
    DEMO_WISHLISTS[themePreset].ownerInstagramHandle
  );
  const [flowerAndGiftNotes, setFlowerAndGiftNotes] = useState(
    DEMO_WISHLISTS[themePreset].flowerAndGiftNotes
  );
  const [items, setItems] = useState<UnifiedGiftCardItem[]>(
    DEMO_WISHLISTS[themePreset].items
  );
  const [forceFallbackPoster, setForceFallbackPoster] = useState(false);

  // Поля швидкого додавання бажання за URL у Суцільній Білій Капсулі
  const [urlInput, setUrlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [previewItem, setPreviewItem] = useState<{
    title: string;
    emoji: string;
    description: string;
    price: string;
    imageUrl: string;
    originalUrl: string;
    instagramHandle: string;
    monoJarUrl: string;
  } | null>(null);

  const [isPostEventReveal, setIsPostEventReveal] = useState(false);

  // Поля анкети для ШІ-помічника (aiPreferences)
  const [selectedInterestChips, setSelectedInterestChips] = useState<string[]>([
    '☕ Specialty кава',
    "💄 Б'юті та парфуми",
  ]);
  const [hobbiesInput, setHobbiesInput] = useState(
    DEMO_WISHLISTS[themePreset].aiHobbies.join(', ')
  );
  const [favoriteBrandsInput, setFavoriteBrandsInput] = useState(
    'Dyson, Apple, @cher17.ua, бежевий та rose gold'
  );
  const [sizesInput, setSizesInput] = useState(DEMO_WISHLISTS[themePreset].aiSizes);
  const [flowerPrefsInput, setFlowerPrefsInput] = useState(
    DEMO_WISHLISTS[themePreset].aiFlowerPreferences
  );
  const [antiGiftsInput, setAntiGiftsInput] = useState(
    DEMO_WISHLISTS[themePreset].aiAntiGifts.join(', ')
  );
  const [showInterestsOnProfile, setShowInterestsOnProfile] = useState(false);
  const [aiSavedToast, setAiSavedToast] = useState(false);
  const [flowerSavedToast, setFlowerSavedToast] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          themePreset?: ThemePreset;
          wishlistTitle?: string;
          items?: UnifiedGiftCardItem[];
        };
        const resolvedPreset =
          initialThemeParam === 'cyber_titanium' || initialThemeParam === 'rose_luxury'
            ? initialThemeParam
            : parsed.themePreset ?? 'rose_luxury';

        setThemePreset(resolvedPreset);
        setSlug(DEMO_WISHLISTS[resolvedPreset].slug);
        setOwnerInstagramHandle(DEMO_WISHLISTS[resolvedPreset].ownerInstagramHandle);
        setFlowerAndGiftNotes(DEMO_WISHLISTS[resolvedPreset].flowerAndGiftNotes);
        setHobbiesInput(DEMO_WISHLISTS[resolvedPreset].aiHobbies.join(', '));
        setSizesInput(DEMO_WISHLISTS[resolvedPreset].aiSizes);
        setFlowerPrefsInput(DEMO_WISHLISTS[resolvedPreset].aiFlowerPreferences);
        setAntiGiftsInput(DEMO_WISHLISTS[resolvedPreset].aiAntiGifts.join(', '));

        if (parsed.items && parsed.items.length > 0) {
          setItems([...parsed.items, ...DEMO_WISHLISTS[resolvedPreset].items]);
        } else {
          setItems(DEMO_WISHLISTS[resolvedPreset].items);
        }
      }
    } catch {
      // Ігноруємо
    }
  }, [initialThemeParam]);

  const handleThemeChange = (nextPreset: ThemePreset) => {
    setThemePreset(nextPreset);
    setWishlistTitle(DEMO_WISHLISTS[nextPreset].title);
    setSlug(DEMO_WISHLISTS[nextPreset].slug);
    setOwnerInstagramHandle(DEMO_WISHLISTS[nextPreset].ownerInstagramHandle);
    setFlowerAndGiftNotes(DEMO_WISHLISTS[nextPreset].flowerAndGiftNotes);
    setItems(DEMO_WISHLISTS[nextPreset].items);
    setHobbiesInput(DEMO_WISHLISTS[nextPreset].aiHobbies.join(', '));
    setSizesInput(DEMO_WISHLISTS[nextPreset].aiSizes);
    setFlowerPrefsInput(DEMO_WISHLISTS[nextPreset].aiFlowerPreferences);
    setAntiGiftsInput(DEMO_WISHLISTS[nextPreset].aiAntiGifts.join(', '));
  };

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}/w/${slug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback
    }
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handleParseUrl = async (e: React.FormEvent) => {
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

      try {
        const parsed = await parseProductUrlAction(candidateUrl);
        setPreviewItem({
          title: parsed.title,
          emoji: parsed.emoji || '✨',
          description: parsed.description || 'Хочу саме цю модель ✨',
          price: parsed.price ? String(parsed.price) : '4500',
          imageUrl: parsed.imageUrl || '',
          originalUrl: parsed.originalUrl,
          instagramHandle: parsed.instagramHandle ?? igMatch?.[1] ?? '',
          monoJarUrl: '',
        });
      } catch {
        setPreviewItem({
          title: raw.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 90),
          emoji:
            raw.toLowerCase().includes('півон') || raw.toLowerCase().includes('букет')
              ? '🌸'
              : themePreset === 'rose_luxury'
              ? '✨'
              : '⚡',
          description: 'Буду дуже рада цьому подарунку ✨',
          price: themePreset === 'rose_luxury' ? '4500' : '4999',
          imageUrl: '',
          originalUrl: candidateUrl.startsWith('http') ? candidateUrl : '',
          instagramHandle: igMatch?.[1] ?? '',
          monoJarUrl: '',
        });
      }
      setUrlInput('');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmAddPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewItem) return;

    const numericPrice = Number.parseFloat(previewItem.price) || undefined;
    const cleanIg = previewItem.instagramHandle.replace(/^@+/, '').trim() || undefined;
    const newItem: UnifiedGiftCardItem = {
      id: `owner-item-${Date.now()}`,
      title: previewItem.title.trim() || 'Нова мрія ✨',
      emoji: previewItem.emoji || '✨',
      description: previewItem.description.trim() || undefined,
      price: numericPrice,
      currency: 'UAH',
      imageUrl: previewItem.imageUrl.trim() || undefined,
      originalUrl: previewItem.originalUrl || undefined,
      affiliateUrl: previewItem.originalUrl || undefined,
      instagramHandle: cleanIg,
      isBooked: false,
      hasMonoJar: Boolean(previewItem.monoJarUrl.trim()),
      monoJarUrl: previewItem.monoJarUrl.trim() || undefined,
      jarTargetAmount: numericPrice,
    };

    setItems((prev) => [newItem, ...prev]);
    setPreviewItem(null);
  };

  const handleDeleteItem = (target: UnifiedGiftCardItem) => {
    setItems((prev) => prev.filter((item) => item.id !== target.id));
  };

  const toggleInterestChip = (chip: string) => {
    setSelectedInterestChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleSaveAiPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        AI_PREFS_STORAGE_KEY,
        JSON.stringify({
          selectedInterestChips,
          hobbiesInput,
          favoriteBrandsInput,
          sizesInput,
          flowerPrefsInput,
          antiGiftsInput,
          showInterestsOnProfile,
        })
      );
    } catch {
      // Ігноруємо помилки localStorage
    }
    setAiSavedToast(true);
    setTimeout(() => setAiSavedToast(false), 3000);
  };

  const handleSaveFlowerNotes = (e: React.FormEvent) => {
    e.preventDefault();
    setFlowerSavedToast(true);
    setTimeout(() => setFlowerSavedToast(false), 3000);
  };

  const tokens = THEME_TOKENS[themePreset];
  const demoProfile = DEMO_WISHLISTS[themePreset];

  return (
    <div className={`min-h-screen ${tokens.meshClass} text-white spring-transition pb-20`}>
      {/* Верхня панель Кабінету Власника */}
      <header className="sticky top-0 z-30 border-b border-white/15 bg-[#090e1a]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2.5 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px]`}
            >
              <div className="w-full h-full bg-[#161324] rounded-[10px] flex items-center justify-center text-base">
                🎁
              </div>
            </div>
            <span className="text-sm sm:text-base font-black text-white">
              Mriyii • Кабінет Іменинника
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setForceFallbackPoster((p) => !p)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-1"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
              <span>{forceFallbackPoster ? '✨ Smart Постер' : '🖼️ З фото'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('rose_luxury')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold spring-transition ${
                themePreset === 'rose_luxury'
                  ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white'
                  : 'bg-white/10 text-white/80 border border-white/15'
              }`}
            >
              👩 Rose Luxury
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('cyber_titanium')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold spring-transition ${
                themePreset === 'cyber_titanium'
                  ? 'bg-gradient-to-r from-indigo-500 to-emerald-500 text-white'
                  : 'bg-white/10 text-white/80 border border-white/15'
              }`}
            >
              👨 Cyber Titanium
            </button>

            <Link
              href={`/w/${slug}`}
              className="py-1.5 px-3.5 rounded-xl text-xs font-extrabold bg-amber-400 text-slate-950 shadow inline-flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Очима Гостя (/w/{slug})</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* 2.1 Шапка профілю в стилі Linktree із кольоровими чіпсами анкети */}
        <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[28px] p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative shrink-0">
              <div
                className={`w-20 h-20 rounded-full ${tokens.avatarRingClass} p-[3px] shadow-xl`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={demoProfile.ownerAvatarUrl}
                  alt={demoProfile.ownerName}
                  className="w-full h-full rounded-full object-cover border-2 border-slate-950"
                />
              </div>
              <span className="absolute -bottom-1 right-0 text-sm font-extrabold px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 shadow">
                VIP ✨
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-sm font-extrabold">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/25 text-emerald-200 border border-emerald-400/30">
                  🔒 СЮРПРИЗ-ЗАХИСТ УВІМКНЕНО
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-amber-300">
                  🎂 До свята: {demoProfile.daysLeft} днів
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                {wishlistTitle}
              </h1>

              {/* 3 Кольорові чіпси-факти прямо у шапці профілю */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs font-extrabold">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  📏 {sizesInput}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-pink-400/25 text-pink-100 border border-pink-400/30">
                  💖 {hobbiesInput}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-rose-500/25 text-rose-200 border border-rose-400/30">
                  🚫 {antiGiftsInput}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="w-full md:w-auto py-3 px-5 rounded-2xl text-xs sm:text-sm font-black bg-white text-slate-950 shadow-xl spring-transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            {copiedToast ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Посилання скопійовано!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>🔗 Скопіювати лінк для Bio (/w/{slug})</span>
              </>
            )}
          </button>
        </section>

        {/* 2.2 Блок швидкого додавання бажання (Суцільна біла капсула) + Анкета ШІ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Ліва колонка (8 cols): Додавання мрії + Сітка карток з фото */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-300" />
                  <span>Додати нову мрію за посиланням або @instagram_shop</span>
                </h2>
                <span className="text-sm font-bold text-emerald-300">
                  Автопідбір фото + Smart Постер
                </span>
              </div>

              {/* Суцільна біла капсула інпуту */}
              <form
                onSubmit={handleParseUrl}
                className="bg-white rounded-2xl p-2 shadow-xl flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Вставте посилання на товар або напишіть @instagram_shop..."
                  className="flex-1 px-3 py-2 text-xs sm:text-sm font-bold text-slate-950 placeholder:text-slate-400 bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isParsing}
                  className={`py-2.5 px-5 rounded-xl text-xs sm:text-sm font-black ${tokens.primaryCtaGradient} text-white spring-transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0`}
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Розпізнаємо...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>+ Додати мрію</span>
                    </>
                  )}
                </button>
              </form>

              {/* Рівень 3 захисту обкладинки: Ручне редагування в прев'ю перед збереженням */}
              {previewItem && (
                <form
                  onSubmit={handleConfirmAddPreview}
                  className="solid-white-card rounded-2xl p-4 space-y-3 border border-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                      ✨ Прев’ю мрії (можна змінити фото або додати коментар 💬)
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewItem(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900"
                    >
                      Скасувати
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Емодзі
                      </label>
                      <input
                        type="text"
                        value={previewItem.emoji}
                        onChange={(e) =>
                          setPreviewItem({ ...previewItem, emoji: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-center text-lg"
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Назва подарунка
                      </label>
                      <input
                        type="text"
                        required
                        value={previewItem.title}
                        onChange={(e) =>
                          setPreviewItem({ ...previewItem, title: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-950"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Ціна (₴)
                      </label>
                      <input
                        type="number"
                        value={previewItem.price}
                        onChange={(e) =>
                          setPreviewItem({ ...previewItem, price: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-950 tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        💬 Ваш коментар гостям (колір, розмір, деталі):
                      </label>
                      <input
                        type="text"
                        value={previewItem.description}
                        onChange={(e) =>
                          setPreviewItem({ ...previewItem, description: e.target.value })
                        }
                        placeholder="Хочу саме в кольорі Strawberry Bronze ✨"
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        🖼️ URL фото товару (якщо порожньо — буде Smart Постер):
                      </label>
                      <input
                        type="url"
                        value={previewItem.imageUrl}
                        onChange={(e) =>
                          setPreviewItem({ ...previewItem, imageUrl: e.target.value })
                        }
                        placeholder="https://..."
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-sm font-bold text-pink-700 mb-1 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>Instagram-магазин (@shop):</span>
                      </label>
                      <input
                        type="text"
                        value={previewItem.instagramHandle}
                        onChange={(e) =>
                          setPreviewItem({
                            ...previewItem,
                            instagramHandle: e.target.value,
                          })
                        }
                        placeholder="kamelia_flowers або cher17.ua"
                        className="w-full rounded-xl bg-pink-50/60 border border-pink-200 px-3 py-2 text-xs font-semibold text-slate-950"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-emerald-800 mb-1">
                        🫙 Банка Monobank для збору (необов’язково):
                      </label>
                      <input
                        type="url"
                        value={previewItem.monoJarUrl}
                        onChange={(e) =>
                          setPreviewItem({ ...previewItem, monoJarUrl: e.target.value })
                        }
                        placeholder="https://send.monobank.ua/jar/..."
                        className="w-full rounded-xl bg-emerald-50/60 border border-emerald-200 px-3 py-2 text-xs font-semibold text-slate-950"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
                  >
                    ✅ Зберегти мрію у список
                  </button>
                </form>
              )}
            </div>

            {/* Помітний блок «🧠 Мій профіль смаків та інтересів (для ШІ-помічника)» */}
            <form
              onSubmit={handleSaveAiPrefs}
              className="solid-white-card rounded-[26px] p-5 sm:p-6 space-y-4 border-2 border-white shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900">
                    🧠 Живить ШІ-помічника Gemini
                  </span>
                  <h2 className="text-lg font-black text-slate-950 mt-1">
                    🧠 Інтереси та смаки для ШІ-помічника
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-slate-600">
                    Оберіть теги та вкажіть табу — ШІ використає це для точного пошуку подарунків в інтернеті.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInterestsOnProfile}
                    onChange={(e) => setShowInterestsOnProfile(e.target.checked)}
                    className="rounded"
                  />
                  <span>Показувати підказки гостям</span>
                </label>
              </div>

              {/* Швидкі клікабельні чіпси інтересів */}
              <div className="flex flex-wrap gap-2">
                {INTEREST_CHIPS.map((chip) => {
                  const active = selectedInterestChips.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleInterestChip(chip)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold spring-transition ${
                        active
                          ? `${tokens.primaryCtaGradient} text-white shadow-md`
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    🎨 Свої хобі та інтереси:
                  </label>
                  <input
                    type="text"
                    value={hobbiesInput}
                    onChange={(e) => setHobbiesInput(e.target.value)}
                    placeholder="Кераміка, вініл, пілатес..."
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 font-semibold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ✨ Улюблені бренди та кольори:
                  </label>
                  <input
                    type="text"
                    value={favoriteBrandsInput}
                    onChange={(e) => setFavoriteBrandsInput(e.target.value)}
                    placeholder="Apple, Dyson, @cher17.ua, молочний..."
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 font-semibold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    📏 Розміри (одяг / взуття) та квіти:
                  </label>
                  <input
                    type="text"
                    value={`${sizesInput} • ${flowerPrefsInput}`}
                    onChange={(e) => setSizesInput(e.target.value)}
                    className="w-full rounded-xl bg-emerald-50/70 border border-emerald-200 px-3 py-2.5 font-semibold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-rose-800 mb-1">
                    🚫 Анти-подарунки (табу):
                  </label>
                  <input
                    type="text"
                    value={antiGiftsInput}
                    onChange={(e) => setAntiGiftsInput(e.target.value)}
                    placeholder="Сувеніри, м'які іграшки, чашки..."
                    className="w-full rounded-xl bg-rose-50/70 border border-rose-200 px-3 py-2.5 font-semibold text-slate-950"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} text-white inline-flex items-center gap-2 shadow-md`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {aiSavedToast
                    ? '✅ Профіль інтересів збережено для ШІ!'
                    : 'Зберегти профіль інтересів для ШІ'}
                </span>
              </button>
            </form>

            {/* Сітка карток подарунків на суцільному білому тлі (Сюрприз-захист) */}
            <div className="grid gap-5 sm:grid-cols-2">
              {items.map((item) => (
                <SmokedGiftCard
                  key={item.id}
                  item={item}
                  themePreset={themePreset}
                  viewMode="owner"
                  ownerInstagramHandle={ownerInstagramHandle}
                  forceFallbackPoster={forceFallbackPoster}
                  onDeleteClick={handleDeleteItem}
                />
              ))}
            </div>
          </div>

          {/* Права колонка (4 cols): Кольорові чіпси анкети ШІ + Картка квітів */}
          <aside className="lg:col-span-4 space-y-5">
            {/* Картка «🌸 Які квіти я люблю та мої побажання» */}
            <div className="solid-white-card rounded-[24px] p-5 space-y-3 border border-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌸</span>
                <div>
                  <h2 className="text-sm font-black text-slate-950">
                    Які квіти я люблю та @Instagram
                  </h2>
                  <p className="text-sm font-semibold text-slate-500">
                    Без домашньої адреси — доставка через Direct
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveFlowerNotes} className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ваш Instagram (@нікнейм):
                  </label>
                  <input
                    type="text"
                    value={ownerInstagramHandle}
                    onChange={(e) =>
                      setOwnerInstagramHandle(e.target.value.replace(/^@+/, ''))
                    }
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 font-bold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Побажання щодо квітів та @шоурумів:
                  </label>
                  <textarea
                    rows={3}
                    value={flowerAndGiftNotes}
                    onChange={(e) => setFlowerAndGiftNotes(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 font-semibold text-slate-950"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl font-extrabold bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white shadow"
                >
                  {flowerSavedToast ? '✅ Збережено!' : '🌸 Оновити картку квітів'}
                </button>
              </form>
            </div>

            {/* Анкета для чіпсів профілю та ШІ-консьєржа Gemini 2.5 */}
            <div className="solid-white-card rounded-[24px] p-5 space-y-3 border border-white">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-950">
                    ✨ Анкета для Профілю та ШІ
                  </h2>
                  <p className="text-sm font-semibold text-slate-500">
                    Формує кольорові чіпси у шапці та підказки Gemini
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveAiPrefs} className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    📏 Мої розміри (чіпс #1):
                  </label>
                  <input
                    type="text"
                    value={sizesInput}
                    onChange={(e) => setSizesInput(e.target.value)}
                    className="w-full rounded-xl bg-emerald-50/70 border border-emerald-200 p-2.5 font-bold text-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-bold text-pink-800 mb-1">
                    💖 Хобі та естетика (чіпс #2):
                  </label>
                  <input
                    type="text"
                    value={hobbiesInput}
                    onChange={(e) => setHobbiesInput(e.target.value)}
                    className="w-full rounded-xl bg-pink-50/70 border border-pink-200 p-2.5 font-bold text-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-bold text-purple-800 mb-1">
                    🌸 Улюблені квіти (для Gemini AI):
                  </label>
                  <input
                    type="text"
                    value={flowerPrefsInput}
                    onChange={(e) => setFlowerPrefsInput(e.target.value)}
                    className="w-full rounded-xl bg-purple-50/70 border border-purple-200 p-2.5 font-bold text-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-bold text-rose-800 mb-1">
                    🚫 Табу / Анти-подарунки (чіпс #3):
                  </label>
                  <input
                    type="text"
                    value={antiGiftsInput}
                    onChange={(e) => setAntiGiftsInput(e.target.value)}
                    className="w-full rounded-xl bg-rose-50/70 border border-rose-200 p-2.5 font-bold text-slate-950"
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 rounded-xl font-extrabold ${tokens.primaryCtaGradient} text-white flex items-center justify-center gap-1.5`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {aiSavedToast ? '✅ Чіпси та ШІ оновлено!' : 'Зберегти анкету'}
                  </span>
                </button>
              </form>
            </div>

            {/* COPY-01: Розкриття дарувальників наступного дня після свята */}
            <div className="solid-white-card rounded-[26px] p-5 border border-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-950">
                  🎉 Кому подякувати за подарунки
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPostEventReveal((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-extrabold transition ${
                    isPostEventReveal
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                  }`}
                >
                  {isPostEventReveal ? '🎉 Після свята' : '🔒 До свята'}
                </button>
              </div>
              {isPostEventReveal ? (
                <ul className="space-y-2 text-sm text-slate-800">
                  <li className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-semibold">
                    🎁 <strong className="text-slate-950">Аліна</strong> подарувала{' '}
                    <span className="font-bold">Dyson Airwrap</span>
                  </li>
                  <li className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-semibold">
                    🫙 <strong className="text-slate-950">Максим, Оля, Діма</strong> скинулись у{' '}
                    <span className="font-bold">Монобанку / Конверт Приват24</span>
                  </li>
                </ul>
              ) : (
                <p className="text-sm font-medium text-slate-600">
                  Імена дарувальників приховані Сюрприз-режимом і автоматично відкриються наступного дня після дати свята!
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen canvas-rose flex items-center justify-center text-white font-extrabold">
          Завантаження кабінету Mriyii...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
