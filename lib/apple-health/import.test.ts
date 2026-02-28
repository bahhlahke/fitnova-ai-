import { describe, it, expect } from "vitest";
import { parseAppleHealthExport } from "./import";

describe("parseAppleHealthExport", () => {
  it("extracts weight, sleep, and steps from Apple Health XML", () => {
    const xml = `
      <HealthData>
        <Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" value="180" startDate="2026-02-25 07:00:00 -0500" endDate="2026-02-25 07:00:00 -0500" />
        <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleep" startDate="2026-02-24 23:00:00 -0500" endDate="2026-02-25 06:30:00 -0500" />
        <Record type="HKQuantityTypeIdentifierStepCount" unit="count" value="8450" startDate="2026-02-25 09:00:00 -0500" endDate="2026-02-25 09:10:00 -0500" />
      </HealthData>
    `;

    const result = parseAppleHealthExport(xml, "xml");

    expect(result.progressEntries).toEqual([
      {
        date: "2026-02-25",
        weightKg: 81.6,
      },
    ]);
    expect(result.checkInEntries).toEqual([
      {
        date_local: "2026-02-25",
        sleepHours: 7.5,
      },
    ]);
    expect(result.summary.weight_entry_count).toBe(1);
    expect(result.summary.sleep_entry_count).toBe(1);
    expect(result.summary.step_day_count).toBe(1);
    expect(result.summary.avg_daily_steps_7d).toBe(8450);
  });
});
