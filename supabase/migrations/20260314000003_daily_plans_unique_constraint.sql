-- Add unique constraint on (user_id, date_local) for daily_plans so that
-- upsert operations work correctly and duplicate plans are prevented.
--
-- Step 1: Remove duplicate rows, keeping only the most recently created plan
-- per user per date. This is safe — the guided workout page already uses
-- ORDER BY created_at DESC, so only the latest plan was ever shown.
DELETE FROM public.daily_plans
WHERE plan_id NOT IN (
  SELECT DISTINCT ON (user_id, date_local) plan_id
  FROM public.daily_plans
  ORDER BY user_id, date_local, created_at DESC
);

-- Step 2: Add the unique constraint
ALTER TABLE public.daily_plans
  ADD CONSTRAINT daily_plans_user_date_unique UNIQUE (user_id, date_local);
