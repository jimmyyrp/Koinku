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
  LogOut
} from 'lucide-react';
import { Dashboard } from '@/app/components/Dashboard';
import { TransactionList } from '@/app/components/TransactionList';
import { TransactionForm } from '@/app/components/TransactionForm';
import { ProfileView } from '@/app/components/ProfileView';
import { LoginScreen } from '@/app/components/LoginScreen';
import { Transaction, Category, INITIAL_CATEGORIES } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type View = 'dashboard' | 'transactions' | 'profile';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();

  const saveToCache = useCallback((type: 'transactions' | 'categories' | 'profile', data: any) => {
    localStorage.setItem(`koinku_${type}`, JSON.stringify(data));
  }, []);

  useEffect(() => {
    const auth = localStorage.getItem('koinku_auth');
    setIsAuthenticated(auth === 'true');
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (res.ok && data?.ok) {
        localStorage.setItem('koinku_auth', 'true');
        setIsAuthenticated(true);
        return { ok: true as const };
      }
      return {
        ok: false as const,
        message: data?.error || 'Server tidak merespons. Coba lagi beberapa saat.',
      };
    } catch (err) {
      console.error('Login Error:', err);
      return { ok: false as const, message: 'Tidak dapat terhubung ke server.' };
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('koinku_auth');
    setIsAuthenticated(false);
    setView('dashboard');
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

      // Migrasi otomatis: dorong data cache lokal ke MongoDB jika server kosong
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

  if (!mounted || isAuthenticated === null) {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-40" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
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
      return { tone: 'ok', label: 'Tersinkron', sub: 'MongoDB terhubung', Icon: Wifi };
    }
    return { tone: 'idle', label: 'Memeriksa...', sub: 'Mengecek koneksi', Icon: Wifi };
  })();

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background overflow-hidden relative selection:bg-primary/30">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r-4 border-black p-8 gap-8 shrink-0 h-full z-40">
        <div className="flex items-center gap-4 px-2">
          <div className="h-12 w-12 bg-black neo-border border-white flex items-center justify-center rounded-2xl neo-shadow-sm">
            <CreditCard className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">KOIN KU</h1>
        </div>
        <button 
          onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
          className="w-full flex items-center justify-center gap-3 p-5 rounded-[24px] bg-primary text-white font-black uppercase text-[11px] tracking-widest neo-interactive neo-border neo-shadow-sm"
        >
          <Plus className="h-5 w-5" /> Catat Baru
        </button>
        <nav className="flex-1 space-y-3">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'transactions', label: 'Log', icon: History },
            { id: 'profile', label: 'Akun', icon: User },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-4 p-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest transition-all neo-interactive",
                view === item.id ? "bg-secondary neo-border neo-shadow-sm translate-x-1" : "hover:bg-muted opacity-40"
              )}
            >
              <item.icon className="h-5 w-5" /> {item.label}
            </button>
          ))}
        </nav>
        <div className={cn(
          "p-4 rounded-[28px] border-2 border-dashed flex items-center gap-3 min-h-[72px]",
          status.tone === 'offline' ? "bg-red-50 border-red-200" :
          status.tone === 'error' ? "bg-amber-50 border-amber-300" :
          status.tone === 'sync' ? "bg-primary/10 border-primary/30" :
          "bg-primary/5 border-primary/20"
        )}>
          <status.Icon className={cn(
            "h-5 w-5 shrink-0",
            status.tone === 'offline' ? "text-red-500" :
            status.tone === 'error' ? "text-amber-500" :
            "text-primary",
            status.tone === 'sync' && "animate-spin"
          )} />
          <div className="min-w-0">
            <p className={cn(
              "font-black text-[10px] uppercase truncate",
              status.tone === 'offline' ? "text-red-500" :
              status.tone === 'error' ? "text-amber-600" :
              "text-primary"
            )}>
              {status.label}
            </p>
            <p className="text-[8px] font-bold uppercase opacity-50 truncate">{status.sub}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-[20px] border-2 border-red-200 text-red-500 font-black uppercase text-[10px] tracking-widest neo-interactive hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" /> Keluar
        </button>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Mobile Header */}
        <header className="h-20 bg-white border-b-4 border-black px-6 md:px-10 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-4">
            <div className="md:hidden h-10 w-10 bg-black rounded-xl flex items-center justify-center neo-border border-white/20">
              <Activity className="text-white h-5 w-5" />
            </div>
            <h2 className="text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-[0.15em] sm:tracking-[0.3em] opacity-80 italic truncate">
              {view === 'dashboard' ? 'Home' : view === 'transactions' ? 'Riwayat' : 'Pengaturan'}
            </h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
             {!isOnline ? (
               <WifiOff className="h-4 w-4 text-red-500" />
             ) : serverStatus === 'error' ? (
               <CloudOff className="h-4 w-4 text-amber-500" />
             ) : isSyncing ? (
               <Loader2 className="h-4 w-4 animate-spin opacity-40" />
             ) : null}
             <Avatar className="h-10 w-10 neo-border border-2 neo-shadow-sm">
               <AvatarImage src={`https://picsum.photos/seed/user-pribadi/100`} alt="Avatar pengguna" />
               <AvatarFallback>U</AvatarFallback>
             </Avatar>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar bg-[#f9fbf9] relative z-10">
          <div className="max-w-6xl mx-auto w-full pb-40 md:pb-10">
            {view === 'dashboard' && (
              <Dashboard 
                transactions={transactions} 
                categories={categories} 
                emergencyFundTarget={emergencyFundTarget} 
                initialBalance={initialBalance} 
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
                onLogout={handleLogout}
              />
            )}
          </div>
        </section>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed inset-x-0 bottom-0 px-4 pt-4 z-50 pointer-events-none safe-area-bottom">
          <nav className="max-w-md mx-auto h-20 bg-white/95 backdrop-blur-xl neo-border rounded-[32px] px-2 flex items-center justify-between shadow-2xl pointer-events-auto">
            <button onClick={() => setView('dashboard')} aria-label="Beranda" className={cn("flex-1 h-14 flex flex-col items-center justify-center rounded-2xl gap-1", view === 'dashboard' ? "bg-secondary neo-border neo-shadow-sm" : "opacity-40")}>
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-[8px] font-black uppercase">Home</span>
            </button>
            <button onClick={() => setView('transactions')} aria-label="Riwayat transaksi" className={cn("flex-1 h-14 flex flex-col items-center justify-center rounded-2xl gap-1", view === 'transactions' ? "bg-secondary neo-border neo-shadow-sm" : "opacity-40")}>
              <History className="h-5 w-5" />
              <span className="text-[8px] font-black uppercase">Log</span>
            </button>
            <div className="flex-1 flex justify-center items-center">
              <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} aria-label="Catat transaksi baru" className="h-14 w-14 bg-primary text-white neo-border rounded-full flex items-center justify-center neo-interactive -translate-y-2 border-white/20 shadow-xl">
                <Plus className="h-7 w-7" />
              </button>
            </div>
            <button onClick={() => setView('profile')} aria-label="Akun dan pengaturan" className={cn("flex-1 h-14 flex flex-col items-center justify-center rounded-2xl gap-1", view === 'profile' ? "bg-secondary neo-border neo-shadow-sm" : "opacity-40")}>
              <User className="h-5 w-5" />
              <span className="text-[8px] font-black uppercase">Akun</span>
            </button>
          </nav>
        </div>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="p-0 bg-white max-w-lg w-[calc(100%-2rem)] sm:w-full h-[90dvh] rounded-[40px] sm:rounded-[40px] md:rounded-[48px] overflow-hidden flex flex-col neo-border shadow-2xl [&>button]:hidden">
          <DialogHeader className="p-6 pb-0 sr-only">
            <DialogTitle>Form Transaksi Elit</DialogTitle>
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
