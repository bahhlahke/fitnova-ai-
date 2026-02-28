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

  const chartWeights = weights.slice(0, 14).reverse();
  const maxWeight = Math.max(...chartWeights.map((x) => x.weight), 1);

  return (
    <PageLayout title="Progress" subtitle="Trend interpretation and body composition tracking">
      {/* Prominent CTAs above the fold */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/progress/add">
          <Button variant="secondary" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          }>Manual Entry</Button>
        </Link>
        <Link href="/progress/scan">
          <Button className="border-fn-accent/40 bg-fn-accent/10 text-fn-accent hover:bg-fn-accent/20" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }>AI Body Scan</Button>
        </Link>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {/* AI Narrative — wide */}
            <Card padding="lg" className="lg:col-span-2 border-fn-accent/10 bg-fn-accent/[0.03]">
              <CardHeader title="AI Narrative" subtitle="Based on latest entries" />
              {aiInsightLoading ? (
                <div className="mt-4 space-y-3 animate-pulse">
                  <div className="h-4 w-full rounded-full bg-white/5" />
                  <div className="h-4 w-4/5 rounded-full bg-white/5" />
                  <div className="h-4 w-3/5 rounded-full bg-white/5" />
                </div>
              ) : (
                <p className="mt-4 text-base text-fn-ink leading-relaxed border-l-2 border-fn-accent/30 pl-4 italic">{aiNarrative}</p>
              )}
            </Card>

            {/* Latest check-in stats */}
            <Card className="border-white/5">
              <CardHeader title="Latest Check-in" />
              {latestWeight != null ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-1">Weight</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-black text-fn-ink italic">{latestWeightDisplay}</p>
                      <p className="text-lg text-fn-muted">{unitLabel}</p>
                    </div>
                    {trend && (
                      <p className={`mt-1 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${trend === "down" ? "text-fn-accent" : trend === "up" ? "text-fn-danger" : "text-fn-muted"}`}>
                        {trend === "down" && <span>↓</span>}
                        {trend === "up" && <span>↑</span>}
                        {trend === "stable" && <span>→</span>}
                        {trend === "down" && "Trending down"}
                        {trend === "up" && "Trending up"}
                        {trend === "stable" && "Stable"}
                      </p>
                    )}
                  </div>
                  {latestBodyFat != null && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-1">Body Fat</p>
                      <p className="text-2xl font-black text-fn-ink italic">{latestBodyFat}%</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-fn-muted">No weight entries yet. Log your first check-in to start tracking.</p>
              )}
            </Card>
          </div>

          {/* Weight Trend Chart */}
          <Card className="mt-4" padding="lg">
            <CardHeader title="Weight Trend" subtitle="Last 14 check-ins" />
            {chartWeights.length > 0 ? (
              <div className="mt-6">
                <div className="flex h-48 items-end gap-2">
                  {chartWeights.map((e) => {
                    const heightPct = Math.max(8, (e.weight / maxWeight) * 90);
                    const dayLabel = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
                    return (
                      <div key={e.date} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-lg bg-fn-accent/50 hover:bg-fn-accent transition-colors duration-200 cursor-default"
                          style={{ height: `${heightPct}%` }}
                          title={`${e.date}: ${formatDisplayNumber(toDisplayWeight(e.weight, unitSystem), 1)} ${unitLabel}`}
                        />
                        <span className="text-[9px] font-bold text-fn-muted uppercase">{dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between text-[10px] text-fn-muted/50">
                  <span>{chartWeights[0]?.date}</span>
                  <span>{chartWeights[chartWeights.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <EmptyState className="mt-4" message="Add at least 2 progress entries to see your trend." />
            )}
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* What changed */}
            <Card>
              <CardHeader title="What Changed" subtitle="Signals from latest entry" />
              <ul className="mt-4 space-y-3">
                {[
                  {
                    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
                    text: latestBodyFat != null ? `Body fat at ${latestBodyFat}%` : "Body fat not logged",
                    active: latestBodyFat != null,
                  },
                  {
                    icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
                    text: latestMeasurements && Object.keys(latestMeasurements).length > 0
                      ? `Measurements: ${Object.keys(latestMeasurements).join(", ")}`
                      : "No measurements captured",
                    active: !!(latestMeasurements && Object.keys(latestMeasurements).length > 0),
                  },
                  {
                    icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
                    text: latestEntry?.notes ? `Note: ${latestEntry.notes}` : "No note on latest check-in",
                    active: !!latestEntry?.notes,
                  },
                ].map(({ icon, text, active }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 h-6 w-6 rounded-lg flex items-center justify-center ${active ? "bg-fn-accent/10" : "bg-white/5"}`}>
                      <svg className={`h-3.5 w-3.5 ${active ? "text-fn-accent" : "text-fn-muted/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                      </svg>
                    </div>
                    <span className={`text-sm leading-relaxed ${active ? "text-fn-ink" : "text-fn-muted"}`}>{text}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Recent entries */}
            <Card>
              <CardHeader title="Recent Entries" subtitle="Last 10" />
              {entries.length === 0 ? (
                <EmptyState className="mt-4" message="No entries yet." />
              ) : (
                <ul className="mt-4 space-y-2">
                  {entries.slice(0, 10).map((e) => (
                    <li key={e.date} className="flex justify-between rounded-xl border border-fn-border bg-fn-surface-hover px-4 py-3 text-sm">
                      <span className="font-bold text-fn-ink">{e.date}</span>
                      <span className="text-fn-muted">
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
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}
