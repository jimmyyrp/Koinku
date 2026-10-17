"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category } from '@/app/lib/types';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  Trash2,
  Edit2,
  ChevronDown,
  LayoutGrid,
  Sparkles,
  Filter,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency, formatTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onDelete: (id: number) => void;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, categories, onDelete, onEdit }: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(10);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(t => activeTab === 'all' || t.type === activeTab)
      .filter(t => categoryFilter === 'all' || t.categoryId === Number(categoryFilter));
  }, [transactions, searchTerm, activeTab, categoryFilter]);

  const groupedTransactions = useMemo(() => {
    if (!mounted) return [];
    
    const groups: { [key: string]: Transaction[] } = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    filtered.forEach(t => {
      const date = new Date(t.date);
      const dateStr = date.toDateString();
      let label = "";

      if (dateStr === today) label = "Hari Ini";
      else if (dateStr === yesterday) label = "Kemarin";
      else label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    });

    return Object.entries(groups).map(([label, items]) => ({ label, items }));
  }, [filtered, mounted]);

  const paginatedGroups = useMemo(() => {
    let count = 0;
    const result = [];
    for (const group of groupedTransactions) {
      if (count >= pageSize) break;
      const itemsToShow = group.items.slice(0, pageSize - count);
      result.push({ label: group.label, items: itemsToShow });
      count += itemsToShow.length;
    }
    return result;
  }, [groupedTransactions, pageSize]);

  const pieData = useMemo(() => {
    const totalFiltered = filtered.reduce((sum, t) => sum + t.amount, 0);
    if (totalFiltered === 0) return [];
    
    return categories
      .filter(c => activeTab === 'all' || c.type === activeTab)
      .map(cat => {
        const amount = filtered
          .filter(t => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);
        return { name: cat.name, value: amount, color: cat.color };
      })
      .filter(d => d.value > 0);
  }, [categories, activeTab, filtered]);

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="lg:col-span-8 space-y-6">
        {/* Filters Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari transaksi..." 
                className="pl-11 h-12 md:h-14 rounded-2xl bg-white font-medium border-border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-1 p-1 bg-white rounded-2xl border border-border">
              {(['all', 'expense', 'income'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-5 md:px-6 py-2 md:py-2.5 rounded-xl text-xs font-semibold transition-all",
                    activeTab === tab ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tab === 'all' ? 'Semua' : tab === 'expense' ? 'Keluar' : 'Masuk'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] rounded-xl bg-white font-medium text-sm border-border">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm">Semua Kategori</SelectItem>
                {categories.filter(c => activeTab === 'all' || c.type === activeTab).map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)} className="text-sm">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setCategoryFilter('all')} className="h-9 px-3 rounded-xl">
                <X className="h-3.5 w-3.5 mr-1.5" /> <span className="text-xs font-medium">Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* List Content Grouped by Date */}
        <div className="space-y-8">
          {paginatedGroups.length > 0 ? (
            paginatedGroups.map((group) => (
              <div key={group.label} className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-400">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-[11px] font-medium text-muted-foreground">{group.label}</p>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {group.items.map((t) => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    return (
                      <div key={t.id} className="soft-card p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                        <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0">
                          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat?.color || '#eee' }}>
                            {t.type === 'income' ? <ArrowDownLeft className="h-5 w-5 text-white" /> : <ArrowUpRight className="h-5 w-5 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm md:text-base font-semibold truncate tracking-tight leading-tight">{t.description}</h3>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {cat?.name || 'Tanpa Kategori'} • {formatTime(t.date)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 shrink-0 md:ml-4">
                          <p className={cn("text-base md:text-lg font-semibold tabular-nums whitespace-nowrap", t.type === 'income' ? "text-emerald-600" : "text-foreground")}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </p>
                          <div className="flex gap-1.5 md:gap-2">
                            <button
                              onClick={() => onEdit(t)}
                              aria-label={`Ubah transaksi ${t.description}`}
                              className="p-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  aria-label={`Hapus transaksi ${t.description}`}
                                  className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-semibold text-lg">Hapus Data?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm">Aksi ini permanen dan tidak bisa dibatalkan.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDelete(t.id)} className="rounded-xl bg-destructive text-white">Hapus</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-12 text-center border border-dashed border-border rounded-3xl text-muted-foreground">
              Belum ada riwayat ditemukan.
            </div>
          )}
        </div>

        {/* Load More */}
        {filtered.length > paginatedGroups.reduce((acc, g) => acc + g.items.length, 0) && (
          <div className="flex justify-center pt-6">
            <Button onClick={() => setPageSize(prev => prev + 10)} className="bg-primary text-white px-8 h-12 font-semibold rounded-2xl text-sm neo-interactive">
              Lihat Lebih Banyak <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Analytics Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <div className="soft-card lg:sticky lg:top-6">
          <div className="flex items-center gap-2 mb-6 text-muted-foreground">
            <LayoutGrid className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Distribusi Kategori</h4>
          </div>
          {pieData.length > 0 ? (
            <div className="flex flex-col">
              <div className="h-48 md:h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-border p-3 rounded-xl text-xs shadow-lg">
                            <p className="text-muted-foreground mb-0.5">{payload[0].name}</p>
                            <p className="text-sm font-semibold">{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-6">
                {pieData.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground truncate max-w-[140px]">{d.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {Math.round((d.value / (filtered.reduce((s, x) => s + x.amount, 0) || 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Sparkles className="h-9 w-9 mb-3 opacity-40" />
              <p className="text-xs text-center">Data grafik belum cukup.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
