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

CREATE POLICY "Users can create their own posts" ON public.social_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
