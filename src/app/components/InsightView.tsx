"use client"

import React, { useMemo } from 'react';
import { Transaction, Category } from '@/app/lib/types';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Info,
  Wallet,
  Target,
  Gauge,
  CalendarClock,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency as currency, formatCompactCurrency as compact, dateKeyWIB, nowWIBParts } from '@/lib/format';

interface InsightViewProps {
  transactions: Transaction[];
  categories: Category[];
  initialBalance: number;
  emergencyFundTarget: number;
  emergencyFundBalance: number;
}

type Tone = 'good' | 'warn' | 'bad' | 'info';

interface Tip {
  id: string;
  tone: Tone;
  title: string;
  message: string;
}

const monthKey = (v: Date | string | number) => {
  const key = dateKeyWIB(v);
  return `${key.slice(0, 4)}-${Number(key.slice(5, 7)) - 1}`;
};

const toneStyles: Record<Tone, { wrap: string; icon: string }> = {
  good: { wrap: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900', icon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40' },
  warn: { wrap: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900', icon: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40' },
  bad: { wrap: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900', icon: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40' },
  info: { wrap: 'bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900', icon: 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40' },
};

const toneIcon: Record<Tone, typeof Info> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: AlertTriangle,
  info: Lightbulb,
};

export function InsightView({
  transactions,
  categories,
  initialBalance,
  emergencyFundTarget,
  emergencyFundBalance,
}: InsightViewProps) {
  const { year: currentYear, month: currentMonth, day: dayOfMonth } = nowWIBParts();
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();

  const stats = useMemo(() => {
    const currKey = `${currentYear}-${currentMonth}`;
    const isCurrentMonth = (t: Transaction) => monthKey(t.date) === currKey;

    const incomeAll = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expenseAll = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const balance = initialBalance + incomeAll - expenseAll;

    const monthIncome = transactions
      .filter((t) => t.type === 'income' && isCurrentMonth(t))
      .reduce((s, t) => s + t.amount, 0);
    const monthExpense = transactions
      .filter((t) => t.type === 'expense' && isCurrentMonth(t))
      .reduce((s, t) => s + t.amount, 0);

    const dailyAverage = dayOfMonth > 0 ? monthExpense / dayOfMonth : 0;
    const projectedExpense = dailyAverage * daysInMonth;
    const daysLeft = Math.max(daysInMonth - dayOfMonth, 0);
    const projectedBalance = balance - dailyAverage * daysLeft;

    const savingsRatio = monthIncome > 0 ? (monthIncome - monthExpense) / monthIncome : 0;
    const targetProgress =
      emergencyFundTarget > 0
        ? Math.min(Math.max(emergencyFundBalance / emergencyFundTarget, 0), 1)
        : 0;

    const score = Math.min(
      Math.max(savingsRatio * 60 + targetProgress * 40, 0),
      100
    );

    return {
      balance,
      monthIncome,
      monthExpense,
      dailyAverage,
      projectedExpense,
      projectedBalance,
      savingsRatio,
      targetProgress,
      score,
      daysLeft: Math.max(daysInMonth - dayOfMonth, 0),
    };
  }, [transactions, initialBalance, emergencyFundTarget, emergencyFundBalance, currentMonth, currentYear, dayOfMonth, daysInMonth]);

  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const total = currentYear * 12 + currentMonth - (5 - i);
      const y = Math.floor(total / 12);
      const m = ((total % 12) + 12) % 12;
      const key = `${y}-${m}`;
      const inMonth = transactions.filter((t) => monthKey(t.date) === key);
      const income = inMonth
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
      const expense = inMonth
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
      return {
        name: new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, 1))),
        Pemasukan: income,
        Pengeluaran: expense,
        Selisih: income - expense,
      };
    });
  }, [transactions, currentMonth, currentYear]);

  const categoryAnalysis = useMemo(() => {
    const prevTotal = currentYear * 12 + currentMonth - 1;
    const prevKey = `${Math.floor(prevTotal / 12)}-${((prevTotal % 12) + 12) % 12}`;
    const currKey = `${currentYear}-${currentMonth}`;

    const expenseCats = categories.filter((c) => c.type === 'expense');

    const rows = expenseCats
      .map((cat) => {
        const spentCurrent = transactions
          .filter((t) => t.categoryId === cat.id && monthKey(t.date) === currKey)
          .reduce((s, t) => s + t.amount, 0);
        const spentPrev = transactions
          .filter((t) => t.categoryId === cat.id && monthKey(t.date) === prevKey)
          .reduce((s, t) => s + t.amount, 0);
        const change = spentPrev > 0 ? ((spentCurrent - spentPrev) / spentPrev) * 100 : null;
        const budget = cat.budget || 0;
        const usage = budget > 0 ? (spentCurrent / budget) * 100 : 0;
        return { ...cat, spentCurrent, spentPrev, change, budget, usage };
      })
      .filter((r) => r.spentCurrent > 0 || r.spentPrev > 0)
      .sort((a, b) => b.spentCurrent - a.spentCurrent);

    const total = rows.reduce((s, r) => s + r.spentCurrent, 0);
    return { rows, total };
  }, [categories, transactions, currentMonth, currentYear]);

  const tips = useMemo<Tip[]>(() => {
    const list: Tip[] = [];

    if (stats.monthIncome <= 0 && stats.monthExpense > 0) {
      list.push({
        id: 'no-income',
        tone: 'warn',
        title: 'Belum ada pemasukan bulan ini',
        message:
          'Kamu sudah mencatat pengeluaran tapi belum ada pemasukan. Catat pemasukan agar analisis lebih akurat.',
      });
    }

    if (stats.monthIncome > 0 && stats.savingsRatio >= 0.2) {
      list.push({
        id: 'good-save',
        tone: 'good',
        title: `Hebat! Kamu menabung ${Math.round(stats.savingsRatio * 100)}%`,
        message: 'Di atas standar sehat 20%. Pertahankan pola ini dan alokasikan ke dana darurat atau investasi.',
      });
    } else if (stats.monthIncome > 0 && stats.savingsRatio >= 0) {
      list.push({
        id: 'low-save',
        tone: 'warn',
        title: `Rasio menabung ${Math.round(stats.savingsRatio * 100)}%`,
        message: 'Masih di bawah 20%. Coba tekan pengeluaran tidak penting agar tabungan lebih optimal.',
      });
    } else if (stats.monthIncome > 0) {
      list.push({
        id: 'negative-save',
        tone: 'bad',
        title: 'Pengeluaran melebihi pemasukan',
        message: `Bulan ini defisit ${currency(Math.abs(stats.monthIncome - stats.monthExpense))}. Tinjau kategori terbesar di bawah.`,
      });
    }

    if (stats.projectedBalance < stats.balance && stats.dailyAverage > 0) {
      list.push({
        id: 'projection',
        tone: 'info',
        title: 'Proyeksi saldo akhir bulan',
        message: `Dengan rata-rata belanja ${currency(stats.dailyAverage)}/hari, saldo diperkirakan menjadi ${currency(stats.projectedBalance)} pada akhir bulan.`,
      });
    }

    categoryAnalysis.rows
      .filter((r) => r.budget > 0)
      .forEach((r) => {
        if (r.usage >= 100) {
          list.push({
            id: `over-${r.id}`,
            tone: 'bad',
            title: `Anggaran ${r.name} terlampaui`,
            message: `Terpakai ${Math.round(r.usage)}% dari anggaran ${currency(r.budget)}. Tahan pengeluaran kategori ini.`,
          });
        } else if (r.usage >= 80) {
          list.push({
            id: `near-${r.id}`,
            tone: 'warn',
            title: `Anggaran ${r.name} hampir habis`,
            message: `Sudah terpakai ${Math.round(r.usage)}%. Sisa anggaran ${currency(Math.max(r.budget - r.spentCurrent, 0))}.`,
          });
        }
      });

    const biggest = categoryAnalysis.rows[0];
    if (biggest && biggest.change != null && biggest.change > 30) {
      list.push({
        id: `spike-${biggest.id}`,
        tone: 'warn',
        title: `Pengeluaran ${biggest.name} naik ${Math.round(biggest.change)}%`,
        message: `Bulan ini ${currency(biggest.spentCurrent)} vs bulan lalu ${currency(biggest.spentPrev)}.`,
      });
    }

    if (stats.score >= 70) {
      list.push({
        id: 'health-good',
        tone: 'good',
        title: 'Kesehatan finansial kamu optimal',
        message: 'Skor tinggi. Terus pertahankan disiplin mencatat dan menabung.',
      });
    } else if (stats.score < 40) {
      list.push({
        id: 'health-low',
        tone: 'bad',
        title: 'Skor kesehatan finansial rendah',
        message: 'Fokus tingkatkan pemasukan atau tekan pengeluaran, lalu bangun dana darurat.',
      });
    }

    return list;
  }, [stats, categoryAnalysis]);

  const scoreTone =
    stats.score >= 70 ? 'good' : stats.score >= 40 ? 'warn' : 'bad';
  const scoreLabel =
    stats.score >= 70 ? 'Optimal' : stats.score >= 40 ? 'Stabil' : 'Waspada';

  const maxCategorySpend = categoryAnalysis.rows[0]?.spentCurrent || 1;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight">Insight Keuangan</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Ringkasan, tren, dan saran otomatis untuk pengeluaranmu
          </p>
        </div>
      </div>

      {/* Health summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 soft-card flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <span
              className={cn(
                'text-xs font-semibold px-3 py-1 rounded-full border',
                toneStyles[scoreTone].wrap
              )}
            >
              {scoreLabel}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Skor Kesehatan</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight tabular-nums">
                {Math.round(stats.score)}
              </span>
              <span className="text-lg text-muted-foreground mb-1.5">/ 100</span>
            </div>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                stats.score >= 70 ? 'bg-emerald-500' : stats.score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${Math.max(stats.score, 3)}%` }}
            />
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            icon={Wallet}
            label="Saldo"
            value={currency(stats.balance)}
            accent="text-slate-900"
          />
          <StatTile
            icon={TrendingUp}
            label="Masuk (bulan)"
            value={currency(stats.monthIncome)}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <StatTile
            icon={TrendingDown}
            label="Keluar (bulan)"
            value={currency(stats.monthExpense)}
            accent="text-rose-600 dark:text-rose-400"
          />
          <StatTile
            icon={PiggyBank}
            label="Rasio Menabung"
            value={`${Math.round(stats.savingsRatio * 100)}%`}
            accent={stats.savingsRatio >= 0.2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
          />
        </div>
      </div>

      {/* Tips & alerts */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Tips & Peringatan Otomatis</h4>
        </div>
        {tips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tips.map((tip) => {
              const Icon = toneIcon[tip.tone];
              return (
                <div
                  key={tip.id}
                  className={cn('flex gap-3 p-4 rounded-2xl border', toneStyles[tip.tone].wrap)}
                >
                  <div
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                      toneStyles[tip.tone].icon
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{tip.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{tip.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="soft-card text-center text-sm text-muted-foreground py-8">
            Belum ada insight. Catat lebih banyak transaksi untuk saran otomatis.
          </div>
        )}
      </div>

      {/* Trend & projection */}
      <div className="soft-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Tren 6 Bulan & Proyeksi</h4>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
              Rata-rata harian <b className="text-foreground">{currency(stats.dailyAverage)}</b>
            </span>
            <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
              Proyeksi keluar <b className="text-rose-600 dark:text-rose-400">{currency(stats.projectedExpense)}</b>
            </span>
          </div>
        </div>
        <div className="h-64 md:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                tickFormatter={(v) => compact(Number(v))}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={48}
              />
              <RechartsTooltip
                formatter={(value: number) => currency(value)}
                contentStyle={{
                  borderRadius: 16,
                  border: '1px solid hsl(214 32% 91%)',
                  boxShadow: '0 12px 32px -16px rgba(15,23,42,0.25)',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Line
                type="monotone"
                dataKey="Selisih"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category analysis */}
      <div className="soft-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Analisis Pengeluaran per Kategori</h4>
          </div>
          <span className="text-xs text-muted-foreground">
            Total bulan ini <b className="text-foreground">{currency(categoryAnalysis.total)}</b>
          </span>
        </div>

        {categoryAnalysis.rows.length > 0 ? (
          <div className="space-y-5">
            {categoryAnalysis.rows.map((row) => {
              const width = Math.max((row.spentCurrent / maxCategorySpend) * 100, row.spentCurrent > 0 ? 4 : 0);
              return (
                <div key={row.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="font-medium truncate">{row.name}</span>
                      {row.change != null && (
                        <span
                          className={cn(
                            'text-[11px] font-semibold flex items-center gap-0.5 shrink-0',
                            row.change > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500'
                          )}
                        >
                          {row.change > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {Math.abs(Math.round(row.change))}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      {row.budget > 0 && (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-medium',
                            row.usage >= 100
                              ? 'bg-rose-50 text-rose-600 dark:text-rose-400'
                              : row.usage >= 80
                                ? 'bg-amber-50 text-amber-600 dark:text-amber-400'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {Math.round(row.usage)}% anggaran
                        </span>
                      )}
                      <span className="font-semibold tabular-nums">{currency(row.spentCurrent)}</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(width, 100)}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            Belum ada pengeluaran tercatat bulan ini.
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="soft-card p-5 flex flex-col gap-3">
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm md:text-base font-semibold tabular-nums truncate', accent)}>
          {value}
        </p>
      </div>
    </div>
  );
}
