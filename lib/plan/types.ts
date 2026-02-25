import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyPlanTrainingExercise = {
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  notes?: string;
  /** Optional demo image URL for guided workout (e.g. AI-generated move photo). */
  image_url?: string | null;
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

export type PlannerInputs = {
  todayConstraints?: {
    minutesAvailable?: number;
    location?: "gym" | "home";
    soreness?: string;
  };
};

export type PlannerDataSources = {
  supabase: SupabaseClient;
  userId: string;
};
