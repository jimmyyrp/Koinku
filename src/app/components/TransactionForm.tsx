
"use client"

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Check, Search, User, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormField } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Category, Person, Transaction } from '@/app/lib/types';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(2, "Minimal 2 karakter"),
  amount: z.coerce.number().positive("Harus lebih dari 0"),
  type: z.enum(['income', 'expense']),
  categoryId: z.coerce.number().refine(v => v > 0, "Pilih kategori"),
  paidById: z.coerce.number().optional(),
});

interface TransactionFormProps {
  categories: Category[];
  people: Person[];
  initialData?: Transaction | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onAddPerson: (name: string) => Promise<Person | null>;
}

export function TransactionForm({ categories, people, initialData, onSubmit, onCancel, onAddPerson }: TransactionFormProps) {
  const [catSearch, setCatSearch] = useState('');
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [isSavingPerson, setIsSavingPerson] = useState(false);

  const selfPerson = people.find(p => p.isSelf) || people[0] || null;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      description: initialData.description,
      amount: initialData.amount,
      type: initialData.type,
      categoryId: initialData.categoryId,
      paidById: initialData.paidById || undefined,
    } : {
      description: "",
      amount: 0,
      type: "expense",
      categoryId: 0,
      paidById: selfPerson?.id,
    },
  });

  const currentType = form.watch('type');
  const currentAmount = form.watch('amount');
  const currentDesc = form.watch('description');
  const currentCatId = form.watch('categoryId');
  const currentPaidById = form.watch('paidById');

  const selectedPerson = people.find(p => p.id === currentPaidById) || null;
  const isUtang = currentType === 'expense' && selectedPerson != null && !selectedPerson.isSelf;

  const [displayAmount, setDisplayAmount] = useState(initialData?.amount.toLocaleString('id-ID') || '');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = parseInt(rawValue, 10) || 0;
    setDisplayAmount(numericValue > 0 ? numericValue.toLocaleString('id-ID') : '');
    form.setValue('amount', numericValue);
  };

  const handleSavePerson = async () => {
    const name = newPersonName.trim();
    if (!name || isSavingPerson) return;
    setIsSavingPerson(true);
    const person = await onAddPerson(name);
    setIsSavingPerson(false);
    if (person) {
      form.setValue('paidById', person.id);
      setNewPersonName('');
      setIsAddingPerson(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories
      .filter(c => c.type === currentType)
      .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, currentType, catSearch]);

  const isValid = currentCatId > 0 && currentAmount > 0 && currentDesc.length >= 2;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center">
            <Check className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold tracking-tight">
            {initialData ? "Ubah Transaksi" : "Catat Transaksi"}
          </h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10 rounded-xl hover:bg-rose-50 hover:text-rose-500">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-7 no-scrollbar pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Tipe & Nominal */}
            <div className="space-y-4">
              <div className="flex gap-1.5 p-1.5 bg-muted rounded-2xl w-fit mx-auto">
                {(['expense', 'income'] as const).map(type => (
                  <button key={type} type="button" onClick={() => { form.setValue('type', type); form.setValue('categoryId', 0); }} className={cn(
                      "px-7 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      currentType === type ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {type === 'expense' ? 'Keluar' : 'Masuk'}
                  </button>
                ))}
              </div>

              <div className="text-center space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground">Nominal Transaksi</label>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl md:text-3xl font-semibold text-muted-foreground shrink-0">Rp</span>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    value={displayAmount} 
                    onChange={handleAmountChange} 
                    placeholder="0"
                    className={cn(
                      "w-full min-w-0 bg-transparent text-center text-[clamp(2rem,9vw,3rem)] font-bold tracking-tight focus:outline-none placeholder:text-muted-foreground/30 py-2 tabular-nums",
                      currentType === 'expense' ? "text-foreground" : "text-emerald-600"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-medium text-muted-foreground">Catatan / Deskripsi</label>
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <Textarea 
                  {...field} 
                  placeholder="Misal: Jajan kopi sore"
                  className="rounded-2xl p-4 font-medium min-h-[90px] bg-white resize-none text-base border-border"
                />
              )} />
            </div>

            {/* Kategori */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 gap-3">
                <label className="text-[11px] font-medium text-muted-foreground">Pilih Kategori</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input 
                    value={catSearch} 
                    onChange={(e) => setCatSearch(e.target.value)} 
                    placeholder="Cari..."
                    className="pl-7 pr-3 py-1.5 bg-muted rounded-lg text-xs font-medium focus:outline-none min-w-0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredCategories.map(cat => (
                  <button 
                    key={cat.id} 
                    type="button" 
                    onClick={() => form.setValue('categoryId', cat.id)}
                    className={cn(
                      "p-3 rounded-2xl text-xs font-medium flex items-center gap-2.5 transition-all border relative min-w-0",
                      currentCatId === cat.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-white hover:bg-muted"
                    )}
                  >
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate flex-1 text-left">{cat.name}</span>
                    {currentCatId === cat.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {filteredCategories.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Kategori tidak ditemukan.</p>
              )}
            </div>

            {/* Dibayar oleh */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-medium text-muted-foreground">Dibayar oleh</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {people.map(person => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => form.setValue('paidById', person.id)}
                    className={cn(
                      "px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 transition-all border min-w-0",
                      currentPaidById === person.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-white hover:bg-muted text-foreground"
                    )}
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate max-w-[140px]">{person.name}</span>
                    {currentPaidById === person.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
                {!isAddingPerson ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingPerson(true)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-1.5 border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Orang
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      autoFocus
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSavePerson(); }
                        if (e.key === 'Escape') { setIsAddingPerson(false); setNewPersonName(''); }
                      }}
                      placeholder="Nama orang..."
                      className="px-3 py-2 bg-muted rounded-xl text-xs font-medium focus:outline-none min-w-0 flex-1 sm:w-40"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSavePerson}
                      disabled={!newPersonName.trim() || isSavingPerson}
                      className="h-8 rounded-xl text-xs font-semibold shrink-0"
                    >
                      {isSavingPerson ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Simpan'}
                    </Button>
                  </div>
                )}
              </div>
              {isUtang && selectedPerson && (
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 font-medium">
                  Dicatat sebagai utang ke {selectedPerson.name}
                </p>
              )}
            </div>
          </form>
        </Form>
      </div>

      {/* Footer Button */}
      <div className="p-4 md:p-6 border-t border-border bg-white sticky bottom-0 z-30">
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={!isValid}
          className="w-full h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-semibold text-sm neo-interactive flex gap-2 transition-all"
        >
          {initialData ? "Perbarui Data" : "Simpan Transaksi"}
          <Check className="h-5 w-5" />
        </Button>
        {!isValid && (
          <p className="text-[11px] text-center text-muted-foreground mt-2.5">
            Lengkapi nominal, catatan, dan pilih kategori
          </p>
        )}
      </div>
    </div>
  );
}
