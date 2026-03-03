-- Migration: 20250222000001_initial_schema.sql
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

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profile;
CREATE POLICY "Users can read own profile" ON public.user_profile
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profile;
CREATE POLICY "Users can insert own profile" ON public.user_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profile;
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

DROP POLICY IF EXISTS "Users can CRUD own workout_logs" ON public.workout_logs;
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

DROP POLICY IF EXISTS "Users can CRUD own nutrition_logs" ON public.nutrition_logs;
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

DROP POLICY IF EXISTS "Users can CRUD own ai_conversations" ON public.ai_conversations;
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

DROP POLICY IF EXISTS "Users can CRUD own progress_tracking" ON public.progress_tracking;
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

DROP POLICY IF EXISTS "Users can CRUD own onboarding" ON public.onboarding;
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


-- Migration: 20260224000002_daily_plans_and_checkins.sql
-- Daily plans and check-ins for personalized planning workflow

CREATE TABLE IF NOT EXISTS public.daily_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  plan_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date
  ON public.daily_plans (user_id, date_local DESC);

ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own daily_plans" ON public.daily_plans;
CREATE POLICY "Users can CRUD own daily_plans" ON public.daily_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.check_ins (
  check_in_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  adherence_score INT,
  energy_score INT,
  sleep_hours NUMERIC,
  soreness_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_user_date
  ON public.check_ins (user_id, date_local DESC);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own check_ins" ON public.check_ins;
CREATE POLICY "Users can CRUD own check_ins" ON public.check_ins
  FOR ALL USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'daily_plans_updated_at') THEN
    CREATE TRIGGER daily_plans_updated_at BEFORE UPDATE ON public.daily_plans
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_ins_updated_at') THEN
    CREATE TRIGGER check_ins_updated_at BEFORE UPDATE ON public.check_ins
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- Migration: 20260224000003_hydration_on_nutrition.sql
-- Add optional hydration tracking to nutrition_logs (liters per day)
ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS hydration_liters NUMERIC;

COMMENT ON COLUMN public.nutrition_logs.hydration_liters IS 'Total liters of water/fluid logged for this date (optional).';


-- Migration: 20260228000004_billing_fields.sql
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

UPDATE public.user_profile
SET subscription_status = COALESCE(subscription_status, 'free')
WHERE subscription_status IS NULL;

COMMENT ON COLUMN public.user_profile.subscription_status IS 'Billing state for the signed-in app shell.';
COMMENT ON COLUMN public.user_profile.stripe_customer_id IS 'Stripe customer identifier for subscription lifecycle events.';


-- Migration: 20260228000005_phone_number.sql
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

COMMENT ON COLUMN public.user_profile.phone_number IS 'Normalized E.164-style phone number used for SMS coaching.';


-- Migration: 20260301000006_priority_features.sql
-- P0/P1/P2 feature foundation
-- - P1 weekly adaptive plans
-- - P0 retention nudges/reminders
-- - P2 hybrid coach escalation

