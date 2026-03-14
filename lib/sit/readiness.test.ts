import { describe, expect, it } from "vitest";
import { buildCanonicalReadinessVector, evaluateReadinessVector } from "@/lib/sit/readiness";

describe("readiness policy", () => {
  it("derives a red pathway for stacked fatigue and pain signals", () => {
    const vector = buildCanonicalReadinessVector({
      dateLocal: "2026-03-09",
      signals: [
        {
          provider: "whoop",
          signal_date: "2026-03-09",
          sleep_hours: 5.1,
          hrv: 42,
          resting_hr: 61,
          strain_score: 17,
          recovery_score: 38,
        },
        {
          provider: "whoop",
          signal_date: "2026-03-08",
          hrv: 58,
          resting_hr: 54,
        },
      ],
      checkIns: [{ date_local: "2026-03-09", soreness_notes: "Sharp knee pain and back tightness", adherence_score: 2 }],
      workouts: [
        { date: "2026-03-09", duration_minutes: 75 },
        { date: "2026-03-08", duration_minutes: 65 },
        { date: "2026-03-07", duration_minutes: 70 },
      ],
      profile: { injuries_limitations: { knee: true } },
    });

    const snapshot = evaluateReadinessVector(vector);
    expect(snapshot.pathway).toBe("red");
    expect(snapshot.reason_codes).toContain("pain_flag_active");
    expect(snapshot.reason_codes).toContain("sleep_debt_high");
  });
});
