-- Meal Planning V2: Enhanced preferences, flexible duration, eating-out tracking
-- Migration: 20260314100000_meal_planning_v2

-- Add duration and preferences to meal_plans
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 7;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS preferences_json JSONB DEFAULT '{}';

-- Eating out log: tracks restaurant meals and integrates with nutrition_logs
CREATE TABLE IF NOT EXISTS eating_out_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  restaurant_name TEXT,
  meal_name TEXT NOT NULL,
  calories INTEGER,
  protein_g NUMERIC(6,1),
  carbs_g NUMERIC(6,1),
  fat_g NUMERIC(6,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE eating_out_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_eating_out_logs"
  ON eating_out_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_eating_out_logs_user_date
  ON eating_out_logs (user_id, date_local);
