import { describe, expect, it } from "vitest";
import { validatePrescription } from "@/lib/sit/safety";
import type { DailyPlan } from "@/lib/plan/types";

describe("safety validator", () => {
  it("blocks a same-day high-intensity overload prescription", () => {
    const plan: DailyPlan = {
      date_local: "2026-03-09",
      training_plan: {
        focus: "Lower body strength",
        duration_minutes: 70,
        location_option: "gym",
        exercises: [
          { name: "Back Squat", sets: 6, reps: "3", intensity: "RPE 9" },
          { name: "Deadlift", sets: 5, reps: "3", intensity: "RPE 9" },
        ],
        alternatives: [],
      },
      nutrition_plan: {
        calorie_target: 2600,
        macros: { protein_g: 180, carbs_g: 250, fat_g: 70 },
        meal_structure: [],
        hydration_goal_liters: 3,
      },
      safety_notes: [],
    };

    const result = validatePrescription({
      plan,
      profile: { experience_level: "beginner" },
      workouts: [{ date: "2026-03-09", exercises: [{ name: "Bench Press", sets: 5 }] }],
      priorPlans: [],
      painFlags: ["knee"],
    });

    expect(result.status).toBe("blocked");
    expect(result.issues.some((issue) => issue.code === "minimum_recovery_spacing")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "pain_guardrail")).toBe(true);
  });
});