CREATE TABLE IF NOT EXISTS public.weekly_plans (
  weekly_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_local DATE NOT NULL,
  plan_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_plans_user_week
  ON public.weekly_plans (user_id, week_start_local);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own weekly_plans" ON public.weekly_plans;
CREATE POLICY "Users can CRUD own weekly_plans" ON public.weekly_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.coach_nudges (
  nudge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('daily_plan', 'workout_log', 'weigh_in', 'retention_risk')),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  delivered_via_sms BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_nudges_user_date
  ON public.coach_nudges (user_id, date_local DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_nudges_dedupe
  ON public.coach_nudges (user_id, date_local, nudge_type);

ALTER TABLE public.coach_nudges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own coach_nudges" ON public.coach_nudges;
CREATE POLICY "Users can read own coach_nudges" ON public.coach_nudges
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own coach_nudges" ON public.coach_nudges;
CREATE POLICY "Users can update own coach_nudges" ON public.coach_nudges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.coach_escalations (
  escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
  details TEXT,
  preferred_channel TEXT NOT NULL DEFAULT 'in_app' CHECK (preferred_channel IN ('in_app', 'sms', 'email')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_escalations_user_created
  ON public.coach_escalations (user_id, created_at DESC);

ALTER TABLE public.coach_escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own coach_escalations" ON public.coach_escalations;
CREATE POLICY "Users can create own coach_escalations" ON public.coach_escalations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own coach_escalations" ON public.coach_escalations;
CREATE POLICY "Users can read own coach_escalations" ON public.coach_escalations
  FOR SELECT USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'weekly_plans_updated_at') THEN
    CREATE TRIGGER weekly_plans_updated_at BEFORE UPDATE ON public.weekly_plans
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coach_nudges_updated_at') THEN
    CREATE TRIGGER coach_nudges_updated_at BEFORE UPDATE ON public.coach_nudges
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coach_escalations_updated_at') THEN
    CREATE TRIGGER coach_escalations_updated_at BEFORE UPDATE ON public.coach_escalations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- Migration: 20260302000007_coach_ops_workflow.sql
-- Coach operations workflow foundation (assignment, SLA, threaded messages, admin visibility)

ALTER TABLE public.coach_escalations
  ADD COLUMN IF NOT EXISTS assigned_coach_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.coach_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_admins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_admins' AND policyname = 'Users can read own coach_admins membership'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own coach_admins membership" ON public.coach_admins;
CREATE POLICY "Users can read own coach_admins membership" ON public.coach_admins
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.coach_escalation_messages (
  escalation_message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES public.coach_escalations(escalation_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'coach', 'system', 'sms')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'sms', 'email')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_escalation_messages_escalation_created
  ON public.coach_escalation_messages (escalation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_escalation_messages_user_created
  ON public.coach_escalation_messages (user_id, created_at DESC);

ALTER TABLE public.coach_escalation_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_messages' AND policyname = 'Users can read own escalation messages'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own escalation messages" ON public.coach_escalation_messages;
CREATE POLICY "Users can read own escalation messages" ON public.coach_escalation_messages
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_messages' AND policyname = 'Users can insert own escalation messages'
  ) THEN
    DROP POLICY IF EXISTS "Users can insert own escalation messages" ON public.coach_escalation_messages;
CREATE POLICY "Users can insert own escalation messages" ON public.coach_escalation_messages
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND (
          sender_type = 'user'
          OR sender_type = 'sms'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_messages' AND policyname = 'Coach admins can manage escalation messages'
  ) THEN
    DROP POLICY IF EXISTS "Coach admins can manage escalation messages" ON public.coach_escalation_messages;
CREATE POLICY "Coach admins can manage escalation messages" ON public.coach_escalation_messages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.coach_escalation_events (
  escalation_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES public.coach_escalations(escalation_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'coach', 'system', 'sms')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'assigned', 'message', 'status_changed', 'resolved', 'sla_updated')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_escalation_events_escalation_created
  ON public.coach_escalation_events (escalation_id, created_at DESC);

ALTER TABLE public.coach_escalation_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_events' AND policyname = 'Users can read own escalation events'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own escalation events" ON public.coach_escalation_events;
CREATE POLICY "Users can read own escalation events" ON public.coach_escalation_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_events' AND policyname = 'Coach admins can manage escalation events'
  ) THEN
    DROP POLICY IF EXISTS "Coach admins can manage escalation events" ON public.coach_escalation_events;
CREATE POLICY "Coach admins can manage escalation events" ON public.coach_escalation_events
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalations' AND policyname = 'Coach admins can manage escalations'
  ) THEN
    DROP POLICY IF EXISTS "Coach admins can manage escalations" ON public.coach_escalations;
CREATE POLICY "Coach admins can manage escalations" ON public.coach_escalations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coach_escalation_messages_updated_at') THEN
    CREATE TRIGGER coach_escalation_messages_updated_at BEFORE UPDATE ON public.coach_escalation_messages
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coach_escalation_events_updated_at') THEN
    CREATE TRIGGER coach_escalation_events_updated_at BEFORE UPDATE ON public.coach_escalation_events
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- Migration: 20260302000008_progression_engine.sql
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
    DROP POLICY IF EXISTS "Users can CRUD own progression snapshots" ON public.progression_snapshots;
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


-- Migration: 20260302000009_retention_rescue.sql
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
    DROP POLICY IF EXISTS "Users can CRUD own retention interventions" ON public.retention_interventions;
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


-- Migration: 20260302000010_ai_calibration.sql
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
    DROP POLICY IF EXISTS "Users can insert own ai_feedback" ON public.ai_feedback;
CREATE POLICY "Users can insert own ai_feedback" ON public.ai_feedback
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_feedback' AND policyname = 'Users can read own ai_feedback'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own ai_feedback" ON public.ai_feedback;
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
    DROP POLICY IF EXISTS "Users can CRUD own ai_calibration_profiles" ON public.ai_calibration_profiles;
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


-- Migration: 20260302000011_integrations.sql
-- Integration account/signal storage

CREATE TABLE IF NOT EXISTS public.connected_accounts (
  account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('whoop')),
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  external_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_accounts_user_provider
  ON public.connected_accounts (user_id, provider);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connected_accounts' AND policyname = 'Users can CRUD own connected_accounts'
  ) THEN
    DROP POLICY IF EXISTS "Users can CRUD own connected_accounts" ON public.connected_accounts;
