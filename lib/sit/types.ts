import type { DailyPlan, DailyPlanTrainingExercise } from "@/lib/plan/types";

export type SitPathway = "green" | "amber" | "red";
export type SitFeatureMode = "off" | "shadow" | "enforce";

export type ReadinessReasonCode =
  | "sleep_debt_high"
  | "hrv_delta_low"
  | "rhr_delta_high"
  | "strain_high"
  | "acwr_spike"
  | "soreness_high"
  | "adherence_decay"
  | "pain_flag_active"
  | "data_confidence_low"
  | "readiness_green";

export type SafetyReasonCode =
  | "weekly_set_delta_cap"
  | "intensity_delta_cap"
  | "high_intensity_day_limit"
  | "minimum_recovery_spacing"
  | "pain_guardrail";

export type PhysicalHistoryEventType =
  | "symptom_reported"
  | "substitution_recommended"
  | "substitution_applied"
  | "outcome_recorded";

export interface CanonicalReadinessVector {
  date_local: string;
  provider_confidence: number;
  data_completeness: number;
  recovery_score: number | null;
  sleep_hours: number | null;
  sleep_debt_hours: number;
  hrv: number | null;
  hrv_delta: number | null;
  resting_hr: number | null;
  resting_hr_delta: number | null;
  strain_score: number | null;
  respiration_rate_avg: number | null;
  spo2_avg: number | null;
  blood_glucose_avg: number | null;
  steps: number | null;
  acwr: number;
  soreness_severity: number;
  adherence_decay: number;
  pain_flags: string[];
  reasons: ReadinessReasonCode[];
  providers: string[];
}

export interface ReadinessSnapshot {
  snapshot_date: string;
  pathway: SitPathway;
  score: number;
  confidence: number;
  reason_codes: ReadinessReasonCode[];
  policy_version: string;
  features: CanonicalReadinessVector;
}

export interface PlanMutationTrace {
  policy_version: string;
  pathway: SitPathway;
  shadow_mode: boolean;
  reasons: ReadinessReasonCode[];
  summary: string;
  before: {
    duration_minutes: number;
    exercises: Array<Pick<DailyPlanTrainingExercise, "name" | "sets" | "reps" | "intensity">>;
  };
  after: {
    duration_minutes: number;
    exercises: Array<Pick<DailyPlanTrainingExercise, "name" | "sets" | "reps" | "intensity">>;
  };
}

export interface SafetyIssue {
  code: SafetyReasonCode;
  message: string;
  severity: "warning" | "block";
}

export interface SafetyValidationResult {
  status: "pass" | "modified" | "blocked";
  plan: DailyPlan;
  issues: SafetyIssue[];
  policy_version: string;
}

export interface ExerciseOntologyEntry {
  exercise_id: string;
  canonical_name: string;
  aliases: string[];
  contraindications: string[];
  equivalence_class: string;
  home_variant: string;
  gym_variant: string;
}

export interface PhysicalHistoryEventRecord {
  event_type: PhysicalHistoryEventType;
  symptom_tags: string[];
  current_exercise?: string | null;
  replacement_exercise?: string | null;
  outcome_quality?: number | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface DeterministicSubstitutionResult {
  replacement: DailyPlanTrainingExercise;
  rationale: string;
  symptom_tags: string[];
  policy_version: string;
  contraindications: string[];
  triggered: boolean;
  reused_history: boolean;
}

export interface VoiceDuplexEvent {
  type:
    | "transcript.partial"
    | "assistant.partial"
    | "assistant.final"
    | "tts.script"
    | "barge_in_ready";
  content?: string;
  index?: number;
  final?: boolean;
}
