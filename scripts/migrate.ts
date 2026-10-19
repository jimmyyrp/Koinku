import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { loadEnv } from './load-env';
import { getSecurePostgresConfig } from '../src/lib/postgres-config';

loadEnv();

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase', 'migrations');
const MIGRATION_LOCK_ID = 742019061;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL belum dikonfigurasi di .env');
  }

  const pool = new Pool({
    ...getSecurePostgresConfig(connectionString),
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
          name text PRIMARY KEY,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await client.query(
        'ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY'
      );

      const files = (await readdir(MIGRATIONS_DIR))
        .filter((name) => /^\d{12}_[a-z0-9_]+\.sql$/.test(name))
        .sort();

      if (files.length === 0) {
        throw new Error(`Tidak ada file migrasi SQL di ${MIGRATIONS_DIR}`);
      }

      let applied = 0;
      for (const name of files) {
        const sql = await readFile(path.join(MIGRATIONS_DIR, name), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        const previous = await client.query<{ checksum: string }>(
          'SELECT checksum FROM public.schema_migrations WHERE name = $1',
          [name]
        );

        if (previous.rowCount) {
          if (previous.rows[0].checksum !== checksum) {
            throw new Error(
              `Checksum migrasi ${name} berubah setelah diterapkan. Buat file migrasi baru; jangan mengubah file yang sudah tercatat.`
            );
          }
          console.log(`[Migration] Sudah diterapkan: ${name}`);
          continue;
        }

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)',
            [name, checksum]
          );
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
        applied += 1;
        console.log(`[Migration] Berhasil diterapkan: ${name}`);
      }

      console.log(`[Migration] Selesai. ${applied} migrasi baru diterapkan.`);
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('[Migration] Gagal:', error);
  process.exitCode = 1;
});
