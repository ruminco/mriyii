'use client';

import React, { useState } from 'react';
import { Sparkles, X, ExternalLink, Loader2, Gift, Globe, ListChecks } from 'lucide-react';
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

const FALLBACK_AI_IDEAS: Record<ThemePreset, AiGiftRecommendationDTO[]> = {
  rose_luxury: [
    {
      title: 'Шовкова наволочка та маска для сну Mulberry Silk 22 Momme',
      emoji: '✨',
      description: 'Натуральний шовк преміум-класу у відтінку Champagne Rose Gold.',
      estimatedPrice: 2800,
      currency: 'UAH',
      searchQuery: 'шовкова наволочка mulberry silk 22 momme',
      whyItFits: 'Ідеально доповнює beauty-ритуали та дбайливо доглядає за волоссям і шкірою.',
      mode: 'web_search',
      sourceStore: 'Rozetka.ua',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=%D1%88%D0%BE%D0%B2%D0%BA%D0%BE%D0%B2%D0%B0+%D0%BD%D0%B0%D0%B2%D0%BE%D0%BB%D0%BE%D1%87%D0%BA%D0%B0&utm_source=mriyii',
    },
    {
      title: 'Аромадифузор та свічка Rituals Private Collection Savage Garden',
      emoji: '🕯️',
      description: 'Розкішний інтер’єрний сет для створення атмосфери SPA вдома.',
      estimatedPrice: 2450,
      currency: 'UAH',
      searchQuery: 'Rituals Private Collection дифузор',
      whyItFits: 'Вписується у захоплення естетикою релаксу, подорожей та нішевих ароматів.',
      mode: 'web_search',
      sourceStore: 'Brocard / Aromateque',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=Rituals+Private+Collection&utm_source=mriyii',
    },
    {
      title: 'Бездротовий MagSafe павербанк Anker Nano 5000 mAh Rose Pink',
      emoji: '🔋',
      description: 'Ультратонкий алюмінієвий корпус для iPhone, ідеальний для сторіз у подорожах.',
      estimatedPrice: 1999,
      currency: 'UAH',
      searchQuery: 'Anker MagSafe Power Bank Pink',
      whyItFits: 'Поєднує любов до екосистеми Apple та активний лайфстайл.',
      mode: 'web_search',
      sourceStore: 'Rozetka.ua',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=Anker+MagSafe+Power+Bank&utm_source=mriyii',
    },
  ],
  cyber_titanium: [
    {
      title: 'Набір для альтернативного заварювання кави Hario V60 Craft Coffee Maker',
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
      title: 'Док-станція 3-в-1 Ugreen MagFlow Qi2 15W Magnetic Foldable Charger',
      emoji: '⚡',
      description: 'Металевий складаний MagSafe-стенд для iPhone, Apple Watch та AirPods.',
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
      title: 'Дизайнерський килимок для столу Wool Felt Desk Mat Dark Anthracite',
      emoji: '🖥️',
      description: 'Вовняний фетр під кастомну механічну клавіатуру (90x40 см).',
      estimatedPrice: 1290,
      currency: 'UAH',
      searchQuery: 'фетровий килимок на стіл 90x40',
      whyItFits: 'Покращує акустику тайпінгу механічної клавіатури та естетику робочого місця.',
      mode: 'web_search',
      sourceStore: 'Prom.ua / Keychron UA',
      affiliateSearchUrl:
        'https://rozetka.com.ua/ua/search/?text=desk+mat+felt&utm_source=mriyii',
    },
  ],
};

