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
CREATE POLICY "Challenges are public" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Participation is visible to all" ON public.challenge_participation FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.challenge_participation FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed initial challenge
INSERT INTO public.challenges (title, description, metric, start_date, end_date, icon_slug) VALUES
('March Madness', 'Log the most workouts in March!', 'workouts', '2026-03-01', '2026-03-31', 'zap');
