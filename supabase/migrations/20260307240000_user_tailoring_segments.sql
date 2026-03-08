-- Add experience_level and motivational_driver to user_profile
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS motivational_driver TEXT CHECK (motivational_driver IN ('performance', 'health', 'aesthetics', 'stress'));

-- Update comment
COMMENT ON COLUMN public.user_profile.experience_level IS 'User self-reported fitness experience level.';
COMMENT ON COLUMN public.user_profile.motivational_driver IS 'Primary psychological driver for fitness goals.';
