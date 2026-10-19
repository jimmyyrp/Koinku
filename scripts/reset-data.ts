import { Pool } from 'pg';
import { loadEnv } from './load-env';
import { getSecurePostgresConfig } from '../src/lib/postgres-config';

loadEnv();

const DEFAULT_EMERGENCY_FUND_TARGET = 20_000_000;

const DEFAULT_CATEGORIES: Array<{
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  budget: number;
}> = [
  { id: 1, name: 'Makan & Minum', type: 'expense', color: '#FFD93D', budget: 1500000 },
  { id: 2, name: 'Transportasi', type: 'expense', color: '#6C5CE7', budget: 500000 },
  { id: 3, name: 'Sewa Rumah / KPR', type: 'expense', color: '#FF8AAE', budget: 2000000 },
  { id: 4, name: 'Belanja & Gaya Hidup', type: 'expense', color: '#FF6B6B', budget: 1000000 },
  { id: 5, name: 'Tagihan & Pulsa', type: 'expense', color: '#44DDFF', budget: 300000 },
  { id: 6, name: 'Cicilan & Hutang', type: 'expense', color: '#FFA502', budget: 0 },
  { id: 7, name: 'Investasi & Tabungan', type: 'expense', color: '#2ED573', budget: 0 },
  { id: 8, name: 'Pinjaman (Lending)', type: 'expense', color: '#A4B0BE', budget: 0 },
  { id: 9, name: 'Kesehatan', type: 'expense', color: '#FC427B', budget: 200000 },
  { id: 10, name: 'Lainnya', type: 'expense', color: '#57606f', budget: 0 },
  { id: 11, name: 'Gaji Utama', type: 'income', color: '#20BF6B', budget: 0 },
  { id: 12, name: 'Freelance & Side Hustle', type: 'income', color: '#8854D0', budget: 0 },
  { id: 13, name: 'Bonus & Hadiah', type: 'income', color: '#F7B731', budget: 0 },
  { id: 14, name: 'Pengembalian Piutang', type: 'income', color: '#45aaf2', budget: 0 },
  { id: 15, name: 'Investasi (Profit)', type: 'income', color: '#26de81', budget: 0 },
  { id: 16, name: 'Lainnya', type: 'income', color: '#A5B1C2', budget: 0 },
];

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run') || args.has('--dry');
const RESET_CATEGORIES = args.has('--reset-categories');
const RESET_PROFILE = args.has('--reset-profile');
const FULL_RESET = args.has('--full');

function resolveScope() {
  if (FULL_RESET) {
    return { transactions: true, categories: true, profile: true };
  }
  return {
    transactions: true,
    categories: RESET_CATEGORIES,
    profile: RESET_PROFILE,
  };
}

async function counts(client: { query: (text: string) => Promise<{ rows: Array<Record<string, string>> }> }) {
  const result = await client.query(`
    SELECT
      (SELECT count(*) FROM public.transactions) AS transactions,
      (SELECT count(*) FROM public.categories) AS categories,
      (SELECT initial_balance FROM public.profiles WHERE id = 'global') AS initial_balance,
      (SELECT emergency_fund_target FROM public.profiles WHERE id = 'global') AS emergency_fund_target,
      (SELECT data_reset_at FROM public.profiles WHERE id = 'global') AS data_reset_at
  `);
  return result.rows[0];
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL belum dikonfigurasi di .env');
  }

  const scope = resolveScope();
  const pool = new Pool({
    ...getSecurePostgresConfig(connectionString),
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  const client = await pool.connect();
  try {
    console.log('[Reset] Sebelum:', await counts(client));
    console.log(
      `[Reset] Cakupan → transaksi: ${scope.transactions}, kategori: ${scope.categories}, profil: ${scope.profile}${DRY_RUN ? ' (DRY RUN)' : ''}`
    );

    if (DRY_RUN) {
      console.log('[Reset] Mode dry-run: tidak ada perubahan yang ditulis.');
      return;
    }

    await client.query('BEGIN');
    try {
      if (scope.transactions) {
        await client.query('TRUNCATE TABLE public.transactions RESTART IDENTITY');
        await client.query(
          `UPDATE public.profiles SET data_reset_at = now() WHERE id = 'global'`
        );
        console.log('[Reset] Transaksi dikosongkan (identity di-reset, penanda reset diperbarui).');
      }

      if (scope.categories) {
        await client.query('TRUNCATE TABLE public.categories RESTART IDENTITY CASCADE');
        for (const category of DEFAULT_CATEGORIES) {
          await client.query(
            `INSERT INTO public.categories (id, name, type, color, budget)
             VALUES ($1, $2, $3, $4, $5)`,
            [category.id, category.name, category.type, category.color, category.budget]
          );
        }
        await client.query(
          `SELECT setval(pg_get_serial_sequence('public.categories', 'id'), $1, true)`,
          [DEFAULT_CATEGORIES.length]
        );
        console.log(`[Reset] Kategori dikembalikan ke ${DEFAULT_CATEGORIES.length} bawaan.`);
      }

      if (scope.profile) {
        await client.query(
          `INSERT INTO public.profiles (id, initial_balance, emergency_fund_target, updated_at)
           VALUES ('global', 0, $1, now())
           ON CONFLICT (id) DO UPDATE
             SET initial_balance = 0,
                 emergency_fund_target = $1,
                 updated_at = now()`,
          [DEFAULT_EMERGENCY_FUND_TARGET]
        );
        console.log('[Reset] Profil dikembalikan ke bawaan (saldo awal 0).');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    console.log('[Reset] Sesudah:', await counts(client));
    console.log('[Reset] Selesai.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('[Reset] Gagal:', error);
  process.exitCode = 1;
});
