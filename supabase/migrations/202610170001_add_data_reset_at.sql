ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS data_reset_at timestamptz NOT NULL DEFAULT now();
