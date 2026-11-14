'use client';

import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  X,
  ExternalLink,
  Loader2,
  Gift,
  Globe,
  ListChecks,
} from 'lucide-react';
import type { ThemePreset } from '@/models/User';
import type { AiAssistantMode } from '@/lib/gemini';
import { THEME_TOKENS } from '@/lib/theme-data';
import type { UnifiedGiftCardItem } from '@/components/SmokedGiftCard';
import {
  askGiftAssistant,
  bookAiSurpriseGift,
  type AiGiftRecommendationDTO,
} from '@/actions/ai';

interface AiGiftAssistantWidgetProps {
  wishlistSlug: string;
  wishlistTitle: string;
  themePreset: ThemePreset;
  existingBrowserTokens: string[];
  wishlistItems?: UnifiedGiftCardItem[];
  hasOwnerInterests?: boolean;
  onSelectWishlistItem?: (itemId: string) => void;
  onSurpriseBooked: (item: {
    id: string;
    title: string;
    emoji: string;
    description: string;
    price: number;
    affiliateUrl: string;
    bookedByName: string;
    bookingToken: string;
  }) => void;
}

const BUDGET_PRESETS = [
  { label: 'до 1 000 ₴', value: 1000 },
  { label: 'до 3 000 ₴', value: 3000 },
  { label: 'до 7 000 ₴', value: 7000 },
  { label: 'VIP 15 000 ₴ 💎', value: 15000 },
];

const INTEREST_CHIPS = [
  { id: 'all', label: '✨ Усі інтереси', query: '' },
  { id: 'coffee', label: '☕ Кава', query: 'кава' },
  { id: 'beauty', label: "💄 Б'юті", query: "б'юті парфуми догляд" },
  { id: 'gadgets', label: '🎧 Гаджети', query: 'гаджети Apple техніка' },
  { id: 'flowers', label: '🌸 Квіти', query: 'квіти букет півонії' },
  { id: 'travel', label: '✈️ Подорожі', query: 'подорожі релакс' },
];

const FALLBACK_AI_IDEAS: Record<ThemePreset, AiGiftRecommendationDTO[]> = {
  rose_luxury: [
    {
      title: 'Шовкова наволочка та маска Mulberry Silk 22 Momme',
      emoji: '✨',
      description: 'Натуральний шовк преміум-класу у відтінку Champagne Rose Gold.',
      estimatedPrice: 2800,
      currency: 'UAH',
      searchQuery: 'шовкова наволочка mulberry silk 22 momme',
      whyItFits: 'Ідеально доповнює beauty-ритуали та дбайливо доглядає за волоссям.',
      mode: 'web_search',
      sourceStore: 'Rozetka.ua',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=%D1%88%D0%BE%D0%B2%D0%BA%D0%BE%D0%B2%D0%B0+%D0%BD%D0%B0%D0%B2%D0%BE%D0%BB%D0%BE%D1%87%D0%BA%D0%B0&utm_source=mriyii',
    },
    {
      title: 'Аромадифузор Rituals Private Collection Savage Garden',
      emoji: '🕯️',
      description: 'Розкішний інтер’єрний сет для атмосфери SPA та подорожей вдома.',
      estimatedPrice: 2450,
      currency: 'UAH',
      searchQuery: 'Rituals Private Collection дифузор',
      whyItFits: 'Вписується у захоплення естетикою затишку та нішевих ароматів.',
      mode: 'web_search',
      sourceStore: 'Aromateque.ua',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=Rituals+Private+Collection&utm_source=mriyii',
    },
    {
      title: 'MagSafe павербанк Anker Nano 5000 mAh Rose Pink',
      emoji: '🔋',
      description: 'Ультратонкий алюмінієвий корпус для iPhone у подорожах.',
      estimatedPrice: 1999,
      currency: 'UAH',
      searchQuery: 'Anker MagSafe Power Bank Pink',
      whyItFits: 'Поєднує любов до гаджетів Apple та активний лайфстайл.',
      mode: 'web_search',
      sourceStore: 'Rozetka.ua',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=Anker+MagSafe+Power+Bank&utm_source=mriyii',
    },
  ],
  cyber_titanium: [
    {
      title: 'Набір для specialty-кави Hario V60 Craft Coffee Maker',
      emoji: '☕',
      description: 'Скляний пуровер, сервер, мірна ложка та японські фільтри.',
      estimatedPrice: 1450,
      currency: 'UAH',
      searchQuery: 'Hario V60 Craft Coffee Maker',
      whyItFits: 'Точне влучання у захоплення specialty-кавою та ранковими ритуалами.',
      mode: 'web_search',
      sourceStore: 'Rozetka.ua',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=Hario+V60+Craft+Coffee+Maker&utm_source=mriyii',
    },
    {
      title: 'Док-станція 3-в-1 Ugreen MagFlow Qi2 15W Magnetic',
      emoji: '⚡',
      description: 'Металевий складаний MagSafe-стенд для iPhone, Watch та AirPods.',
      estimatedPrice: 2699,
      currency: 'UAH',
      searchQuery: 'Ugreen Qi2 MagSafe 3 in 1',
      whyItFits: 'Мінімалістичний сетап на робочому столі у стилі Apple Pro Titanium.',
      mode: 'web_search',
      sourceStore: 'Rozetka.ua',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=Ugreen+Qi2+MagSafe&utm_source=mriyii',
    },
    {
      title: 'Дизайнерський килимок Wool Felt Desk Mat Anthracite',
      emoji: '🖥️',
      description: 'Вовняний фетр під кастомну механічну клавіатуру (90x40 см).',
      estimatedPrice: 1290,
      currency: 'UAH',
      searchQuery: 'фетровий килимок на стіл 90x40',
      whyItFits: 'Покращує акустику тайпінгу та естетику робочого простору.',
      mode: 'web_search',
      sourceStore: 'Comfy.ua',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=desk+mat+felt&utm_source=mriyii',
    },
  ],
};

