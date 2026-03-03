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
