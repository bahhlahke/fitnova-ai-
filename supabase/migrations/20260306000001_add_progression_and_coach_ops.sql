-- Create table for Exercise PRs and 1RM tracking
CREATE TABLE IF NOT EXISTS public.exercise_prs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id text NOT NULL, -- The identifier used for the exercise (e.g., 'barbell_bench_press')
  exercise_name text NOT NULL,
  max_weight numeric, -- The max weight lifted (e.g., lbs or kg)
  highest_1rm numeric, -- Calculated 1RM
  last_achieved_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, exercise_id)
);

-- RLS policies for exercise_prs
ALTER TABLE public.exercise_prs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PRs"
  ON public.exercise_prs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PRs"
  ON public.exercise_prs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PRs"
  ON public.exercise_prs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PRs"
  ON public.exercise_prs FOR DELETE
  USING (auth.uid() = user_id);

-- Update coach_escalations table to support SLA tracking if not already present
-- We will add an IF NOT EXISTS block through conditional execution since ADD COLUMN IF NOT EXISTS requires Postgres 9.6+, which Supabase has.
ALTER TABLE public.coach_escalations 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
ADD COLUMN IF NOT EXISTS sla_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolution_notes text;

-- Create an index for querying open escalations by SLA
CREATE INDEX IF NOT EXISTS idx_coach_escalations_status_sla ON public.coach_escalations (status, sla_deadline);