CREATE POLICY "Users can CRUD own connected_accounts" ON public.connected_accounts
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.connected_signals (
  signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('whoop')),
  signal_date DATE NOT NULL,
  recovery_score NUMERIC,
  strain_score NUMERIC,
  sleep_hours NUMERIC,
  resting_hr NUMERIC,
  hrv NUMERIC,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_signals_user_provider_date
  ON public.connected_signals (user_id, provider, signal_date);

ALTER TABLE public.connected_signals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connected_signals' AND policyname = 'Users can CRUD own connected_signals'
  ) THEN
    DROP POLICY IF EXISTS "Users can CRUD own connected_signals" ON public.connected_signals;
CREATE POLICY "Users can CRUD own connected_signals" ON public.connected_signals
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'connected_accounts_updated_at') THEN
    CREATE TRIGGER connected_accounts_updated_at BEFORE UPDATE ON public.connected_accounts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'connected_signals_updated_at') THEN
    CREATE TRIGGER connected_signals_updated_at BEFORE UPDATE ON public.connected_signals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- Migration: 20260302000012_nutrition_adherence.sql
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
    DROP POLICY IF EXISTS "Users can CRUD own nutrition_targets" ON public.nutrition_targets;
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
    DROP POLICY IF EXISTS "Users can CRUD own nutrition_adherence_daily" ON public.nutrition_adherence_daily;
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


-- Migration: 20260302000013_product_telemetry.sql
-- Product telemetry events

CREATE TABLE IF NOT EXISTS public.product_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_props JSONB NOT NULL DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_user_created
  ON public.product_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created
  ON public.product_events (event_name, created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_events' AND policyname = 'Users can insert own product_events'
  ) THEN
    DROP POLICY IF EXISTS "Users can insert own product_events" ON public.product_events;
CREATE POLICY "Users can insert own product_events" ON public.product_events
      FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_events' AND policyname = 'Users can read own product_events'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own product_events" ON public.product_events;
CREATE POLICY "Users can read own product_events" ON public.product_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;


-- Migration: 20260303000014_rls_policies_fix.sql
-- Fix missing WITH CHECK policies for tables that only have FOR ALL USING (...) defined

DO $$
BEGIN
  -- 1. nutrition_logs
  DROP POLICY IF EXISTS "Users can CRUD own nutrition_logs" ON public.nutrition_logs;
  CREATE POLICY "Users can CRUD own nutrition_logs" ON public.nutrition_logs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 2. workout_logs
  DROP POLICY IF EXISTS "Users can CRUD own workout_logs" ON public.workout_logs;
  CREATE POLICY "Users can CRUD own workout_logs" ON public.workout_logs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 3. progress_tracking
  DROP POLICY IF EXISTS "Users can CRUD own progress_tracking" ON public.progress_tracking;
  CREATE POLICY "Users can CRUD own progress_tracking" ON public.progress_tracking
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 4. ai_conversations
  DROP POLICY IF EXISTS "Users can CRUD own ai_conversations" ON public.ai_conversations;
  CREATE POLICY "Users can CRUD own ai_conversations" ON public.ai_conversations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 5. onboarding
  DROP POLICY IF EXISTS "Users can CRUD own onboarding" ON public.onboarding;
  CREATE POLICY "Users can CRUD own onboarding" ON public.onboarding
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

