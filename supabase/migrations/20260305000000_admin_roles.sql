-- Migration to add admin roles
-- Path: supabase/migrations/20260305000000_admin_roles.sql

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin');
    END IF;
END $$;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'user';

COMMENT ON COLUMN public.user_profile.role IS 'User role for access control (user, admin).';

-- Grant access to first user if needed (Manual or specific email)
-- UPDATE public.user_profile SET role = 'admin' WHERE email = 'YOUR_EMAIL@example.com';
