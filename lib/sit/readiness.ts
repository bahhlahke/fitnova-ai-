import { toLocalDateString } from "@/lib/date/local-date";
import type { CanonicalReadinessVector, ReadinessReasonCode, ReadinessSnapshot } from "@/lib/sit/types";

type SignalRow = {
  provider?: string | null;
  signal_date?: string | null;
  recovery_score?: number | null;
  sleep_hours?: number | null;
  sleep_deep_hours?: number | null;
  sleep_rem_hours?: number | null;
  hrv?: number | null;
  resting_hr?: number | null;
  strain_score?: number | null;
  respiratory_rate_avg?: number | null;
  spo2_avg?: number | null;
  blood_glucose_avg?: number | null;
  steps?: number | null;
};

type CheckInRow = {
  date_local?: string | null;
  soreness_notes?: string | null;
  adherence_score?: number | null;
};

type WorkoutRow = {
  date?: string | null;
  duration_minutes?: number | null;
};

type BuildReadinessSources = {
  dateLocal?: string;
  signals: SignalRow[];
  checkIns: CheckInRow[];
  workouts: WorkoutRow[];
  profile?: Record<string, unknown> | null;
};

const PROVIDER_WEIGHTS: Record<string, number> = {
  oura: 0.97,
  whoop: 0.94,
  garmin: 0.84,
  fitbit: 0.8,
  apple_health: 0.72,
  healthkit: 0.72,
  unknown: 0.55,
};

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((value): value is number => Number.isFinite(value as number));
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function providerWeight(provider: string | null | undefined): number {
  if (!provider) return PROVIDER_WEIGHTS.unknown;
  return PROVIDER_WEIGHTS[provider.toLowerCase()] ?? PROVIDER_WEIGHTS.unknown;
}

function severityFromSoreness(notes: string | null | undefined): number {
  if (!notes) return 0;
  const lower = notes.toLowerCase();
  if (/sharp|severe|can'?t|injur|spasm|radiat/.test(lower)) return 4;
  if (/pain|flare|swollen|bad|limp/.test(lower)) return 3;
  if (/tight|sore|stiff|fatigue/.test(lower)) return 2;
  return 1;
}

function painFlagsFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tags = new Set<string>();
  if (/knee/.test(lower)) tags.add("knee");
  if (/shoulder/.test(lower)) tags.add("shoulder");
  if (/back|spine|lumbar/.test(lower)) tags.add("back");
  if (/hip/.test(lower)) tags.add("hip");
  if (/elbow/.test(lower)) tags.add("elbow");
  if (/ankle/.test(lower)) tags.add("ankle");
  if (/pain|injur|sharp|radiat/.test(lower)) tags.add("pain");
  return Array.from(tags);
}

function computeAcwr(workouts: WorkoutRow[], dateLocal: string): number {
  const end = new Date(`${dateLocal}T12:00:00`);
  let acute = 0;
  let chronic = 0;

  for (const workout of workouts) {
    if (!workout.date) continue;
    const diffDays = Math.floor((end.getTime() - new Date(`${workout.date}T12:00:00`).getTime()) / (24 * 60 * 60 * 1000));
    const load = Math.max(15, Number(workout.duration_minutes) || 0);
    if (diffDays >= 0 && diffDays < 7) acute += load;
    if (diffDays >= 0 && diffDays < 28) chronic += load;
  }

  if (acute === 0 && chronic === 0) return 1;
  const chronicWeekly = chronic > 0 ? chronic / 4 : acute || 1;
  return round(acute / Math.max(chronicWeekly, 1), 2);
}

function computeDataCompleteness(signal: SignalRow | null): number {
  if (!signal) return 0;
  const total = 8;
  let present = 0;
  if (signal.sleep_hours != null) present += 1;
  if (signal.hrv != null) present += 1;
  if (signal.resting_hr != null) present += 1;
  if (signal.strain_score != null) present += 1;
  if (signal.recovery_score != null) present += 1;
  if (signal.respiratory_rate_avg != null) present += 1;
  if (signal.spo2_avg != null) present += 1;
  if (signal.steps != null) present += 1;
  return round(present / total, 2);
}

