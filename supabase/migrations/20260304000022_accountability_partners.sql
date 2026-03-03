-- Accountability Partners
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS accountability_partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS for partner visibility (optional, but good for future)
-- Users should be able to see their partner's basic status if designated
CREATE POLICY "Users can see their accountability partner's profile" ON public.user_profile
  FOR SELECT USING (
    auth.uid() = accountability_partner_id
  );
