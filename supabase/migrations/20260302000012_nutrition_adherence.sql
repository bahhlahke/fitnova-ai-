-- Nutrition adherence program loop

CREATE TABLE IF NOT EXISTS public.nutrition_targets (
  target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_target NUMERIC,
  protein_target_g NUMERIC,
  carbs_target_g NUMERIC,
  fat_target_g NUMERIC,
  meal_timing JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_targets_user_active
  ON public.nutrition_targets (user_id)
  WHERE active = true;

ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'nutrition_targets' AND policyname = 'Users can CRUD own nutrition_targets'
  ) THEN
    CREATE POLICY "Users can CRUD own nutrition_targets" ON public.nutrition_targets
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.nutrition_adherence_daily (
  adherence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  calorie_adherence NUMERIC,
  macro_adherence NUMERIC,
  meal_timing_adherence NUMERIC,
  total_score NUMERIC,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_adherence_daily_user_date
  ON public.nutrition_adherence_daily (user_id, date_local);

ALTER TABLE public.nutrition_adherence_daily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'nutrition_adherence_daily' AND policyname = 'Users can CRUD own nutrition_adherence_daily'
  ) THEN
    CREATE POLICY "Users can CRUD own nutrition_adherence_daily" ON public.nutrition_adherence_daily
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'nutrition_targets_updated_at') THEN
    CREATE TRIGGER nutrition_targets_updated_at BEFORE UPDATE ON public.nutrition_targets
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'nutrition_adherence_daily_updated_at') THEN
    CREATE TRIGGER nutrition_adherence_daily_updated_at BEFORE UPDATE ON public.nutrition_adherence_daily
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
