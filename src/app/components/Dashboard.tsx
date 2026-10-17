"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category } from '@/app/lib/types';
import { 
  Activity,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertCircle,
  ArrowRight,
  Heart,
  CalendarDays,
  Gauge
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip as RechartsTooltip
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatCurrency, formatShortDate } from '@/lib/format';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  emergencyFundTarget: number;
  initialBalance: number;
}

export function Dashboard({ transactions, categories, emergencyFundTarget, initialBalance }: DashboardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const incomeTotalAllTime = useMemo(() => transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0), [transactions]);
    
  const expenseTotalAllTime = useMemo(() => transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0), [transactions]);

  const currentBalance = initialBalance + incomeTotalAllTime - expenseTotalAllTime;

  const monthlyTotals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyIncome = transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return { monthlyIncome, monthlyExpense };
  }, [transactions]);

  const budgetAnalysis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const expenseCategories = categories.filter(c => c.type === 'expense' && c.budget);
    
    return expenseCategories.map(cat => {
      const spent = transactions
        .filter(t => t.categoryId === cat.id && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const budget = cat.budget || 0;
      const percent = budget > 0 ? (spent / budget) * 100 : 0;
      
      return { ...cat, spent, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [categories, transactions]);

  const progressPercentage = emergencyFundTarget > 0 
    ? Math.min(Math.max((currentBalance / emergencyFundTarget) * 100, 0), 100) 
    : 0;

  const healthStatus = useMemo(() => {
    const savingsRatio = monthlyTotals.monthlyIncome > 0 
      ? (monthlyTotals.monthlyIncome - monthlyTotals.monthlyExpense) / monthlyTotals.monthlyIncome 
      : 0;
    
    if (savingsRatio > 0.3) return { label: 'Sangat Sehat', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Heart };
    if (savingsRatio > 0) return { label: 'Stabil', color: 'text-sky-600', bg: 'bg-sky-50', icon: Activity };
    return { label: 'Perlu Perhatian', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle };
  }, [monthlyTotals]);

  const chartData = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.toDateString() === d.toDateString();
      });
      const netValue = dayTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
      return { name: label, balance: netValue };
    });
  }, [transactions, mounted]);

  const recentTransactions = useMemo(() => [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4), [transactions]);

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="lg:col-span-8 space-y-6 md:space-y-8">
        {/* Main Wallet Card */}
        <div className="soft-card p-6 md:p-8 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <p className="text-xs font-medium">Saldo Saat Ini</p>
              </div>
              <h3 className="text-[clamp(1.75rem,7vw,3.25rem)] font-bold tracking-tight tabular-nums break-words leading-none">
                {formatCurrency(currentBalance)}
              </h3>
            </div>
            <div className={cn("px-4 py-3 rounded-2xl border flex items-center gap-3", healthStatus.bg, "border-border")}>
              <healthStatus.icon className={cn("h-5 w-5 animate-pulse-soft", healthStatus.color)} />
              <div className="text-left">
                <p className="text-[10px] font-medium text-muted-foreground">Kesehatan</p>
                <p className={cn("text-sm font-semibold", healthStatus.color)}>{healthStatus.label}</p>
              </div>
            </div>
          </div>
            
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3 bg-muted rounded-xl text-center min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Awal</p>
              <p className="font-semibold text-[11px] tabular-nums truncate">{formatCurrency(initialBalance)}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-center min-w-0">
              <p className="text-[10px] font-medium text-emerald-700 mb-1">Pemasukan</p>
              <p className="font-semibold text-[11px] text-emerald-700 tabular-nums truncate">+{formatCurrency(monthlyTotals.monthlyIncome)}</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-center min-w-0">
              <p className="text-[10px] font-medium text-rose-700 mb-1">Pengeluaran</p>
              <p className="font-semibold text-[11px] text-rose-700 tabular-nums truncate">-{formatCurrency(monthlyTotals.monthlyExpense)}</p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-2 text-muted-foreground">
               <CalendarDays className="h-3.5 w-3.5" />
               <p className="text-[11px] font-medium">Tren Arus Kas 7 Hari Terakhir</p>
             </div>
             <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cashflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <RechartsTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-border p-3 rounded-xl text-xs shadow-lg">
                          <p className="text-muted-foreground mb-0.5">{payload[0].payload.name}</p>
                          <p className={cn("font-semibold", (payload[0].value as number) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={3} fill="url(#cashflow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6 md:space-y-8">
        {/* Budget vs Actual Tracker */}
        <div className="soft-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-6">
            <Gauge className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Anggaran Bulanan</h4>
          </div>
          <div className="space-y-5">
            {budgetAnalysis.slice(0, 3).map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium truncate max-w-[45%]">{item.name}</span>
                  <span className={cn("tabular-nums text-right", item.percent > 90 ? "text-rose-600 font-semibold" : "text-muted-foreground")}>
                    {formatCurrency(item.spent)} / {formatCurrency(item.budget || 0)}
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 rounded-full",
                      item.percent > 100 ? "bg-rose-500" : item.percent > 75 ? "bg-amber-400" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(item.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {budgetAnalysis.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada anggaran diset.</p>
            )}
          </div>
        </div>

        {/* Savings Target Card */}
        <div className="soft-card bg-primary/5">
          <div className="flex justify-between items-center mb-6">
            <div className="h-11 w-11 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <Target className={cn("h-5 w-5", progressPercentage >= 100 ? "text-emerald-600" : "text-primary")} />
            </div>
            <div className="text-right">
               <span className="font-bold text-2xl tracking-tight block tabular-nums">{Math.round(progressPercentage)}%</span>
               <span className="text-[11px] text-muted-foreground">Dana Darurat</span>
            </div>
          </div>
          <h4 className="text-sm font-semibold mb-2">Target Tabungan</h4>
          <div className="flex items-center gap-2 mb-4 text-xs">
             <span className="font-semibold">{formatCurrency(currentBalance)}</span>
             <ArrowRight className="h-3 w-3 text-muted-foreground" />
             <span className="text-muted-foreground">{formatCurrency(emergencyFundTarget)}</span>
          </div>
          <Progress value={progressPercentage} className="h-3 bg-white rounded-full overflow-hidden" />
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground">Aktivitas Terakhir</h4>
          <div className="space-y-3">
            {recentTransactions.map((t) => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="soft-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat?.color || '#eee' }}>
                      {t.type === 'income' ? <TrendingUp className="h-4 w-4 text-white" /> : <TrendingDown className="h-4 w-4 text-white" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-medium text-sm truncate">{t.description}</p>
                      <p className="text-[11px] text-muted-foreground">{formatShortDate(t.date)}</p>
                    </div>
                  </div>
                  <p className={cn("font-semibold text-sm shrink-0 tabular-nums", t.type === 'income' ? "text-emerald-600" : "text-foreground")}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                </div>
              );
            })}
            {recentTransactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada transaksi.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
