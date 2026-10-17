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
  Sparkles
} from 'lucide-react';
import { Dashboard } from '@/app/components/Dashboard';
import { TransactionList } from '@/app/components/TransactionList';
import { TransactionForm } from '@/app/components/TransactionForm';
import { ProfileView } from '@/app/components/ProfileView';
import { InsightView } from '@/app/components/InsightView';
import { Transaction, Category, INITIAL_CATEGORIES } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type View = 'dashboard' | 'insights' | 'transactions' | 'profile';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [emergencyFundTarget, setEmergencyFundTarget] = useState<number>(20000000);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const { toast } = useToast();

  const saveToCache = useCallback((type: 'transactions' | 'categories' | 'profile', data: any) => {
    localStorage.setItem(`koinku_${type}`, JSON.stringify(data));
  }, []);

  const syncWithServer = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      const [profileRes, catRes, transRes] = await Promise.all([
        fetch('/api/profile', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/transactions', { cache: 'no-store' }),
      ]);

      const allOk = profileRes.ok && catRes.ok && transRes.ok;
      setServerStatus(allOk ? 'ok' : 'error');

      const profileData = await profileRes.json().catch(() => null);
      if (profileData?.profile) {
        const p = { 
          initialBalance: Number(profileData.profile.initialBalance), 
          emergencyFundTarget: Number(profileData.profile.emergencyFundTarget) 
        };
        setInitialBalance(p.initialBalance);
        setEmergencyFundTarget(p.emergencyFundTarget);
        saveToCache('profile', p);
      }

      const catData = await catRes.json().catch(() => null);
      if (catData?.categories && catData.categories.length > 0) {
        setCategories(catData.categories);
        saveToCache('categories', catData.categories);
      }

      const transData = await transRes.json().catch(() => null);
      if (transData?.transactions) {
        setTransactions(transData.transactions);
        saveToCache('transactions', transData.transactions);
      }

      // Server tidak merespons sempurna → berhenti di sini.
      // Data lokal tetap dipakai, dan tidak ada dorong data yang membanjiri
      // request lambat saat database tidak terjangkau.
      if (!allOk) return;

      // Sinkronkan data cache lokal ke server jika server kosong
      // atau masih ada item dengan id sementara (negatif/string) yang belum di-sync
      const cachedTransactions = localStorage.getItem('koinku_transactions');
      const cachedCategories = localStorage.getItem('koinku_categories');
      const cachedProfile = localStorage.getItem('koinku_profile');

      let localTrans: any[] = [];
      let localCats: any[] = [];
      try {
        const parsedTrans = cachedTransactions ? JSON.parse(cachedTransactions) : null;
        const parsedCats = cachedCategories ? JSON.parse(cachedCategories) : null;
        if (Array.isArray(parsedTrans)) localTrans = parsedTrans;
        if (Array.isArray(parsedCats)) localCats = parsedCats;
      } catch {
        // cache corrupt — abaikan
      }

      const serverEmptyTrans = !transData?.transactions || transData.transactions.length === 0;
      const serverEmptyCats = !catData?.categories || catData.categories.length === 0;

      const isUnsyncedId = (id: any) => id == null || typeof id === 'string' || id <= 0;
      const pendingTrans = localTrans.filter((t) => isUnsyncedId(t.id));
      const pendingCats = localCats.filter((c) => isUnsyncedId(c.id));

      // Sinkron kategori dulu agar id baru bisa dipakai transaksi
      const catIdMap: Record<string, number> = {};
      let pushedCats = false;
      if (localCats.length > 0 && (serverEmptyCats || pendingCats.length > 0)) {
        const toPush = pendingCats.length > 0 ? pendingCats : localCats;
        try {
          const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toPush),
          });
          if (res.ok) {
            const resp = await res.json().catch(() => null);
            if (resp?.ids) {
              toPush.forEach((c, i) => {
                const newId = resp.ids[i];
                if (newId && c.id !== newId) catIdMap[String(c.id)] = newId;
              });
            } else if (resp?.id) {
              catIdMap[String(toPush[0].id)] = resp.id;
            }
            pushedCats = true;
          }
        } catch {
          // offline — tetap lokal
        }
      }

      let pushedTrans = false;
      if (localTrans.length > 0 && (serverEmptyTrans || pendingTrans.length > 0)) {
        const toPush = pendingTrans.length > 0 ? pendingTrans : localTrans;
        let ok = true;
        for (const t of toPush) {
          if (catIdMap[String(t.category_id)] != null) {
            t.category_id = catIdMap[String(t.category_id)];
            t.categoryId = t.category_id;
          }
          try {
            const res = await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(t),
            });
            if (!res.ok) {
              ok = false;
              break;
            }
          } catch {
            ok = false;
            break;
          }
        }
        pushedTrans = ok;
      }

      if ((!profileData?.profile || profileData.profile.initialBalance === undefined) && cachedProfile) {
        const localProfile = JSON.parse(cachedProfile);
        await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initialBalance: Number(localProfile.initialBalance) || 0,
            emergencyFundTarget: Number(localProfile.emergencyFundTarget) || 20000000,
          }),
        });
      }

      // Ambil ulang data server agar id int hasil sinkron ikut terekam di cache lokal
      if (pushedTrans || pushedCats) {
        const [t2, c2] = await Promise.all([
          fetch('/api/transactions', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ]);
        const td = await t2.json().catch(() => null);
        const cd = await c2.json().catch(() => null);
        if (td?.transactions) {
          setTransactions(td.transactions);
          saveToCache('transactions', td.transactions);
        }
        if (cd?.categories && cd.categories.length > 0) {
          setCategories(cd.categories);
          saveToCache('categories', cd.categories);
        }
      }
    } catch (err) {
      console.error('Sync Error:', err);
      setServerStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [saveToCache]);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const readCache = <T,>(key: string): T | null => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        // Cache rusak -> buang agar aplikasi tetap bisa jalan
        localStorage.removeItem(key);
        return null;
      }
    };

    const cachedTransactions = readCache<Transaction[]>('koinku_transactions');
    const cachedCategories = readCache<Category[]>('koinku_categories');
    const cachedProfile = readCache<{ initialBalance: number; emergencyFundTarget: number }>('koinku_profile');

    if (cachedTransactions) setTransactions(cachedTransactions);
    if (cachedCategories) setCategories(cachedCategories);
    else setCategories(INITIAL_CATEGORIES);

    if (cachedProfile) {
      setInitialBalance(Number(cachedProfile.initialBalance) || 0);
      setEmergencyFundTarget(Number(cachedProfile.emergencyFundTarget) || 20000000);
    }

    syncWithServer();

    const handleOnline = () => { setIsOnline(true); syncWithServer(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWithServer]);

  const missingSystemCategories = useMemo(() => {
    return INITIAL_CATEGORIES.filter(initial => 
      !categories.some(current => current.name.toLowerCase() === initial.name.toLowerCase())
    );
  }, [categories]);

  const handleUpdateProfile = async (balance: number, target: number) => {
    setIsSavingProfile(true);
    const newProfile = { initialBalance: balance, emergencyFundTarget: target };
    setInitialBalance(balance);
    setEmergencyFundTarget(target);
    saveToCache('profile', newProfile);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialBalance: balance, emergencyFundTarget: target }),
      });
      if (!res.ok) throw new Error('Gagal sinkron profil');
      toast({ title: "Profil Tersinkron" });
    } catch (err) {
      toast({ variant: "destructive", title: "Berhasil Lokal" });
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
      toast({ title: "Sistem Diperbarui" });
      await syncWithServer();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Sinkron" });
    } finally {
      setIsSyncingCategories(false);
    }
  };

  const handleAddTransaction = async (data: any) => {
    const isEdit = !!editingTransaction;
    const tempId = -Math.abs(Date.now());
    const id = isEdit ? editingTransaction!.id : tempId;
    const newTx = {
      id,
      description: data.description,
      amount: Number(data.amount),
      type: data.type,
      category_id: data.categoryId,
      date: editingTransaction?.date || new Date().toISOString(),
    };

    let updated = isEdit
      ? transactions.map(t => t.id === id ? { ...t, ...newTx, categoryId: data.categoryId } : t)
      : [{ ...newTx, categoryId: data.categoryId } as Transaction, ...transactions];

    setTransactions(updated as Transaction[]);
    saveToCache('transactions', updated);
    setIsFormOpen(false);
    setEditingTransaction(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      });
      const resp = await res.json().catch(() => null);
      if (!res.ok) throw new Error('Gagal simpan transaksi');
      if (resp?.id && resp.id !== id) {
        updated = updated.map(t => t.id === id ? { ...t, id: resp.id, categoryId: Number(newTx.category_id) } : t);
        setTransactions(updated as Transaction[]);
        saveToCache('transactions', updated);
      }
      toast({ title: isEdit ? "Data Diubah" : "Berhasil Dicatat" });
    } catch (err) {
      toast({ variant: "destructive", title: "Tersimpan Lokal" });
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveToCache('transactions', updated);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus transaksi');
      toast({ title: "Terhapus" });
    } catch (err) {
      toast({ variant: "destructive", title: "Terhapus Lokal" });
    }
  };

  const handleAddCategory = async (name: string, type: 'expense' | 'income', budget?: number) => {
    const tempId = -Math.abs(Date.now());
    const colors = ['#FFD93D', '#6C5CE7', '#FF8AAE', '#FF6B6B', '#44DDFF', '#FFA502', '#2ED573'];
    const newCat = { id: tempId, name, type, budget, color: colors[Math.floor(Math.random() * colors.length)] };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveToCache('categories', updated);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      });
      const resp = await res.json().catch(() => null);
      if (!res.ok) throw new Error('Gagal tambah kategori');
      if (resp?.id && resp.id !== tempId) {
        const updatedWithId = updated.map(c => c.id === tempId ? { ...c, id: resp.id } : c);
        setCategories(updatedWithId);
        saveToCache('categories', updatedWithId);
      }
      toast({ title: "Kategori Ditambah" });
    } catch (e) {
      toast({ title: "Simpan Lokal" });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    saveToCache('categories', updated);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus kategori');
      toast({ title: "Kategori Dihapus" });
    } catch (e) {
      toast({ title: "Hapus Lokal" });
    }
  };

  const handleUpdateCategoryBudget = async (id: number, budget: number) => {
    const updated = categories.map(c => c.id === id ? { ...c, budget } : c);
    setCategories(updated);
    saveToCache('categories', updated);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget }),
      });
      if (!res.ok) throw new Error('Gagal perbarui budget');
    } catch (e) {
      console.warn("Budget update local only");
    }
  };

  const handleResetData = async () => {
    setTransactions([]);
    saveToCache('transactions', []);
    try {
      const res = await fetch('/api/transactions', { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal bersihkan data');
      toast({ title: "Data Dibersihkan" });
    } catch (e) {
      toast({ title: "Reset Lokal" });
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
      new Date(t.date).toLocaleDateString(),
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

  if (!mounted) {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-40" />
      </div>
    );
  }

  const status = (() => {
    if (!isOnline) {
      return { tone: 'offline', label: 'Offline', sub: 'Data tersimpan di perangkat', Icon: WifiOff };
    }
    if (isSyncing) {
      return { tone: 'sync', label: 'Sinkron...', sub: 'Mengirim data', Icon: Loader2 };
    }
    if (serverStatus === 'error') {
      return { tone: 'error', label: 'Mode Lokal', sub: 'Server DB belum terjangkau', Icon: CloudOff };
    }
    if (serverStatus === 'ok') {
      return { tone: 'ok', label: 'Tersinkron', sub: 'Supabase terhubung', Icon: Wifi };
    }
    return { tone: 'idle', label: 'Memeriksa...', sub: 'Mengecek koneksi', Icon: Wifi };
  })();

  const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'insights', label: 'Insight', icon: Sparkles },
    { id: 'transactions', label: 'Riwayat', icon: History },
    { id: 'profile', label: 'Akun', icon: User },
  ];

  const pageTitle = view === 'dashboard' ? 'Beranda' : view === 'insights' ? 'Insight' : view === 'transactions' ? 'Riwayat' : 'Pengaturan';

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background overflow-hidden relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-white/80 backdrop-blur-xl border-r border-border p-6 gap-6 shrink-0 h-full z-40">
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
          status.tone === 'offline' ? "bg-rose-50 border-rose-100" :
          status.tone === 'error' ? "bg-amber-50 border-amber-100" :
          status.tone === 'sync' ? "bg-primary/5 border-primary/15" :
          "bg-emerald-50 border-emerald-100"
        )}>
          <status.Icon className={cn(
            "h-5 w-5 shrink-0",
            status.tone === 'offline' ? "text-rose-500" :
            status.tone === 'error' ? "text-amber-500" :
            "text-emerald-600",
            status.tone === 'sync' && "animate-spin"
          )} />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{status.label}</p>
            <p className="text-[11px] text-muted-foreground truncate">{status.sub}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-xl border-b border-border px-4 md:px-10 flex items-center justify-between shrink-0 z-40">
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
               <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full">
                 <WifiOff className="h-3.5 w-3.5" /> Offline
               </span>
             ) : serverStatus === 'error' ? (
               <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                 <CloudOff className="h-3.5 w-3.5" /> Lokal
               </span>
             ) : isSyncing ? (
               <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                 <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sinkron
               </span>
             ) : (
               <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                 <Wifi className="h-3.5 w-3.5" /> Tersinkron
               </span>
             )}
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
          <nav className="max-w-md mx-auto h-16 bg-white/95 backdrop-blur-xl border border-border rounded-[26px] px-1.5 flex items-center justify-between shadow-lg pointer-events-auto">
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
        <DialogContent className="p-0 bg-white max-w-lg w-[calc(100%-2rem)] sm:w-full h-[90dvh] rounded-[32px] overflow-hidden flex flex-col border border-border shadow-xl [&>button]:hidden">
          <DialogHeader className="p-6 pb-0 sr-only">
            <DialogTitle>Form Transaksi</DialogTitle>
            <DialogDescription>Catat pengeluaran atau pemasukan baru Anda.</DialogDescription>
          </DialogHeader>
          <TransactionForm 
            categories={categories} 
            initialData={editingTransaction} 
            onSubmit={handleAddTransaction} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
