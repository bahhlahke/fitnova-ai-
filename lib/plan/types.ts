import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyPlanTrainingExercise = {
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  notes?: string;
  target_load_kg?: number | null;
  target_rir?: number | null;
  progression_note?: string | null;
  /** Optional demo image URL for guided workout (e.g. AI-generated move photo). */
  image_url?: string | null;
  /** Optional demo video URL for guided workout. */
  video_url?: string | null;
};

export type DailyPlan = {
  date_local: string;
  training_plan: {
    focus: string;
    duration_minutes: number;
    location_option: "gym" | "home";
    exercises: DailyPlanTrainingExercise[];
    alternatives: string[];
  };
  nutrition_plan: {
    calorie_target: number;
    nutrition_mode?: "Performance" | "Baseline" | "Recovery";
    macros: {
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    meal_structure: string[];
    hydration_goal_liters: number;
  };
  safety_notes: string[];
};

export type WeeklyPlanDay = {
  date_local: string;
  day_label: string;
  focus: string;
  intensity: "low" | "moderate" | "high";
  target_duration_minutes: number;
  rationale: string;
};

export type WeeklyPlan = {
  week_start_local: string;
  cycle_goal: string;
  adaptation_summary: string;
  days: WeeklyPlanDay[];
};

export type PlannerInputs = {
  todayConstraints?: {
    minutesAvailable?: number;
    location?: "gym" | "home";
    soreness?: string;
  };
};

export type AdaptSessionRequest = {
  minutes_available?: number;
  equipment_mode?: "full_gym" | "limited" | "bodyweight";
  noise_constraint?: "any" | "quiet";
  avoid_body_regions?: string[];
  pain_flags?: string[];
  intensity_preference?: "downshift" | "maintain" | "push";
  current_exercises: DailyPlanTrainingExercise[];
};

export type AdaptSessionResponse = {
  exercises: DailyPlanTrainingExercise[];
  rationale: string;
  reliability: {
    confidence_score: number;
    explanation: string;
    limitations: string[];
  };
};

export type PlannerDataSources = {
  supabase: SupabaseClient;
  userId: string;
};
