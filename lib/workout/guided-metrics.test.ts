import { describe, expect, it } from "vitest";
import {
  getExerciseRestSeconds,
  getNumericRepPlaceholder,
  parseTimedWorkSeconds,
} from "@/lib/workout/guided-metrics";

describe("guided workout metrics helpers", () => {
  it("parses timed work prescriptions", () => {
    expect(parseTimedWorkSeconds("40s work / 20s rest")).toBe(40);
    expect(parseTimedWorkSeconds("45s")).toBe(45);
    expect(parseTimedWorkSeconds("10 min")).toBe(600);
  });

  it("ignores rep prescriptions that are not timed", () => {
    expect(parseTimedWorkSeconds("8-10")).toBeNull();
    expect(parseTimedWorkSeconds("8/side")).toBeNull();
  });

  it("returns stable defaults for logging and rest", () => {
    expect(getNumericRepPlaceholder("6-8")).toBe("6");
    expect(getNumericRepPlaceholder("40s work / 20s rest")).toBe("40");
    expect(getExerciseRestSeconds({ rest_seconds_after_set: null })).toBe(60);
    expect(getExerciseRestSeconds({ rest_seconds_after_set: 105 })).toBe(105);
  });
});
