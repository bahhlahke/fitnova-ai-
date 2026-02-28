ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

COMMENT ON COLUMN public.user_profile.phone_number IS 'Normalized E.164-style phone number used for SMS coaching.';
