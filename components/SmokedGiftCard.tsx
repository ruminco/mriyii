'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  Trash2,
  RefreshCw,
  ShoppingCart,
  RotateCcw,
  Camera,
} from 'lucide-react';
import type { ThemePreset } from '@/models/User';
import { THEME_TOKENS } from '@/lib/theme-data';
import { trackClientInteraction } from '@/actions/analytics';
import { LikeBurst } from '@/components/LikeBurst';

export interface UnifiedGiftCardItem {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  originalUrl?: string;
  affiliateUrl?: string;
  instagramHandle?: string;
  isBooked: boolean;
  bookedByName?: string;
  hasMonoJar?: boolean;
  monoJarUrl?: string;
  jarTargetAmount?: number;
  jarCurrentAmount?: number;
  isAiSurprise?: boolean;
}

interface SmokedGiftCardProps {
  item: UnifiedGiftCardItem;
  themePreset: ThemePreset;
  viewMode: 'owner' | 'guest';
  locale?: 'ua' | 'en';
  ownerInstagramHandle?: string;
  forceFallbackPoster?: boolean;
  isBookedByCurrentVisitor?: boolean;
  onBookClick?: (item: UnifiedGiftCardItem) => void;
  onCancelBookingClick?: (item: UnifiedGiftCardItem) => void;
  onAttachJarClick?: (item: UnifiedGiftCardItem) => void;
  onSyncJarClick?: (item: UnifiedGiftCardItem) => Promise<void> | void;
  onDeleteClick?: (item: UnifiedGiftCardItem) => void;
  onDonateSimulateClick?: (item: UnifiedGiftCardItem) => void;
  onCloseJar100SimulateClick?: (item: UnifiedGiftCardItem) => void;
  onInstagramOrderToast?: (toastText: string) => void;
}

/**
 * Генерує текст замовлення в Instagram Direct без необхідності знати домашню адресу отримувача (Zero Home Address Storage).
 * У режимі 'en' формує двомовний шаблон (EN + UA), щоб іноземний гість розумів, а український магазин миттєво обробив замовлення.
 */
export function buildInstagramDirectOrderMessage(
  ownerInstagramHandle: string | undefined,
  itemTitle: string,
  locale: 'ua' | 'en' = 'ua'
): string {
  const cleanOwnerIg = (ownerInstagramHandle || 'recipient_handle').replace(/^@+/, '');
  const uaText = `Привіт! 👋 Хочу оплатити подарунок зі списку бажань Mriyii для @${cleanOwnerIg}: ${itemTitle}. Напишіть їй, будь ласка, у Direct після оплати, щоб вона сама вказала, куди і коли їй зручно прийняти доставку!`;
  if (locale === 'en') {
    return `Hi! 👋 I'd like to pay for a gift from @${cleanOwnerIg}'s Mriyii wishlist: ${itemTitle}. Please DM her for delivery details after payment.\n\n[UA для магазину]: ${uaText}`;
  }
  return uaText;
}

function getStoreLabel(url?: string, instagramHandle?: string): string {
  if (instagramHandle) {
    return `📸 @${instagramHandle.replace(/^@+/, '')}`;
  }
  if (!url) return '🛍️ Офіційний стор';
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    if (host.includes('rozetka')) return '🛍️ Rozetka';
    if (host.includes('apple')) return '🍏 Apple';
    if (host.includes('comfy')) return '🛍️ Comfy';
    if (host.includes('makeup')) return '💄 Makeup';
    if (host.includes('instagram')) return '📸 Instagram';
    return `🛍️ ${host.split('.')[0]}`;
  } catch {
    return '🛍️ Магазин';
  }
}

