-- Add new, high-value biometric columns to the existing connected_signals table
-- These will store granular sleep stages and continuous glucose data from aggregators like Terra API.

ALTER TABLE public.connected_signals
ADD COLUMN IF NOT EXISTS sleep_rem_hours NUMERIC,
ADD COLUMN IF NOT EXISTS sleep_deep_hours NUMERIC,
ADD COLUMN IF NOT EXISTS blood_glucose_avg NUMERIC;

-- Create an index to query these metrics efficiently, although the existing user_id + provider index might be sufficient
-- Creating an index specifically on signal_date and user_id to speed up analytics queries
CREATE INDEX IF NOT EXISTS idx_connected_signals_date_user ON public.connected_signals(user_id, signal_date);

-- Add a comment to describe the table's capabilities
COMMENT ON TABLE public.connected_signals IS 'Unified biometric data table, capable of storing high-level daily aggregates and granular continuous tracking points from external wearables.';
