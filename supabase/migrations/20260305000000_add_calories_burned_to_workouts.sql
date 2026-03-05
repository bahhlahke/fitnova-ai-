-- Migration to add calories_burned to workout_logs
ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS calories_burned INT;

COMMENT ON COLUMN public.workout_logs.calories_burned IS 'Estimated calories burned during the workout session.';
