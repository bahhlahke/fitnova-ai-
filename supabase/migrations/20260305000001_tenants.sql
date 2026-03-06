-- Multi-tenant foundation
-- Path: supabase/migrations/20260305000001_tenants.sql

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Admin can see all tenants
CREATE POLICY "Admins can manage all tenants"
  ON public.tenants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can see their own tenant
CREATE POLICY "Users can view their own tenant"
  ON public.tenants
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM public.user_profile WHERE user_id = auth.uid())
  );

-- 2. Add tenant_id to user_profile
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(tenant_id);

COMMENT ON COLUMN public.user_profile.tenant_id IS 'Association with a specific tenant for data isolation.';

-- 3. Create a default tenant for existing users (Optional migration step)
-- INSERT INTO public.tenants (name, slug) VALUES ('Default', 'default') ON CONFLICT DO NOTHING;
-- UPDATE public.user_profile SET tenant_id = (SELECT tenant_id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;
