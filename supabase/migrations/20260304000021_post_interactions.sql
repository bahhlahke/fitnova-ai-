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
CREATE POLICY "Likes are viewable by post viewers" ON public.post_likes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.social_posts WHERE post_id = public.post_likes.post_id
  ));

CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Comments are viewable by post viewers" ON public.post_comments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.social_posts WHERE post_id = public.post_comments.post_id
  ));

CREATE POLICY "Users can comment on posts" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
