-- Tenant isolation for core tables
-- Path: supabase/migrations/20260305000002_tenant_isolation.sql

-- tables to update: workout_logs, nutrition_logs, progress_tracking, check_ins, ai_conversations, daily_plans, social_posts, coach_escalated_cases

DO $$ 
DECLARE 
    t TEXT;
    tables TEXT[] := ARRAY['workout_logs', 'nutrition_logs', 'progress_tracking', 'check_ins', 'ai_conversations', 'daily_plans', 'social_posts', 'coach_escalations'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(tenant_id)', t);
        
        -- Update RLS policies for each table
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant isolation" ON public.%I FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profile WHERE user_id = auth.uid()))', t);
        
        -- Admin bypass (optional but recommended)
        EXECUTE format('DROP POLICY IF EXISTS "Admin bypass" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Admin bypass" ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profile WHERE user_id = auth.uid() AND role = ''admin''))', t);
    END LOOP;
END $$;
