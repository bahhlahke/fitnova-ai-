/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { computeProgressionSnapshots, estimateE1rm } from "./compute";

describe("progression compute", () => {
  it("computes E1RM using Brzycki style approximation", () => {
    expect(estimateE1rm(100, 5)).toBe(116.67);
    expect(estimateE1rm(80, 8)).toBe(101.33);
  });

  it("aggregates workout logs into progression snapshots", () => {
    const snapshots = computeProgressionSnapshots([
      {
        date: "2026-02-20",
        exercises: [
          {
            name: "Back Squat",
            performed_sets: [
              { reps: 5, weight_kg: 100 },
              { reps: 5, weight_kg: 102.5 },
            ],
          },
        ],
      },
      {
        date: "2026-02-27",
        exercises: [
          {
            name: "Back Squat",
            performed_sets: [
              { reps: 5, weight_kg: 105 },
              { reps: 5, weight_kg: 107.5 },
            ],
          },
        ],
      },
    ]);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].exercise_name).toBe("Back Squat");
    expect(snapshots[0].sample_size).toBe(4);
    expect(snapshots[0].total_volume).toBe(518.75);
    expect(snapshots[0].e1rm).toBe(121.04);
    expect(snapshots[0].trend_score).toBeGreaterThan(0);
    expect(snapshots[0].last_performed_date).toBe("2026-02-27");
  });

  it("ignores sparse entries without reps/load", () => {
    const snapshots = computeProgressionSnapshots([
      {
        date: "2026-02-28",
        exercises: [{ name: "Bench Press", performed_sets: [{ reps: 0, weight_kg: 80 }] }],
      },
    ]);

    expect(snapshots).toHaveLength(0);
  });
});
