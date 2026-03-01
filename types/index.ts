/**
 * Shared types for FitNova AI.
 * Kept in sync with Supabase schema (see supabase/migrations/).
 * Used by app routes, lib/ai/assemble-context, and API.
 */

export type WorkoutType = "strength" | "cardio" | "mobility" | "other";

export type RefreshScope = "dashboard" | "nutrition" | "workout" | "progress";

export interface AiActionResult {
  type: "meal_logged" | "workout_logged" | "biometrics_logged";
  targetRoute: string;
  summary: string;
}

export interface AiReliability {
  confidence_score: number;
  explanation: string;
  limitations: string[];
  calibration_version?: number;
  historical_error_band?: { min: number; max: number };
}

export interface PerformedSetEntry {
  reps: number;
  weight_kg?: number;
  rir?: number;
}

export interface ExerciseEntry {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  rir?: number;
  tempo?: string;
  target_load_kg?: number;
  target_rir?: number;
  progression_note?: string;
  performed_sets?: PerformedSetEntry[];
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
  phone_number?: string;
  age?: number;
  sex?: string;
  height?: number;
  weight?: number;
  goals?: string[];
  injuries_limitations?: Record<string, unknown>;
  dietary_preferences?: Record<string, unknown>;
  activity_level?: string;
  devices?: Record<string, unknown>;
  subscription_status?: "free" | "pro";
  stripe_customer_id?: string;
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

export interface WeeklyPlanRecord {
  weekly_plan_id: string;
  user_id: string;
  week_start_local: string;
  plan_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CoachNudgeRecord {
  nudge_id: string;
  user_id: string;
  date_local: string;
  nudge_type: "daily_plan" | "workout_log" | "weigh_in" | "retention_risk";
  risk_level: "low" | "medium" | "high";
  message: string;
  stage?: number;
  cta_route?: string | null;
  cta_label?: string | null;
  expires_at?: string | null;
  delivered_via_sms: boolean;
  acknowledged_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachEscalationRecord {
  escalation_id: string;
  user_id: string;
  topic: string;
  urgency: "low" | "normal" | "high";
  details?: string | null;
  preferred_channel: "in_app" | "sms" | "email";
  status: "open" | "assigned" | "closed";
  assigned_coach_user_id?: string | null;
  sla_due_at?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachEscalationMessageRecord {
  escalation_message_id: string;
  escalation_id: string;
  user_id: string;
  sender_type: "user" | "coach" | "system" | "sms";
  sender_user_id?: string | null;
  body: string;
  channel: "in_app" | "sms" | "email";
  created_at: string;
  updated_at: string;
}

export interface CoachEscalationEventRecord {
  escalation_event_id: string;
  escalation_id: string;
  user_id: string;
  actor_type: "user" | "coach" | "system" | "sms";
  actor_user_id?: string | null;
  event_type: "created" | "assigned" | "message" | "status_changed" | "resolved" | "sla_updated";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RetentionInterventionRecord {
  intervention_id: string;
  user_id: string;
  date_local: string;
  stage: 1 | 2 | 3;
  risk_level: "low" | "medium" | "high";
  reason_codes: string[];
  next_best_action: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiFeedbackRecord {
  feedback_id: string;
  user_id: string;
  domain: "nutrition" | "motion" | "body_comp";
  output_id: string;
  predicted_confidence: number;
  user_rating: 1 | 2 | 3 | 4 | 5;
  correction_delta?: number | null;
  created_at: string;
}

export interface ConnectedAccountRecord {
  account_id: string;
  user_id: string;
  provider: "whoop";
  status: "connected" | "disconnected" | "error";
  external_user_id?: string | null;
  token_expires_at?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConnectedSignalRecord {
  signal_id: string;
  user_id: string;
  provider: "whoop";
  signal_date: string;
  recovery_score?: number | null;
  strain_score?: number | null;
  sleep_hours?: number | null;
  resting_hr?: number | null;
  hrv?: number | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NutritionTargetRecord {
  target_id: string;
  user_id: string;
  calorie_target?: number | null;
  protein_target_g?: number | null;
  carbs_target_g?: number | null;
  fat_target_g?: number | null;
  meal_timing: Array<{ label: string; window?: string }>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionAdherenceDailyRecord {
  adherence_id: string;
  user_id: string;
  date_local: string;
  calorie_adherence?: number | null;
  macro_adherence?: number | null;
  meal_timing_adherence?: number | null;
  total_score?: number | null;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductEventRecord {
  event_id: string;
  user_id?: string | null;
  event_name: string;
  event_props: Record<string, unknown>;
  session_id?: string | null;
  created_at: string;
}
