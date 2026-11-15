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
  Trash2,
  Pencil,
  Image as ImageIcon,
} from 'lucide-react';
import type { ThemePreset } from '@/models/User';
import { THEME_TOKENS, DEMO_WISHLISTS } from '@/lib/theme-data';
import type { UnifiedGiftCardItem } from '@/components/SmokedGiftCard';
import { parseProductUrlAction } from '@/actions/wishlist';

const DRAFT_STORAGE_KEY = 'mriyii_delayed_auth_draft_v1';
const AI_PREFS_STORAGE_KEY = 'mriyii_ai_preferences_v1';

type EditorTab = 'content' | 'header' | 'design' | 'interests';

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

const WISHLIST_TEMPLATES: Record<
  'birthday' | 'santa' | 'housewarming',
  {
    label: string;
    title: string;
    items: Array<{ title: string; emoji: string; price: number; description: string }>;
  }
> = {
  birthday: {
    label: '🎂 День народження',
    title: 'Мій День Народження 🎂',
    items: [
      {
        title: 'Стайлер Dyson Airwrap Complete Long',
        emoji: '💇‍♀️',
        price: 25990,
        description: 'Можна скинутися в Монобанку або подарувати разом ✨',
      },
      {
        title: 'Парфуми Jo Malone Wood Sage & Sea Salt',
        emoji: '🌸',
        price: 5800,
        description: 'Обʼєм 50 мл або 100 мл',
      },
      {
        title: 'Сертифікат на SPA-день та масаж',
        emoji: '🧖‍♀️',
        price: 3500,
        description: 'Будь-який вечірній час на вихідних',
      },
    ],
  },
  santa: {
    label: '🎅 Таємний Санта',
    title: 'Таємний Санта 2025 🎅',
    items: [
      {
        title: 'Набір specialty-кави (3 пачки по 250г)',
        emoji: '☕',
        price: 950,
        description: 'Під фільтр або воронку, світле обсмаження',
      },
      {
        title: 'Термочашка KeepCup або Stanley',
        emoji: '🥤',
        price: 1200,
        description: 'Колір бежевий, чорний або оливковий',
      },
      {
        title: 'Аромасвічка WoodWick з деревʼяним гнотом',
        emoji: '🕯️',
        price: 890,
        description: 'Запах ванілі, кедра або морської солі',
      },
    ],
  },
  housewarming: {
    label: '🏡 Новосілля',
    title: 'Наше затишне Новосілля 🏡',
    items: [
      {
        title: 'Кавоварка DeLonghi або Nespresso',
        emoji: '☕',
        price: 11500,
        description: 'Для ранків на новій кухні',
      },
      {
        title: 'Набір келихів для вина Spiegelau (4 шт)',
        emoji: '🥂',
        price: 2100,
        description: 'Прозоре тонке скло',
      },
      {
        title: 'Плед із мериносової вовни',
        emoji: '🛋️',
        price: 3200,
        description: 'Молочний або графітовий колір',
      },
    ],
  },
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialThemeParam = searchParams.get('theme');

  const [themePreset, setThemePreset] = useState<ThemePreset>(
    initialThemeParam === 'cyber_titanium' ? 'cyber_titanium' : 'rose_luxury'
  );
  const [activeTab, setActiveTab] = useState<EditorTab>('content');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');

  const [wishlistTitle, setWishlistTitle] = useState(
    DEMO_WISHLISTS[themePreset].title
  );
  const [ownerBio, setOwnerBio] = useState(DEMO_WISHLISTS[themePreset].ownerBio);
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState(
    DEMO_WISHLISTS[themePreset].ownerAvatarUrl
  );
  const [eventDate, setEventDate] = useState(
    DEMO_WISHLISTS[themePreset].eventDate.slice(0, 10)
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

  // Редагування окремого лота
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');

  // Швидке додавання бажання за URL у Суцільній Білій Капсулі (Loading -> Success -> Error)
  const [urlInput, setUrlInput] = useState('');
  const [addBtnState, setAddBtnState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
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

  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importText, setImportText] = useState('');
  const [templateToast, setTemplateToast] = useState<string | null>(null);
  const [thankedDonors, setThankedDonors] = useState<Record<string, boolean>>({});

  const [isPostEventReveal, setIsPostEventReveal] = useState(false);
  const [previewAiExpanded, setPreviewAiExpanded] = useState(false);

  // Поля анкети для ШІ-помічника (aiPreferences)
  const [selectedInterestChips, setSelectedInterestChips] = useState<string[]>([
    '☕ Specialty кава',
    "💄 Б'юті та парфуми",
  ]);
  const [hobbiesInput, setHobbiesInput] = useState(
    DEMO_WISHLISTS[themePreset].aiHobbies.join(', ')
  );
  const [favoriteBrandsInput, setFavoriteBrandsInput] = useState(
    'Dyson, Apple, @cher17.ua, бежевий та champagne gold'
  );
  const [sizesInput, setSizesInput] = useState(DEMO_WISHLISTS[themePreset].aiSizes);
  const [flowerPrefsInput, setFlowerPrefsInput] = useState(
    DEMO_WISHLISTS[themePreset].aiFlowerPreferences
  );
  const [antiGiftsInput, setAntiGiftsInput] = useState(
    DEMO_WISHLISTS[themePreset].aiAntiGifts.join(', ')
  );
  const [showInterestsOnProfile, setShowInterestsOnProfile] = useState(true);
  const [aiSavedToast, setAiSavedToast] = useState(false);
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
        setOwnerBio(DEMO_WISHLISTS[resolvedPreset].ownerBio);
        setOwnerAvatarUrl(DEMO_WISHLISTS[resolvedPreset].ownerAvatarUrl);
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
    setOwnerBio(DEMO_WISHLISTS[nextPreset].ownerBio);
    setOwnerAvatarUrl(DEMO_WISHLISTS[nextPreset].ownerAvatarUrl);
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
    setTimeout(() => setCopiedToast(false), 1500);
  };

  const handleParseUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) {
      setAddBtnState('error');
      setTimeout(() => setAddBtnState('idle'), 1600);
      return;
    }

    setAddBtnState('loading');
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
      setAddBtnState('success');
      setTimeout(() => setAddBtnState('idle'), 1200);
    } catch {
      setAddBtnState('error');
      setTimeout(() => setAddBtnState('idle'), 1600);
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

  const handleDeleteItem = (targetId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== targetId));
  };

  const handleStartEdit = (item: UnifiedGiftCardItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditPrice(item.price ? String(item.price) : '');
  };

  const handleSaveEdit = (itemId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              title: editTitle.trim() || it.title,
              price: Number.parseFloat(editPrice) || it.price,
            }
          : it
      )
    );
    setEditingItemId(null);
  };

  const handleApplyTemplate = (key: 'birthday' | 'santa' | 'housewarming') => {
    const tpl = WISHLIST_TEMPLATES[key];
    const mapped: UnifiedGiftCardItem[] = tpl.items.map((entry, idx) => ({
      id: `tpl-${key}-${Date.now()}-${idx}`,
      title: entry.title,
      emoji: entry.emoji,
      description: entry.description,
      price: entry.price,
      currency: 'UAH',
      isBooked: false,
    }));
    setWishlistTitle(tpl.title);
    setItems((prev) => [...mapped, ...prev]);
    setTemplateToast(`✨ Додано ${mapped.length} ідеї із шаблону «${tpl.label}»!`);
    setTimeout(() => setTemplateToast(null), 3500);
  };

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^[-*•\d.)]+\s*/, ''))
      .filter((l) => l.length > 1);

    if (lines.length === 0) return;

    const imported: UnifiedGiftCardItem[] = lines.map((line, idx) => {
      const urlMatch = line.match(/https?:\/\/\S+/i);
      const priceMatch = line.match(/(\d[\d\s]{2,7})\s*(?:₴|грн|uah)?\s*$/i);
      const parsedPrice = priceMatch
        ? Number.parseInt(priceMatch[1].replace(/\s+/g, ''), 10)
        : undefined;
      let cleanTitle = line
        .replace(/https?:\/\/\S+/i, '')
        .replace(/[-—–]\s*\d[\d\s]{2,7}\s*(?:₴|грн|uah)?\s*$/i, '')
        .replace(/\d[\d\s]{2,7}\s*(?:₴|грн|uah)?\s*$/i, '')
        .trim();

      if (!cleanTitle && urlMatch) {
        cleanTitle = urlMatch[0].replace(/^https?:\/\/(www\.)?/i, '').slice(0, 64);
      }

      const lower = cleanTitle.toLowerCase();
      const emoji =
        lower.includes('кав') || lower.includes('coffee')
          ? '☕'
          : lower.includes('навуш') || lower.includes('airpods') || lower.includes('sony')
          ? '🎧'
          : lower.includes('dyson') || lower.includes('стайл')
          ? '💇‍♀️'
          : lower.includes('квіт') || lower.includes('півон')
          ? '🌸'
          : lower.includes('книг')
          ? '📚'
          : '🎁';

      return {
        id: `imp-${Date.now()}-${idx}`,
        title: cleanTitle || 'Імпортована мрія',
        emoji,
        price: parsedPrice,
        currency: 'UAH',
        originalUrl: urlMatch?.[0],
        affiliateUrl: urlMatch?.[0],
        description: 'Імпортовано зі списку 📥',
        isBooked: false,
      };
    });

    setItems((prev) => [...imported, ...prev]);
    setImportText('');
    setShowImportPanel(false);
    setTemplateToast(`📥 Імпортовано ${imported.length} позицій у вішліст!`);
    setTimeout(() => setTemplateToast(null), 3500);
  };

  const handleThankDonor = async (donorId: string, donorName: string, giftName: string) => {
    const thankMsg = `Дякую тобі велике за ${giftName}! Це було неймовірно приємно 💛✨`;
    try {
      await navigator.clipboard.writeText(thankMsg);
    } catch {
      // Fallback
    }
    setThankedDonors((prev) => ({ ...prev, [donorId]: true }));
    setTemplateToast(`💌 Подяку для ${donorName} скопійовано в буфер обміну!`);
    setTimeout(() => setTemplateToast(null), 3500);
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

  const tokens = THEME_TOKENS[themePreset];
  const demoProfile = DEMO_WISHLISTS[themePreset];
  const isRose = themePreset === 'rose_luxury';
  const solidBtnClass = isRose
    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
    : 'bg-emerald-400 hover:bg-emerald-500 text-slate-950';

  return (
    <div className={`min-h-screen ${tokens.meshClass} text-white spring-transition pb-20`}>
      {/* Верхня панель Linktree-редактора */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0E1324]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px]`}
              >
                <div className="w-full h-full bg-[#171D30] rounded-[10px] flex items-center justify-center text-lg">
                  🎁
                </div>
              </div>
              <span className="text-base font-black text-white">Mriyii</span>
            </Link>
            <span className="hidden sm:inline text-sm font-semibold text-slate-300">
              • Кабінет • <span className="text-white font-bold">mriyii.app/w/{slug}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareLink}
              aria-live="polite"
              className="min-h-[48px] min-w-[172px] justify-center px-4 rounded-xl text-sm font-extrabold bg-[#171D30] hover:bg-[#1E2640] text-white border border-white/15 inline-flex items-center gap-2 spring-transition"
            >
              {copiedToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>✓ Скопійовано</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Скопіювати лінк</span>
                </>
              )}
            </button>

            <Link
              href={`/w/${slug}`}
              className={`min-h-[44px] px-4 rounded-xl text-sm font-extrabold ${solidBtnClass} inline-flex items-center gap-1.5 shadow-lg spring-transition`}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Очима Гостя</span>
            </Link>
          </div>
        </div>

        {/* Мобільний сегментний перемикач (<1024px) */}
        <div className="lg:hidden border-t border-white/10 px-4 py-2 bg-[#0E1324]/95">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#171D30] border border-white/10">
            <button
              type="button"
              onClick={() => setMobileView('editor')}
              className={`min-h-[48px] rounded-xl text-sm font-extrabold spring-transition ${
                mobileView === 'editor'
                  ? solidBtnClass
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              ✏️ Редактор
            </button>
            <button
              type="button"
              onClick={() => setMobileView('preview')}
              className={`min-h-[48px] rounded-xl text-sm font-extrabold spring-transition ${
                mobileView === 'preview'
                  ? solidBtnClass
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              👁️ Прев&apos;ю (/w/{slug})
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =============================================================== */}
          {/* ЛІВА ПАНЕЛЬ: РЕДАКТОР (58% / 7 cols) з 4 табами                 */}
          {/* =============================================================== */}
          <section
            className={`lg:col-span-7 space-y-5 ${
              mobileView === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* 4 вкладки редактора */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-[#171D30] border border-white/10">
              {(
                [
                  { id: 'content', label: '📦 Content' },
                  { id: 'header', label: '👤 Header' },
                  { id: 'design', label: '🎨 Design' },
                  { id: 'interests', label: '🧠 Interests' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[48px] px-3 rounded-xl text-sm font-extrabold spring-transition ${
                    activeTab === tab.id
                      ? `${solidBtnClass} shadow-md`
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* --------------------------------------------------------------- */}
            {/* TAB 1: CONTENT (Подарунки)                                      */}
            {/* --------------------------------------------------------------- */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                <div className="rounded-[24px] bg-[#171D30] border border-white/10 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-300" />
                      <span>Додати мрію за лінком або @shop</span>
                    </h2>
                    <span className="text-sm font-bold text-amber-300">
                      🔒 Сюрприз-захист активний
                    </span>
                  </div>

                  <form
                    onSubmit={handleParseUrl}
                    className="bg-white rounded-2xl p-2 shadow-xl flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Вставте посилання або @instagram_shop..."
                      className="flex-1 px-3.5 py-2.5 text-sm sm:text-base font-bold text-slate-950 placeholder:text-slate-400 bg-transparent focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={addBtnState === 'loading'}
                      aria-live="polite"
                      className={`w-full sm:w-[196px] min-h-[48px] px-4 rounded-xl text-sm font-extrabold spring-transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0 ${
                        addBtnState === 'success'
                          ? 'bg-emerald-400 text-slate-950'
                          : addBtnState === 'error'
                          ? 'bg-rose-500 text-white shake-2px'
                          : solidBtnClass
                      }`}
                    >
                      {addBtnState === 'loading' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span>Додаємо...</span>
                        </>
                      ) : addBtnState === 'success' ? (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>✓ Додано</span>
                        </>
                      ) : addBtnState === 'error' ? (
                        <span>Не вдалося, спробуй ще</span>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 shrink-0" />
                          <span>Додати</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* COPY-04: 1-click шаблони + COPY-05: Імпорт списку */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-300">Шаблони:</span>
                      {(
                        Object.keys(WISHLIST_TEMPLATES) as Array<
                          keyof typeof WISHLIST_TEMPLATES
                        >
                      ).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleApplyTemplate(key)}
                          className="min-h-[40px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold text-white transition"
                        >
                          {WISHLIST_TEMPLATES[key].label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImportPanel((v) => !v)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/35 text-sm font-extrabold text-indigo-200 transition"
                    >
                      {showImportPanel ? 'Закрити імпорт ▴' : '📥 Імпорт списку'}
                    </button>
                  </div>

                  {templateToast && (
                    <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/35 px-4 py-2.5 text-sm font-bold text-emerald-200">
                      {templateToast}
                    </div>
                  )}

                  {showImportPanel && (
                    <form
                      onSubmit={handleBulkImport}
                      className="rounded-2xl bg-[#0E1324] border border-indigo-400/30 p-4 space-y-3"
                    >
                      <div className="text-sm font-bold text-slate-200">
                        Вставте список з Нотаток, Notion або посилання (по одному в рядок):
                      </div>
                      <textarea
                        rows={4}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={`- Dyson Airwrap 26000\n- Навушники Sony — 11999\nhttps://rozetka.com.ua/...`}
                        className="w-full rounded-xl bg-[#171D30] border border-white/15 p-3 text-sm font-semibold text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                      />
                      <button
                        type="submit"
                        className={`min-h-[48px] px-5 rounded-xl text-sm font-extrabold ${solidBtnClass}`}
                      >
                        ✨ Розпізнати та додати в список
                      </button>
                    </form>
                  )}

                  {previewItem && (
                    <form
                      onSubmit={handleConfirmAddPreview}
                      className="solid-white-card rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-emerald-700">
                          ✨ Прев’ю нового лота
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewItem(null)}
                          className="text-sm font-bold text-slate-500 hover:text-slate-900"
                        >
                          Скасувати
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-12 gap-2.5">
                        <input
                          type="text"
                          value={previewItem.emoji}
                          onChange={(e) =>
                            setPreviewItem({ ...previewItem, emoji: e.target.value })
                          }
                          className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-center text-lg"
                        />
                        <input
                          type="text"
                          required
                          value={previewItem.title}
                          onChange={(e) =>
                            setPreviewItem({ ...previewItem, title: e.target.value })
                          }
                          placeholder="Назва подарунка"
                          className="sm:col-span-7 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-bold text-slate-950"
                        />
                        <input
                          type="number"
                          value={previewItem.price}
                          onChange={(e) =>
                            setPreviewItem({ ...previewItem, price: e.target.value })
                          }
                          placeholder="Ціна ₴"
                          className="sm:col-span-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-bold text-slate-950 tabular-nums"
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={previewItem.description}
                          onChange={(e) =>
                            setPreviewItem({ ...previewItem, description: e.target.value })
                          }
                          placeholder="Коментар гостям (колір, розмір)"
                          className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-950"
                        />
                        <input
                          type="url"
                          value={previewItem.monoJarUrl}
                          onChange={(e) =>
                            setPreviewItem({ ...previewItem, monoJarUrl: e.target.value })
                          }
                          placeholder="https://send.monobank.ua/jar/..."
                          className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-950"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full min-h-[48px] rounded-xl text-sm font-extrabold bg-emerald-400 hover:bg-emerald-500 text-slate-950 shadow-md"
                      >
                        ✅ Зберегти мрію у список
                      </button>
                    </form>
                  )}
                </div>

                {/* Список лотів редактора */}
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-[#171D30] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-[#0E1324] border border-white/15 overflow-hidden flex items-center justify-center text-2xl shrink-0">
                          {item.imageUrl && !forceFallbackPoster ? (
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

                        <div className="min-w-0 flex-1 space-y-1">
                          {editingItemId === item.id ? (
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="flex-1 min-w-[160px] rounded-xl bg-[#0E1324] border border-white/25 px-3 py-1.5 text-sm font-bold text-white"
                              />
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-28 rounded-xl bg-[#0E1324] border border-white/25 px-3 py-1.5 text-sm font-bold text-white tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-400 text-slate-950 text-sm font-extrabold"
                              >
                                Зберегти
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm sm:text-base font-extrabold text-white truncate">
                                {idx + 1}. {item.title}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-300 tabular-nums">
                                <span className="text-amber-300 font-extrabold">
                                  {(item.price ?? 0).toLocaleString('uk-UA')} ₴
                                </span>
                                {item.hasMonoJar || item.monoJarUrl ? (
                                  <span className="text-emerald-300">• 🫙 Монобанка</span>
                                ) : null}
                                {item.instagramHandle ? (
                                  <span className="text-indigo-300">
                                    • 📸 @{item.instagramHandle}
                                  </span>
                                ) : null}
                                <span className="text-slate-300">• 🤫 Інтрига збережена</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="min-h-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold inline-flex items-center gap-1.5"
                        >
                          <Pencil className="w-4 h-4" />
                          <span>Ред.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="min-h-[44px] px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-200 border border-rose-400/25 text-sm font-bold inline-flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Вид.</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* COPY-01: Розкриття дарувальників наступного дня після свята */}
                <div className="rounded-[24px] bg-[#171D30] border border-white/10 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-white">
                      🎉 Кому подякувати за подарунки
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsPostEventReveal((v) => !v)}
                      className={`min-h-[44px] px-4 rounded-xl text-sm font-extrabold transition ${
                        isPostEventReveal
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isPostEventReveal ? '🎉 Після свята' : '🔒 До свята'}
                    </button>
                  </div>
                  {isPostEventReveal ? (
                    <ul className="space-y-2.5 text-sm text-slate-200">
                      {[
                        {
                          id: 'donor-alina',
                          icon: '🎁',
                          name: 'Аліна',
                          action: 'подарувала',
                          gift: 'Dyson Airwrap',
                          accent: 'text-amber-300',
                        },
                        {
                          id: 'donor-group',
                          icon: '🫙',
                          name: 'Максим, Оля, Діма',
                          action: 'скинулись у',
                          gift: 'Монобанку / Приват24',
                          accent: 'text-emerald-300',
                        },
                      ].map((d) => (
                        <li
                          key={d.id}
                          className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 font-semibold flex flex-wrap items-center justify-between gap-2"
                        >
                          <span>
                            {d.icon} <strong className="text-white">{d.name}</strong> {d.action}{' '}
                            <span className={`font-bold ${d.accent}`}>{d.gift}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleThankDonor(d.id, d.name, d.gift)}
                            className={`min-h-[40px] px-3.5 rounded-xl text-sm font-extrabold transition ${
                              thankedDonors[d.id]
                                ? 'bg-emerald-400 text-slate-950'
                                : 'bg-white/15 hover:bg-white/25 text-white'
                            }`}
                          >
                            {thankedDonors[d.id] ? '✅ Подяку надіслано!' : '💌 Подякувати'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-slate-300">
                      Імена дарувальників приховані Сюрприз-режимом і відкриються наступного дня після дати свята.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 2: HEADER (Профіль та квіти без адреси)                     */}
            {/* --------------------------------------------------------------- */}
            {activeTab === 'header' && (
              <div className="rounded-[24px] bg-[#171D30] border border-white/10 p-5 sm:p-6 space-y-5">
                <h2 className="text-lg font-black text-white">👤 Профіль свята та квіти</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-1.5">
                      Заголовок вішліста:
                    </label>
                    <input
                      type="text"
                      value={wishlistTitle}
                      onChange={(e) => setWishlistTitle(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl bg-[#0E1324] border border-white/15 px-4 text-sm sm:text-base font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-1.5">
                      Коротке біо для друзів:
                    </label>
                    <textarea
                      rows={2}
                      value={ownerBio}
                      onChange={(e) => setOwnerBio(e.target.value)}
                      className="w-full rounded-xl bg-[#0E1324] border border-white/15 p-3.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-200 mb-1.5">
                        📅 Дата свята (для розкриття подяк):
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full min-h-[48px] rounded-xl bg-[#0E1324] border border-white/15 px-4 text-sm font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-200 mb-1.5">
                        🖼️ URL аватарки:
                      </label>
                      <input
                        type="url"
                        value={ownerAvatarUrl}
                        onChange={(e) => setOwnerAvatarUrl(e.target.value)}
                        className="w-full min-h-[48px] rounded-xl bg-[#0E1324] border border-white/15 px-4 text-sm font-semibold text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div>
                    <h3 className="text-base font-black text-amber-300">
                      🌸 Квіти та @Instagram без домашньої адреси
                    </h3>
                    <p className="text-sm text-slate-300">
                      Магазин сам напише вам у Direct для узгодження часу й місця доставки.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-1.5">
                      Ваш @instagram нікнейм:
                    </label>
                    <input
                      type="text"
                      value={ownerInstagramHandle}
                      onChange={(e) =>
                        setOwnerInstagramHandle(e.target.value.replace(/^@+/, ''))
                      }
                      className="w-full min-h-[48px] rounded-xl bg-[#0E1324] border border-white/15 px-4 text-sm font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-1.5">
                      Улюблені квіти та шоуруми:
                    </label>
                    <textarea
                      rows={3}
                      value={flowerAndGiftNotes}
                      onChange={(e) => setFlowerAndGiftNotes(e.target.value)}
                      className="w-full rounded-xl bg-[#0E1324] border border-white/15 p-3.5 text-sm font-semibold text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 3: DESIGN (Тема DS V2 Option 2)                            */}
            {/* --------------------------------------------------------------- */}
            {activeTab === 'design' && (
              <div className="rounded-[24px] bg-[#171D30] border border-white/10 p-5 sm:p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-black text-white">🎨 Дизайн-тема DS V2</h2>
                  <p className="text-sm text-slate-300">
                    Оберіть пресет — праве прев&apos;ю оновиться миттєво.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('rose_luxury')}
                    className={`rounded-2xl p-5 text-left border-2 transition space-y-3 ${
                      themePreset === 'rose_luxury'
                        ? 'border-amber-400 bg-[#0E1324]'
                        : 'border-white/10 bg-[#0E1324]/60 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-white">
                        👩 Midnight Velvet
                      </span>
                      {themePreset === 'rose_luxury' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-sm font-black">
                          Активна
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300">
                      Глибокий оксамит #0E1324 + Champagne Amber #F59E0B CTA
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#0E1324] border border-white/25" />
                      <span className="w-6 h-6 rounded-full bg-amber-500" />
                      <span className="w-6 h-6 rounded-full bg-amber-200" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange('cyber_titanium')}
                    className={`rounded-2xl p-5 text-left border-2 transition space-y-3 ${
                      themePreset === 'cyber_titanium'
                        ? 'border-emerald-400 bg-[#0B1120]'
                        : 'border-white/10 bg-[#0B1120]/60 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-white">
                        👨 Cyber Titanium
                      </span>
                      {themePreset === 'cyber_titanium' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-sm font-black">
                          Активна
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300">
                      Титан #0B1120 + Emerald Mint #34D399 + Indigo #4F46E5
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#0B1120] border border-white/25" />
                      <span className="w-6 h-6 rounded-full bg-emerald-400" />
                      <span className="w-6 h-6 rounded-full bg-indigo-500" />
                    </div>
                  </button>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200">
                    Режим обкладинок карток без фото:
                  </span>
                  <button
                    type="button"
                    onClick={() => setForceFallbackPoster((p) => !p)}
                    className="min-h-[44px] px-4 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 inline-flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-amber-300" />
                    <span>{forceFallbackPoster ? '✨ Smart Постер' : '🖼️ З фото'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 4: INTERESTS (Анкета для ШІ)                                */}
            {/* --------------------------------------------------------------- */}
            {activeTab === 'interests' && (
              <form
                onSubmit={handleSaveAiPrefs}
                className="rounded-[24px] bg-[#171D30] border border-white/10 p-5 sm:p-6 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-white">
                      🧠 Інтереси та смаки для ШІ
                    </h2>
                    <p className="text-sm text-slate-300">
                      Живить ШІ-тізер у правому прев&apos;ю та сторінку друзів.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-200 bg-[#0E1324] px-3 py-2 rounded-xl border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInterestsOnProfile}
                      onChange={(e) => setShowInterestsOnProfile(e.target.checked)}
                    />
                    <span>Показувати чіпси</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {INTEREST_CHIPS.map((chip) => {
                    const active = selectedInterestChips.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleInterestChip(chip)}
                        className={`min-h-[48px] px-4 rounded-xl text-sm font-extrabold spring-transition ${
                          active
                            ? `${solidBtnClass} shadow-md`
                            : 'bg-[#0E1324] hover:bg-white/10 text-slate-200 border border-white/15'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-1.5">
                      🎨 Свої хобі та інтереси:
                    </label>
                    <input
                      type="text"
                      value={hobbiesInput}
                      onChange={(e) => setHobbiesInput(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl bg-[#0E1324] border border-white/15 px-4 text-sm font-semibold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-1.5">
                      ✨ Улюблені бренди та кольори:
                    </label>
                    <input
                      type="text"
                      value={favoriteBrandsInput}
                      onChange={(e) => setFavoriteBrandsInput(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl bg-[#0E1324] border border-white/15 px-4 text-sm font-semibold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-emerald-300 mb-1.5">
                      📏 Розміри (одяг / взуття):
                    </label>
                    <input
                      type="text"
                      value={sizesInput}
                      onChange={(e) => setSizesInput(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl bg-[#0E1324] border border-emerald-400/30 px-4 text-sm font-semibold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-rose-300 mb-1.5">
                      🚫 Анти-подарунки (табу):
                    </label>
                    <input
                      type="text"
                      value={antiGiftsInput}
                      onChange={(e) => setAntiGiftsInput(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl bg-[#0E1324] border border-rose-400/30 px-4 text-sm font-semibold text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`min-h-[48px] px-6 rounded-xl text-sm font-extrabold ${solidBtnClass} inline-flex items-center gap-2 shadow-md`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {aiSavedToast ? '✅ Профіль інтересів збережено!' : 'Зберегти анкету для ШІ'}
                  </span>
                </button>
              </form>
            )}
          </section>

          {/* =============================================================== */}
          {/* ПРАВА ПАНЕЛЬ: LIVE PREVIEW (42% / 5 cols) у порядку Issue #8!    */}
          {/* =============================================================== */}
          <aside
            className={`lg:col-span-5 lg:sticky lg:top-20 ${
              mobileView === 'editor' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="rounded-[32px] border border-white/20 bg-[#0B0F19] p-3 shadow-2xl">
              <div className="flex items-center justify-between px-3 pb-2.5 text-sm font-bold text-slate-300">
                <span>👁️ Live Preview</span>
                <span className="text-amber-300">mriyii.app/w/{slug}</span>
              </div>

              <div
                className={`rounded-[24px] ${tokens.meshClass} p-4 space-y-3.5 max-h-[78vh] overflow-y-auto`}
              >
                {/* 1. PROFILE HEADER */}
                <div className="rounded-2xl bg-[#171D30]/95 border border-white/15 p-4 text-center space-y-2.5">
                  <div className="mx-auto w-16 h-16 rounded-full p-[2px] inline-block bg-gradient-to-br from-amber-400 to-indigo-500">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ownerAvatarUrl}
                      alt={demoProfile.ownerName}
                      className="w-full h-full rounded-full object-cover border-2 border-[#0E1324]"
                    />
                  </div>
                  <h3 className="text-base font-black text-white leading-snug">
                    {wishlistTitle}
                  </h3>
                  <p className="text-sm text-slate-200 leading-snug">{ownerBio}</p>
                  {showInterestsOnProfile && (
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1 text-sm font-bold">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-200">
                        📏 {sizesInput}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-200">
                        💖 {hobbiesInput.split(',')[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. AI TEASER (Collapsed by default, expands on click) */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPreviewAiExpanded((v) => !v)}
                    className="w-full min-h-[48px] rounded-2xl bg-[#171D30]/95 border border-amber-400/35 px-4 py-2.5 flex items-center justify-between gap-2 text-left"
                  >
                    <span className="text-sm font-extrabold text-white">
                      ✨ Хочеш, допоможу з ідеєю на основі інтересів?
                    </span>
                    <span className="text-sm font-black text-amber-300 shrink-0">
                      {previewAiExpanded ? '▴' : '▾'}
                    </span>
                  </button>
                  {previewAiExpanded && (
                    <div className="rounded-2xl bg-[#171D30] border border-white/10 p-3 space-y-2 text-sm">
                      <div className="font-bold text-emerald-300">
                        🤖 3 ідеї під {selectedInterestChips[0] || 'інтереси'}:
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0E1324] text-white font-semibold">
                        ☕ Набір specialty-кави • 950 ₴
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0E1324] text-white font-semibold">
                        ✨ Аромадифузор Rituals • 2 450 ₴
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. FREE APP NOTE */}
                <div className="rounded-xl bg-[#171D30]/85 border border-white/10 px-3.5 py-2.5 text-sm font-semibold text-amber-200 flex items-center gap-2">
                  <span>💡</span>
                  <span>Користуйся посиланнями — застосунок безкоштовний</span>
                </div>

                {/* 4. OWNER-CHOSEN ITEMS (White Cards #FFFFFF) */}
                <div className="space-y-3">
                  {items.slice(0, 3).map((item) => (
                    <div
                      key={`prev-${item.id}`}
                      className="solid-white-card rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-base font-black text-slate-950 leading-snug">
                          {item.emoji || '🎁'} {item.title}
                        </div>
                        <span className="text-sm font-black text-slate-950 tabular-nums shrink-0">
                          {(item.price ?? 0).toLocaleString('uk-UA')} ₴
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-600">
                        {item.isBooked ? '🔒 Заброньовано гостем' : '✨ Доступно для бронювання'}
                      </div>
                      <div
                        className={`w-full min-h-[44px] rounded-xl text-sm font-extrabold flex items-center justify-center ${solidBtnClass}`}
                      >
                        {item.hasMonoJar || item.monoJarUrl
                          ? '🫙 Поповнити Банку'
                          : item.instagramHandle
                          ? `📸 Замовити в @${item.instagramHandle}`
                          : '🎁 Забронювати'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 5. FLOWERS / INSTAGRAM BANNER */}
                {flowerAndGiftNotes && (
                  <div className="rounded-2xl bg-[#171D30]/95 border border-white/15 p-4 space-y-2">
                    <div className="text-sm font-extrabold text-amber-300">
                      🌸 Улюблені квіти • @{ownerInstagramHandle} (без адреси)
                    </div>
                    <p className="text-sm text-slate-200 line-clamp-2">{flowerAndGiftNotes}</p>
                  </div>
                )}
              </div>
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
