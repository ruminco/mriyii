'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Crown,
  Flame,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  addCreatorToCohortAction,
  getMetricsDashboardAction,
  updateCreatorStatusAction,
} from '@/actions/analytics';
import type { MetricsDashboardDTO, MetricsPeriod } from '@/lib/analytics';
import type { CreatorCohortStatus } from '@/models/CreatorCohort';

interface MetricsDashboardClientProps {
  initialData: MetricsDashboardDTO;
  adminGuardNotice?: string;
}

const STATUS_BADGE: Record<
  CreatorCohortStatus,
  { label: string; className: string }
> = {
  invited: {
    label: '⚪ Запрошена',
    className: 'bg-slate-800 text-slate-200 border-slate-600',
  },
  showcase_ready: {
    label: '⚪ Вітрина готова (Не в Bio)',
    className: 'bg-slate-800/90 text-slate-200 border-white/20',
  },
  placed_in_bio: {
    label: '🟡 У Bio (Чекає 1-й донат)',
    className: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  },
  validated_gift_received: {
    label: '🟢 Активна (Є подарунки)',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  },
  churned_14d: {
    label: '🔴 Не активувалась (14 дн.)',
    className: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
  },
};

export function MetricsDashboardClient({
  initialData,
  adminGuardNotice,
}: MetricsDashboardClientProps) {
  const [data, setData] = useState<MetricsDashboardDTO>(initialData);
  const [period, setPeriod] = useState<MetricsPeriod>(initialData.period);
  const [forceSim, setForceSim] = useState<boolean>(initialData.isSimulated);
  const [activeTab, setActiveTab] = useState<'overview' | 'creators'>('overview');
  const [isPending, startTransition] = useTransition();

  // Форма додавання інфлюенсерки
  const [handle, setHandle] = useState('');
  const [followers, setFollowers] = useState('15000');
  const [niche, setNiche] = useState('Lifestyle / IT-Girl');
  const [wishlistSlug, setWishlistSlug] = useState('');
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const reloadDashboard = (nextPeriod: MetricsPeriod, nextSim: boolean) => {
    setPeriod(nextPeriod);
    setForceSim(nextSim);
    startTransition(async () => {
      const fresh = await getMetricsDashboardAction(nextPeriod, nextSim);
      setData(fresh);
    });
  };

  const handleAddCreator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || !wishlistSlug.trim()) {
      setFormNotice('Вкажіть @instagramHandle та slug вішліста.');
      return;
    }
    setFormNotice(null);
    startTransition(async () => {
      try {
        await addCreatorToCohortAction({
          instagramHandle: handle.trim(),
          followersCount: Number(followers) || 10000,
          niche: niche.trim() || 'Lifestyle / IT-Girl',
          wishlistSlug: wishlistSlug.trim(),
          status: 'showcase_ready',
        });
        setHandle('');
        setWishlistSlug('');
        setFormNotice('Інфлюенсерку додано до когорти 30-тесту! ✨');
        const fresh = await getMetricsDashboardAction(period, false);
        setForceSim(false);
        setData(fresh);
      } catch (err) {
        setFormNotice(
          err instanceof Error ? err.message : 'Не вдалося додати інфлюенсерку.'
        );
      }
    });
  };

  const handleStatusChange = (creatorId: string, newStatus: CreatorCohortStatus) => {
    startTransition(async () => {
      await updateCreatorStatusAction(creatorId, newStatus);
      const fresh = await getMetricsDashboardAction(period, forceSim);
      setData(fresh);
    });
  };

  const fmtUah = (val: number) => `${Math.round(val).toLocaleString('uk-UA')} ₴`;
  const maxBarRevenue = Math.max(
    data.benchmarks.optimisticMonthlyUah,
    data.runRate100.monthlyRevenueUah,
    1
  );

  const validatedPct = Math.min(
    100,
    Math.round(
      (data.creatorExperiment.validatedCount /
        data.creatorExperiment.targetTotal) *
        100
    )
  );

  return (
    <div className="min-h-screen mesh-cyber text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TOP NAV & HEADER */}
        <header className="smoked-glass rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="min-h-[48px] px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-bold text-white inline-flex items-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                До кабінету
              </Link>
              <span className="px-3.5 py-1.5 rounded-full text-sm font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                📈 Mriyii Unit Economics &amp; CRM
              </span>
              {data.isSimulated && (
                <span className="px-3.5 py-1.5 rounded-full text-sm font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  🧪 Демо-симуляція 100 власників
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Продуктовий Дашборд та Юніт-Економіка
            </h1>
            <p className="text-sm sm:text-base font-medium text-slate-200 max-w-3xl">
              Живе порівняння фактичного Run-Rate на 100 власників із моделлю{' '}
              <span className="text-white font-bold">06_Unit_Economics</span>, діагностика{' '}
              <span className="text-cyan-300 font-bold">RULE-01..RULE-06</span> та трекер
              експерименту 30 мікроінфлюенсерок.
            </p>
            {adminGuardNotice && (
              <p className="text-sm font-semibold text-amber-300">{adminGuardNotice}</p>
            )}
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap items-center gap-3">
            {(['7d', '30d', 'all'] as MetricsPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => reloadDashboard(p, forceSim)}
                disabled={isPending}
                className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-sm font-extrabold border transition ${
                  period === p
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/25'
                    : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
                }`}
              >
                {p === '7d' ? '7 днів' : p === '30d' ? '30 днів' : 'Весь час'}
              </button>
            ))}

            <button
              type="button"
              onClick={() => reloadDashboard(period, !forceSim)}
              disabled={isPending}
              className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-sm font-extrabold border inline-flex items-center gap-2 transition ${
                forceSim
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {forceSim ? 'Live MongoDB' : 'Демо-симуляція 100'}
            </button>

            <button
              type="button"
              onClick={() => reloadDashboard(period, forceSim)}
              disabled={isPending}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
              Оновити
            </button>
          </div>
        </header>

        {/* TABS */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`min-h-[48px] px-6 py-3 rounded-2xl text-base font-extrabold inline-flex items-center gap-2.5 border transition ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 border-transparent shadow-lg'
                : 'smoked-glass text-slate-200 border-white/20 hover:bg-white/15'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Сценарій vs Факт + Поради
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('creators')}
            className={`min-h-[48px] px-6 py-3 rounded-2xl text-base font-extrabold inline-flex items-center gap-2.5 border transition ${
              activeTab === 'creators'
                ? 'bg-gradient-to-r from-pink-500 to-amber-400 text-slate-950 border-transparent shadow-lg'
                : 'smoked-glass text-slate-200 border-white/20 hover:bg-white/15'
            }`}
          >
            <Users className="w-5 h-5" />
            Тест 30 інфлюенсерок ({data.creatorExperiment.validatedCount} / 30)
          </button>
        </div>

        {/* TOP 4 KPI CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="smoked-glass rounded-3xl p-6 space-y-2">
            <div className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>Run-Rate Дохід / міс</span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-300 tabular-nums">
              {fmtUah(data.runRate100.monthlyRevenueUah)}
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Ціль Базового MVP: <span className="text-white">6 453 ₴ / міс</span>
            </p>
          </div>

          <div className="smoked-glass rounded-3xl p-6 space-y-2">
            <div className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>Run-Rate Дохід / рік</span>
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div className="text-3xl font-black text-white tabular-nums">
              {fmtUah(data.runRate100.annualRevenueUah)}
            </div>
            <p className="text-sm font-semibold text-slate-200">
              На 100 власників · Take Rate{' '}
              <span className="text-cyan-300 tabular-nums">
                {data.runRate100.effectiveTakeRatePct.toFixed(2)}%
              </span>
            </p>
          </div>

          <div className="smoked-glass rounded-3xl p-6 space-y-2">
            <div className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>Потенціал Етапу 2 / міс</span>
              <Flame className="w-5 h-5 text-pink-400" />
            </div>
            <div className="text-3xl font-black text-pink-300 tabular-nums">
              {fmtUah(data.runRate100.stage2MonthlyPotentialUah)}
            </div>
            <p className="text-sm font-semibold text-slate-200">
              На тому ж GMV (Квіти 12% + Гейт 5%)
            </p>
          </div>

          <div className="smoked-glass rounded-3xl p-6 space-y-2">
            <div className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>Віральний K-factor</span>
              <Activity className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="text-3xl font-black text-cyan-300 tabular-nums">
              {data.runRate100.kFactor.toFixed(2)}
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {data.totals.uniqueGuestsCount} гостей · {data.totals.bookingsCount} броней
            </p>
          </div>
        </section>

        {activeTab === 'overview' ? (
          <>
            {/* SCENARIO VS ACTUAL VISUAL BARS */}
            <section className="smoked-glass rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Місячний дохід Mriyii на 100 власників: Сценарій vs Факт
                  </h2>
                  <p className="text-sm font-medium text-slate-200 mt-1">
                    Порівняння поточного Run-Rate із трьома сценаріями фінансової моделі.
                  </p>
                </div>
                <span className="text-sm font-bold text-cyan-300 tabular-nums">
                  Річний GMV: {fmtUah(data.runRate100.annualGmvUah)}
                </span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: '🔴 Песимістичний (Поріг виживання)',
                    value: data.benchmarks.pessimisticMonthlyUah,
                    barClass: 'bg-rose-500',
                  },
                  {
                    label: '🟡 Базовий (Ціль MVP)',
                    value: data.benchmarks.baseMonthlyUah,
                    barClass: 'bg-amber-400',
                  },
                  {
                    label: '📊 ФАКТ (Поточний Run-Rate)',
                    value: data.runRate100.monthlyRevenueUah,
                    barClass: 'bg-gradient-to-r from-cyan-400 to-emerald-400',
                  },
                  {
                    label: '🟢 Оптимістичний (Creator-Heavy)',
                    value: data.benchmarks.optimisticMonthlyUah,
                    barClass: 'bg-emerald-500',
                  },
                ].map((row) => {
                  const pct = Math.max(
                    3,
                    Math.min(100, Math.round((row.value / maxBarRevenue) * 100))
                  );
                  return (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-white">{row.label}</span>
                        <span className="text-white tabular-nums">
                          {fmtUah(row.value)} / міс
                        </span>
                      </div>
                      <div className="w-full h-3.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.barClass} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* RULE-BASED DIAGNOSTIC ENGINE */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-amber-300" />
                  Автоматичний Блок Порад (RULE-01 .. RULE-06)
                </h2>
                <span className="text-sm font-bold text-slate-200">
                  Активних сигналів: {data.healthAlerts.length}
                </span>
              </div>

              {data.healthAlerts.length === 0 ? (
                <div className="smoked-glass rounded-3xl p-6 flex items-center gap-4 border border-emerald-400/40">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-base font-extrabold text-white">
                      Усі показники воронки в зеленій зоні!
                    </div>
                    <p className="text-sm font-medium text-slate-200">
                      Жодне з правил RULE-01..RULE-06 не виявило критичних відхилень.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.healthAlerts.map((alert) => {
                    const badgeStyle =
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                        : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40';

                    return (
                      <div
                        key={alert.id}
                        className="smoked-glass rounded-3xl p-6 space-y-3 border border-white/15"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-extrabold border ${badgeStyle}`}
                          >
                            {alert.id} · {alert.severity}
                          </span>
                          <span className="text-sm font-bold text-cyan-300 tabular-nums">
                            {alert.metricValueText} ({alert.thresholdText})
                          </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
                          {alert.title}
                        </h3>
                        <p className="text-sm font-medium text-slate-200">
                          <strong className="text-white">Діагноз:</strong> {alert.diagnosis}
                        </p>
                        <ul className="space-y-1.5 text-sm font-medium text-slate-200 list-disc pl-5">
                          {alert.actionPlan.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* FULL 13-ROW SCENARIO MATRIX */}
            <section className="smoked-glass rounded-3xl p-6 sm:p-8 space-y-4 overflow-x-auto">
              <h2 className="text-xl font-black text-white">
                Матриця порівняння «Сценарій vs Факт» (на 100 власників)
              </h2>
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-white/20 text-sm font-extrabold text-slate-200">
                    <th className="py-3 pr-4">Метрика Юніт-Економіки</th>
                    <th className="py-3 px-3">🔴 Песимістичний</th>
                    <th className="py-3 px-3">🟡 Базовий</th>
                    <th className="py-3 px-3">🟢 Оптимістичний</th>
                    <th className="py-3 pl-3 text-right">📊 ФАКТ (Live)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {data.matrixRows.map((row) => {
                    const statusDot =
                      row.status === 'green'
                        ? 'text-emerald-300'
                        : row.status === 'yellow'
                        ? 'text-amber-300'
                        : 'text-rose-300';
                    return (
                      <tr key={row.key} className="hover:bg-white/5 transition">
                        <td className="py-3 pr-4 font-bold text-white">{row.label}</td>
                        <td className="py-3 px-3 font-medium text-slate-200 tabular-nums">
                          {row.pessimistic}
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-200 tabular-nums">
                          {row.base}
                        </td>
                        <td className="py-3 px-3 font-medium text-emerald-200 tabular-nums">
                          {row.optimistic}
                        </td>
                        <td
                          className={`py-3 pl-3 text-right font-black tabular-nums ${statusDot}`}
                        >
                          {row.actual}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          /* CREATOR COHORT 30 MICRO-INFLUENCERS TAB */
          <div className="space-y-6">
            {/* FUNNEL PROGRESS */}
            <section className="smoked-glass rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Експеримент: 30 мікроінфлюенсерок (Вішліст у Bio за 14 днів)
                  </h2>
                  <p className="text-sm font-medium text-slate-200 mt-1">
                    Гіпотеза валідується, якщо{' '}
                    <span className="text-emerald-300 font-extrabold">
                      ≥ 6 із 30 дівчат (20%)
                    </span>{' '}
                    отримають подарунок, квіти або поповнення Банки за 14 днів.
                  </p>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-base font-black text-emerald-300 tabular-nums">
                  УСПІХ: {data.creatorExperiment.validatedCount} / 30 ({validatedPct}%)
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  {
                    step: '1. Відібрано',
                    count: data.creatorExperiment.invitedCount,
                    sub: 'Ціль: 30',
                  },
                  {
                    step: '2. Вітрина готова',
                    count: data.creatorExperiment.showcaseReadyCount,
                    sub: 'Rose Luxury',
                  },
                  {
                    step: '3. Лінк у Bio',
                    count: data.creatorExperiment.placedInBioCount,
                    sub: '≥3 переходи ig_bio',
                  },
                  {
                    step: '4. ≥10 переходів',
                    count: data.creatorExperiment.tenPlusVisitsCount,
                    sub: 'Живий трафік',
                  },
                  {
                    step: '5. 🎯 Є подарунок',
                    count: data.creatorExperiment.validatedCount,
                    sub: 'Поріг: ≥ 6 / 30',
                  },
                ].map((stage) => (
                  <div
                    key={stage.step}
                    className="rounded-2xl bg-white/5 border border-white/15 p-4 space-y-1"
                  >
                    <div className="text-sm font-bold text-slate-200">{stage.step}</div>
                    <div className="text-2xl font-black text-white tabular-nums">
                      {stage.count}
                    </div>
                    <div className="text-sm font-medium text-cyan-300">{stage.sub}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* QUICK ADD CREATOR FORM */}
            <section className="smoked-glass rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-black text-white">
                Швидко додати інфлюенсерку в експеримент
              </h3>
              <form
                onSubmit={handleAddCreator}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
              >
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@alina.luxury.kyiv"
                  className="min-h-[48px] rounded-2xl bg-black/40 border border-white/20 px-4 text-sm font-semibold text-white placeholder:text-slate-300"
                />
                <input
                  type="number"
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                  placeholder="Підписники (напр. 24500)"
                  className="min-h-[48px] rounded-2xl bg-black/40 border border-white/20 px-4 text-sm font-semibold text-white placeholder:text-slate-300 tabular-nums"
                />
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Ніша (Lifestyle / Beauty)"
                  className="min-h-[48px] rounded-2xl bg-black/40 border border-white/20 px-4 text-sm font-semibold text-white placeholder:text-slate-300"
                />
                <input
                  type="text"
                  value={wishlistSlug}
                  onChange={(e) => setWishlistSlug(e.target.value)}
                  placeholder="slug вішліста (напр. alina-luxury)"
                  className="min-h-[48px] rounded-2xl bg-black/40 border border-white/20 px-4 text-sm font-semibold text-white placeholder:text-slate-300"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-[48px] px-5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-pink-500 to-amber-400 text-slate-950 hover:brightness-110 inline-flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  Додати в когорту
                </button>
              </form>
              {formNotice && (
                <p className="text-sm font-bold text-emerald-300">{formNotice}</p>
              )}
            </section>

            {/* LEADERBOARD TABLE */}
            <section className="smoked-glass rounded-3xl p-6 sm:p-8 space-y-4 overflow-x-auto">
              <h3 className="text-lg font-black text-white">
                Таблиця когорти (CreatorOutreach CRM)
              </h3>
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/20 text-sm font-extrabold text-slate-200">
                    <th className="py-3 pr-3">#</th>
                    <th className="py-3 px-3">Instagram</th>
                    <th className="py-3 px-3">Підписники</th>
                    <th className="py-3 px-3">Ніша</th>
                    <th className="py-3 px-3">Статус воронки</th>
                    <th className="py-3 px-3">День</th>
                    <th className="py-3 px-3">Кліки Bio</th>
                    <th className="py-3 px-3">IG / Броні</th>
                    <th className="py-3 pl-3 text-right">GMV (₴)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {data.creatorExperiment.rows.map((row, idx) => {
                    const badge = STATUS_BADGE[row.status];
                    return (
                      <tr key={row.id} className="hover:bg-white/5 transition">
                        <td className="py-3 pr-3 font-bold text-slate-200 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-white">
                          <div>{row.instagramHandle}</div>
                          <Link
                            href={`/w/${row.wishlistSlug}?ref=bio`}
                            className="text-sm font-semibold text-cyan-300 hover:underline"
                          >
                            /w/{row.wishlistSlug}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-200 tabular-nums">
                          {(row.followersCount / 1000).toFixed(1)}k
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-200">{row.niche}</td>
                        <td className="py-3 px-3">
                          {row.id.startsWith('sim-') ? (
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          ) : (
                            <select
                              value={row.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  row.id,
                                  e.target.value as CreatorCohortStatus
                                )
                              }
                              className="min-h-[40px] rounded-xl bg-black/50 border border-white/20 px-3 text-sm font-bold text-white"
                            >
                              <option value="invited">⚪ Запрошена</option>
                              <option value="showcase_ready">⚪ Вітрина готова</option>
                              <option value="placed_in_bio">🟡 У Bio</option>
                              <option value="validated_gift_received">
                                🟢 Активна (Є подарунки)
                              </option>
                              <option value="churned_14d">🔴 Не активувалась</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-200 tabular-nums">
                          День {row.daysSinceInvite} / 14
                        </td>
                        <td className="py-3 px-3 font-bold text-cyan-300 tabular-nums">
                          {row.bioClicks}
                        </td>
                        <td className="py-3 px-3 font-bold text-white tabular-nums">
                          {row.igOrders} IG · {row.bookingsAndJars} Броні
                        </td>
                        <td className="py-3 pl-3 text-right font-black text-emerald-300 tabular-nums">
                          {fmtUah(row.gmvUah)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* TOP INSTAGRAM SHOPS FOR STAGE 2 B2B */}
            {data.creatorExperiment.topShopHandles.length > 0 && (
              <section className="smoked-glass rounded-3xl p-6 sm:p-8 space-y-3">
                <h3 className="text-lg font-black text-white">
                  Топ Instagram-шопів для підключення B2B-комісії 12% (Етап 2)
                </h3>
                <div className="flex flex-wrap gap-3">
                  {data.creatorExperiment.topShopHandles.map((shop) => (
                    <div
                      key={shop.handle}
                      className="px-4 py-2.5 rounded-2xl bg-pink-500/15 border border-pink-400/30 text-sm font-bold text-white"
                    >
                      {shop.handle}{' '}
                      <span className="text-pink-300 tabular-nums">
                        ({shop.count} замовлень)
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
