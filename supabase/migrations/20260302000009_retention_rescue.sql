-- Retention rescue ladder and nudge metadata

ALTER TABLE public.coach_nudges
  ADD COLUMN IF NOT EXISTS stage INT NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS cta_route TEXT,
  ADD COLUMN IF NOT EXISTS cta_label TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.retention_interventions (
  intervention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  stage INT NOT NULL CHECK (stage BETWEEN 1 AND 3),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  reason_codes TEXT[] NOT NULL DEFAULT '{}',
  next_best_action TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retention_interventions_user_date
  ON public.retention_interventions (user_id, date_local);

ALTER TABLE public.retention_interventions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'retention_interventions' AND policyname = 'Users can CRUD own retention interventions'
  ) THEN
    CREATE POLICY "Users can CRUD own retention interventions" ON public.retention_interventions
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'retention_interventions_updated_at') THEN
    CREATE TRIGGER retention_interventions_updated_at BEFORE UPDATE ON public.retention_interventions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