END $$;


-- Migration: 20260303000015_rls_policies_fix_v2.sql
-- Final RLS policies cleanup and fix for remaining tables
-- This ensures all user-owned tables have explicit WITH CHECK for upsert/insert/update

DO $$
BEGIN
  -- 1. user_profile (Update to unified FOR ALL CRUD)
  DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profile;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profile;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profile;
  DROP POLICY IF EXISTS "Users can CRUD own profile" ON public.user_profile;
CREATE POLICY "Users can CRUD own profile" ON public.user_profile
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 2. daily_plans
  DROP POLICY IF EXISTS "Users can CRUD own daily_plans" ON public.daily_plans;
  CREATE POLICY "Users can CRUD own daily_plans" ON public.daily_plans
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 3. check_ins
  DROP POLICY IF EXISTS "Users can CRUD own check_ins" ON public.check_ins;
  CREATE POLICY "Users can CRUD own check_ins" ON public.check_ins
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 4. weekly_plans
  DROP POLICY IF EXISTS "Users can CRUD own weekly_plans" ON public.weekly_plans;
  CREATE POLICY "Users can CRUD own weekly_plans" ON public.weekly_plans
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 5. coach_nudges
  DROP POLICY IF EXISTS "Users can read own coach_nudges" ON public.coach_nudges;
  DROP POLICY IF EXISTS "Users can update own coach_nudges" ON public.coach_nudges;
  DROP POLICY IF EXISTS "Users can CRUD own coach_nudges" ON public.coach_nudges;
CREATE POLICY "Users can CRUD own coach_nudges" ON public.coach_nudges
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 6. coach_escalations
  DROP POLICY IF EXISTS "Users can create own coach_escalations" ON public.coach_escalations;
  DROP POLICY IF EXISTS "Users can read own coach_escalations" ON public.coach_escalations;
  DROP POLICY IF EXISTS "Users can CRUD own coach_escalations" ON public.coach_escalations;
CREATE POLICY "Users can CRUD own coach_escalations" ON public.coach_escalations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 7. retention_interventions
  DROP POLICY IF EXISTS "Users can CRUD own retention interventions" ON public.retention_interventions;
  DROP POLICY IF EXISTS "Users can CRUD own retention interventions" ON public.retention_interventions;
CREATE POLICY "Users can CRUD own retention interventions" ON public.retention_interventions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

END $$;


-- Migration: 20260304000016_gamification_and_culinary.sql
-- Phase 1 Gamification and Culinary AI
-- experience_points and level on user_profile
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS experience_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;

-- badge_definitions
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badge_definitions(badge_id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own badges" ON public.user_badges;
CREATE POLICY "Users can read own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- meal_plans
CREATE TABLE IF NOT EXISTS public.meal_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  plan_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own meal_plans" ON public.meal_plans;
CREATE POLICY "Users can CRUD own meal_plans" ON public.meal_plans
  FOR ALL USING (auth.uid() = user_id);

-- grocery_lists
CREATE TABLE IF NOT EXISTS public.grocery_lists (
  list_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.meal_plans(plan_id) ON DELETE SET NULL,
  items_json JSONB NOT NULL DEFAULT '[]',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own grocery_lists" ON public.grocery_lists;
CREATE POLICY "Users can CRUD own grocery_lists" ON public.grocery_lists
  FOR ALL USING (auth.uid() = user_id);

-- Triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'meal_plans_updated_at') THEN
    CREATE TRIGGER meal_plans_updated_at BEFORE UPDATE ON public.meal_plans
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'grocery_lists_updated_at') THEN
    CREATE TRIGGER grocery_lists_updated_at BEFORE UPDATE ON public.grocery_lists
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- Migration: 20260304000017_user_xp.sql
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;


