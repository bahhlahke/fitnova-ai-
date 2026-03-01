-- Progression engine foundation

CREATE TABLE IF NOT EXISTS public.progression_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  e1rm NUMERIC,
  total_volume NUMERIC,
  trend_score NUMERIC,
  last_performed_date DATE,
  sample_size INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_progression_snapshots_user_exercise
  ON public.progression_snapshots (user_id, exercise_name);

CREATE INDEX IF NOT EXISTS idx_progression_snapshots_user_updated
  ON public.progression_snapshots (user_id, updated_at DESC);

ALTER TABLE public.progression_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'progression_snapshots' AND policyname = 'Users can CRUD own progression snapshots'
  ) THEN
    CREATE POLICY "Users can CRUD own progression snapshots" ON public.progression_snapshots
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'progression_snapshots_updated_at') THEN
    CREATE TRIGGER progression_snapshots_updated_at BEFORE UPDATE ON public.progression_snapshots
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
