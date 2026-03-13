import type { SupabaseClient } from "@supabase/supabase-js";

export type ReadinessSignal = {
  hrv: number | null;
  sleep_hours: number | null;
  soreness_score: number | null; // 1-10
};

export type SafetyCheckResult = {
  is_safe: boolean;
  adjustment_required: boolean;
  adjustment_notes: string | null;
  risk_level: "low" | "medium" | "high";
};

export class ReadinessOrchestrator {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Cross-references an AI-generated plan against real-time biometric signals.
   * If signals indicate high recovery debt, it flags for volume/intensity reduction.
   */
  async evaluatePlan(planFocus: string, planIntensity: string): Promise<SafetyCheckResult> {
    const today = new Date().toISOString().split("T")[0];

    const { data: signals } = await this.supabase
      .from("connected_signals")
      .select("hrv, sleep_hours")
      .eq("user_id", this.userId)
      .eq("signal_date", today)
      .maybeSingle();

    const { data: checkIn } = await this.supabase
      .from("check_ins")
      .select("energy_score, sleep_hours")
      .eq("user_id", this.userId)
      .eq("date_local", today)
      .maybeSingle();

    const hrv = signals?.hrv ?? null;
    const sleep = checkIn?.sleep_hours ?? signals?.sleep_hours ?? null;
    const energy = checkIn?.energy_score ?? null;

    let adjustmentRequired = false;
    let notes: string | null = null;
    let riskLevel: "low" | "medium" | "high" = "low";

    // Deterministic override logic:
    // 1. High fatigue / Low sleep
    if (sleep !== null && sleep < 6) {
      adjustmentRequired = true;
      riskLevel = "medium";
      notes = "Sleep deficit detected (<6h). Reducing target intensity and volume by 15-20%.";
    }

    // 2. Critical HRV drop (if we have baseline, but for now absolute threshold or trend)
    if (hrv !== null && hrv < 40) {
      adjustmentRequired = true;
      riskLevel = "high";
      notes = "Critical readiness drop (HRV < 40). Pivot to active recovery or low-intensity mobility.";
    }

    // 3. Subjective energy crash
    if (energy !== null && energy <= 3) {
      adjustmentRequired = true;
      riskLevel = "medium";
      notes = "Low subjective energy score. Moderating load to protect neurological recovery.";
    }

    // Correlation with plan intensity
    if (adjustmentRequired && planIntensity.toLowerCase() === "high") {
      riskLevel = "high";
      notes = (notes ?? "") + " High-intensity session is not recommended today.";
    }

    return {
      is_safe: riskLevel !== "high",
      adjustment_required: adjustmentRequired,
      adjustment_notes: notes,
      risk_level: riskLevel,
    };
  }
}
