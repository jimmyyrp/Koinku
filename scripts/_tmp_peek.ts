import { query } from '../src/lib/supabase-db';

async function main() {
  const cats = await query('SELECT id, name, type FROM public.categories ORDER BY id');
  console.log('CATEGORIES');
  console.table(cats.rows);

  const people = await query('SELECT id, name, is_self FROM public.people ORDER BY id');
  console.log('PEOPLE');
  console.table(people.rows);

  const tx = await query(
    `SELECT id, description, amount, date, type, category_id, paid_by_id, for_person_id
     FROM public.transactions ORDER BY date DESC LIMIT 15`
  );
  console.log('TRANSACTIONS (15 terbaru)');
  console.table(tx.rows);

  const debts = await query('SELECT * FROM public.debts ORDER BY debt_date DESC, id DESC LIMIT 15');
  console.log('DEBTS (15 terbaru)');
  console.table(debts.rows);

  const schema = await query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name IN ('transactions','debts')
     ORDER BY table_name, ordinal_position`
  );
  console.log('SCHEMA');
  console.table(schema.rows);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });
