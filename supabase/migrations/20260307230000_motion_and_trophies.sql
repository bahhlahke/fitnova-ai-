-- Motion Analysis & Elite Trophies Persistence

-- 1. Motion Analysis Storage
CREATE TABLE IF NOT EXISTS public.motion_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT,
  score INTEGER,
  critique TEXT,
  correction TEXT,
  image_urls TEXT[], 
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Trophies Storage (Elite Protocols)
CREATE TABLE IF NOT EXISTS public.trophies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ai_rationale TEXT,
  icon_slug TEXT DEFAULT 'zap',
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  earned_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.motion_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trophies ENABLE ROW LEVEL SECURITY;

-- Policies for motion_analysis
CREATE POLICY "Users can view their own motion analysis" ON public.motion_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own motion analysis" ON public.motion_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for trophies
CREATE POLICY "Users can view their own trophies" ON public.trophies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System/Users can insert trophies" ON public.trophies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed some initial trophies for the user if needed (handled by AI in practice)
