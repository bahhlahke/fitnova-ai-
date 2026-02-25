-- Add optional hydration tracking to nutrition_logs (liters per day)
ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS hydration_liters NUMERIC;

COMMENT ON COLUMN public.nutrition_logs.hydration_liters IS 'Total liters of water/fluid logged for this date (optional).';
