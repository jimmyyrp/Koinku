-- Ringkas arah utang jadi 4 status yang jelas:
--   lend      : saya pinjamkan uang        (orang berhutang ke saya)
--   repay_in  : orang mengembalikan uangnya (piutang saya berkurang)
--   borrow    : saya meminjam uang          (saya berhutang ke orang)
--   repay_out : saya mengembalikan uang     (hutang saya berkurang)

ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_direction_check;
ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_direction_check;

ALTER TABLE public.debts
  ADD CONSTRAINT debts_direction_check
  CHECK (direction IN ('lend', 'repay_in', 'borrow', 'repay_out'));