function buildDemoWishlistRecommendations(
  wishlistItems: UnifiedGiftCardItem[],
  budget: number
): AiGiftRecommendationDTO[] {
  const freeItems = wishlistItems.filter((item) => !item.isBooked && !item.isAiSurprise);
  const sorted = [...freeItems].sort((a, b) => {
    const aPrice = a.price ?? budget;
    const bPrice = b.price ?? budget;
    const aFits = aPrice <= budget ? 0 : 1;
    const bFits = bPrice <= budget ? 0 : 1;
    if (aFits !== bFits) return aFits - bFits;
    if (a.monoJarUrl && !b.monoJarUrl) return -1;
    if (!a.monoJarUrl && b.monoJarUrl) return 1;
    return aPrice - bPrice;
  });

  return sorted.slice(0, 3).map((item) => {
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
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AiAssistantMode>('from_wishlist');
  const [budget, setBudget] = useState<number>(3000);
  const [guestQuery, setGuestQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ideas, setIdeas] = useState<AiGiftRecommendationDTO[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<AiGiftRecommendationDTO | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tokens = THEME_TOKENS[themePreset];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedIdea(null);

    try {
      const generated = await askGiftAssistant(wishlistSlug, budget, guestQuery, mode);
      if (generated.length === 0 && mode === 'from_wishlist' && wishlistItems.length > 0) {
        setIdeas(buildDemoWishlistRecommendations(wishlistItems, budget));
      } else {
        setIdeas(generated);
      }
    } catch {
      if (mode === 'from_wishlist') {
        const demoFromList = buildDemoWishlistRecommendations(wishlistItems, budget);
        setIdeas(demoFromList);
      } else {
        const fallback = FALLBACK_AI_IDEAS[themePreset].map((item) => ({
          ...item,
          estimatedPrice: Math.min(item.estimatedPrice, budget),
        }));
        setIdeas(fallback);
      }
    } finally {
      setIsLoading(false);
    }
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
      setIsOpen(false);
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
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Вбудований банер над сіткою подарунків */}
      <div className="smoked-glass rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/20">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tokens.emojiFrameGradient} p-[2px] shrink-0`}
          >
            <div className="w-full h-full bg-[#161324] rounded-[14px] flex items-center justify-center text-2xl">
              ✨
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Gemini 2.5 Flash • 2 режими підбору
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
              Допомогти обрати з вішліста або знайти в інтернеті за інтересами?
            </h3>
            <p className="text-xs font-semibold text-slate-200 mt-0.5">
              ШІ аналізує вільні лоти або шукає реальні товари в Україні з урахуванням прихованої анкети іменинника.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`w-full sm:w-auto py-3 px-5 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} text-white spring-transition active:scale-95 flex items-center justify-center gap-2 shrink-0`}
        >
          <Sparkles className="w-4 h-4" />
          Відкрити ШІ-помічник
        </button>
      </div>

      {/* Плаваюча кнопка (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-40 py-3 px-4 rounded-full text-sm font-extrabold ${tokens.primaryCtaGradient} text-white shadow-2xl border border-white/25 spring-transition hover:scale-105 active:scale-95 flex items-center gap-2`}
      >
        <Sparkles className="w-4 h-4" />
        <span>✨ Не знаєш, що подарувати?</span>
      </button>

      {/* Модальне вікно ШІ-помічника */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="smoked-glass rounded-[28px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 border border-white/25 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/25 text-purple-200 border border-purple-400/40">
                  <Sparkles className="w-3.5 h-3.5" /> Gemini 2.5 Flash • Google Search Grounding
                </span>
                <h2 className="text-xl font-extrabold text-white mt-2">
                  ✨ ШІ-Помічник для «{wishlistTitle}»
                </h2>
                {hasOwnerInterests && (
                  <p className="text-xs font-bold text-emerald-300 mt-1">
                    🧠 ШІ врахував заповнені інтереси, розміри та табу іменинника (приховані від сторонніх очей)
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Перемикач 2 режимів */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/15">
              <button
                type="button"
                onClick={() => {
                  setMode('from_wishlist');
                  setIdeas([]);
                  setSelectedIdea(null);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 spring-transition ${
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
                  setIdeas([]);
                  setSelectedIdea(null);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 spring-transition ${
                  mode === 'web_search'
                    ? `${tokens.primaryCtaGradient} text-white shadow-lg`
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>🌐 Знайти в інтернеті за інтересами</span>
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-2">
                  1. Оберіть ваш бюджет (₴):
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setBudget(preset.value)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold spring-transition ${
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

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-1.5">
                  2. Побажання від себе (необов’язково):
                </label>
                <input
                  type="text"
                  value={guestQuery}
                  onChange={(e) => setGuestQuery(e.target.value)}
                  placeholder={
                    mode === 'from_wishlist'
                      ? 'Наприклад: щось практичне або донат у Монобанку...'
                      : 'Наприклад: щось із кавою, гаджетами Apple або квітами...'
                  }
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm font-semibold text-white placeholder:text-slate-300/70 focus:outline-none focus:border-white/50"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full min-h-[48px] py-3 px-4 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} text-white spring-transition active:scale-95 flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {mode === 'from_wishlist'
                        ? 'Підбираємо найкращі лоти зі списку...'
                        : 'Шукаємо реальні товари через Google Search...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {mode === 'from_wishlist'
                        ? '📋 Підібрати зі списку під мій бюджет'
                        : '🌐 Знайти 3 реальні ідеї в інтернеті'}
                    </span>
                  </>
                )}
              </button>
            </form>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/25 border border-rose-400/40 text-xs font-bold text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* Картки згенерованих ідей */}
            {ideas.length > 0 && !selectedIdea && (
              <div className="space-y-3 pt-2 border-t border-white/15">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  {mode === 'from_wishlist'
                    ? 'Рекомендовані позиції з вішліста:'
                    : 'Знайдені в інтернеті ідеї без спойлерів для іменинника:'}
                </h3>
                <div className="grid gap-3">
                  {ideas.map((idea, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-white/5 border border-white/15 p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl shrink-0">
                            {idea.emoji || '🎁'}
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-extrabold text-white">
                              {idea.title}
                            </h4>
                            {idea.sourceStore && (
                              <span className="inline-block text-xs font-bold text-amber-300 mt-0.5">
                                🛍️ {idea.sourceStore}
                              </span>
                            )}
                            <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                              {idea.description}
                            </p>
                            <p className="text-xs font-bold text-emerald-300 mt-1.5">
                              💡 Чому підійде: {idea.whyItFits}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg shrink-0 tabular-nums ${tokens.pricePillClass}`}
                        >
                          {idea.isMonoJarContribution ? 'Внесок ' : '~'}
                          {idea.estimatedPrice.toLocaleString('uk-UA')} ₴
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
                        {idea.mode === 'from_wishlist' && idea.wishlistItemId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              onSelectWishlistItem?.(idea.wishlistItemId!);
                            }}
                            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold ${tokens.primaryCtaGradient} text-white inline-flex items-center gap-1.5`}
                          >
                            <Gift className="w-4 h-4" />
                            <span>
                              {idea.isMonoJarContribution
                                ? '🫙 Докинути в Монобанку'
                                : '🎁 Перейти до лоту в списку'}
                            </span>
                          </button>
                        ) : (
                          <>
                            <a
                              href={idea.affiliateSearchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 inline-flex items-center gap-1.5"
                            >
                              <span>Знайти в магазині</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setSelectedIdea(idea)}
                              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold ${tokens.primaryCtaGradient} text-white inline-flex items-center gap-1.5`}
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>✨ Зафіксувати як таємний сюрприз</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Підтвердження фіксації сюрпризу (`isAiSurprise: true`) */}
            {selectedIdea && (
              <form
                onSubmit={handleCommitSurprise}
                className="rounded-2xl bg-white/10 border border-white/25 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-white">
                    🤫 Фіксація таємного сюрпризу: {selectedIdea.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSelectedIdea(null)}
                    className="text-xs font-bold text-slate-200 underline"
                  >
                    Назад до ідей
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  Інші гості побачать, що цей сюрприз уже зайнятий вами, але іменинник у своєму кабінеті НЕ побачить цей лот до свята!
                </p>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ваше ім'я або нікнейм"
                    className="rounded-xl bg-black/40 border border-white/20 px-3.5 py-2 text-xs font-semibold text-white placeholder:text-slate-300"
                  />
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="Ваш email (для керування бронню)"
                    className="rounded-xl bg-black/40 border border-white/20 px-3.5 py-2 text-xs font-semibold text-white placeholder:text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 spring-transition"
                >
                  💎 Підтвердити та додати таємний сюрприз
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
