-- FitNova AI v1 schema with RLS
-- Run in Supabase SQL editor or via supabase db push

-- user_profile
CREATE TABLE IF NOT EXISTS public.user_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  age INT,
  sex TEXT,
  height NUMERIC,
  weight NUMERIC,
  goals TEXT[],
  injuries_limitations JSONB DEFAULT '{}',
  dietary_preferences JSONB DEFAULT '{}',
  activity_level TEXT,
  devices JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.user_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE USING (auth.uid() = user_id);

-- workout_logs
CREATE TABLE IF NOT EXISTS public.workout_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('strength', 'cardio', 'mobility', 'other')),
  exercises JSONB NOT NULL DEFAULT '[]',
  duration_minutes INT,
  perceived_exertion INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs (user_id, date DESC);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workout_logs" ON public.workout_logs
  FOR ALL USING (auth.uid() = user_id);

-- nutrition_logs
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meals JSONB NOT NULL DEFAULT '[]',
  total_calories NUMERIC,
  macros JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON public.nutrition_logs (user_id, date DESC);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own nutrition_logs" ON public.nutrition_logs
  FOR ALL USING (auth.uid() = user_id);

-- ai_conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  convo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  system_prompt_version TEXT,
  user_message_history JSONB DEFAULT '[]',
  ai_reply_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations (user_id, created_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own ai_conversations" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- progress_tracking
CREATE TABLE IF NOT EXISTS public.progress_tracking (
  track_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  body_fat_percent NUMERIC,
  measurements JSONB DEFAULT '{}',
  photos TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_date ON public.progress_tracking (user_id, date DESC);

ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own progress_tracking" ON public.progress_tracking
  FOR ALL USING (auth.uid() = user_id);

-- onboarding
CREATE TABLE IF NOT EXISTS public.onboarding (
  onboarding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  responses JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own onboarding" ON public.onboarding
  FOR ALL USING (auth.uid() = user_id);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_profile_updated_at') THEN
    CREATE TRIGGER user_profile_updated_at BEFORE UPDATE ON public.user_profile
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'workout_logs_updated_at') THEN
    CREATE TRIGGER workout_logs_updated_at BEFORE UPDATE ON public.workout_logs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'nutrition_logs_updated_at') THEN
    CREATE TRIGGER nutrition_logs_updated_at BEFORE UPDATE ON public.nutrition_logs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'ai_conversations_updated_at') THEN
    CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'progress_tracking_updated_at') THEN
    CREATE TRIGGER progress_tracking_updated_at BEFORE UPDATE ON public.progress_tracking
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'onboarding_updated_at') THEN
    CREATE TRIGGER onboarding_updated_at BEFORE UPDATE ON public.onboarding
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
