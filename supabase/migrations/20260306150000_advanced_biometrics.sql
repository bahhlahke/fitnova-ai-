-- Add advanced physiological indicators to the connected_signals table
ALTER TABLE public.connected_signals
ADD COLUMN IF NOT EXISTS spo2_avg NUMERIC,
ADD COLUMN IF NOT EXISTS respiratory_rate_avg NUMERIC,
ADD COLUMN IF NOT EXISTS core_temp_deviation NUMERIC;

-- Create table specifically for Hormonal Cycle / Menstrual tracking to enable Female Physiology Adaptive Coaching
CREATE TABLE IF NOT EXISTS public.user_cycle_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    cycle_phase TEXT NOT NULL CHECK (cycle_phase IN ('menstrual', 'follicular', 'ovulatory', 'luteal')),
    symptom_severity INTEGER CHECK (symptom_severity >= 1 AND symptom_severity <= 10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) for privacy
ALTER TABLE public.user_cycle_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own cycle logs." 
ON public.user_cycle_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cycle logs." 
ON public.user_cycle_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cycle logs." 
ON public.user_cycle_logs FOR UPDATE 
USING (auth.uid() = user_id);

-- Create an index to quickly lookup the latest cycle phase for AI constraints
CREATE INDEX IF NOT EXISTS idx_user_cycle_logs_start_date ON public.user_cycle_logs(user_id, start_date DESC);
