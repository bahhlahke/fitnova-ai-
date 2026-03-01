/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { buildProgressionAnalytics } from "./progression";

describe("buildProgressionAnalytics", () => {
  it("builds metric and trend structures", () => {
    const output = buildProgressionAnalytics(
      [
        {
          date: "2026-02-20",
          exercises: [{ name: "Back Squat", performed_sets: [{ reps: 5, weight_kg: 100 }] }],
        },
        {
          date: "2026-02-27",
          exercises: [{ name: "Back Squat", performed_sets: [{ reps: 5, weight_kg: 105 }] }],
        },
      ],
      [{ exercise_name: "Back Squat", e1rm: 120, total_volume: 500, trend_score: 0.02, sample_size: 10 }],
      [{ date_local: "2026-02-27", total_score: 0.8 }]
    );

    expect(output.metrics).toHaveLength(1);
    expect(output.metrics[0].exercise_name).toBe("Back Squat");
    expect(output.metrics[0].trend_pct).toBeGreaterThan(0);
    expect(output.trend_points.length).toBeGreaterThan(0);
    expect(output.adherence_avg).toBe(0.8);
  });
});
