-- AI output feedback and calibration state

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('nutrition', 'motion', 'body_comp')),
  output_id TEXT NOT NULL,
  predicted_confidence NUMERIC NOT NULL,
  user_rating INT NOT NULL CHECK (user_rating BETWEEN 1 AND 5),
  correction_delta NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_domain_created
  ON public.ai_feedback (user_id, domain, created_at DESC);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_feedback' AND policyname = 'Users can insert own ai_feedback'
  ) THEN
    CREATE POLICY "Users can insert own ai_feedback" ON public.ai_feedback
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_feedback' AND policyname = 'Users can read own ai_feedback'
  ) THEN
    CREATE POLICY "Users can read own ai_feedback" ON public.ai_feedback
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_calibration_profiles (
  calibration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('nutrition', 'motion', 'body_comp')),
  sample_count INT NOT NULL DEFAULT 0,
  avg_user_rating NUMERIC NOT NULL DEFAULT 0,
  avg_correction_delta NUMERIC NOT NULL DEFAULT 0,
  confidence_bias NUMERIC NOT NULL DEFAULT 0,
  calibration_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_calibration_profiles_user_domain
  ON public.ai_calibration_profiles (user_id, domain);

ALTER TABLE public.ai_calibration_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_calibration_profiles' AND policyname = 'Users can CRUD own ai_calibration_profiles'
  ) THEN
    CREATE POLICY "Users can CRUD own ai_calibration_profiles" ON public.ai_calibration_profiles
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'ai_calibration_profiles_updated_at') THEN
    CREATE TRIGGER ai_calibration_profiles_updated_at BEFORE UPDATE ON public.ai_calibration_profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
