/**
 * Shared types for Koda AI.
 * Kept in sync with Supabase schema (see supabase/migrations/).
 * Used by app routes, lib/ai/assemble-context, and API.
 */

export type WorkoutType = "strength" | "cardio" | "mobility" | "other";

export type RefreshScope = "dashboard" | "nutrition" | "workout" | "progress" | "social" | "profile" | "plan";

export interface AiActionResult {
  type:
  | "meal_logged"
  | "workout_logged"
  | "biometrics_logged"
  | "meal_removed"
  | "hydration_logged"
  | "check_in_logged"
  | "profile_updated"
  | "social_posted"
  | "coach_requested"
  | "plan_generated";
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
  calories_burned?: number;
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
  experience_level?: "beginner" | "intermediate" | "advanced";
  motivational_driver?: "performance" | "health" | "aesthetics" | "stress";
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
  provider: "whoop" | "oura" | "apple_health" | "healthkit" | "fitbit" | "garmin";
  status: "connected" | "disconnected" | "error";
  external_user_id?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConnectedSignalRecord {
  signal_id: string;
  user_id: string;
  provider: "whoop" | "oura" | "apple_health" | "healthkit" | "fitbit" | "garmin";
  signal_date: string;
  recovery_score?: number | null;
  strain_score?: number | null;
  sleep_hours?: number | null;
  resting_hr?: number | null;
  hrv?: number | null;
  respiratory_rate_avg?: number | null;
  spo2_avg?: number | null;
  blood_glucose_avg?: number | null;
  steps?: number | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PolicyVersionRecord {
  policy_version_id: string;
  policy_key: string;
  version: string;
  is_active: boolean;
  changelog?: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReadinessSnapshotRecord {
  snapshot_id: string;
  user_id: string;
  snapshot_date: string;
  pathway: "green" | "amber" | "red";
  score: number;
  confidence: number;
  reason_codes: string[];
  policy_version: string;
  features: Record<string, unknown>;
  canonical_input: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlanMutationRecord {
  mutation_id: string;
  user_id: string;
  date_local: string;
  policy_version: string;
  pathway: "green" | "amber" | "red";
  shadow_mode: boolean;
  before_plan: Record<string, unknown>;
  after_plan: Record<string, unknown>;
  mutation_trace: Record<string, unknown>;
  created_at: string;
}

export interface SafetyLedgerRecord {
  ledger_id: string;
  user_id: string;
  date_local: string;
  policy_version: string;
  decision_status: "pass" | "modified" | "blocked";
  reason_codes: string[];
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  created_at: string;
}

export interface OneRmAnomalyRecord {
  anomaly_id: string;
  user_id: string;
  exercise_name: string;
  source_row_id?: string | null;
  decision: "quarantined" | "accepted";
  reason_codes: string[];
  input_payload: Record<string, unknown>;
  created_at: string;
}

export interface ExerciseOntologyRecord {
  exercise_id: string;
  canonical_name: string;
  aliases: string[];
  contraindications: string[];
  equivalence_class: string;
  home_variant: string;
  gym_variant: string;
  created_at: string;
  updated_at: string;
}

export interface PhysicalHistoryEventRecord {
  event_id: string;
  user_id: string;
  event_type: "symptom_reported" | "substitution_recommended" | "substitution_applied" | "outcome_recorded";
  symptom_tags: string[];
  current_exercise?: string | null;
  replacement_exercise?: string | null;
  outcome_quality?: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
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

// ── Meal Planning V2 ────────────────────────────────────────────────────────

export interface MealPlanPreferences {
  duration_days: 1 | 3 | 7 | 14 | 30;
  meals_per_day: 3 | 4 | 5 | 6;
  dietary_restrictions: string[]; // e.g. ["Vegetarian", "Gluten-Free"]
  allergies: string[];            // e.g. ["peanuts", "shellfish"]
  cuisine_preferences: string[];  // e.g. ["Mediterranean", "Mexican"]
  cooking_skill: "beginner" | "intermediate" | "advanced";
  prep_time_budget: "quick" | "moderate" | "elaborate"; // <15min / 15-30min / 30+min
  weekly_budget_usd?: number | null;
  servings_per_meal: 1 | 2 | 4;
  meal_prep_mode: boolean;
  include_snacks: boolean;
}

export interface EnhancedMeal {
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber_g?: number;
  sodium_mg?: number;
  recipe: string;
  ingredients: string[]; // imperial: "8 oz chicken breast", "1 cup brown rice"
  prep_time_minutes: number;
  servings: number;
  cuisine_type?: string;
  estimated_cost_usd?: number;
  recipe_url?: string;
  recipe_source?: string;
  image_url?: string;
  goal_alignment_rationale?: string;
}

export interface EnhancedGroceryItem {
  item: string;
  category:
    | "Produce"
    | "Meat & Seafood"
    | "Dairy & Eggs"
    | "Canned & Jarred"
    | "Dry & Pantry"
    | "Frozen"
    | "Bakery"
    | "Beverages"
    | "Other";
  quantity: string; // imperial: "2 lbs", "12 oz", "1 cup"
  estimated_cost_usd?: number;
  checked: boolean;
  custom?: boolean;
  source_recipe_name?: string;
}

export interface EnhancedMealPlan {
  days: Array<{
    date: string;
    meals: EnhancedMeal[];
  }>;
  grocery_list: EnhancedGroceryItem[];
  total_estimated_cost_usd?: number;
}

export interface EatingOutLog {
  log_id: string;
  user_id: string;
  date_local: string;
  restaurant_name?: string;
  meal_name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  notes?: string;
  created_at: string;
}

export interface MealSwapOption {
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipe: string;
  ingredients: string[];
  prep_time_minutes: number;
  reason: string;
  recipe_url?: string;
  recipe_source?: string;
  image_url?: string;
  goal_alignment_rationale?: string;
}
