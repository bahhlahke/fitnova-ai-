import { toLocalDateString } from "@/lib/date/local-date";

export interface AppleHealthProgressEntry {
  date: string;
  weightKg: number;
}

export interface AppleHealthCheckInEntry {
  date_local: string;
  sleepHours: number;
}

export interface AppleHealthImportSummary {
  imported_at: string;
  source: "apple_health";
  file_type: "xml" | "zip";
  record_count: number;
  weight_entry_count: number;
  sleep_entry_count: number;
  step_day_count: number;
  latest_weight_kg: number | null;
  avg_sleep_hours_7d: number | null;
  avg_daily_steps_7d: number | null;
  range_start: string | null;
  range_end: string | null;
}

export interface AppleHealthImportResult {
  progressEntries: AppleHealthProgressEntry[];
  checkInEntries: AppleHealthCheckInEntry[];
  summary: AppleHealthImportSummary;
}

const MAX_IMPORTED_DAYS = 90;

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([A-Za-z0-9_:-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(raw)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

function parseAppleHealthDate(input: string | undefined): Date | null {
  if (!input) return null;

  const normalized = input.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
    "$1T$2$3:$4"
  );
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampRecentEntries<T extends { date: string }>(entries: T[]): T[] {
  return [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_IMPORTED_DAYS)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function parseAppleHealthExport(
  xml: string,
  fileType: "xml" | "zip"
): AppleHealthImportResult {
  const weightByDate = new Map<string, { weightKg: number; timestamp: number }>();
  const sleepByDate = new Map<string, number>();
  const stepsByDate = new Map<string, number>();
  let recordCount = 0;
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  const recordRegex = /<Record\b([^>]*?)(?:\/>|>(?:.*?)<\/Record>)/g;
  let match: RegExpExecArray | null;

  while ((match = recordRegex.exec(xml)) !== null) {
    recordCount += 1;
    const attrs = parseAttributes(match[1]);
    const type = attrs.type;
    const unit = attrs.unit;
    const value = Number.parseFloat(attrs.value ?? "");
    const startDate = parseAppleHealthDate(attrs.startDate);
    const endDate = parseAppleHealthDate(attrs.endDate);
    const dayKey =
      toLocalDateString(endDate ?? startDate ?? new Date());

    if (rangeStart == null || dayKey.localeCompare(rangeStart) < 0) {
      rangeStart = dayKey;
    }

    if (rangeEnd == null || dayKey.localeCompare(rangeEnd) > 0) {
      rangeEnd = dayKey;
    }

    if (type === "HKQuantityTypeIdentifierBodyMass" && Number.isFinite(value)) {
      const weightKg =
        unit === "lb" ? value * 0.45359237 : unit === "kg" ? value : value;
      const timestamp = (endDate ?? startDate ?? new Date()).getTime();
      const existing = weightByDate.get(dayKey);
      if (!existing || timestamp >= existing.timestamp) {
        weightByDate.set(dayKey, {
          weightKg: roundOneDecimal(weightKg),
          timestamp,
        });
      }
      continue;
    }

    if (type === "HKQuantityTypeIdentifierStepCount" && Number.isFinite(value)) {
      stepsByDate.set(dayKey, (stepsByDate.get(dayKey) ?? 0) + value);
      continue;
    }

    if (
      type === "HKCategoryTypeIdentifierSleepAnalysis" &&
      startDate &&
      endDate &&
      /Asleep/i.test(attrs.value ?? "")
    ) {
      const durationHours =
        (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000);
      if (durationHours > 0) {
        sleepByDate.set(dayKey, (sleepByDate.get(dayKey) ?? 0) + durationHours);
      }
    }
  }

  const progressEntries = clampRecentEntries(
    Array.from(weightByDate.entries()).map(([date, entry]) => ({
      date,
      weightKg: entry.weightKg,
    }))
  );

  const checkInEntries = clampRecentEntries(
    Array.from(sleepByDate.entries()).map(([date_local, sleepHours]) => ({
      date_local,
      sleepHours: roundOneDecimal(sleepHours),
      date: date_local,
    }))
  ).map(({ date_local, sleepHours }) => ({ date_local, sleepHours }));

  const recentSleep = [...checkInEntries].slice(-7);
  const recentSteps = Array.from(stepsByDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7);

  const latestWeight = progressEntries.length
    ? progressEntries[progressEntries.length - 1].weightKg
    : null;

  return {
    progressEntries,
    checkInEntries,
    summary: {
      imported_at: new Date().toISOString(),
      source: "apple_health",
      file_type: fileType,
      record_count: recordCount,
      weight_entry_count: progressEntries.length,
      sleep_entry_count: checkInEntries.length,
      step_day_count: stepsByDate.size,
      latest_weight_kg: latestWeight,
      avg_sleep_hours_7d:
        recentSleep.length > 0
          ? roundOneDecimal(
              recentSleep.reduce((sum, entry) => sum + entry.sleepHours, 0) /
                recentSleep.length
            )
          : null,
      avg_daily_steps_7d:
        recentSteps.length > 0
          ? Math.round(
              recentSteps.reduce((sum, [, steps]) => sum + steps, 0) /
                recentSteps.length
            )
          : null,
      range_start: rangeStart,
      range_end: rangeEnd,
    },
  };
}
