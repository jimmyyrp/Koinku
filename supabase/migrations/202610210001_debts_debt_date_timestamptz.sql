-- Catatan utang bisa menyimpan jam, bukan hanya tanggal.
-- Konversi debt_date dari date menjadi timestamptz; nilai lama diasumsikan tengah malam WIB.

ALTER TABLE public.debts
  ALTER COLUMN debt_date TYPE timestamptz
  USING (debt_date::timestamp AT TIME ZONE 'Asia/Jakarta');
