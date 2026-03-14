import { describe, expect, it } from "vitest";
import { detectSymptomIntent, selectDeterministicSubstitution } from "@/lib/sit/substitutions";

describe("deterministic substitutions", () => {
  it("detects symptom-triggered substitutions and reuses successful history", () => {
    const intent = detectSymptomIntent("My knee hurts during back squats");
    expect(intent.triggered).toBe(true);
    expect(intent.symptom_tags).toContain("knee");

    const result = selectDeterministicSubstitution({
      currentExercise: "Back Squat",
      reason: "knee pain again today",
      history: [
        {
          event_type: "substitution_applied",
          symptom_tags: ["knee", "pain"],
          current_exercise: "Back Squat",
          replacement_exercise: "Box Squat",
          outcome_quality: 5,
          created_at: "2026-03-08T12:00:00Z",
        },
      ],
    });

    expect(result.replacement.name).toBe("Box Squat");
    expect(result.reused_history).toBe(true);
    expect(result.policy_version).toBe("exercise-ontology-v1");
  });
});
