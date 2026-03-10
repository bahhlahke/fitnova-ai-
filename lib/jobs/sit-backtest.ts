import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { buildCanonicalReadinessVector, evaluateReadinessVector } from "@/lib/sit/readiness";

export type SitBacktestSummary = {
  sampled_users: number;
  timelines_scanned: number;
  red_days: number;
  amber_days: number;
  green_days: number;
  generated_at: string;
};

export async function runSitBacktest(limitUsers = 25): Promise<SitBacktestSummary> {
  const supabase = await createSupabaseClient();

  const usersRes = await supabase.from("user_profile").select("user_id").limit(limitUsers);
  const userIds = (usersRes.data ?? []).map((row: any) => row.user_id).filter(Boolean);

  let redDays = 0;
  let amberDays = 0;
  let greenDays = 0;
  let timelinesScanned = 0;

  for (const userId of userIds) {
    const [signalsRes, checkInsRes, workoutsRes] = await Promise.all([
      supabase
        .from("connected_signals")
        .select("provider, signal_date, sleep_hours, recovery_score, hrv, resting_hr, strain_score, raw_payload")
        .eq("user_id", userId)
        .order("signal_date", { ascending: false })
        .limit(90),
      supabase.from("check_ins").select("date_local, soreness_notes, adherence_score").eq("user_id", userId).limit(90),
      supabase.from("workout_logs").select("date, duration_minutes").eq("user_id", userId).limit(90),
    ]);

    const signals = signalsRes.data ?? [];
    if (signals.length === 0) continue;

    const dates = Array.from(new Set(signals.map((s: any) => s.signal_date))).slice(0, 90);
    for (const dateLocal of dates) {
      const vector = buildCanonicalReadinessVector({
        dateLocal,
        signals,
        checkIns: (checkInsRes.data ?? []).filter((entry: any) => entry.date_local <= dateLocal),
        workouts: (workoutsRes.data ?? []).filter((entry: any) => entry.date <= dateLocal),
        profile: null,
      });
      const snapshot = evaluateReadinessVector(vector);
      timelinesScanned += 1;
      if (snapshot.pathway === "red") redDays += 1;
      else if (snapshot.pathway === "amber") amberDays += 1;
      else greenDays += 1;
    }
  }

  return {
    sampled_users: userIds.length,
    timelines_scanned: timelinesScanned,
    red_days: redDays,
    amber_days: amberDays,
    green_days: greenDays,
    generated_at: new Date().toISOString(),
  };
}
