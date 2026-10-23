"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  Plus,
  LayoutDashboard,
  History,
  CreditCard,
  WifiOff,
  Wifi,
  CloudOff,
  Loader2,
  Activity,
  Sparkles,
  HandCoins,
  RefreshCw
} from 'lucide-react';
import { Dashboard } from '@/app/components/Dashboard';
import { TransactionList } from '@/app/components/TransactionList';
import { TransactionForm } from '@/app/components/TransactionForm';
import { ProfileView } from '@/app/components/ProfileView';
import { InsightView } from '@/app/components/InsightView';
import { UtangView } from '@/app/components/UtangView';
import { Transaction, Category, Person, Debt, DebtDirection, INITIAL_CATEGORIES } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';

type View = 'dashboard' | 'insights' | 'transactions' | 'utang' | 'profile';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [emergencyFundTarget, setEmergencyFundTarget] = useState<number>(20000000);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);
  const [isSavingDebt, setIsSavingDebt] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [serverStatus, setServerStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setServerStatus('error');
      setLoadError('Tidak ada koneksi internet. Data hanya tersedia saat online.');
      setIsLoading(false);
      return;
    }

    setServerStatus('loading');
    setLoadError(null);

    try {
      const responses = await Promise.all([
        fetch('/api/profile', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/transactions', { cache: 'no-store' }),
        fetch('/api/people', { cache: 'no-store' }),
        fetch('/api/debts', { cache: 'no-store' }),
      ]);

      if (responses.some((res) => !res.ok)) {
        throw new Error('Database online tidak merespons. Periksa DATABASE_URL di server.');
      }

      const [profileData, catData, transData, peopleData, debtsData] = await Promise.all(
        responses.map((res) => res.json())
      );

      if (profileData?.profile) {
        setInitialBalance(Number(profileData.profile.initialBalance) || 0);
        setEmergencyFundTarget(Number(profileData.profile.emergencyFundTarget) || 20000000);
      }
      setCategories(Array.isArray(catData?.categories) ? catData.categories : []);
      setPeople(Array.isArray(peopleData?.people) ? peopleData.people : []);
      setTransactions(Array.isArray(transData?.transactions) ? transData.transactions : []);
      setDebts(Array.isArray(debtsData?.debts) ? debtsData.debts : []);
      setServerStatus('ok');
    } catch (error) {
      console.error('Load Error:', error);
      setServerStatus('error');
      setLoadError(
        error instanceof Error ? error.message : 'Gagal memuat data dari database online.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    loadData();

    const handleOnline = () => {
      setIsOnline(true);
      loadData();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData]);

  const missingSystemCategories = useMemo(() => {
    return INITIAL_CATEGORIES.filter(initial => 
      !categories.some(current => current.name.toLowerCase() === initial.name.toLowerCase())
    );
  }, [categories]);

  const handleAddDebt = async (data: { personName: string; amount: number; direction: DebtDirection; note: string; debtDate: string }) => {
    setIsSavingDebt(true);
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resp = await res.json().catch(() => null);
      if (!res.ok || !resp?.id) throw new Error(resp?.error || 'Gagal simpan utang');
      await loadData();
      toast({ title: 'Utang Tercatat' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSavingDebt(false);
    }
  };

  const handleDeleteDebt = async (id: number) => {
    try {
      const res = await fetch(`/api/debts?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus utang');
      await loadData();
      toast({ title: 'Terhapus' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleUpdateProfile = async (balance: number, target: number) => {
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialBalance: balance, emergencyFundTarget: target }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan profil');
      setInitialBalance(balance);
      setEmergencyFundTarget(target);
      toast({ title: 'Profil Tersimpan' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePushMissingCategories = async () => {
    if (!isOnline) return;
    setIsSyncingCategories(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missingSystemCategories),
      });
      if (!res.ok) throw new Error('Gagal sinkron kategori');
      await loadData();
      toast({ title: 'Sistem Diperbarui' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Sinkron',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSyncingCategories(false);
    }
  };

  const selfPersonId = people.find(p => p.isSelf)?.id ?? people[0]?.id;

  const handleAddPerson = async (name: string): Promise<Person | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const existing = people.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, is_self: false }),
      });
      const resp = await res.json().catch(() => null);
      if (!res.ok || !resp?.id) throw new Error(resp?.error || 'Gagal tambah orang');
      const person: Person = { id: resp.id, name: trimmed, isSelf: false };
      setPeople((prev) => [...prev, person]);
      return person;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menambah Orang',
        description: error instanceof Error ? error.message : undefined,
      });
      return null;
    }
  };

  const handleAddTransaction = async (data: any) => {
    const isEdit = !!editingTransaction;
    const paidById = data.paidById ?? selfPersonId ?? undefined;
    const newTx = {
      id: isEdit ? editingTransaction!.id : undefined,
      description: data.description,
      amount: Number(data.amount),
      type: data.type,
      category_id: data.categoryId,
      paid_by_id: paidById,
      for_person_id: data.forPersonId ?? null,
      date: editingTransaction?.date || new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      });
      const resp = await res.json().catch(() => null);
      if (!res.ok || !resp?.id) throw new Error(resp?.error || 'Gagal simpan transaksi');
      setIsFormOpen(false);
      setEditingTransaction(null);
      await loadData();
      toast({ title: isEdit ? 'Data Diubah' : 'Berhasil Dicatat' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus transaksi');
      await loadData();
      toast({ title: 'Terhapus' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleAddCategory = async (name: string, type: 'expense' | 'income', budget?: number) => {
    const colors = ['#FFD93D', '#6C5CE7', '#FF8AAE', '#FF6B6B', '#44DDFF', '#FFA502', '#2ED573'];
    const newCat = { name, type, budget, color: colors[Math.floor(Math.random() * colors.length)] };
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      });
      const resp = await res.json().catch(() => null);
      if (!res.ok || !resp?.id) throw new Error(resp?.error || 'Gagal tambah kategori');
      await loadData();
      toast({ title: 'Kategori Ditambah' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus kategori');
      await loadData();
      toast({ title: 'Kategori Dihapus' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleUpdateCategoryBudget = async (id: number, budget: number) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget }),
      });
      if (!res.ok) throw new Error('Gagal perbarui budget');
      await loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleResetData = async () => {
    try {
      const res = await fetch('/api/transactions', { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal bersihkan data');
      await loadData();
      toast({ title: 'Data Dibersihkan' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ transactions, categories, initialBalance, emergencyFundTarget }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koinku_backup.json`;
    a.click();
  };

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Deskripsi', 'Tipe', 'Nominal', 'Kategori'];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }),
      t.description,
      t.type === 'income' ? 'Masuk' : 'Keluar',
      t.amount,
      categories.find(c => c.id === t.categoryId)?.name || 'Lainnya'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koinku_laporan.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin opacity-40" />
          <p className="text-sm text-muted-foreground">Memuat data dari database online...</p>
        </div>
      </div>
    );
  }

  if (serverStatus === 'error' && transactions.length === 0 && categories.length === 0) {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
            <CloudOff className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <h1 className="text-lg font-bold">Database Online Tidak Terjangkau</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loadError ?? 'Periksa koneksi dan konfigurasi DATABASE_URL di server.'}
          </p>
          <button
            onClick={() => {
              setIsLoading(true);
              loadData();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white neo-interactive"
          >
            <RefreshCw className="h-4 w-4" /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const status = (() => {
    if (!isOnline) {
      return { tone: 'offline', label: 'Offline', sub: 'Tidak ada koneksi internet', Icon: WifiOff };
    }
    if (serverStatus === 'loading') {
      return { tone: 'sync', label: 'Memuat...', sub: 'Mengambil data online', Icon: Loader2 };
    }
    if (serverStatus === 'error') {
      return { tone: 'error', label: 'Server Terputus', sub: 'Database online tidak terjangkau', Icon: CloudOff };
    }
    return { tone: 'ok', label: 'Online', sub: 'Terhubung ke database online', Icon: Wifi };
  })();

  const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'insights', label: 'Insight', icon: Sparkles },
    { id: 'transactions', label: 'Riwayat', icon: History },
    { id: 'utang', label: 'Utang', icon: HandCoins },
    { id: 'profile', label: 'Akun', icon: User },
  ];

  const pageTitle = view === 'dashboard' ? 'Beranda' : view === 'insights' ? 'Insight' : view === 'transactions' ? 'Riwayat' : view === 'utang' ? 'Utang' : 'Pengaturan';

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background overflow-hidden relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-card/90 backdrop-blur-xl border-r border-border p-6 gap-6 shrink-0 h-full z-40">
        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="h-11 w-11 bg-primary flex items-center justify-center rounded-2xl shadow-sm">
            <CreditCard className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">KOIN KU</h1>
            <p className="text-[11px] text-muted-foreground">Financial Vault</p>
          </div>
        </div>

        <button
          onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
          className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-primary text-white font-semibold text-sm neo-interactive shadow-sm"
        >
          <Plus className="h-5 w-5" /> Catat Transaksi
        </button>

        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                view === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" /> {item.label}
            </button>
          ))}
        </nav>

        <div className={cn(
          "p-4 rounded-2xl border flex items-center gap-3",
          status.tone === 'offline' ? "bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900" :
          status.tone === 'error' ? "bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900" :
          status.tone === 'sync' ? "bg-primary/5 border-primary/15 dark:bg-primary/10 dark:border-primary/25" :
          "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900"
        )}>
          <status.Icon className={cn(
            "h-5 w-5 shrink-0",
            status.tone === 'offline' ? "text-rose-500 dark:text-rose-400" :
            status.tone === 'error' ? "text-amber-500 dark:text-amber-400" :
            "text-emerald-600 dark:text-emerald-400",
            status.tone === 'sync' && "animate-spin"
          )} />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{status.label}</p>
            <p className="text-[11px] text-muted-foreground truncate">{status.sub}</p>
          </div>
          {status.tone === 'error' && (
            <button
              onClick={() => {
                setIsLoading(true);
                loadData();
              }}
              aria-label="Coba lagi"
              className="ml-auto rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-16 md:h-20 bg-card/90 backdrop-blur-xl border-b border-border px-4 md:px-10 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-3">
            <div className="md:hidden h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
              <Activity className="text-white h-5 w-5" />
            </div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight truncate">
              {pageTitle}
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
             {!isOnline ? (
               <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-full">
                 <WifiOff className="h-3.5 w-3.5" /> Offline
               </span>
             ) : serverStatus === 'error' ? (
               <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full">
                 <CloudOff className="h-3.5 w-3.5" /> Terputus
               </span>
             ) : serverStatus === 'loading' ? (
               <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                 <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat
               </span>
             ) : (
               <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full">
                 <Wifi className="h-3.5 w-3.5" /> Online
               </span>
             )}
             <ThemeToggle />
             <Avatar className="h-10 w-10 ring-2 ring-border">
               <AvatarImage src={`https://picsum.photos/seed/user-pribadi/100`} alt="Avatar pengguna" />
               <AvatarFallback className="bg-primary/10 text-primary font-semibold">U</AvatarFallback>
             </Avatar>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar bg-background relative z-10">
          <div className="max-w-6xl mx-auto w-full pb-40 md:pb-10">
            {view === 'dashboard' && (
              <Dashboard 
                transactions={transactions} 
                categories={categories} 
                emergencyFundTarget={emergencyFundTarget} 
                initialBalance={initialBalance} 
              />
            )}
            {view === 'insights' && (
              <InsightView
                transactions={transactions}
                categories={categories}
                initialBalance={initialBalance}
                emergencyFundTarget={emergencyFundTarget}
              />
            )}
            {view === 'transactions' && (
              <TransactionList 
                transactions={transactions} 
                categories={categories} 
                onDelete={handleDeleteTransaction} 
                onEdit={(t) => { setEditingTransaction(t); setIsFormOpen(true); }} 
              />
            )}
            {view === 'utang' && (
              <UtangView
                debts={debts}
                isSaving={isSavingDebt}
                onAddDebt={handleAddDebt}
                onDeleteDebt={handleDeleteDebt}
              />
            )}
            {view === 'profile' && (
              <ProfileView 
                transactions={transactions}
                categories={categories}
                initialBalance={initialBalance}
                emergencyFundTarget={emergencyFundTarget}
                isOnline={isOnline}
                isSavingProfile={isSavingProfile}
                isSyncingCategories={isSyncingCategories}
                missingSystemCategories={missingSystemCategories}
                onUpdateProfile={handleUpdateProfile}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateCategoryBudget={handleUpdateCategoryBudget}
                onPushMissingCategories={handlePushMissingCategories}
                onExportJSON={handleExportJSON}
                onExportCSV={handleExportCSV}
                onResetData={handleResetData}
              />
            )}
          </div>
        </section>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed inset-x-0 bottom-0 px-4 pt-4 z-50 pointer-events-none safe-area-bottom">
          <nav className="max-w-md mx-auto h-16 bg-card/95 backdrop-blur-xl border border-border rounded-[26px] px-1.5 flex items-center justify-between shadow-lg pointer-events-auto">
            {navItems.slice(0, 2).map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-label={item.label}
                className={cn(
                  "flex-1 h-12 flex flex-col items-center justify-center rounded-2xl gap-0.5 transition-colors",
                  view === item.id ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
            <div className="flex-1 flex justify-center items-center">
              <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} aria-label="Catat transaksi baru"                 className="h-14 w-14 p-3.5 bg-primary text-white rounded-full flex items-center justify-center neo-interactive -translate-y-3 shadow-lg">
                <Plus className="h-6 w-6" />
              </button>
            </div>
            {navItems.slice(2).map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-label={item.label}
                className={cn(
                  "flex-1 h-12 flex flex-col items-center justify-center rounded-2xl gap-0.5 transition-colors",
                  view === item.id ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="p-0 bg-card max-w-lg w-[calc(100%-2rem)] sm:w-full h-[90dvh] rounded-[32px] overflow-hidden flex flex-col border border-border shadow-xl [&>button]:hidden">
          <DialogHeader className="p-6 pb-0 sr-only">
            <DialogTitle>Form Transaksi</DialogTitle>
            <DialogDescription>Catat pengeluaran atau pemasukan baru Anda.</DialogDescription>
          </DialogHeader>
          <TransactionForm
            categories={categories}
            people={people}
            initialData={editingTransaction}
            onSubmit={handleAddTransaction}
            onCancel={() => setIsFormOpen(false)}
            onAddPerson={handleAddPerson}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
