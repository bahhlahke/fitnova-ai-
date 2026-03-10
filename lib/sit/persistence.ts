import type { DailyPlan } from "@/lib/plan/types";
import type {
  PhysicalHistoryEventRecord,
  PlanMutationTrace,
  ReadinessSnapshot,
  SafetyValidationResult,
} from "@/lib/sit/types";
import { getExerciseOntologySeed } from "@/lib/sit/substitutions";

const POLICY_SEEDS = [
  {
    policy_key: "readiness_orchestrator",
    version: "readiness-orchestrator-v1",
    is_active: true,
    changelog: "Initial deterministic readiness pathways for green/amber/red delivery.",
    config: { statuses: ["green", "amber", "red"] },
  },
  {
    policy_key: "safety_validator",
    version: "safety-validator-v1",
    is_active: true,
    changelog: "Initial prescription guardrails for weekly volume, intensity, and recovery spacing.",
    config: { fail_closed: true },
  },
  {
    policy_key: "substitution_policy",
    version: "exercise-ontology-v1",
    is_active: true,
    changelog: "Initial deterministic substitution ontology with contraindications and equivalence classes.",
    config: { deterministic: true },
  },
];

export async function ensureSitArtifacts(supabase: any): Promise<void> {
  await Promise.allSettled([
    supabase.from("policy_versions").upsert(POLICY_SEEDS, { onConflict: "policy_key,version" }),
    supabase
      .from("exercise_ontology")
      .upsert(getExerciseOntologySeed(), { onConflict: "exercise_id" }),
  ]);
}

export async function loadReadinessContext(
  supabase: any,
  userId: string,
  dateLocal: string
): Promise<{
  profile: Record<string, unknown> | null;
  signals: any[];
  checkIns: any[];
  workouts: any[];
  priorPlans: any[];
}> {
  const [profileRes, signalRes, checkInRes, workoutRes, priorPlansRes] = await Promise.all([
    supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("connected_signals")
      .select("provider, signal_date, recovery_score, sleep_hours, sleep_deep_hours, sleep_rem_hours, hrv, resting_hr, strain_score, respiratory_rate_avg, spo2_avg, blood_glucose_avg, steps")
      .eq("user_id", userId)
      .lte("signal_date", dateLocal)
      .order("signal_date", { ascending: false })
      .limit(21),
    supabase
      .from("check_ins")
      .select("date_local, soreness_notes, adherence_score")
      .eq("user_id", userId)
      .lte("date_local", dateLocal)
      .order("date_local", { ascending: false })
      .limit(14),
    supabase
      .from("workout_logs")
      .select("date, duration_minutes, exercises")
      .eq("user_id", userId)
      .lte("date", dateLocal)
      .order("date", { ascending: false })
      .limit(35),
    supabase
      .from("daily_plans")
      .select("date_local, plan_json")
      .eq("user_id", userId)
      .lte("date_local", dateLocal)
      .order("date_local", { ascending: false })
      .limit(7),
  ]);

  return {
    profile: (profileRes.data ?? null) as Record<string, unknown> | null,
    signals: signalRes.data ?? [],
    checkIns: checkInRes.data ?? [],
    workouts: workoutRes.data ?? [],
    priorPlans: priorPlansRes.data ?? [],
  };
}

export async function persistReadinessSnapshot(
  supabase: any,
  userId: string,
  snapshot: ReadinessSnapshot
): Promise<void> {
  await supabase.from("readiness_snapshots").insert({
    user_id: userId,
    snapshot_date: snapshot.snapshot_date,
    pathway: snapshot.pathway,
    score: snapshot.score,
    confidence: snapshot.confidence,
    reason_codes: snapshot.reason_codes,
    policy_version: snapshot.policy_version,
    features: snapshot.features,
    canonical_input: snapshot.features,
  });
}

export async function persistPlanMutation(
  supabase: any,
  userId: string,
  dateLocal: string,
  beforePlan: DailyPlan,
  afterPlan: DailyPlan,
  mutationTrace: PlanMutationTrace
): Promise<void> {
  await supabase.from("plan_mutations").insert({
    user_id: userId,
    date_local: dateLocal,
    policy_version: mutationTrace.policy_version,
    pathway: mutationTrace.pathway,
    before_plan: beforePlan,
    after_plan: afterPlan,
    mutation_trace: mutationTrace,
    shadow_mode: mutationTrace.shadow_mode,
  });
}

export async function persistSafetyLedger(
  supabase: any,
  userId: string,
  dateLocal: string,
  inputPlan: DailyPlan,
  validation: SafetyValidationResult
): Promise<void> {
  await supabase.from("safety_ledger").insert({
    user_id: userId,
    date_local: dateLocal,
    policy_version: validation.policy_version,
    decision_status: validation.status,
    reason_codes: validation.issues.map((issue) => issue.code),
    input_payload: inputPlan,
    output_payload: validation.plan,
  });
}

export async function loadPhysicalHistoryEvents(
  supabase: any,
  userId: string,
  symptomTags: string[]
): Promise<PhysicalHistoryEventRecord[]> {
  const response = await supabase
    .from("physical_history_events")
    .select("event_type, symptom_tags, current_exercise, replacement_exercise, outcome_quality, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);

  const rows = (response.data ?? []) as PhysicalHistoryEventRecord[];
  if (symptomTags.length === 0) return rows;
  return rows.filter((row) => symptomTags.every((tag) => row.symptom_tags?.includes(tag)));
}

export async function persistPhysicalHistoryEvent(
  supabase: any,
  userId: string,
  event: PhysicalHistoryEventRecord
): Promise<void> {
  await supabase.from("physical_history_events").insert({
    user_id: userId,
    event_type: event.event_type,
    symptom_tags: event.symptom_tags,
    current_exercise: event.current_exercise ?? null,
    replacement_exercise: event.replacement_exercise ?? null,
    outcome_quality: event.outcome_quality ?? null,
    metadata: event.metadata ?? {},
  });
}
