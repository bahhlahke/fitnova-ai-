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
CREATE POLICY "Groups are viewable by everyone" ON public.groups
  FOR SELECT USING (true);

CREATE POLICY "Users can join any group" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see their memberships" ON public.group_members
  FOR SELECT USING (auth.uid() = user_id);

-- Seed Groups
INSERT INTO public.groups (name, description, icon_slug) VALUES 
('Early Risers', 'The 5 AM club. Log your morning sessions here.', 'fire'),
('Powerlifters', 'Squat, Bench, Deadlift focus.', 'weight'),
('Healthy Recipes', 'Share and track meal plans with the community.', 'heart'),
('10k Step Challenge', 'Daily walking targets and step goals.', 'zap');
