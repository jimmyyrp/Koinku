import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { runMigrations } = await import('../src/lib/schema');
  const result = await runMigrations();
  console.log('Hasil Migrasi MongoDB:');
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migrasi gagal:', err);
  process.exit(1);
});