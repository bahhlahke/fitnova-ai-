-- Wearables Sync Production Fix
-- Expand connected_signals and connected_accounts to support all providers
-- and add missing biometric columns.
-- Run in Supabase SQL editor.

-- 1. Drop old provider constraints and re-add as open TEXT
ALTER TABLE public.connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_provider_check;

ALTER TABLE public.connected_signals
  DROP CONSTRAINT IF EXISTS connected_signals_provider_check;

-- 2. Add missing biometric columns to connected_signals
ALTER TABLE public.connected_signals
  ADD COLUMN IF NOT EXISTS sleep_deep_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS sleep_rem_hours   NUMERIC,
  ADD COLUMN IF NOT EXISTS spo2_avg          NUMERIC,
  ADD COLUMN IF NOT EXISTS respiratory_rate_avg NUMERIC,
  ADD COLUMN IF NOT EXISTS blood_glucose_avg NUMERIC,
  ADD COLUMN IF NOT EXISTS core_temp_deviation NUMERIC,
  ADD COLUMN IF NOT EXISTS recovery_score    NUMERIC,
  ADD COLUMN IF NOT EXISTS steps             INTEGER,
  ADD COLUMN IF NOT EXISTS active_calories   NUMERIC,
  ADD COLUMN IF NOT EXISTS workout_hr_avg    NUMERIC;

-- 3. Ensure the unique conflict index still exists (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_signals_user_provider_date
  ON public.connected_signals (user_id, provider, signal_date);

-- 4. Confirm RLS is still enabled
ALTER TABLE public.connected_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
