"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  PageLayout,
  Card,
  CardHeader,
  Button,
  LoadingState,
  EmptyState,
} from "@/components/ui";
import {
  DEFAULT_UNIT_SYSTEM,
  UnitSystem,
  formatDisplayNumber,
  readUnitSystemFromProfile,
  toDisplayWeight,
  weightUnitLabel,
} from "@/lib/units";

type Entry = {
  date: string;
  weight?: number;
  body_fat_percent?: number;
  measurements?: Record<string, number>;
  notes?: string;
};

export default function ProgressPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      supabase
        .from("progress_tracking")
        .select("date, weight, body_fat_percent, measurements, notes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30)
        .then(
          ({ data }) => {
            setEntries((data ?? []) as Entry[]);
            setLoading(false);
          },
          () => setLoading(false)
        );
      supabase
        .from("user_profile")
        .select("devices")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const nextUnits = readUnitSystemFromProfile((data ?? {}) as Record<string, unknown>);
          setUnitSystem(nextUnits);
        });
    }).then(undefined, () => setLoading(false));
  }, []);

  const weights = entries.filter((e) => e.weight != null) as { date: string; weight: number }[];
  const latestWeight = weights[0]?.weight;
  const previousWeight = weights[1]?.weight;
  const latestWeightDisplay = latestWeight != null ? formatDisplayNumber(toDisplayWeight(latestWeight, unitSystem), 1) : null;
  const unitLabel = weightUnitLabel(unitSystem);
  const trend =
    latestWeight != null && previousWeight != null
      ? latestWeight < previousWeight
        ? "down"
        : latestWeight > previousWeight
          ? "up"
          : "stable"
      : null;

  const latestEntry = entries[0];
  const latestBodyFat = latestEntry?.body_fat_percent;
  const latestMeasurements = latestEntry?.measurements && typeof latestEntry.measurements === "object"
    ? (latestEntry.measurements as Record<string, number>)
    : null;

  const fallbackNarrative = useMemo(() => {
    if (!entries.length) return "No trend available yet. Add at least two check-ins to unlock AI narrative insight.";
    if (trend === "down") return "Weight trend is moving down. Maintain current adherence and preserve protein intake.";
    if (trend === "up") return "Weight trend is rising. Review weekly calorie average and session consistency.";
    return "Trend is stable. Consider a small plan adjustment if body composition goals are stalled.";
  }, [entries.length, trend]);

  useEffect(() => {
    if (entries.length < 1) return;
    setAiInsightLoading(true);
    fetch("/api/v1/ai/progress-insight", { method: "POST" })
      .then((r) => r.json())
      .then((body: { insight?: string | null }) => {
        if (body.insight && typeof body.insight === "string") setAiInsight(body.insight);
      })
      .catch(() => { })
      .finally(() => setAiInsightLoading(false));
  }, [entries.length]);

  const aiNarrative = aiInsight ?? fallbackNarrative;

  return (
    <PageLayout title="Progress" subtitle="Trend interpretation and what changed" >
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card padding="lg" className="lg:col-span-2">
              <CardHeader title="AI narrative" subtitle="Based on latest entries" />
              {aiInsightLoading ? (
                <p className="mt-3 text-base text-fn-muted">Generating insight...</p>
              ) : (
                <p className="mt-3 text-base text-fn-ink">{aiNarrative}</p>
              )}
            </Card>

            <Card>
              <CardHeader title="Latest check-in" />
              {latestWeight != null ? (
                <>
                  <p className="mt-2 text-3xl font-semibold text-fn-ink">{latestWeightDisplay} {unitLabel}</p>
                  {trend && (
                    <p className="mt-1 text-sm text-fn-muted">
                      {trend === "down" && "Trending down"}
                      {trend === "up" && "Trending up"}
                      {trend === "stable" && "Stable"} vs previous entry
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-fn-muted">No weight entries yet.</p>
              )}
            </Card>
          </div>

          <Card className="mt-4" padding="lg">
            <CardHeader title="Weight trend" subtitle="Last 14 points" />
            <div className="mt-4 flex h-36 items-end gap-1.5">
              {weights.slice(0, 14).reverse().map((e) => (
                <div
                  key={e.date}
                  className="flex-1 rounded-t-md bg-fn-primary/70 min-h-[6px]"
                  style={{
                    height: `${Math.max(8, (e.weight / (Math.max(...weights.map((x) => x.weight), 1) || 1)) * 85)}%`,
                  }}
                  title={`${e.date}: ${formatDisplayNumber(toDisplayWeight(e.weight, unitSystem), 1)} ${unitLabel}`}
                />
              ))}
            </div>
            {weights.length === 0 && <EmptyState className="mt-4" message="Add progress entries to see a trend." />}
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="What changed" subtitle="Signals from latest entry" />
              <ul className="mt-3 space-y-2 text-sm text-fn-muted">
                <li>{latestBodyFat != null ? `Body fat updated to ${latestBodyFat}%` : "Body fat not logged this entry."}</li>
                <li>{latestMeasurements && Object.keys(latestMeasurements).length > 0 ? `Measurements captured (${Object.keys(latestMeasurements).join(", ")}).` : "No measurement updates captured."}</li>
                <li>{latestEntry?.notes ? `Coach note: ${latestEntry.notes}` : "No note added to latest check-in."}</li>
              </ul>
            </Card>

            <Card>
              <CardHeader title="Recent entries" subtitle="Last 10" />
              {entries.length === 0 ? (
                <EmptyState className="mt-4" message="No entries yet." />
              ) : (
                <ul className="mt-3 space-y-2">
                  {entries.slice(0, 10).map((e) => (
                    <li key={e.date} className="flex justify-between rounded-xl border border-fn-border bg-fn-surface-hover px-3 py-2 text-sm text-fn-ink">
                      <span>{e.date}</span>
                      <span>
                        {[
                          e.weight != null ? `${formatDisplayNumber(toDisplayWeight(e.weight, unitSystem), 1)} ${unitLabel}` : "",
                          e.body_fat_percent != null ? `${e.body_fat_percent}%` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/progress/add" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full">Manual Entry</Button>
                </Link>
                <Link href="/progress/scan" className="w-full sm:w-auto">
                  <Button className="w-full bg-fn-accent/20 border border-fn-accent/50 text-fn-accent hover:bg-fn-accent/30 group">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      AI Body Scan
                    </span>
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}
