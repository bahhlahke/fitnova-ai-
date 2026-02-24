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
