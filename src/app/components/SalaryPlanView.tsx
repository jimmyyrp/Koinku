"use client"

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Calculator,
  CheckCircle2,
  Clock,
  Loader2,
  PiggyBank,
  Receipt,
  Save,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Transaction, Category } from '@/app/lib/types';
import { cn } from '@/lib/utils';
import {
  dateKeyWIB,
  formatCurrency,
  formatDate,
  formatNumber,
  formatShortDate,
  nowWIBParts,
} from '@/lib/format';

interface SalaryPlanViewProps {
  transactions: Transaction[];
  categories: Category[];
  monthlyIncome: number;
  payday: number;
  hasInstallments: boolean;
  emergencyFundTarget: number;
  emergencyFundBalance: number;
  isSaving: boolean;
  onSavePlan: (data: {
    monthlyIncome: number;
    payday: number;
    hasInstallments: boolean;
    emergencyFundTarget: number;
    emergencyFundBalance: number;
  }) => void;
}

const NEED_CATEGORY_NAMES = new Set([
  'makan & minum',
  'transportasi',
  'sewa rumah / kpr',
  'tagihan & pulsa',
  'kesehatan',
]);

const pad = (value: number) => String(value).padStart(2, '0');

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function paydayForMonth(year: number, month: number, payday: number) {
  return Math.min(Math.max(1, payday), lastDayOfMonth(year, month));
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function getPayCycle(year: number, month: number, day: number, payday: number) {
  const thisPayday = paydayForMonth(year, month, payday);
  let startYear = year;
  let startMonth = month;

  if (day < thisPayday) {
    startMonth -= 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const startDay = paydayForMonth(startYear, startMonth, payday);
  const startKey = dateKey(startYear, startMonth, startDay);

  let nextYear = startYear;
  let nextMonth = startMonth + 1;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }
  const nextDay = paydayForMonth(nextYear, nextMonth, payday);
  const nextKey = dateKey(nextYear, nextMonth, nextDay);

  const startMs = Date.parse(`${startKey}T00:00:00Z`);
  const nextMs = Date.parse(`${nextKey}T00:00:00Z`);
  const todayKey = dateKey(year, month, day);
  const todayMs = Date.parse(`${todayKey}T00:00:00Z`);
  const endKey = new Date(nextMs - 86_400_000).toISOString().slice(0, 10);
  const days = Math.max(1, Math.round((nextMs - startMs) / 86_400_000));
  const daysLeft = Math.max(1, Math.round((nextMs - todayMs) / 86_400_000));

  return { startKey, nextKey, endKey, todayKey, days, daysLeft };
}

function MoneyInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
        Rp
      </span>
      <Input
        type="text"
        inputMode="numeric"
        value={formatNumber(value)}
        onChange={(event) =>
          onChange(parseInt(event.target.value.replace(/\D/g, ''), 10) || 0)
        }
        className={cn(
          'h-12 pl-11 rounded-xl font-semibold tabular-nums border-border',
          className
        )}
      />
    </div>
  );
}