function buildDemoWishlistRecommendations(
  wishlistItems: UnifiedGiftCardItem[],
  budget: number,
  interestFilter: string
): AiGiftRecommendationDTO[] {
  const freeItems = wishlistItems.filter((item) => !item.isBooked && !item.isAiSurprise);
  const terms = interestFilter
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = [...freeItems].sort((a, b) => {
    const aText = `${a.title} ${a.description || ''}`.toLowerCase();
    const bText = `${b.title} ${b.description || ''}`.toLowerCase();
    const aMatch = terms.some((t) => aText.includes(t)) ? 0 : 1;
    const bMatch = terms.some((t) => bText.includes(t)) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;

    const aPrice = a.price ?? budget;
    const bPrice = b.price ?? budget;
    const aFits = aPrice <= budget ? 0 : 1;
    const bFits = bPrice <= budget ? 0 : 1;
    if (aFits !== bFits) return aFits - bFits;

    return aPrice - bPrice;
  });

  return scored.slice(0, 3).map((item) => {
    const price = item.price ?? budget;
    const isJarTopUp = Boolean((item.monoJarUrl || item.hasMonoJar) && price > budget);
    return {
      title: item.title,
      emoji: item.emoji || '🎁',
      description:
        item.description ||
        (isJarTopUp
          ? `Товар коштує ${price.toLocaleString('uk-UA')} ₴ — ви можете закинути комфортний внесок ${budget.toLocaleString('uk-UA')} ₴ у Монобанку!`
          : 'Позиція вже є у вішлісті іменинника та вільна для бронювання.'),
      estimatedPrice: isJarTopUp ? budget : price,
      currency: 'UAH',
      searchQuery: item.title,
      whyItFits: isJarTopUp
        ? 'Спільний збір на Монобанку дозволяє підтримати мрію в межах вашого бюджету.'
        : '100% збіг із бажанням іменинника зі списку.',
      mode: 'from_wishlist',
      wishlistItemId: item.id,
      isMonoJarContribution: isJarTopUp,
      sourceStore: isJarTopUp ? 'Монобанка' : 'Зі списку',
      affiliateSearchUrl: item.affiliateUrl || item.originalUrl || '#wishlist-grid',
    };
  });
}

