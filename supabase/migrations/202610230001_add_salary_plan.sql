ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_income numeric(14, 2) NOT NULL DEFAULT 3300000 CHECK (monthly_income >= 0),
  ADD COLUMN IF NOT EXISTS payday smallint NOT NULL DEFAULT 28 CHECK (payday BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS has_installments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_fund_balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (emergency_fund_balance >= 0);