export function SmokedGiftCard({
  item,
  themePreset,
  viewMode,
  locale = 'ua',
  ownerInstagramHandle,
  forceFallbackPoster = false,
  isBookedByCurrentVisitor = false,
  onBookClick,
  onCancelBookingClick,
  onAttachJarClick,
  onSyncJarClick,
  onDeleteClick,
  onDonateSimulateClick,
  onCloseJar100SimulateClick,
  onInstagramOrderToast,
}: SmokedGiftCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [igCopiedLocal, setIgCopiedLocal] = useState(false);
  const [purchasedElsewhere, setPurchasedElsewhere] = useState(false);
  const [isHoldingBook, setIsHoldingBook] = useState(false);
  const [jarBurstKey, setJarBurstKey] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdCompletedRef = useRef(false);
  const hadPointerDownRef = useRef(false);
  const tokens = THEME_TOKENS[themePreset];

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cancelHoldBook = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHoldingBook(false);
  };

  const startHoldBook = () => {
    if (!onBookClick) return;
    hadPointerDownRef.current = true;
    if (prefersReducedMotion()) {
      holdCompletedRef.current = true;
      onBookClick(item);
      return;
    }
    cancelHoldBook();
    holdCompletedRef.current = false;
    setIsHoldingBook(true);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      holdCompletedRef.current = true;
      setIsHoldingBook(false);
      onBookClick(item);
    }, 900);
  };

  const hasJar = Boolean(item.monoJarUrl || item.hasMonoJar);
  const isPrivat24 = Boolean(item.monoJarUrl?.includes('privat24.ua'));
  const targetAmount = item.jarTargetAmount ?? item.price ?? 0;
  const currentAmount = item.jarCurrentAmount ?? 0;
  const progressPct =
    targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;
  const isGoalReached = targetAmount > 0 && currentAmount >= targetAmount;

  const storeUrl = item.affiliateUrl || item.originalUrl;
  const outUrl = storeUrl
    ? `/api/out?itemId=${encodeURIComponent(item.id)}&src=card_button&url=${encodeURIComponent(storeUrl)}`
    : undefined;
  const cleanShopHandle = item.instagramHandle?.replace(/^@+/, '').trim();
  const storeBadgeText = getStoreLabel(storeUrl, cleanShopHandle);
  const showRealPhoto = Boolean(item.imageUrl && !imgError && !forceFallbackPoster);

  const handleSync = async () => {
    if (!onSyncJarClick || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncJarClick(item);
      setJarBurstKey((k) => k + 1);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInstagramOrderClick = async () => {
    if (!cleanShopHandle) return;
    const message = buildInstagramDirectOrderMessage(ownerInstagramHandle, item.title, locale);
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Fallback
    }
    setIgCopiedLocal(true);
    setTimeout(() => setIgCopiedLocal(false), 3500);
    if (onInstagramOrderToast) {
      onInstagramOrderToast(
        locale === 'en'
          ? 'Bilingual order message (EN+UA) copied to clipboard! 💌'
          : 'Текст замовлення скопійовано в буфер обміну! 💌'
      );
    }
    void trackClientInteraction({
      eventType: 'instagram_dm_copied',
      itemId: item.id,
      shopHandle: cleanShopHandle,
      priceUah: item.price,
      isFlowerPreferenceCard: false,
    });
    window.open(
      `https://ig.me/m/${encodeURIComponent(cleanShopHandle)}?ref=mriyii`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const imgObjectPos = item.imageUrl?.includes('5208818')
    ? '85% 90%'
    : item.imageUrl?.includes('4669901')
    ? 'center 25%'
    : item.imageUrl?.includes('5410144')
    ? 'center 15%'
    : 'center center';

  return (
    <div className="solid-white-card rounded-[26px] overflow-hidden border border-slate-200/80 flex flex-col justify-between spring-transition">
      {/* ВЕРХНЯ ФОТО-ШАПКА (h-48) БЕЗ БРУДНОГО ОВЕРЛЕЮ */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {showRealPhoto ? (
          <div className="w-full h-full relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="eager"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              style={{ objectPosition: imgObjectPos }}
              className="w-full h-full object-cover spring-transition hover:scale-105"
            />
          </div>
        ) : (
          /* Smart Luxury Poster Fallback (Рівень 2 захисту обкладинки) */
          <div
            className={`w-full h-full ${tokens.fallbackPosterClass} relative flex flex-col items-center justify-center overflow-hidden`}
          >
            <div className="absolute inset-0 poster-pattern" />
            <div className="relative z-10 w-16 h-16 rounded-[18px] bg-white/20 backdrop-blur-md border border-white/40 shadow-xl flex items-center justify-center text-4xl -translate-y-1.5 select-none">
              <span>{item.emoji || '✨'}</span>
            </div>
            <span className="relative z-10 text-sm font-bold text-white/95 px-3 py-1 rounded-full bg-black/35">
              Офіційний магазин • Перевірено
            </span>
          </div>
        )}

        {/* Верхній лівий кут: Магазин + Пріоритет */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
          {outUrl ? (
            <a
              href={viewMode === 'guest' ? outUrl : storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#141218]/90 hover:bg-[#141218] backdrop-blur-md text-white text-sm font-bold px-3 py-1 rounded-full border border-white/20 inline-flex items-center gap-1.5"
            >
              <span>{storeBadgeText}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-85" />
            </a>
          ) : (
            <span className="bg-[#141218]/90 backdrop-blur-md text-white text-sm font-bold px-3 py-1 rounded-full border border-white/20">
              {storeBadgeText}
            </span>
          )}

          {item.isAiSurprise ? (
            <span className="bg-[#5B50EC] text-white text-sm font-extrabold px-3 py-1 rounded-full shadow">
              ✨ AI Сюрприз
            </span>
          ) : (
            <span
              className={`${tokens.priorityBadgeClass} text-sm font-extrabold px-3 py-1 rounded-full shadow`}
            >
              {tokens.priorityBadgeText}
            </span>
          )}
        </div>

        {/* Верхній правий кут: Живий статус лота */}
        <div className="absolute top-3 right-3 z-10">
          {viewMode === 'owner' ? (
            item.isBooked || hasJar ? (
              <span className="bg-[#5B50EC] text-white font-extrabold text-sm px-3 py-1 rounded-full shadow-md inline-flex items-center gap-1">
                🔒 Заброньовано
              </span>
            ) : (
              <span className="bg-emerald-500 text-[#141218] font-extrabold text-sm px-3 py-1 rounded-full shadow-md">
                🟢 Вільно
              </span>
            )
          ) : item.isBooked || isGoalReached ? (
            <span className="bg-emerald-400 text-[#141218] font-extrabold text-sm px-3 py-1 rounded-full shadow-md">
              {isGoalReached ? '🎉 100% зібрано' : '💎 Заброньовано'}
            </span>
          ) : hasJar ? (
            <span className="bg-[#F4FF7A] text-[#141218] font-extrabold text-sm px-3 py-1 rounded-full shadow-md tabular-nums">
              🫙 Банка {progressPct}%
            </span>
          ) : cleanShopHandle ? (
            <span className="bg-[#141218]/90 text-white font-extrabold text-sm px-3 py-1 rounded-full shadow-md">
              📸 Direct
            </span>
          ) : (
            <span className="bg-emerald-400 text-[#141218] font-extrabold text-sm px-3 py-1 rounded-full shadow-md">
              🎁 Доступно
            </span>
          )}
        </div>

        {/* Нижній край фото: Чиста пігулка ціни в ₴ + Категорійний бейдж */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="text-lg sm:text-xl font-black text-white bg-[#141218]/90 backdrop-blur-md px-3.5 py-1 rounded-full shadow-lg tabular-nums">
            {typeof item.price === 'number' && item.price > 0
              ? `${item.price.toLocaleString('uk-UA')} ₴`
              : 'Сюрприз 🎁'}
          </div>
          <span className="text-sm font-extrabold text-[#141218] bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow">
            {hasJar
              ? '✨ Спільний подарунок'
              : cleanShopHandle
              ? '🌸 Через Direct'
              : '🎁 Індивідуально'}
          </span>
        </div>
      </div>

      {/* НИЖНЯ ЧАСТИНА КАРТКИ НА СУЦІЛЬНОМУ БІЛОМУ ТЛІ ІЗ СОКОВИТИМИ КОЛЬОРОВИМИ АКЦЕНТАМИ */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-white text-[#141218]">
        <div>
          <h3 className="font-extrabold text-base text-[#141218] leading-snug">
            {item.title}
          </h3>

          {/* Кольорова бульбашка коментаря іменинника (💬) з бічною смужкою border-l-4 */}
          {item.description && (
            <div
              className={`mt-2 text-sm font-bold ${tokens.commentBubbleClass} rounded-r-xl px-3 py-1.5`}
            >
              💬 «{item.description}»
            </div>
          )}
        </div>

        {viewMode === 'owner' ? (
          /* РЕЖИМ ІМЕНИННИКА (СЮРПРИЗ-ЗАХИСТ НА БІЛОМУ ТЛІ) */
          <div className="pt-1">
            {item.isBooked || hasJar ? (
              <div
                className={`bg-gradient-to-r ${tokens.surpriseBoxGradient} border rounded-2xl p-3 flex items-center justify-between gap-2.5`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-xl bg-[#5B50EC] text-white flex items-center justify-center text-base shrink-0">
                    🔒
                  </span>
                  <div className="text-sm">
                    <div className="font-extrabold text-indigo-950">
                      Сюрприз-захист активний! ✨
                    </div>
                    <div className="text-sm font-semibold text-indigo-800">
                      Друзі вже збирають Банку або забронювали цей лот. Деталі приховано до свята!
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {cleanShopHandle
                    ? `Доступно в @${cleanShopHandle} (без домашньої адреси)`
                    : 'Вільно для бронювання гостями'}
                </span>
                <div className="flex items-center gap-1.5">
                  {storeUrl && (
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Магазин
                    </a>
                  )}
                  {onDeleteClick && (
                    <button
                      type="button"
                      onClick={() => onDeleteClick(item)}
                      className="py-1.5 px-2.5 rounded-xl text-sm font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center gap-1"
                      title="Видалити бажання"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* РЕЖИМ ГОСТЯ (КОЛЬОРОВИЙ БОКС МОНОБАНКИ + INSTAGRAM DIRECT + БРОНЮВАННЯ) */
          <div className="space-y-2.5 pt-1">
            {/* Смарагдово-бірюзовий акцентний бокс Монобанки збору */}
            {hasJar && targetAmount > 0 && (
              <div className="bg-gradient-to-br from-emerald-50/95 via-teal-50/70 to-indigo-50/60 border border-emerald-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <span>
                      {isPrivat24
                        ? locale === 'en'
                          ? '💚 Privat24 Envelope'
                          : '💚 Конверт Приват24'
                        : locale === 'en'
                        ? '🐈‍⬛ Monobank Jar'
                        : '🐈‍⬛ Монобанка збору'}
                    </span>
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded-md ${tokens.donorsBadgeClass}`}
                    >
                      спільний подарунок
                    </span>
                  </span>
                  <span className="font-black text-emerald-700 tabular-nums">
                    {currentAmount.toLocaleString('uk-UA')} /{' '}
                    {targetAmount.toLocaleString('uk-UA')} ₴
                  </span>
                </div>

                <div className="w-full h-2.5 bg-emerald-950/10 rounded-full overflow-hidden p-[1px]">
                  <div
                    className={`h-full ${tokens.shimmerBarClass} rounded-full spring-transition`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {!item.isBooked && !isGoalReached && (
                  <div className="relative flex items-center gap-2 pt-0.5">
                    <LikeBurst burstKey={jarBurstKey} themePreset={themePreset} />
                    {onDonateSimulateClick ? (
                      <button
                        type="button"
                        onClick={() => {
                          setJarBurstKey((k) => k + 1);
                          onDonateSimulateClick(item);
                        }}
                        className={`flex-1 min-h-[48px] ${tokens.primaryCtaGradient} hover:brightness-95 font-extrabold text-sm py-2.5 px-3 rounded-xl spring-transition active:scale-95`}
                      >
                        {tokens.primaryJarBtnText} (+2 000 ₴)
                      </button>
                    ) : (
                      <a
                        href={item.monoJarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setJarBurstKey((k) => k + 1);
                          void trackClientInteraction({
                            eventType: 'jar_clicked',
                            itemId: item.id,
                            jarGoalUah: targetAmount,
                            jarCurrentUah: currentAmount,
                          });
                        }}
                        className={`flex-1 min-h-[48px] ${tokens.primaryCtaGradient} hover:brightness-95 font-extrabold text-sm py-2.5 px-3 rounded-xl spring-transition active:scale-95 inline-flex items-center justify-center gap-1.5`}
                      >
                        <span>{tokens.primaryJarBtnText}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {onSyncJarClick && (
                      <button
                        type="button"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="min-h-[48px] py-2.5 px-3 rounded-xl text-sm font-bold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 spring-transition"
                        title="Оновити баланс Банки (кеш 60с)"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                        />
                      </button>
                    )}

                    {onCloseJar100SimulateClick ? (
                      <button
                        type="button"
                        onClick={() => {
                          setJarBurstKey((k) => k + 1);
                          onCloseJar100SimulateClick(item);
                        }}
                        className="min-h-[48px] bg-[#141218] hover:bg-slate-800 text-[#F4FF7A] font-extrabold text-sm py-2.5 px-3 rounded-xl spring-transition active:scale-95"
                      >
                        👑 Закрити 100%
                      </button>
                    ) : (
                      onBookClick && (
                        <button
                          type="button"
                          onClick={() => onBookClick(item)}
                          className="min-h-[48px] bg-[#141218] hover:bg-slate-800 text-[#F4FF7A] font-extrabold text-sm py-2.5 px-3 rounded-xl spring-transition active:scale-95"
                        >
                          👑 Закрити 100%
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Кнопка замовлення в Instagram Direct без домашньої адреси (IG-FLOW-01) */}
            {cleanShopHandle && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleInstagramOrderClick}
                  className="w-full min-h-[48px] py-2.5 px-3.5 rounded-xl text-sm font-extrabold bg-[#141218] hover:bg-slate-800 text-white shadow-md spring-transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Замовити в Instagram @{cleanShopHandle} 📸</span>
                </button>
                {igCopiedLocal && (
                  <div className="text-sm font-bold text-emerald-800 text-center bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 px-2">
                    Текст замовлення скопійовано в буфер обміну! 💌
                  </div>
                )}
              </div>
            )}

            {/* Якщо лот вже заброньовано або Банку зібрано на 100% */}
            {item.isBooked || isGoalReached ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-extrabold">
                  <span>💎</span>
                  <span>
                    {isGoalReached
                      ? '100% Зібрано в Монобанці!'
                      : item.bookedByName
                      ? `Подаровано: ${item.bookedByName}`
                      : 'Заброньовано гостем'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {outUrl && (
                    <a
                      href={outUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl text-sm font-extrabold bg-slate-950 hover:bg-slate-800 text-amber-300 shadow spring-transition active:scale-95 inline-flex items-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Купити в магазині
                    </a>
                  )}

                  {isBookedByCurrentVisitor && !purchasedElsewhere && (
                    <button
                      type="button"
                      onClick={() => {
                        setPurchasedElsewhere(true);
                        void trackClientInteraction({
                          eventType: 'gift_purchased_elsewhere',
                          itemId: item.id,
                          priceUah: item.price,
                        });
                        if (onInstagramOrderToast) {
                          onInstagramOrderToast(
                            locale === 'en'
                              ? 'Marked as purchased elsewhere! Thanks for confirming ✅'
                              : 'Позначено як «Куплено деінде»! Дякуємо за чесність ✅'
                          );
                        }
                      }}
                      className="py-2 px-2.5 rounded-xl text-sm font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 spring-transition inline-flex items-center gap-1"
                    >
                      {locale === 'en' ? '✅ Purchased elsewhere' : '✅ Купив деінде'}
                    </button>
                  )}

                  {purchasedElsewhere && (
                    <span className="py-2 px-2.5 rounded-xl text-sm font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {locale === 'en' ? '✅ Purchased' : '✅ Куплено'}
                    </span>
                  )}

                  {isBookedByCurrentVisitor && onCancelBookingClick && (
                    <button
                      type="button"
                      onClick={() => onCancelBookingClick(item)}
                      className="py-2 px-2.5 rounded-xl text-sm font-bold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 spring-transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {locale === 'en' ? 'Cancel' : 'Скасувати'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Якщо лот без Банки — кнопки прямого бронювання (Hold-to-book 900мс) та відкриття Банки */
              !hasJar && (
                <div className="flex items-center gap-2 pt-0.5">
                  {onBookClick && (
                    <button
                      type="button"
                      onPointerDown={startHoldBook}
                      onPointerUp={() => cancelHoldBook()}
                      onPointerLeave={() => cancelHoldBook()}
                      onPointerCancel={() => cancelHoldBook()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onBookClick(item);
                        }
                      }}
                      onClick={() => {
                        if (holdCompletedRef.current) {
                          holdCompletedRef.current = false;
                          return;
                        }
                        if (!hadPointerDownRef.current || prefersReducedMotion()) {
                          onBookClick(item);
                        }
                        hadPointerDownRef.current = false;
                      }}
                      title={
                        locale === 'en'
                          ? 'Press and hold 0.9s to reserve (or press Enter)'
                          : 'Затисни 0.9 сек, щоб забронювати (або натисни Enter)'
                      }
                      className={`relative overflow-hidden select-none touch-none flex-1 min-h-[48px] py-2.5 px-3 rounded-xl text-sm font-extrabold ${tokens.primaryCtaGradient} hover:brightness-110 text-white spring-transition flex items-center justify-center gap-1.5`}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 pointer-events-none"
                        style={{
                          width: isHoldingBook ? '100%' : '0%',
                          backgroundColor:
                            themePreset === 'rose_luxury'
                              ? 'rgba(251, 113, 133, 0.55)'
                              : 'rgba(52, 211, 153, 0.5)',
                          transition: isHoldingBook
                            ? 'width 900ms linear'
                            : 'width 140ms ease-out',
                        }}
                      />
                      <span className="relative z-10">
                        {isHoldingBook
                          ? locale === 'en'
                            ? 'Hold…'
                            : 'Тримай…'
                          : locale === 'en'
                          ? '🎁 Reserve gift'
                          : tokens.primaryBookBtnText}
                      </span>
                    </button>
                  )}

                  {onAttachJarClick && (
                    <button
                      type="button"
                      onClick={() => onAttachJarClick(item)}
                      className="min-h-[48px] py-2.5 px-3 rounded-xl text-sm font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 spring-transition active:scale-95"
                    >
                      {locale === 'en' ? '🫙 Group Jar / P24' : '🫙 Банка / Приват24'}
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