export function buildCanonicalReadinessVector({
  dateLocal = toLocalDateString(),
  signals,
  checkIns,
  workouts,
  profile,
}: BuildReadinessSources): CanonicalReadinessVector {
  const orderedSignals = [...signals]
    .filter((signal) => signal.signal_date)
    .sort((a, b) => String(b.signal_date).localeCompare(String(a.signal_date)));
  const latestSignal = orderedSignals[0] ?? null;
  const baselineSignals = orderedSignals.slice(1, 22);
  const latestCheckIn = [...checkIns]
    .filter((checkIn) => checkIn.date_local)
    .sort((a, b) => String(b.date_local).localeCompare(String(a.date_local)))[0] ?? null;

  const weightedConfidence = latestSignal
    ? round(providerWeight(latestSignal.provider) * computeDataCompleteness(latestSignal), 2)
    : 0;
  const hrvBaseline = average(baselineSignals.map((signal) => signal.hrv));
  const rhrBaseline = average(baselineSignals.map((signal) => signal.resting_hr));
  const adherenceValues = checkIns
    .map((checkIn) => Number(checkIn.adherence_score))
    .filter((value) => Number.isFinite(value));
  const adherenceAverage = adherenceValues.length
    ? adherenceValues.reduce((sum, value) => sum + value, 0) / adherenceValues.length
    : 4;
  const latestSleep = latestSignal?.sleep_hours ?? null;
  const sorenessSeverity = severityFromSoreness(latestCheckIn?.soreness_notes);
  const painFlags = [
    ...painFlagsFromText(latestCheckIn?.soreness_notes),
    ...painFlagsFromText(
      typeof profile?.injuries_limitations === "object"
        ? JSON.stringify(profile?.injuries_limitations)
        : null
    ),
  ].filter((value, index, values) => values.indexOf(value) === index);

  const vector: CanonicalReadinessVector = {
    date_local: dateLocal,
    provider_confidence: weightedConfidence,
    data_completeness: computeDataCompleteness(latestSignal),
    recovery_score: latestSignal?.recovery_score ?? null,
    sleep_hours: latestSleep,
    sleep_debt_hours: round(Math.max(0, 8 - (latestSleep ?? 7))),
    hrv: latestSignal?.hrv ?? null,
    hrv_delta:
      latestSignal?.hrv != null && hrvBaseline != null
        ? round(latestSignal.hrv - hrvBaseline, 1)
        : null,
    resting_hr: latestSignal?.resting_hr ?? null,
    resting_hr_delta:
      latestSignal?.resting_hr != null && rhrBaseline != null
        ? round(latestSignal.resting_hr - rhrBaseline, 1)
        : null,
    strain_score: latestSignal?.strain_score ?? null,
    respiration_rate_avg: latestSignal?.respiratory_rate_avg ?? null,
    spo2_avg: latestSignal?.spo2_avg ?? null,
    blood_glucose_avg: latestSignal?.blood_glucose_avg ?? null,
    steps: latestSignal?.steps ?? null,
    acwr: computeAcwr(workouts, dateLocal),
    soreness_severity: sorenessSeverity,
    adherence_decay: round(clamp((4 - adherenceAverage) / 4, 0, 1), 2),
    pain_flags: painFlags,
    reasons: [],
    providers: Array.from(
      new Set(orderedSignals.map((signal) => signal.provider).filter(Boolean) as string[])
    ),
  };

  return vector;
}

export function evaluateReadinessVector(
  vector: CanonicalReadinessVector,
  policyVersion = "readiness-orchestrator-v1"
): ReadinessSnapshot {
  const reasons: ReadinessReasonCode[] = [];
  let score = 100;

  if (vector.sleep_debt_hours >= 2) {
    score -= 18;
    reasons.push("sleep_debt_high");
  }
  if (vector.hrv_delta != null && vector.hrv_delta <= -12) {
    score -= 18;
    reasons.push("hrv_delta_low");
  }
  if (vector.resting_hr_delta != null && vector.resting_hr_delta >= 5) {
    score -= 14;
    reasons.push("rhr_delta_high");
  }
  if (vector.strain_score != null && vector.strain_score >= 16) {
    score -= 14;
    reasons.push("strain_high");
  }
  if (vector.acwr >= 1.45) {
    score -= 18;
    reasons.push("acwr_spike");
  }
  if (vector.soreness_severity >= 3) {
    score -= 12;
    reasons.push("soreness_high");
  }
  if (vector.adherence_decay >= 0.45) {
    score -= 8;
    reasons.push("adherence_decay");
  }
  if (vector.pain_flags.length > 0) {
    score -= 16;
    reasons.push("pain_flag_active");
  }
  if (vector.provider_confidence < 0.45 || vector.data_completeness < 0.35) {
    score -= 10;
    reasons.push("data_confidence_low");
  }

  score = clamp(score, 5, 100);
  let pathway: ReadinessSnapshot["pathway"] = "green";
  if (score < 55 || reasons.includes("pain_flag_active")) {
    pathway = "red";
  } else if (score < 75) {
    pathway = "amber";
  }

  if (pathway === "green") {
    reasons.push("readiness_green");
  }

  return {
    snapshot_date: vector.date_local,
    pathway,
    score,
    confidence: round(clamp((vector.provider_confidence + vector.data_completeness) / 2, 0.2, 0.99), 2),
    reason_codes: reasons,
    policy_version: policyVersion,
    features: {
      ...vector,
      reasons,
    },
  };
}
