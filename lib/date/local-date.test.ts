import { describe, it, expect } from "vitest";
import { toLocalDateString } from "./local-date";

describe("toLocalDateString", () => {
  it("returns YYYY-MM-DD", () => {
    expect(toLocalDateString(new Date("2026-02-24T12:00:00"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is stable for local midnight edge", () => {
    const d = new Date(2026, 1, 24, 0, 5, 0);
    expect(toLocalDateString(d)).toBe("2026-02-24");
  });
});
