"use client"

import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  Database, 
  Target, 
  Activity, 
  Save, 
  FileJson, 
  FileSpreadsheet, 
  Settings, 
  Plus, 
  Search, 
  Zap,
  Loader2,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Category, Transaction } from '@/app/lib/types';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

interface ProfileViewProps {
  transactions: Transaction[];
  categories: Category[];
  initialBalance: number;
  emergencyFundTarget: number;
  isOnline: boolean;
  isSavingProfile: boolean;
  isSyncingCategories: boolean;
  missingSystemCategories: Category[];
  onUpdateProfile: (balance: number, target: number) => void;
  onAddCategory: (name: string, type: 'expense' | 'income', budget?: number) => void;
  onDeleteCategory: (id: number) => void;
  onUpdateCategoryBudget: (id: number, budget: number) => void;
  onPushMissingCategories: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onResetData: () => void;
}

export function ProfileView({
  transactions,
  categories,
  initialBalance,
  emergencyFundTarget,
  isOnline,
  isSavingProfile,
  isSyncingCategories,
  missingSystemCategories,
  onUpdateProfile,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategoryBudget,
  onPushMissingCategories,
  onExportJSON,
  onExportCSV,
  onResetData
}: ProfileViewProps) {
  const [tempBalance, setTempBalance] = useState(initialBalance);
  const [tempTarget, setTempTarget] = useState(emergencyFundTarget);
  const [catSearch, setCatSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'expense' | 'income'>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState<number>(0);

  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = initialBalance + totalIncome - totalExpense;
    const savingsRatio = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo);
    const dailyAverage = recentExpenses.length > 0 ? recentExpenses.reduce((sum, t) => sum + t.amount, 0) / 30 : 0;

    const progressToTarget = emergencyFundTarget > 0 ? (currentBalance / emergencyFundTarget) * 100 : 0;
    const healthScore = Math.min(Math.max((savingsRatio * 0.5) + (progressToTarget * 0.5), 0), 100);

    return { totalIncome, totalExpense, currentBalance, savingsRatio, dailyAverage, healthScore };
  }, [transactions, initialBalance, emergencyFundTarget]);

  const categoryUsage = useMemo(() => {
    const usage: { [key: string]: number } = {};
    transactions.forEach(t => {
      usage[t.categoryId] = (usage[t.categoryId] || 0) + t.amount;
    });
    return usage;
  }, [transactions]);

  const filteredCategories = useMemo(() => {
    return categories
      .filter(c => c.type === catFilter)
      .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catFilter, catSearch]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Profile Header */}
      <div className="soft-card p-6 md:p-8 flex flex-col items-center text-center">
        <Avatar className="h-20 w-20 md:h-24 md:w-24 mb-4 ring-4 ring-primary/10">
          <AvatarImage src={`https://picsum.photos/seed/koin-ku-pro/150`} alt="Avatar profil" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">U</AvatarFallback>
        </Avatar>
        <h3 className="text-xl md:text-2xl font-bold tracking-tight">Profil Finansial</h3>
        <p className="text-xs text-muted-foreground mt-1">Solo Edition Pro v6.0</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-6">
          
          {/* Health Score Card */}
          <div className={cn(
            "soft-card border flex items-center justify-between gap-3 p-5 md:p-6",
            stats.healthScore > 70 ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900" : stats.healthScore > 40 ? "bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900" : "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900"
          )}>
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-card flex items-center justify-center shrink-0 shadow-sm">
                <Zap className={cn("h-6 w-6", stats.healthScore > 40 ? "text-primary" : "text-amber-500 dark:text-amber-400")} />
              </div>
              <div className="min-w-0">
                 <h4 className="text-xl md:text-2xl font-bold tracking-tight tabular-nums">{Math.round(stats.healthScore)} / 100</h4>
                 <p className="text-xs text-muted-foreground truncate">Skor Kesehatan Finansial</p>
              </div>
            </div>
            <div className="text-right hidden sm:block shrink-0">
              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Performa</p>
              <p className={cn("text-sm font-semibold", stats.healthScore > 50 ? "text-primary" : "text-amber-600 dark:text-amber-400")}>
                {stats.healthScore > 70 ? 'Optimal' : stats.healthScore > 40 ? 'Stabil' : 'Waspada'}
              </p>
            </div>
          </div>

          {/* Category Management */}
          <div className="soft-card space-y-6">
            <div className="flex flex-col gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Kelola Kategori & Anggaran</h4>
              </div>
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari kategori..." 
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  className="rounded-xl h-11 pl-11 text-sm font-medium w-full border-border"
                />
              </div>
            </div>
            
            <div className="flex gap-1 p-1 bg-muted rounded-2xl w-full">
              {(['expense', 'income'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCatFilter(type)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all",
                    catFilter === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 bg-muted/50 p-4 rounded-2xl border border-border">
                <p className="text-[11px] font-medium text-muted-foreground">Tambah Kategori Baru</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    placeholder="Nama Kategori..." 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="rounded-xl h-11 text-sm font-medium w-full sm:flex-1 min-w-0 border-border"
                  />
                  {catFilter === 'expense' && (
                    <Input 
                      placeholder="Anggaran (Rp)..." 
                      inputMode="numeric"
                      value={newCatBudget === 0 ? '' : newCatBudget.toLocaleString('id-ID')}
                      onChange={(e) => setNewCatBudget(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                      className="rounded-xl h-11 text-sm font-medium w-full sm:w-36 min-w-0 border-border"
                    />
                  )}
                  <Button onClick={() => { onAddCategory(newCatName, catFilter, newCatBudget); setNewCatName(''); setNewCatBudget(0); }} disabled={!newCatName} aria-label="Tambah kategori" className="h-11 w-full sm:w-11 bg-primary text-white rounded-xl shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="flex flex-col gap-3 p-4 bg-card border border-border rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium truncate block">{cat.name}</span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:bg-rose-950/40 rounded-xl transition-all">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-semibold text-lg">Hapus Kategori?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">Aksi ini akan menghapus kategori "{cat.name}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteCategory(cat.id)} className="bg-destructive text-white rounded-xl">Ya, Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    {cat.type === 'expense' && (
                      <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl">
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Batas Anggaran Bulanan</p>
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-semibold">Rp</span>
                             <input 
                               type="text"
                               value={cat.budget?.toLocaleString('id-ID') || '0'}
                               onChange={(e) => onUpdateCategoryBudget(cat.id, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                               className="bg-transparent border-none focus:outline-none text-sm font-semibold w-full"
                             />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-medium text-muted-foreground">Terpakai</p>
                          <p className={cn("text-xs font-semibold tabular-nums", (categoryUsage[cat.id] || 0) > (cat.budget || 0) && cat.budget ? "text-rose-500 dark:text-rose-400" : "text-primary")}>
                            {cat.budget ? `${Math.min(Math.round(((categoryUsage[cat.id] || 0) / cat.budget) * 100), 999)}%` : 'â€”'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Tidak ada kategori.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 space-y-6">
          {/* Targets & Balance */}
          <div className="soft-card space-y-6">
            <div className="flex items-center gap-2.5 border-b border-border pb-4">
              <Target className="h-4 w-4 text-accent" />
              <h4 className="font-semibold text-sm">Target & Saldo</h4>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground">Saldo Awal</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">Rp</span>
                  <Input 
                    type="text" 
                    inputMode="numeric"
                    value={formatNumber(tempBalance)} 
                    onChange={(e) => setTempBalance(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} 
                    className="h-14 pl-12 font-bold text-lg rounded-2xl bg-muted/40 border-border tabular-nums" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground">Target Dana Darurat</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">Rp</span>
                  <Input 
                    type="text" 
                    inputMode="numeric"
                    value={formatNumber(tempTarget)} 
                    onChange={(e) => setTempTarget(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} 
                    className="h-14 pl-12 font-bold text-lg rounded-2xl bg-muted/40 border-border tabular-nums" 
                  />
                </div>
              </div>
              <Button 
                onClick={() => onUpdateProfile(tempBalance, tempTarget)} 
                disabled={isSavingProfile}
                className="w-full h-14 bg-primary text-white hover:bg-primary/90 font-semibold text-sm rounded-2xl flex gap-2 transition-all"
              >
                {isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Simpan Profil
              </Button>
            </div>
          </div>

          {/* Data Controls */}
          <div className="soft-card space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border pb-4">
              <Database className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Kontrol Data</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
              <Button onClick={onExportJSON} variant="outline" className="h-12 rounded-xl font-medium text-sm flex gap-2 border-border">
                <FileJson className="h-4 w-4" /> Backup JSON
              </Button>
              <Button onClick={onExportCSV} variant="outline" className="h-12 rounded-xl font-medium text-sm flex gap-2 border-border">
                <FileSpreadsheet className="h-4 w-4" /> Laporan CSV
              </Button>
            </div>

            {missingSystemCategories.length > 0 && (
              <Button onClick={onPushMissingCategories} disabled={isSyncingCategories || !isOnline} variant="outline" className="w-full h-12 rounded-xl font-medium text-sm flex gap-2 border-border">
                {isSyncingCategories ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                Sinkron Kategori Sistem
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full h-12 rounded-xl font-medium text-sm flex gap-2 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" /> Bersihkan Seluruh Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-semibold text-lg flex items-center gap-2">
                    <AlertTriangle className="text-rose-500 dark:text-rose-400 h-5 w-5" /> Hapus Semua Data?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">Ini adalah aksi permanen. Seluruh riwayat Anda akan hilang selamanya.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onResetData} className="bg-destructive text-white rounded-xl">HAPUS PERMANEN</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
