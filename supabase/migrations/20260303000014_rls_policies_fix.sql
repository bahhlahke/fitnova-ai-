-- Fix missing WITH CHECK policies for tables that only have FOR ALL USING (...) defined

DO $$
BEGIN
  -- 1. nutrition_logs
  DROP POLICY IF EXISTS "Users can CRUD own nutrition_logs" ON public.nutrition_logs;
  CREATE POLICY "Users can CRUD own nutrition_logs" ON public.nutrition_logs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 2. workout_logs
  DROP POLICY IF EXISTS "Users can CRUD own workout_logs" ON public.workout_logs;
  CREATE POLICY "Users can CRUD own workout_logs" ON public.workout_logs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 3. progress_tracking
  DROP POLICY IF EXISTS "Users can CRUD own progress_tracking" ON public.progress_tracking;
  CREATE POLICY "Users can CRUD own progress_tracking" ON public.progress_tracking
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 4. ai_conversations
  DROP POLICY IF EXISTS "Users can CRUD own ai_conversations" ON public.ai_conversations;
  CREATE POLICY "Users can CRUD own ai_conversations" ON public.ai_conversations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- 5. onboarding
  DROP POLICY IF EXISTS "Users can CRUD own onboarding" ON public.onboarding;
  CREATE POLICY "Users can CRUD own onboarding" ON public.onboarding
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

END $$;
