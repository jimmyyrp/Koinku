export type TransactionType = 'income' | 'expense';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  budget?: number; // Anggaran bulanan (opsional)
}

export interface Person {
  id: number;
  name: string;
  isSelf: boolean;
}

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  categoryId: number;
  paidById?: number | null;
  paidByName?: string | null;
  paidByIsSelf?: boolean | null;
}

export const INITIAL_CATEGORIES: Category[] = [
  // Expenses (Pengeluaran) - Uang Keluar
  { id: 1, name: 'Makan & Minum', type: 'expense', color: '#FFD93D', budget: 1500000 },
  { id: 2, name: 'Transportasi', type: 'expense', color: '#6C5CE7', budget: 500000 },
  { id: 3, name: 'Sewa Rumah / KPR', type: 'expense', color: '#FF8AAE', budget: 2000000 },
  { id: 4, name: 'Belanja & Gaya Hidup', type: 'expense', color: '#FF6B6B', budget: 1000000 },
  { id: 5, name: 'Tagihan & Pulsa', type: 'expense', color: '#44DDFF', budget: 300000 },
  { id: 6, name: 'Cicilan & Hutang', type: 'expense', color: '#FFA502' },
  { id: 7, name: 'Investasi & Tabungan', type: 'expense', color: '#2ED573' },
  { id: 8, name: 'Pinjaman (Lending)', type: 'expense', color: '#A4B0BE' },
  { id: 9, name: 'Kesehatan', type: 'expense', color: '#FC427B', budget: 200000 },
  { id: 10, name: 'Lainnya', type: 'expense', color: '#57606f' },

  // Income (Pemasukan) - Uang Masuk
  { id: 11, name: 'Gaji Utama', type: 'income', color: '#20BF6B' },
  { id: 12, name: 'Freelance & Side Hustle', type: 'income', color: '#8854D0' },
  { id: 13, name: 'Bonus & Hadiah', type: 'income', color: '#F7B731' },
  { id: 14, name: 'Pengembalian Piutang', type: 'income', color: '#45aaf2' },
  { id: 15, name: 'Investasi (Profit)', type: 'income', color: '#26de81' },
  { id: 16, name: 'Lainnya', type: 'income', color: '#A5B1C2' },
];
