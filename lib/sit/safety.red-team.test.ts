import { describe, expect, it } from "vitest";
import { validatePrescription } from "@/lib/sit/safety";
import type { DailyPlan } from "@/lib/plan/types";

function makePlan(exercises: DailyPlan["training_plan"]["exercises"]): DailyPlan {
  return {
    date_local: "2026-03-10",
    training_plan: {
      focus: "Strength",
      duration_minutes: 75,
      location_option: "gym",
      exercises,
      alternatives: [],
    },
    nutrition_plan: {
      calorie_target: 2500,
      macros: { protein_g: 180, carbs_g: 260, fat_g: 70 },
      meal_structure: [],
      hydration_goal_liters: 3,
    },
    safety_notes: [],
  };
}

describe("safety validator red-team suite", () => {
  it("blocks stacked max-intensity lower-body loading for beginners", () => {
    const result = validatePrescription({
      plan: makePlan([
        { name: "Back Squat", sets: 8, reps: "2", intensity: "RPE 10" },
        { name: "Deadlift", sets: 7, reps: "2", intensity: "RPE 10" },
      ]),
      profile: { experience_level: "beginner" },
      workouts: [{ date: "2026-03-10", exercises: [{ name: "Power Clean", sets: 6 }] }],
      priorPlans: [],
      painFlags: ["knee"],
    });

    expect(result.status).toBe("blocked");
    expect(result.issues.some((i) => i.code === "minimum_recovery_spacing")).toBe(true);
    expect(result.issues.some((i) => i.code === "pain_guardrail")).toBe(true);
  });

  it("modifies borderline overload prescriptions instead of passing", () => {
    const result = validatePrescription({
      plan: makePlan([
        { name: "Bench Press", sets: 6, reps: "5", intensity: "RPE 8" },
        { name: "Barbell Row", sets: 6, reps: "5", intensity: "RPE 8" },
      ]),
      profile: { experience_level: "intermediate" },
      workouts: [{ date: "2026-03-09", exercises: [{ name: "Bench Press", sets: 3 }] }],
      priorPlans: [{
        date_local: "2026-03-08",
        plan_json: { training_plan: { exercises: [{ name: "Overhead Press", sets: 5, reps: "5", intensity: "RPE 8" }] } },
      }],
      painFlags: [],
    });

    expect(["modified", "blocked"]).toContain(result.status);
  });
});
