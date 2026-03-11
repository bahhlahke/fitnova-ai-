import { toLocalDateString } from "@/lib/date/local-date";

export type OpenWearablesEventType = "sleep" | "activity" | "readiness" | "body";

export type OpenWearablesPayload = {
  event_type: OpenWearablesEventType;
  user_id: string;
  provider: string;
  data: Record<string, unknown>[];
};

const PROVIDER_CONFIDENCE: Record<string, number> = {
  oura: 0.97,
  whoop: 0.94,
  garmin: 0.84,
  fitbit: 0.8,
  apple_health: 0.72,
  healthkit: 0.72,
};

function num(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function signalDate(entry: Record<string, unknown>): string {
  const raw = entry.date;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return toLocalDateString();
}

function providerConfidence(provider: string): number {
  return PROVIDER_CONFIDENCE[provider.toLowerCase()] ?? 0.55;
}

function cleanRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== null && value !== undefined)
  );
}

function buildSignalRecord(
  payload: OpenWearablesPayload,
  row: Record<string, unknown>,
  nowIso: string
): Record<string, unknown> | null {
  const { event_type, user_id: userId, provider = "unknown" } = payload;
  const date = signalDate(row);
  const raw_payload = {
    provider_confidence: providerConfidence(provider),
    source: row,
  };

  if (event_type === "sleep") {
    const durationHours =
      (num(row.duration_seconds) ??
        num(row.total_sleep_seconds) ??
        num(row.total_sleep_duration) ??
        0) / 3600;

    if (durationHours <= 0) {
      return null;
    }

    return cleanRecord({
      user_id: userId,
      provider,
      signal_date: date,
      sleep_hours: durationHours,
      sleep_deep_hours:
        num(row.deep_sleep_seconds) != null
          ? num(row.deep_sleep_seconds)! / 3600
          : num(row.deep_sleep_duration) != null
            ? num(row.deep_sleep_duration)! / 3600
            : null,
      sleep_rem_hours:
        num(row.rem_sleep_seconds) != null
          ? num(row.rem_sleep_seconds)! / 3600
          : num(row.rem_sleep_duration) != null
            ? num(row.rem_sleep_duration)! / 3600
            : null,
      recovery_score: num(row.readiness) ?? num(row.readiness_score),
      hrv: num(row.hrv_rmssd) ?? num(row.hrv),
      resting_hr: num(row.resting_heart_rate) ?? num(row.resting_hr),
      spo2_avg: num(row.spo2_avg),
      respiratory_rate_avg: num(row.respiratory_rate_avg),
      raw_payload,
      updated_at: nowIso,
    });
  }

  if (event_type === "readiness") {
    return cleanRecord({
      user_id: userId,
      provider,
      signal_date: date,
      strain_score: num(row.strain) ?? num(row.activity_strain),
      recovery_score: num(row.recovery_score) ?? num(row.readiness) ?? num(row.readiness_score),
      hrv: num(row.hrv_rmssd) ?? num(row.hrv),
      resting_hr: num(row.resting_heart_rate) ?? num(row.resting_hr),
      raw_payload,
      updated_at: nowIso,
    });
  }

  if (event_type === "activity") {
    return cleanRecord({
      user_id: userId,
      provider,
      signal_date: date,
      steps: num(row.steps),
      active_calories: num(row.active_calories),
      workout_hr_avg: num(row.avg_heart_rate) ?? num(row.workout_hr_avg),
      raw_payload,
      updated_at: nowIso,
    });
  }

  if (event_type === "body") {
    return cleanRecord({
      user_id: userId,
      provider,
      signal_date: date,
      blood_glucose_avg: num(row.blood_glucose_avg),
      core_temp_deviation: num(row.core_temperature_delta),
      spo2_avg: num(row.spo2_avg),
      raw_payload,
      updated_at: nowIso,
    });
  }

  throw new Error(`Unsupported event type: ${event_type}`);
}

export async function persistOpenWearablesPayload(
  supabase: {
    from: (table: string) => {
      upsert: (
        values: Record<string, unknown>,
        options: { onConflict: string }
      ) => Promise<{ error?: { message: string; code?: string } | null }>;
    };
  },
  payload: OpenWearablesPayload
): Promise<{ processed: number; skipped: number }> {
  if (!Array.isArray(payload.data) || payload.data.length === 0) {
    return { processed: 0, skipped: 0 };
  }

  const nowIso = new Date().toISOString();
  let processed = 0;
  let skipped = 0;

  for (const row of payload.data) {
    const record = buildSignalRecord(payload, row, nowIso);
    if (!record) {
      skipped += 1;
      continue;
    }

    const result = await supabase
      .from("connected_signals")
      .upsert(record, { onConflict: "user_id,provider,signal_date" });

    if (result.error) {
      throw new Error(result.error.message);
    }

    processed += 1;
  }

  return { processed, skipped };
}
