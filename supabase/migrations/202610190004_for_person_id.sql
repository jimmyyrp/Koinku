-- Transaksi "dibayar saya untuk orang lain" → otomatis jadi utang orang itu.
-- Tambah kolom penerima manfaat di transaksi + tautan ke debts supaya bisa disinkronkan.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS for_person_id bigint REFERENCES public.people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_for_person_id_idx ON public.transactions(for_person_id);

ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS source_transaction_id bigint REFERENCES public.transactions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS debts_source_transaction_id_idx
  ON public.debts(source_transaction_id)
  WHERE source_transaction_id IS NOT NULL;
