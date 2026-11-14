'use client';

import React, { useState } from 'react';
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
 */
export function buildInstagramDirectOrderMessage(
  ownerInstagramHandle: string | undefined,
  itemTitle: string
): string {
  const cleanOwnerIg = (ownerInstagramHandle || 'нікнейм_отримувачки').replace(/^@+/, '');
  return `Привіт! 👋 Хочу оплатити подарунок зі списку бажань Mriyii для @${cleanOwnerIg}: ${itemTitle}. Напишіть їй, будь ласка, у Direct після оплати, щоб вона сама вказала, куди і коли їй зручно прийняти доставку!`;
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
  const tokens = THEME_TOKENS[themePreset];

  const hasJar = Boolean(item.monoJarUrl || item.hasMonoJar);
  const targetAmount = item.jarTargetAmount ?? item.price ?? 0;
  const currentAmount = item.jarCurrentAmount ?? 0;
  const progressPct =
    targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;
  const isGoalReached = targetAmount > 0 && currentAmount >= targetAmount;

  const storeUrl = item.affiliateUrl || item.originalUrl;
  const cleanShopHandle = item.instagramHandle?.replace(/^@+/, '').trim();
  const storeBadgeText = getStoreLabel(storeUrl, cleanShopHandle);
  const showRealPhoto = Boolean(item.imageUrl && !imgError && !forceFallbackPoster);

  const handleSync = async () => {
    if (!onSyncJarClick || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncJarClick(item);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInstagramOrderClick = async () => {
    if (!cleanShopHandle) return;
    const message = buildInstagramDirectOrderMessage(ownerInstagramHandle, item.title);
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Fallback
    }
    setIgCopiedLocal(true);
    setTimeout(() => setIgCopiedLocal(false), 3500);
    if (onInstagramOrderToast) {
      onInstagramOrderToast('Текст замовлення скопійовано в буфер обміну! 💌');
    }
    window.open(
      `https://ig.me/m/${encodeURIComponent(cleanShopHandle)}?ref=mriyii`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="solid-white-card rounded-[26px] overflow-hidden border border-white flex flex-col justify-between spring-transition">
      {/* ВЕРХНЯ ФОТО-ШАПКА (h-44) ІЗ КУТОВИМИ БЕЙДЖАМИ ТА SMART LUXURY POSTER FALLBACK */}
      <div className="relative h-44 w-full overflow-hidden">
        {showRealPhoto ? (
          <div className="w-full h-full relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover spring-transition hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
          </div>
        ) : (
          /* Smart Luxury Poster Fallback (Рівень 2 захисту обкладинки) */
          <div
            className={`w-full h-full ${tokens.fallbackPosterClass} relative flex flex-col items-center justify-center overflow-hidden`}
          >
            <div className="absolute inset-0 poster-pattern" />
            <div className="relative z-10 w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md border border-white/40 shadow-xl flex items-center justify-center text-4xl -translate-y-1.5 select-none">
              <span>{item.emoji || '✨'}</span>
            </div>
            <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-white/85">
              Офіційний магазин • Перевірено
            </span>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          </div>
        )}

        {/* Верхній лівий кут: Магазин + Пріоритет */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
          {storeUrl ? (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-950/80 hover:bg-slate-950 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 inline-flex items-center gap-1"
            >
              <span>{storeBadgeText}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>
          ) : (
            <span className="bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20">
              {storeBadgeText}
            </span>
          )}

          {item.isAiSurprise ? (
            <span className="bg-purple-600/95 backdrop-blur-md text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full">
              ✨ AI Сюрприз
            </span>
          ) : (
            <span
              className={`${tokens.priorityBadgeClass} backdrop-blur-md text-[11px] font-extrabold px-2.5 py-1 rounded-full`}
            >
              {tokens.priorityBadgeText}
            </span>
          )}
        </div>

        {/* Верхній правий кут: Живий статус лота */}
        <div className="absolute top-3 right-3 z-10">
          {viewMode === 'owner' ? (
            item.isBooked || hasJar ? (
              <span className="bg-indigo-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md inline-flex items-center gap-1">
                🔒 Заброньовано (Сюрприз!)
              </span>
            ) : (
              <span className="bg-emerald-500 text-slate-950 font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md">
                🟢 Вільно
              </span>
            )
          ) : item.isBooked || isGoalReached ? (
            <span className="bg-emerald-400 text-slate-950 font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md">
              {isGoalReached ? '🎉 Банку зібрано (100%)!' : '💎 Заброньовано'}
            </span>
          ) : hasJar ? (
            <span className="bg-amber-400 text-slate-950 font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md">
              🫙 Йде збір на Банку ({progressPct}%)
            </span>
          ) : cleanShopHandle ? (
            <span className="bg-pink-500 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md">
              📸 Instagram Direct
            </span>
          ) : (
            <span className="bg-emerald-400 text-slate-950 font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md">
              🎁 Доступно
            </span>
          )}
        </div>

        {/* Нижній край фото: Велика ціна в ₴ + Категорійний бейдж */}
        <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end justify-between z-10">
          <div className="text-2xl font-black text-white drop-shadow tabular-nums">
            {typeof item.price === 'number' && item.price > 0
              ? `${item.price.toLocaleString('uk-UA')} ₴`
              : 'Сюрприз 🎁'}
          </div>
          <span className="text-[11px] font-extrabold text-amber-300 bg-slate-950/75 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-amber-400/40">
            {hasJar
              ? '✨ Груповий подарунок'
              : cleanShopHandle
              ? '🌸 Доставка через Direct'
              : '🎁 Індивідуальний лот'}
          </span>
        </div>
      </div>

      {/* НИЖНЯ ЧАСТИНА КАРТКИ НА СУЦІЛЬНОМУ БІЛОМУ ТЛІ ІЗ СОКОВИТИМИ КОЛЬОРОВИМИ АКЦЕНТАМИ */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-white text-slate-950">
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-950 leading-snug">
            {item.title}
          </h3>

          {/* Кольорова бульбашка коментаря іменинника (💬) з бічною смужкою border-l-4 */}
          {item.description && (
            <div
              className={`mt-2 text-xs font-bold ${tokens.commentBubbleClass} rounded-r-xl px-3 py-1.5`}
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
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shrink-0">
                    🔒
                  </span>
                  <div className="text-xs">
                    <div className="font-extrabold text-indigo-950">
                      Сюрприз-захист активний! ✨
                    </div>
                    <div className="text-[11px] font-semibold text-indigo-800">
                      Друзі вже збирають Банку або забронювали цей лот. Деталі приховано до свята!
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
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
                      className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Магазин
                    </a>
                  )}
                  {onDeleteClick && (
                    <button
                      type="button"
                      onClick={() => onDeleteClick(item)}
                      className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center gap-1"
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
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <span>🐈‍⬛ Монобанка збору</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${tokens.donorsBadgeClass}`}
                    >
                      спільний збір друзів
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
                  <div className="flex items-center gap-2 pt-0.5">
                    {onDonateSimulateClick ? (
                      <button
                        type="button"
                        onClick={() => onDonateSimulateClick(item)}
                        className={`flex-1 ${tokens.primaryCtaGradient} hover:brightness-110 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl spring-transition active:scale-95`}
                      >
                        {tokens.primaryJarBtnText} (+2 000 ₴)
                      </button>
                    ) : (
                      <a
                        href={item.monoJarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 ${tokens.primaryCtaGradient} hover:brightness-110 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl spring-transition active:scale-95 inline-flex items-center justify-center gap-1.5`}
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
                        className="py-2.5 px-2.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 spring-transition"
                        title="Оновити баланс Банки (кеш 60с)"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                        />
                      </button>
                    )}

                    {onCloseJar100SimulateClick ? (
                      <button
                        type="button"
                        onClick={() => onCloseJar100SimulateClick(item)}
                        className="bg-slate-950 hover:bg-slate-800 text-amber-300 font-extrabold text-xs py-2.5 px-3 rounded-xl spring-transition active:scale-95"
                      >
                        👑 Закрити 100%
                      </button>
                    ) : (
                      onBookClick && (
                        <button
                          type="button"
                          onClick={() => onBookClick(item)}
                          className="bg-slate-950 hover:bg-slate-800 text-amber-300 font-extrabold text-xs py-2.5 px-3 rounded-xl spring-transition active:scale-95"
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
                  className="w-full py-2.5 px-3.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:brightness-110 text-white shadow-md shadow-pink-500/20 spring-transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Замовити в Instagram @{cleanShopHandle} 📸</span>
                </button>
                {igCopiedLocal && (
                  <div className="text-[11px] font-bold text-emerald-800 text-center bg-emerald-50 border border-emerald-200 rounded-lg py-1 px-2">
                    Текст замовлення скопійовано в буфер обміну! 💌
                  </div>
                )}
              </div>
            )}

            {/* Якщо лот вже заброньовано або Банку зібрано на 100% */}
            {item.isBooked || isGoalReached ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold">
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
                  {storeUrl && (
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl text-xs font-extrabold bg-slate-950 hover:bg-slate-800 text-amber-300 shadow spring-transition active:scale-95 inline-flex items-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Купити в магазині
                    </a>
                  )}

                  {isBookedByCurrentVisitor && onCancelBookingClick && (
                    <button
                      type="button"
                      onClick={() => onCancelBookingClick(item)}
                      className="py-2 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 spring-transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Скасувати
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Якщо лот без Банки — кнопки прямого бронювання та відкриття Банки */
              !hasJar && (
                <div className="flex items-center gap-2 pt-0.5">
                  {onBookClick && (
                    <button
                      type="button"
                      onClick={() => onBookClick(item)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold ${tokens.primaryCtaGradient} hover:brightness-110 text-white spring-transition active:scale-95 flex items-center justify-center gap-1.5`}
                    >
                      <span>{tokens.primaryBookBtnText}</span>
                    </button>
                  )}

                  {onAttachJarClick && (
                    <button
                      type="button"
                      onClick={() => onAttachJarClick(item)}
                      className="py-2.5 px-3 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 spring-transition active:scale-95"
                    >
                      🫙 Збір у Банку
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
