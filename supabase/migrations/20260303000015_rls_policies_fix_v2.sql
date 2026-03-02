-- Final RLS policies cleanup and fix for remaining tables
-- This ensures all user-owned tables have explicit WITH CHECK for upsert/insert/update

DO $$
BEGIN
  -- 1. user_profile (Update to unified FOR ALL CRUD)
  DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profile;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profile;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profile;
  CREATE POLICY "Users can CRUD own profile" ON public.user_profile
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 2. daily_plans
  DROP POLICY IF EXISTS "Users can CRUD own daily_plans" ON public.daily_plans;
  CREATE POLICY "Users can CRUD own daily_plans" ON public.daily_plans
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 3. check_ins
  DROP POLICY IF EXISTS "Users can CRUD own check_ins" ON public.check_ins;
  CREATE POLICY "Users can CRUD own check_ins" ON public.check_ins
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 4. weekly_plans
  DROP POLICY IF EXISTS "Users can CRUD own weekly_plans" ON public.weekly_plans;
  CREATE POLICY "Users can CRUD own weekly_plans" ON public.weekly_plans
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 5. coach_nudges
  DROP POLICY IF EXISTS "Users can read own coach_nudges" ON public.coach_nudges;
  DROP POLICY IF EXISTS "Users can update own coach_nudges" ON public.coach_nudges;
  CREATE POLICY "Users can CRUD own coach_nudges" ON public.coach_nudges
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 6. coach_escalations
  DROP POLICY IF EXISTS "Users can create own coach_escalations" ON public.coach_escalations;
  DROP POLICY IF EXISTS "Users can read own coach_escalations" ON public.coach_escalations;
  CREATE POLICY "Users can CRUD own coach_escalations" ON public.coach_escalations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 7. retention_interventions
  DROP POLICY IF EXISTS "Users can CRUD own retention interventions" ON public.retention_interventions;
  CREATE POLICY "Users can CRUD own retention interventions" ON public.retention_interventions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

END $$;
