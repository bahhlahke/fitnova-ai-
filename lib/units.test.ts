/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_UNIT_SYSTEM,
  formatDisplayNumber,
  fromDisplayHeight,
  fromDisplayWeight,
  parseUnitSystem,
  readUnitSystemFromProfile,
  toDisplayHeight,
  toDisplayWeight,
} from "./units";

describe("units helpers", () => {
  it("defaults to imperial when no unit preference is present", () => {
    expect(DEFAULT_UNIT_SYSTEM).toBe("imperial");
    expect(parseUnitSystem(undefined)).toBe("imperial");
    expect(readUnitSystemFromProfile(null)).toBe("imperial");
    expect(readUnitSystemFromProfile({})).toBe("imperial");
  });

  it("reads metric preference from profile devices", () => {
    expect(readUnitSystemFromProfile({ devices: { units_system: "metric" } })).toBe("metric");
  });

  it("converts height and weight between display and metric storage", () => {
    const heightCm = fromDisplayHeight(70, "imperial");
    const weightKg = fromDisplayWeight(220, "imperial");
    expect(Math.abs(heightCm - 177.8)).toBeLessThan(0.01);
    expect(Math.abs(weightKg - 99.79)).toBeLessThan(0.01);
    expect(Math.abs(toDisplayHeight(heightCm, "imperial") - 70)).toBeLessThan(0.01);
    expect(Math.abs(toDisplayWeight(weightKg, "imperial") - 220)).toBeLessThan(0.01);
  });

  it("formats display numbers with minimal trailing zeros", () => {
    expect(formatDisplayNumber(180)).toBe("180");
    expect(formatDisplayNumber(180.25, 1)).toBe("180.3");
    expect(formatDisplayNumber(180.2, 2)).toBe("180.2");
  });
});
