import { Pool } from 'pg';
import { loadEnv } from './load-env';
import { getSecurePostgresConfig } from '../src/lib/postgres-config';

loadEnv();

const pool = new Pool({
  ...getSecurePostgresConfig(process.env.DATABASE_URL!),
  max: 1,
});

async function main() {
  const d = await pool.query(
    `UPDATE public.debts SET debt_date = $1 WHERE id = 8 RETURNING id, person_name, amount, debt_date`,
    ['2026-10-20T19:18:00+07:00']
  );
  console.log('debt:', d.rows);

  const t = await pool.query(
    `UPDATE public.transactions SET date = CASE id WHEN 28 THEN $1::timestamptz WHEN 29 THEN $2::timestamptz END, updated_at = now()
     WHERE id IN (28, 29) RETURNING id, description, amount, date`,
    ['2026-10-20T21:21:00+07:00', '2026-10-20T21:30:00+07:00']
  );
  console.log('transactions:', t.rows);
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error('ERROR:', e.message);
    await pool.end();
    process.exit(1);
  });
