'use client';

import * as React from 'react';
import { ArrowDownLeft, ArrowUpRight, HandCoins, Plus, Trash2, UserRound, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Debt, DebtDirection } from '@/app/lib/types';
import { cn } from '@/lib/utils';
import { formatCurrency, formatShortDate, dateKeyWIB } from '@/lib/format';

interface UtangViewProps {
  debts: Debt[];
  isSaving: boolean;
  onAddDebt: (data: { personName: string; amount: number; direction: DebtDirection; note: string; debtDate: string }) => void;
  onDeleteDebt: (id: number) => void;
}

const DIRECTIONS: { value: DebtDirection; label: string; hint: string }[] = [
  { value: 'lend', label: 'Saya Pinjamkan', hint: 'Uang keluar, orang berhutang ke saya' },
  { value: 'borrow', label: 'Saya Pinjam', hint: 'Uang masuk, saya berhutang ke orang' },
  { value: 'repay_in', label: 'Dikembalikan ke Saya', hint: 'Orang kembalikan uangnya' },
  { value: 'repay_out', label: 'Saya Kembalikan', hint: 'Saya bayar hutang saya' },
];

export function UtangView({ debts, isSaving, onAddDebt, onDeleteDebt }: UtangViewProps) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [direction, setDirection] = React.useState<DebtDirection>('lend');
  const [personName, setPersonName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [debtDate, setDebtDate] = React.useState(() => dateKeyWIB(new Date()));

  const summary = React.useMemo(() => {
    const groups: Record<string, { lend: number; repayIn: number; borrow: number; repayOut: number; count: number }> = {};
    for (const d of debts) {
      const key = d.personName.toLowerCase().trim();
      if (!groups[key]) groups[key] = { lend: 0, repayIn: 0, borrow: 0, repayOut: 0, count: 0 };
      if (d.direction === 'lend') groups[key].lend += d.amount;
      else if (d.direction === 'repay_in') groups[key].repayIn += d.amount;
      else if (d.direction === 'borrow') groups[key].borrow += d.amount;
      else groups[key].repayOut += d.amount;
      groups[key].count += 1;
    }
    return Object.entries(groups)
      .map(([key, g]) => ({
        key,
        name: debts.find((d) => d.personName.toLowerCase().trim() === key)?.personName ?? key,
        owedToMe: g.lend - g.repayIn - (g.borrow - g.repayOut),
        lend: g.lend,
        repayIn: g.repayIn,
        borrow: g.borrow,
        repayOut: g.repayOut,
        count: g.count,
      }))
      .sort((a, b) => b.owedToMe - a.owedToMe);
  }, [debts]);

  const totalIAmOwed = summary.reduce((sum, s) => sum + Math.max(s.owedToMe, 0), 0);
  const totalIOwe = summary.reduce((sum, s) => sum + Math.max(-s.owedToMe, 0), 0);
  const peopleOwingMe = summary.filter((s) => s.owedToMe > 0).length;
  const peopleIOwe = summary.filter((s) => s.owedToMe < 0).length;

  const resetForm = () => {
    setPersonName('');
    setAmount('');
    setNote('');
    setDebtDate(dateKeyWIB(new Date()));
    setDirection('lend');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!personName.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    onAddDebt({
      personName: personName.trim(),
      amount: parsedAmount,
      direction,
      note: note.trim(),
      debtDate,
    });
    resetForm();
    setIsFormOpen(false);
  };

  const currentHint = DIRECTIONS.find((d) => d.value === direction)?.hint ?? '';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="soft-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <HandCoins className="h-4 w-4" />
              <p className="text-xs font-medium">Ringkasan Utang</p>
            </div>
            <h3 className="text-[clamp(1.5rem,6vw,2.5rem)] font-bold tracking-tight tabular-nums break-words leading-none text-foreground">
              {formatCurrency(totalIAmOwed - totalIOwe)}
            </h3>
            <p className="text-xs text-muted-foreground mt-2">Posisi bersih kamu</p>
          </div>
          <Button
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="rounded-2xl gap-2"
          >
            <Plus className="h-4 w-4" /> Catat Utang
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl min-w-0">
            <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mb-1">Orang Berhutang ke Saya</p>
            <p className="font-bold text-base sm:text-lg text-amber-700 dark:text-amber-400 tabular-nums truncate">
              {formatCurrency(totalIAmOwed)}
            </p>
            <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 mt-1">{peopleOwingMe} orang</p>
          </div>
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl min-w-0">
            <p className="text-[10px] font-medium text-rose-700 dark:text-rose-400 mb-1">Saya Berhutang ke Orang</p>
            <p className="font-bold text-base sm:text-lg text-rose-700 dark:text-rose-400 tabular-nums truncate">
              {formatCurrency(totalIOwe)}
            </p>
            <p className="text-[10px] text-rose-700/70 dark:text-rose-400/70 mt-1">{peopleIOwe} orang</p>
          </div>
        </div>
      </div>

      <div className="soft-card">
        <div className="flex items-center gap-2 mb-4">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Per Orang</h4>
        </div>
        {summary.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Belum ada data utang.</p>
        ) : (
          <div className="space-y-3">
            {summary.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className={cn(
                    "text-[11px] font-medium",
                    s.owedToMe > 0 ? "text-amber-600 dark:text-amber-400" : s.owedToMe < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                  )}>
                    {s.owedToMe > 0 ? `berhutang ke kamu ${formatCurrency(s.owedToMe)}`
                      : s.owedToMe < 0 ? `kamu berhutang ${formatCurrency(-s.owedToMe)}`
                      : 'sudah lunas'}
                  </p>
                  {(s.lend > 0 || s.borrow > 0) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.lend > 0 && `Dipinjamkan ${formatCurrency(s.lend)}`}
                      {s.lend > 0 && s.borrow > 0 && ' · '}
                      {s.borrow > 0 && `Dipinjam ${formatCurrency(s.borrow)}`}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    "text-sm font-bold tabular-nums",
                    s.owedToMe > 0 ? "text-amber-600 dark:text-amber-400" : s.owedToMe < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                  )}>
                    {formatCurrency(Math.abs(s.owedToMe))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.count} catatan</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="soft-card">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Riwayat Utang</h4>
        </div>
        {debts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Belum ada riwayat.</p>
        ) : (
          <div className="space-y-2">
            {debts.map((d) => {
              const meta = DIRECTIONS.find((dir) => dir.value === d.direction);
              const isOutgoing = d.direction === 'lend' || d.direction === 'repay_out';
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                    isOutgoing
                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                  )}>
                    {isOutgoing ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {meta?.label ?? d.direction} · {d.personName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {formatShortDate(d.debtDate)}{d.note ? ` · ${d.note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className={cn(
                      "text-sm font-bold tabular-nums",
                      isOutgoing ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {isOutgoing ? '-' : '+'}{formatCurrency(d.amount)}
                    </p>
                    <button
                      onClick={() => onDeleteDebt(d.id)}
                      aria-label="Hapus catatan utang"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card max-w-md w-[calc(100%-2rem)] rounded-[24px] border border-border">
          <DialogHeader>
            <DialogTitle>Catat Utang</DialogTitle>
            <DialogDescription>{currentHint}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {DIRECTIONS.map((dir) => (
                <button
                  key={dir.value}
                  type="button"
                  onClick={() => setDirection(dir.value)}
                  className={cn(
                    "py-2.5 px-2 rounded-xl text-[11px] font-semibold transition-colors border",
                    direction === dir.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {dir.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="personName">Nama Orang</Label>
              <Input
                id="personName"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="cth: Bg Yogi"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Nominal (Rp)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="cth: 30000"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debtDate">Tanggal</Label>
              <Input
                id="debtDate"
                type="date"
                value={debtDate}
                onChange={(e) => setDebtDate(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Catatan (opsional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="cth: untuk jajan"
                className="rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !personName.trim() || !amount}
                className="flex-1 rounded-xl"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