-- Migration: 20260304000018_community_groups.sql
-- Community Groups
CREATE TABLE IF NOT EXISTS public.groups (
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_slug TEXT DEFAULT 'users',
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Group Memberships
CREATE TABLE IF NOT EXISTS public.group_members (
  membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(group_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON public.groups;
CREATE POLICY "Groups are viewable by everyone" ON public.groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join any group" ON public.group_members;
CREATE POLICY "Users can join any group" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can see their memberships" ON public.group_members;
CREATE POLICY "Users can see their memberships" ON public.group_members
  FOR SELECT USING (auth.uid() = user_id);

-- Optional: Allow seeing other members if you are in the group (requires a function to avoid recursion)
-- For now, keeping it simple to avoid build/execution errors.

-- Seed Groups
INSERT INTO public.groups (name, description, icon_slug) VALUES 
('Early Risers', 'The 5 AM club. Log your morning sessions here.', 'fire'),
('Powerlifters', 'Squat, Bench, Deadlift focus.', 'weight'),
('Healthy Recipes', 'Share and track meal plans with the community.', 'heart'),
('10k Step Challenge', 'Daily walking targets and step goals.', 'zap');


-- Migration: 20260304000019_social_connections.sql
-- User Connections (Friends)
CREATE TABLE IF NOT EXISTS public.user_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own connections" ON public.user_connections;
CREATE POLICY "Users can view their own connections" ON public.user_connections
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can create connection requests" ON public.user_connections;
CREATE POLICY "Users can create connection requests" ON public.user_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their connection status" ON public.user_connections;
CREATE POLICY "Users can update their connection status" ON public.user_connections
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- Migration: 20260304000020_social_posts.sql
-- Social Posts (Activity Feed)
CREATE TABLE IF NOT EXISTS public.social_posts (
  post_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('workout', 'meal', 'achievement', 'pr')),
  content TEXT,
  media_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Posts are viewable by friends" ON public.social_posts;
CREATE POLICY "Posts are viewable by friends" ON public.social_posts
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_connections 
      WHERE status = 'accepted' AND (
        (user_id = auth.uid() AND friend_id = public.social_posts.user_id) OR
        (friend_id = auth.uid() AND user_id = public.social_posts.user_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can create their own posts" ON public.social_posts;
CREATE POLICY "Users can create their own posts" ON public.social_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Migration: 20260304000021_post_interactions.sql
-- Post Likes (Cheers)
CREATE TABLE IF NOT EXISTS public.post_likes (
  like_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_posts(post_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Post Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_posts(post_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Likes are viewable by post viewers" ON public.post_likes;
CREATE POLICY "Likes are viewable by post viewers" ON public.post_likes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.social_posts WHERE post_id = public.post_likes.post_id
  ));

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.post_likes;
CREATE POLICY "Users can unlike their own likes" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comments are viewable by post viewers" ON public.post_comments;
CREATE POLICY "Comments are viewable by post viewers" ON public.post_comments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.social_posts WHERE post_id = public.post_comments.post_id
  ));

DROP POLICY IF EXISTS "Users can comment on posts" ON public.post_comments;
CREATE POLICY "Users can comment on posts" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Migration: 20260304000022_accountability_partners.sql
-- Accountability Partners
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS accountability_partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS for partner visibility (optional, but good for future)
-- Users should be able to see their partner's basic status if designated
DROP POLICY IF EXISTS "Users can see their accountability partner's profile" ON public.user_profile;
CREATE POLICY "Users can see their accountability partner's profile" ON public.user_profile
  FOR SELECT USING (
    auth.uid() = accountability_partner_id
  );


-- Migration: 20260304000023_challenges.sql
-- Challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL, -- e.g. 'workouts', 'volume', 'xp'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  icon_slug TEXT
);

-- Challenge Participation
CREATE TABLE IF NOT EXISTS public.challenge_participation (
  participation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(challenge_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_value NUMERIC DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participation ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Challenges are public" ON public.challenges;
CREATE POLICY "Challenges are public" ON public.challenges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Participation is visible to all" ON public.challenge_participation;
CREATE POLICY "Participation is visible to all" ON public.challenge_participation FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participation;
CREATE POLICY "Users can join challenges" ON public.challenge_participation FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed initial challenge
INSERT INTO public.challenges (title, description, metric, start_date, end_date, icon_slug) VALUES
('March Madness', 'Log the most workouts in March!', 'workouts', '2026-03-01', '2026-03-31', 'zap');
