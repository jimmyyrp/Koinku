import path from 'node:path';
import dotenv from 'dotenv';

/**
 * Memuat variabel lingkungan untuk skrip.
 * Utamakan `.env` (sesuai konfigurasi proyek); `.env.local` hanya fallback.
 * Variabel yang sudah ada di process.env tidak ditimpa.
 */
export function loadEnv(): void {
  const cwd = process.cwd();
  dotenv.config({ path: path.resolve(cwd, '.env') });
  dotenv.config({ path: path.resolve(cwd, '.env.local') });
}
