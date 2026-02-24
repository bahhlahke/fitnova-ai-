/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from "vitest";
import { composeDailyPlan } from "./compose-daily-plan";

function makeSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === "user_profile") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              weight: 90,
              goals: ["Weight loss"],
              injuries_limitations: { notes: "knee pain" },
            },
          }),
        };
      }
      if (table === "workout_logs") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ workout_type: "strength", duration_minutes: 45 }],
          }),
        };
      }
      if (table === "nutrition_logs") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ total_calories: 2500 }],
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ weight: 90 }, { weight: 90.5 }],
        }),
      };
    }),
  };
}

describe("composeDailyPlan", () => {
  it("returns plan with expected top-level sections", async () => {
    const supabase = makeSupabaseMock();
    const plan = await composeDailyPlan({ supabase: supabase as never, userId: "u1" });

    expect(plan.training_plan.focus).toMatch(/Fat-loss|weight|strength/i);
    expect(plan.training_plan.exercises.length).toBeGreaterThan(0);
    expect(plan.nutrition_plan.calorie_target).toBeGreaterThan(0);
    expect(plan.nutrition_plan.macros.protein_g).toBeGreaterThan(0);
    expect(plan.safety_notes.length).toBeGreaterThan(0);
  });
});
