
"use client"

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormField } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Category, Transaction } from '@/app/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(2, "Minimal 2 karakter"),
  amount: z.coerce.number().positive("Harus lebih dari 0"),
  type: z.enum(['income', 'expense']),
  categoryId: z.coerce.number().refine(v => v > 0, "Pilih kategori"),
});

interface TransactionFormProps {
  categories: Category[];
  initialData?: Transaction | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function TransactionForm({ categories, initialData, onSubmit, onCancel }: TransactionFormProps) {
  const [catSearch, setCatSearch] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      description: initialData.description,
      amount: initialData.amount,
      type: initialData.type,
      categoryId: initialData.categoryId,
    } : {
      description: "",
      amount: 0,
      type: "expense",
      categoryId: 0,
    },
  });

  const currentType = form.watch('type');
  const currentAmount = form.watch('amount');
  const currentDesc = form.watch('description');
  const currentCatId = form.watch('categoryId');

  const [displayAmount, setDisplayAmount] = useState(initialData?.amount.toLocaleString('id-ID') || '');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = parseInt(rawValue, 10) || 0;
    setDisplayAmount(numericValue > 0 ? numericValue.toLocaleString('id-ID') : '');
    form.setValue('amount', numericValue);
  };

  const filteredCategories = useMemo(() => {
    return categories
      .filter(c => c.type === currentType)
      .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, currentType, catSearch]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b-4 border-black bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl neo-border bg-black text-white flex items-center justify-center">
            <Check className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-black uppercase italic tracking-tighter">
            {initialData ? "Ubah Transaksi" : "Catat Transaksi"}
          </h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10 rounded-xl neo-border hover:bg-red-50 hover:text-red-500">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-7 no-scrollbar pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Tipe & Nominal */}
            <div className="space-y-4">
              <div className="flex gap-2 p-1.5 bg-muted/30 neo-border rounded-2xl w-fit mx-auto">
                {(['expense', 'income'] as const).map(type => (
                  <button key={type} type="button" onClick={() => { form.setValue('type', type); form.setValue('categoryId', 0); }} className={cn(
                      "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                      currentType === type ? "bg-black text-white neo-shadow-sm" : "text-black/40 hover:bg-white"
                    )}
                  >
                    {type === 'expense' ? 'Keluar' : 'Masuk'}
                  </button>
                ))}
              </div>

              <div className="text-center space-y-2">
                <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Nominal Transaksi</label>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl md:text-3xl font-black opacity-20 shrink-0">Rp</span>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    value={displayAmount} 
                    onChange={handleAmountChange} 
                    placeholder="0"
                    className={cn(
                      "w-full min-w-0 bg-transparent text-center text-[clamp(2rem,9vw,3.5rem)] font-black tracking-tighter focus:outline-none placeholder:opacity-10 py-2 tabular-nums",
                      currentType === 'expense' ? "text-black" : "text-green-600"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Catatan / Deskripsi</label>
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <Textarea 
                  {...field} 
                  placeholder="Misal: Jajan Kopi Sore"
                  className="neo-border rounded-2xl p-4 font-bold min-h-[100px] bg-white resize-none text-base"
                />
              )} />
            </div>

            {/* Kategori */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Pilih Kategori</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-30" />
                  <input 
                    value={catSearch} 
                    onChange={(e) => setCatSearch(e.target.value)} 
                    placeholder="Cari..."
                    className="pl-7 pr-2 py-1.5 bg-muted/50 rounded-lg text-[10px] font-bold focus:outline-none neo-border min-w-0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredCategories.map(cat => (
                  <button 
                    key={cat.id} 
                    type="button" 
                    onClick={() => form.setValue('categoryId', cat.id)}
                    className={cn(
                      "p-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2.5 transition-all neo-border relative min-w-0",
                      currentCatId === cat.id ? "bg-black text-white neo-shadow-sm" : "bg-white hover:bg-muted"
                    )}
                  >
                    <div className="w-5 h-5 rounded-full neo-border shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate flex-1 text-left">{cat.name}</span>
                    {currentCatId === cat.id && (
                      <Check className="h-3 w-3 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {filteredCategories.length === 0 && (
                <p className="text-[9px] font-bold italic opacity-30 text-center py-4">Kategori tidak ditemukan.</p>
              )}
            </div>
          </form>
        </Form>
      </div>

      {/* Footer Button */}
      <div className="p-4 md:p-6 border-t-4 border-black bg-white sticky bottom-0 z-30">
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={!currentCatId || currentAmount <= 0 || currentDesc.length < 2}
          className="w-full h-14 md:h-16 rounded-2xl bg-black text-white hover:bg-primary font-black uppercase text-xs neo-interactive neo-border neo-shadow-sm flex gap-3 transition-all"
        >
          {initialData ? "Perbarui Data" : "Simpan Transaksi"}
          <Check className="h-5 w-5" />
        </Button>
        {(!currentCatId || currentAmount <= 0 || currentDesc.length < 2) && (
          <p className="text-[9px] font-black uppercase text-center opacity-40 mt-2.5">
            Lengkapi nominal, catatan, dan pilih kategori
          </p>
        )}
      </div>
    </div>
  );
}
