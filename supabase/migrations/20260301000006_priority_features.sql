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

CREATE POLICY "Users can read own coach_nudges" ON public.coach_nudges
  FOR SELECT USING (auth.uid() = user_id);

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

CREATE POLICY "Users can create own coach_escalations" ON public.coach_escalations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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