export function AiGiftAssistantWidget({
  wishlistSlug,
  wishlistTitle,
  themePreset,
  existingBrowserTokens,
  wishlistItems = [],
  hasOwnerInterests = true,
  onSelectWishlistItem,
  onSurpriseBooked,
}: AiGiftAssistantWidgetProps) {
  const [mode, setMode] = useState<AiAssistantMode>('from_wishlist');
  const [budget, setBudget] = useState<number>(3000);
  const [activeInterest, setActiveInterest] = useState<string>('all');
  const [guestQuery, setGuestQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customIdeas, setCustomIdeas] = useState<AiGiftRecommendationDTO[] | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<AiGiftRecommendationDTO | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tokens = THEME_TOKENS[themePreset];

  const activeInterestQuery =
    INTEREST_CHIPS.find((c) => c.id === activeInterest)?.query || '';

  const displayedIdeas = useMemo<AiGiftRecommendationDTO[]>(() => {
    if (customIdeas && customIdeas.length > 0) {
      return customIdeas.slice(0, 3);
    }
    if (mode === 'from_wishlist') {
      const fromList = buildDemoWishlistRecommendations(
        wishlistItems,
        budget,
        `${activeInterestQuery} ${guestQuery}`
      );
      if (fromList.length > 0) return fromList;
    }
    return FALLBACK_AI_IDEAS[themePreset].map((item) => ({
      ...item,
      estimatedPrice: Math.min(item.estimatedPrice, budget),
    }));
  }, [customIdeas, mode, wishlistItems, budget, activeInterestQuery, guestQuery, themePreset]);

  const runAiFetch = async (
    nextMode: AiAssistantMode,
    nextBudget: number,
    nextQuery: string
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedIdea(null);
    try {
      const generated = await askGiftAssistant(
        wishlistSlug,
        nextBudget,
        nextQuery,
        nextMode
      );
      if (generated.length > 0) {
        setCustomIdeas(generated.slice(0, 3));
      } else {
        setCustomIdeas(null);
      }
    } catch {
      setCustomIdeas(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedQuery = [activeInterestQuery, guestQuery].filter(Boolean).join(' ');
    await runAiFetch(mode, budget, combinedQuery);
  };

  const handleCommitSurprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdea) return;
    if (guestName.trim().length < 2 || !guestEmail.includes('@')) {
      setErrorMessage("Вкажіть ваше ім'я та коректний email.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await bookAiSurpriseGift({
        wishlistSlug,
        title: selectedIdea.title,
        emoji: selectedIdea.emoji,
        description: selectedIdea.description,
        estimatedPrice: selectedIdea.estimatedPrice,
        searchQuery: selectedIdea.searchQuery,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        existingBrowserTokens,
      });

      onSurpriseBooked({
        id: result.itemId,
        title: selectedIdea.title,
        emoji: selectedIdea.emoji,
        description: selectedIdea.description,
        price: selectedIdea.estimatedPrice,
        affiliateUrl: result.affiliateUrl,
        bookedByName: guestName.trim(),
        bookingToken: result.bookingToken,
      });

      setSelectedIdea(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes('не більше 2')) {
        setErrorMessage(err.message);
      } else {
        const demoToken = `demo_token_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        onSurpriseBooked({
          id: `ai-surprise-${Date.now()}`,
          title: selectedIdea.title,
          emoji: selectedIdea.emoji || '✨',
          description: selectedIdea.description,
          price: selectedIdea.estimatedPrice,
          affiliateUrl: selectedIdea.affiliateSearchUrl,
          bookedByName: guestName.trim(),
          bookingToken: demoToken,
        });
        setSelectedIdea(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      id="guest-ai-section"
      className="smoked-glass rounded-[28px] p-5 sm:p-7 border border-white/25 space-y-5"
    >
      {/* Заголовок окремої секції ШІ-помічника */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px] shrink-0`}
          >
            <div className="w-full h-full bg-[#161324] rounded-[14px] flex items-center justify-center text-3xl">
              ✨
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-purple-200">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Gemini 2.5 Flash • Google Search Grounding
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              ШІ-Помічник подарунків для «{wishlistTitle}»
            </h2>
            {hasOwnerInterests && (
              <p className="text-sm font-semibold text-emerald-300 mt-1">
                🧠 ШІ враховує інтереси, розміри та табу іменинника (приховані від сторонніх очей)
              </p>
            )}
          </div>
        </div>

        {/* Перемикач 2 режимів */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 rounded-2xl bg-black/45 border border-white/15 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('from_wishlist');
              setCustomIdeas(null);
              setSelectedIdea(null);
            }}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 spring-transition ${
              mode === 'from_wishlist'
                ? `${tokens.primaryCtaGradient} text-white shadow-lg`
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>📋 Обрати з вішліста</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('web_search');
              setCustomIdeas(null);
              setSelectedIdea(null);
            }}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 spring-transition ${
              mode === 'web_search'
                ? `${tokens.primaryCtaGradient} text-white shadow-lg`
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>🌐 Знайти в інтернеті</span>
          </button>
        </div>
      </div>

      {/* Клікабельні чіпси інтересів + Бюджет */}
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
            1. Оберіть інтерес іменинника (миттєво оновлює 3 картки):
          </div>
          <div className="flex flex-wrap gap-2">
            {INTEREST_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setActiveInterest(chip.id);
                  setCustomIdeas(null);
                }}
                className={`min-h-[48px] px-4 py-2 rounded-2xl text-sm font-extrabold border spring-transition ${
                  activeInterest === chip.id
                    ? `${tokens.primaryCtaGradient} text-white border-white/40 shadow-lg`
                    : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-5 space-y-2">
            <label className="block text-sm font-extrabold uppercase tracking-wider text-slate-200">
              2. Ваш бюджет (₴):
            </label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setBudget(preset.value);
                    setCustomIdeas(null);
                  }}
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold spring-transition ${
                    budget === preset.value
                      ? `${tokens.primaryCtaGradient} text-white`
                      : 'bg-white/10 text-slate-200 border border-white/15 hover:bg-white/20'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-2">
            <label className="block text-sm font-extrabold uppercase tracking-wider text-slate-200">
              3. Уточнення (необов’язково):
            </label>
            <input
              type="text"
              value={guestQuery}
              onChange={(e) => setGuestQuery(e.target.value)}
              placeholder="Наприклад: щось для подорожей чи кави..."
              className="w-full min-h-[48px] rounded-xl bg-white/10 border border-white/20 px-4 text-sm font-semibold text-white placeholder:text-slate-300/70 focus:outline-none focus:border-white/50"
            />
          </div>

          <div className="lg:col-span-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full min-h-[48px] py-3 px-4 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} text-white spring-transition active:scale-95 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Підбираємо...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Оновити 3 ідеї з ШІ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/25 border border-rose-400/40 text-sm font-bold text-rose-200">
          {errorMessage}
        </div>
      )}

      {/* Сітка з 3 інтерактивних карток (grid-cols-1 md:grid-cols-3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/15">
        {displayedIdeas.map((idea, idx) => (
          <div
            key={`${idea.title}-${idx}`}
            className="rounded-2xl bg-white/10 border border-white/20 p-4 flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-3xl shrink-0">
                  {idea.emoji || '🎁'}
                </div>
                <span
                  className={`text-sm font-black px-3 py-1 rounded-xl shrink-0 tabular-nums ${tokens.pricePillClass}`}
                >
                  {idea.isMonoJarContribution ? 'Внесок ' : ''}
                  {idea.estimatedPrice.toLocaleString('uk-UA')} ₴
                </span>
              </div>

              <div className="space-y-1.5">
                {idea.sourceStore && (
                  <span className="inline-block text-sm font-extrabold text-amber-300">
                    🛍️ {idea.sourceStore}
                  </span>
                )}
                <h3 className="text-base font-extrabold text-white leading-snug">
                  {idea.title}
                </h3>
                <p className="text-sm font-medium text-slate-200 leading-relaxed">
                  {idea.description}
                </p>
                <p className="text-sm font-bold text-emerald-300">
                  💡 {idea.whyItFits}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/15">
              {idea.mode === 'from_wishlist' && idea.wishlistItemId ? (
                <button
                  type="button"
                  onClick={() => onSelectWishlistItem?.(idea.wishlistItemId!)}
                  className={`w-full min-h-[48px] py-2.5 px-4 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} text-white inline-flex items-center justify-center gap-2`}
                >
                  <Gift className="w-4 h-4" />
                  <span>
                    {idea.isMonoJarContribution
                      ? '🫙 Скинутися на Банку'
                      : '🎁 Забронювати цей подарунок'}
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedIdea(idea)}
                    className={`w-full min-h-[48px] py-2.5 px-4 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} text-white inline-flex items-center justify-center gap-2`}
                  >
                    <Gift className="w-4 h-4" />
                    <span>🤫 Забронювати як сюрприз</span>
                  </button>
                  <a
                    href={idea.affiliateSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[48px] py-2.5 px-4 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 inline-flex items-center justify-center gap-2"
                  >
                    <span>🛒 Відкрити в магазині</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Підтвердження фіксації таємного сюрпризу */}
      {selectedIdea && (
        <form
          onSubmit={handleCommitSurprise}
          className="rounded-2xl bg-black/55 border border-white/25 p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-extrabold text-white">
              🤫 Фіксація таємного сюрпризу: {selectedIdea.title}
            </h4>
            <button
              type="button"
              onClick={() => setSelectedIdea(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              aria-label="Закрити"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Інші гості побачать, що цей сюрприз уже зайнятий вами, але іменинник у своєму кабінеті НЕ побачить цей лот до свята!
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Ваше ім'я або нікнейм"
              className="min-h-[48px] rounded-xl bg-black/40 border border-white/20 px-4 text-sm font-semibold text-white placeholder:text-slate-300"
            />
            <input
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Ваш email (для керування бронню)"
              className="min-h-[48px] rounded-xl bg-black/40 border border-white/20 px-4 text-sm font-semibold text-white placeholder:text-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 spring-transition"
          >
            💎 Підтвердити та додати таємний сюрприз
          </button>
        </form>
      )}
    </section>
  );
}
