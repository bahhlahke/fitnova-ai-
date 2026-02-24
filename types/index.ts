/**
 * Shared types for FitNova AI.
 * Kept in sync with Supabase schema (see supabase/migrations/).
 * Used by app routes, lib/ai/assemble-context, and API.
 */

export type WorkoutType = "strength" | "cardio" | "mobility" | "other";

export interface ExerciseEntry {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  rir?: number;
  tempo?: string;
  rest_seconds_after_set?: number;
  rest_seconds_after_exercise?: number;
  form_cues?: string;
}

export interface WorkoutLog {
  log_id: string;
  user_id: string;
  date: string;
  workout_type: WorkoutType;
  exercises: ExerciseEntry[];
  duration_minutes?: number;
  perceived_exertion?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MealEntry {
  time: string;
  description: string;
  calories?: number;
  macros?: { carbs?: number; protein?: number; fat?: number };
}

export interface NutritionLog {
  log_id: string;
  user_id: string;
  date: string;
  meals: MealEntry[];
  total_calories?: number;
  macros?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  name?: string;
  email?: string;
  age?: number;
  sex?: string;
  height?: number;
  weight?: number;
  goals?: string[];
  injuries_limitations?: Record<string, unknown>;
  dietary_preferences?: Record<string, unknown>;
  activity_level?: string;
  devices?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DailyPlanRecord {
  plan_id: string;
  user_id: string;
  date_local: string;
  plan_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CheckInRecord {
  check_in_id: string;
  user_id: string;
  date_local: string;
  adherence_score?: number;
  energy_score?: number;
  sleep_hours?: number;
  soreness_notes?: string;
  created_at: string;
  updated_at: string;
}