export function SalaryPlanView({
  transactions,
  categories,
  monthlyIncome,
  payday,
  hasInstallments,
  emergencyFundTarget,
  emergencyFundBalance,
  isSaving,
  onSavePlan,
}: SalaryPlanViewProps) {
  const [form, setForm] = useState({
    monthlyIncome,
    payday,
    hasInstallments,
    emergencyFundTarget,
    emergencyFundBalance,
  });

  useEffect(() => {
    setForm({
      monthlyIncome,
      payday,
      hasInstallments,
      emergencyFundTarget,
      emergencyFundBalance,
    });
  }, [monthlyIncome, payday, hasInstallments, emergencyFundTarget, emergencyFundBalance]);

  const { year, month, day } = nowWIBParts();
  const cycle = useMemo(
    () => getPayCycle(year, month, day, form.payday),
    [year, month, day, form.payday]
  );

  const plan = useMemo(() => {
    const income = Math.max(0, form.monthlyIncome);
    const target = Math.max(0, form.emergencyFundTarget);
    const balance = Math.max(0, form.emergencyFundBalance);
    const targetReached = target > 0 ? balance >= target : true;

    const needsPct = 0.4;
    const obligationsPct = form.hasInstallments ? 0.3 : 0;
    const emergencyBasePct = 0.2 + (form.hasInstallments ? 0 : 0.3);
    const emergencyPct = emergencyBasePct + (targetReached ? 0 : 0.1);
    const investmentPct = targetReached ? 0.1 : 0;

    const needs = income * needsPct;
    const obligations = income * obligationsPct;
    const emergency = income * emergencyPct;
    const investment = income * investmentPct;

    const needCategoryIds = new Set(
      categories
        .filter((category) =>
          NEED_CATEGORY_NAMES.has(category.name.trim().toLowerCase())
        )
        .map((category) => category.id)
    );
    const obligationCategoryIds = new Set(
      categories
        .filter((category) => category.name.trim().toLowerCase() === 'cicilan & hutang')
        .map((category) => category.id)
    );

    const inCycle = (transaction: Transaction) => {
      const key = dateKeyWIB(transaction.date);
      return key >= cycle.startKey && key < cycle.nextKey;
    };

    const needsSpent = transactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          needCategoryIds.has(transaction.categoryId) &&
          inCycle(transaction)
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const todayNeedsSpent = transactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          needCategoryIds.has(transaction.categoryId) &&
          dateKeyWIB(transaction.date) === cycle.todayKey
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const obligationsSpent = transactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          obligationCategoryIds.has(transaction.categoryId) &&
          inCycle(transaction)
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const needsRemaining = Math.max(0, needs - needsSpent);
    const needsOver = Math.max(0, needsSpent - needs);
    const dailyLimit = cycle.days > 0 ? needs / cycle.days : 0;
    const todayRemaining = dailyLimit - todayNeedsSpent;
    const progress =
      target > 0 ? Math.min(Math.max((balance / target) * 100, 0), 100) : 100;
    const monthsToTarget =
      !targetReached && emergency > 0
        ? Math.max(1, Math.ceil((target - balance) / emergency))
        : 0;

    return {
      income,
      target,
      balance,
      targetReached,
      needs,
      obligations,
      emergency,
      investment,
      needsPct,
      obligationsPct,
      emergencyPct,
      investmentPct,
      needsSpent,
      todayNeedsSpent,
      obligationsSpent,
      needsRemaining,
      needsOver,
      dailyLimit,
      todayRemaining,
      progress,
      monthsToTarget,
    };
  }, [form, cycle, categories, transactions]);

  const cycleLabel = `${formatShortDate(cycle.startKey)} – ${formatShortDate(cycle.endKey)}`;
  const nextPaydayKey = cycle.todayKey === cycle.startKey ? cycle.startKey : cycle.nextKey;
  const nextPaydayLabel = formatDate(nextPaydayKey);

  const handleSave = () => {
    onSavePlan({
      monthlyIncome: Math.max(0, Math.round(form.monthlyIncome)),
      payday: Math.min(31, Math.max(1, Math.round(form.payday))),
      hasInstallments: form.hasInstallments,
      emergencyFundTarget: Math.max(0, Math.round(form.emergencyFundTarget)),
      emergencyFundBalance: Math.max(0, Math.round(form.emergencyFundBalance)),
    });
  };

  const allocationCards = [
    {
      key: 'needs',
      label: 'Biaya Hidup Wajib',
      pct: Math.round(plan.needsPct * 100),
      amount: plan.needs,
      note: 'Makan, transport, sewa, tagihan, kesehatan',
      icon: Wallet,
      wrap: 'bg-sky-50 border-sky-100 dark:bg-sky-950/40 dark:border-sky-900',
      iconWrap: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
    },
    {
      key: 'obligations',
      label: 'Cicilan & Kewajiban',
      pct: Math.round(plan.obligationsPct * 100),
      amount: plan.obligations,
      note:
        plan.obligations > 0
          ? `Terpakai ${formatCurrency(plan.obligationsSpent)}`
          : 'Tidak ada cicilan aktif',
      icon: Receipt,
      wrap: 'bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900',
      iconWrap: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    },
    {
      key: 'emergency',
      label: 'Dana Darurat',
      pct: Math.round(plan.emergencyPct * 100),
      amount: plan.emergency,
      note: plan.targetReached
        ? 'Target tercapai, jaga saldo'
        : 'Prioritas sampai target tercapai',
      icon: ShieldCheck,
      wrap: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900',
      iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    },
    {
      key: 'investment',
      label: 'Investasi',
      pct: Math.round(plan.investmentPct * 100),
      amount: plan.investment,
      note: plan.investment > 0 ? 'Mulai setelah dana darurat aman' : 'Ditunda ke dana darurat',
      icon: TrendingUp,
      wrap: 'bg-violet-50 border-violet-100 dark:bg-violet-950/40 dark:border-violet-900',
      iconWrap: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
    },
  ];

  const scheduleRows = [
    {
      time: '08:00',
      label: 'Gaji masuk',
      amount: plan.income,
      tone: 'text-emerald-600 dark:text-emerald-400',
      note: 'Pemasukan utama',
    },
    {
      time: '08:05',
      label: 'Setor dana darurat',
      amount: plan.emergency,
      tone: 'text-foreground',
      note: 'Rekening terpisah',
    },
    {
      time: '08:10',
      label: 'Setor investasi',
      amount: plan.investment,
      tone: 'text-foreground',
      note: plan.investment > 0 ? 'Reksa dana / instrumen lain' : 'Ditunda dulu',
    },
    {
      time: '08:15',
      label: 'Sisihkan biaya hidup',
      amount: plan.needs,
      tone: 'text-foreground',
      note: 'Rekening harian',
    },
    {
      time: '08:20',
      label: 'Bayar kewajiban',
      amount: plan.obligations,
      tone: 'text-foreground',
      note: plan.obligations > 0 ? 'Cicilan / tagihan wajib' : 'Tidak ada',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="soft-card p-6 md:p-8 bg-gradient-to-br from-primary/10 via-card to-card">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Calculator className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Rencana Gaji</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Metode 40 / 30 / 20 / 10</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gajian tanggal {form.payday} · Siklus {cycleLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-card border border-border px-5 py-4">
            <p className="text-[10px] font-medium text-muted-foreground">Gaji bulanan</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(plan.income)}</p>
            <p className="text-[11px] text-muted-foreground">Gajian berikutnya {nextPaydayLabel}</p>
          </div>
        </div>
      </div>

      <div className="soft-card p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Atur Rencana</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground">Gaji bulanan</label>
            <MoneyInput
              value={form.monthlyIncome}
              onChange={(value) => setForm((prev) => ({ ...prev, monthlyIncome: value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground">Tanggal gajian</label>
            <Input
              type="number"
              min={1}
              max={31}
              value={form.payday}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  payday: parseInt(event.target.value, 10) || 1,
                }))
              }
              className="h-12 rounded-xl font-semibold tabular-nums border-border"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground">Saldo dana darurat</label>
            <MoneyInput
              value={form.emergencyFundBalance}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, emergencyFundBalance: value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground">Target dana darurat</label>
            <MoneyInput
              value={form.emergencyFundTarget}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, emergencyFundTarget: value }))
              }
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-muted/50 border border-border p-4">
          <div className="flex items-center gap-3">
            <Switch
              id="installments"
              checked={form.hasInstallments}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, hasInstallments: checked }))
              }
            />
            <div>
              <label htmlFor="installments" className="text-sm font-medium">
                Ada cicilan / kewajiban aktif?
              </label>
              <p className="text-[11px] text-muted-foreground">
                Kalau tidak ada, porsi 30% otomatis dialihkan ke dana darurat.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  emergencyFundTarget: Math.max(0, prev.monthlyIncome * 2),
                }))
              }
              className="h-11 rounded-xl border-border"
            >
              Pakai target 2x gaji
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 rounded-xl bg-primary text-white"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Rencana
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {allocationCards.map((card) => (
          <div key={card.key} className={cn('rounded-2xl border p-4 md:p-5', card.wrap)}>
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-3', card.iconWrap)}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">{card.label}</p>
            <p className="text-lg md:text-xl font-bold tabular-nums mt-0.5">{formatCurrency(card.amount)}</p>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[11px] font-semibold">{card.pct}%</span>
              <span className="text-[10px] text-muted-foreground text-right">{card.note}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="soft-card p-6 md:p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <h4 className="text-sm font-semibold">Dana Darurat</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {plan.targetReached
                  ? 'Target tercapai. Jaga saldo dan mulai investasi.'
                  : `Kejar target ${formatCurrency(plan.target)} dulu sebelum investasi.`}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border',
                plan.targetReached
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
              )}
            >
              {plan.targetReached ? 'Fase 2 · Jaga & Investasi' : 'Fase 1 · Kejar Dana Darurat'}
            </span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(plan.balance)}</p>
              <p className="text-[11px] text-muted-foreground">dari {formatCurrency(plan.target)}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{Math.round(plan.progress)}%</p>
          </div>
          <Progress value={plan.progress} className="h-3" />

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-[10px] text-muted-foreground">Setoran / bulan</p>
              <p className="font-semibold tabular-nums">{formatCurrency(plan.emergency)}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-[10px] text-muted-foreground">Perkiraan</p>
              <p className="font-semibold">
                {plan.targetReached ? 'Sudah' : plan.monthsToTarget > 0 ? `${plan.monthsToTarget} bln` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-[10px] text-muted-foreground">Saran target</p>
              <p className="font-semibold tabular-nums">{formatCurrency(plan.income * 2)}</p>
            </div>
          </div>
        </div>

        <div className="soft-card p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Jatah Biaya Hidup</h4>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(plan.dailyLimit)}</p>
              <p className="text-[11px] text-muted-foreground">batas rata-rata per hari</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{cycle.daysLeft} hari lagi</p>
              <p className="text-[11px] text-muted-foreground">sampai gajian</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Terpakai siklus ini</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(plan.needsSpent)} / {formatCurrency(plan.needs)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  plan.needsOver > 0 ? 'bg-rose-500' : 'bg-primary'
                )}
                style={{ width: `${Math.min((plan.needsSpent / Math.max(plan.needs, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-[10px] text-muted-foreground">Terpakai hari ini</p>
              <p className="font-semibold tabular-nums">{formatCurrency(plan.todayNeedsSpent)}</p>
            </div>
            <div
              className={cn(
                'rounded-xl p-3',
                plan.todayRemaining < 0
                  ? 'bg-rose-50 dark:bg-rose-950/40'
                  : 'bg-emerald-50 dark:bg-emerald-950/40'
              )}
            >
              <p className="text-[10px] text-muted-foreground">
                {plan.todayRemaining < 0 ? 'Lewat batas' : 'Sisa jatah hari ini'}
              </p>
              <p
                className={cn(
                  'font-semibold tabular-nums',
                  plan.todayRemaining < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {formatCurrency(Math.abs(plan.todayRemaining))}
              </p>
            </div>
          </div>

          {plan.needsOver > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-100 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-[11px] text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>Biaya hidup sudah lewat {formatCurrency(plan.needsOver)}. Rem pengeluaran sampai gajian.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="soft-card p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <h4 className="text-sm font-semibold">Jadwal Gajian Berikutnya</h4>
            </div>
            <span className="text-[11px] font-medium text-primary">{nextPaydayLabel}</span>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            {scheduleRows.map((row, index) => (
              <div
                key={`${row.time}-${row.label}`}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3',
                  index > 0 && 'border-t border-border'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">{row.time}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{row.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{row.note}</p>
                  </div>
                </div>
                <p className={cn('text-sm font-semibold tabular-nums shrink-0', row.tone)}>
                  {formatCurrency(row.amount)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Jadwal ini pengingat alokasi, bukan transfer otomatis. Sesuaikan dengan jam gajian aktual.
          </p>
        </div>

        <div className="soft-card p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <PiggyBank className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Aturan Main</h4>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Biaya hidup wajib maksimal 40% dari gaji. Kalau lewat, kurangi besok.</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Dana darurat diutamakan sampai target tercapai. Jangan dipakai untuk jajan.</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Setelah target aman, porsi investasi 10% mulai dijalankan.</span>
            </li>
            <li className="flex gap-3">
              <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Update saldo dana darurat setiap kali setor atau menarik dana.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
