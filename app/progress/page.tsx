"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { useDataRefresh } from "@/lib/ui/data-sync";
import { DashboardAnalyticsSection } from "@/components/dashboard/DashboardAnalyticsSection";
import { DashboardProgressSection } from "@/components/dashboard/DashboardProgressSection";
import { toLocalDateString } from "@/lib/date/local-date";

type Entry = {
  track_id: string;
  created_at: string;
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
  const [analytics, setAnalytics] = useState<{
    workout_days: number;
    workout_minutes: number;
    estimated_total_sets: number;
    push_pull_balance: number;
    recovery_debt: number;
    nutrition_compliance: number | null;
    recent_prs?: Array<{ exercise_name: string; max_weight: number; highest_1rm: number; last_achieved_at: string }>;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<any>(null);
  const [weeklyPlanLoading, setWeeklyPlanLoading] = useState(false);
  const [projection, setProjection] = useState<any>(null);
  const [last7Days, setLast7Days] = useState<number[]>([]);

  const loadProgress = useCallback(() => {
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
        .select("track_id, created_at, date, weight, body_fat_percent, measurements, notes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
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

    // Load last 7 days activity
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      supabase
        .from("workout_logs")
        .select("date")
        .eq("user_id", user.id)
        .gte("date", sevenDaysAgo.toISOString().split("T")[0])
        .then(({ data }) => {
          const byDate: Record<string, number> = {};
          data?.forEach(r => byDate[r.date] = (byDate[r.date] ?? 0) + 1);
          const next7 = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            next7.push(byDate[toLocalDateString(d)] ?? 0);
          }
          setLast7Days(next7);
        });
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    loadProgress();
  }, [loadProgress]);

  useDataRefresh(["progress"], () => {
    setLoading(true);
    loadProgress();
  });

  const weights = entries.filter((e) => e.weight != null) as {
    track_id: string;
    date: string;
    weight: number;
  }[];
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

  useEffect(() => {
    if (loading) return;
    setAnalyticsLoading(true);
    fetch("/api/v1/analytics/performance")
      .then((r) => r.json())
      .then((body) => {
        if (typeof body.period_days === "number") {
          setAnalytics(body);
        }
      })
      .catch(() => { })
      .finally(() => setAnalyticsLoading(false));

    setWeeklyPlanLoading(true);
    fetch(`/api/v1/plan/weekly?today=${toLocalDateString()}`)
      .then(r => r.json())
      .then(body => { if (body.plan) setWeeklyPlan(body.plan); })
      .finally(() => setWeeklyPlanLoading(false));

    fetch("/api/v1/ai/projection")
      .then(r => r.json())
      .then(body => { if (body.current != null) setProjection(body); });
  }, [loading]);

  const aiNarrative = aiInsight ?? fallbackNarrative;

  const chartWeights = weights.slice(0, 14).reverse();
  const maxWeight = Math.max(...chartWeights.map((x) => x.weight), 1);

  return (
    <PageLayout title="Progress" subtitle="Biometric trend interpretation and system-wide body composition tracking">
      {/* Prominent CTAs above the fold */}
      <div className="mb-8 flex flex-wrap gap-4">
        <Link href="/progress/add">
          <Button variant="secondary" size="sm" icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          }>Manual Entry</Button>
        </Link>
        <Link href="/progress/scan">
          <Button size="sm" className="border-fn-accent/20 bg-fn-accent/5 text-fn-accent hover:bg-fn-accent/10" icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
            <Card padding="lg" className="lg:col-span-2 border-fn-accent/20 bg-fn-accent/5">
              <CardHeader title="Intelligence Narrative" subtitle="Based on multi-vector entry analysis" />
              {aiInsightLoading ? (
                <div className="mt-6 space-y-4 animate-pulse">
                  <div className="h-4 w-full rounded-full bg-white/5" />
                  <div className="h-4 w-4/5 rounded-full bg-white/5" />
                  <div className="h-4 w-3/5 rounded-full bg-white/5" />
                </div>
              ) : (
                <p className="mt-6 text-lg text-white leading-relaxed border-l-2 border-fn-accent/30 pl-6 italic font-medium">{aiNarrative}</p>
              )}
            </Card>

            {/* Latest check-in stats */}
            <Card className="border-white/5">
              <CardHeader title="Latest Check-in" />
              {latestWeight != null ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-fn-ink/40 mb-2">Current System Weight</p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-5xl font-black text-white italic leading-none">{latestWeightDisplay}</p>
                      <p className="text-xl font-black uppercase tracking-widest text-fn-ink/40">{unitLabel}</p>
                    </div>
                    {trend && (
                      <p className={`mt-4 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${trend === "down" ? "text-fn-accent" : trend === "up" ? "text-fn-danger" : "text-fn-muted"}`}>
                        {trend === "down" && <span className="text-sm">↓</span>}
                        {trend === "up" && <span className="text-sm">↑</span>}
                        {trend === "stable" && <span className="text-sm">→</span>}
                        {trend === "down" && "Trending Down"}
                        {trend === "up" && "Trending Up"}
                        {trend === "stable" && "Stable Delta"}
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
                <div className="mt-6 flex flex-col items-center justify-center text-center pb-4">
                  <p className="text-sm font-medium text-fn-muted mb-5 leading-relaxed">Log your first weight to unlock<br />your AI trend projection.</p>
                  <div className="w-full max-w-[200px] flex flex-col gap-3">
                    <Link href="/progress/add" className="w-full">
                      <Button className="w-full h-12 shadow-[0_0_20px_rgba(255,255,255,0.1)]">Manual Entry</Button>
                    </Link>
                    <Link href="/progress/scan" className="w-full">
                      <Button variant="secondary" className="w-full h-12 border-fn-accent/40 bg-fn-accent/10 text-fn-accent hover:bg-fn-accent/20">AI Body Scan</Button>
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Weight Trend Chart */}
          <Card className="mt-4" padding="lg">
            <CardHeader title="System Weight Trend" subtitle="Phased biometric data over 14 cycles" />
            {chartWeights.length > 0 ? (
              <div className="mt-8">
                <div className="flex h-56 items-end gap-3 px-2">
                  {chartWeights.map((e) => {
                    const heightPct = Math.max(8, (e.weight / maxWeight) * 90);
                    const dayLabel = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
                    return (
                      <div key={e.track_id} className="flex flex-1 flex-col items-center gap-3">
                        <div
                          className="w-full rounded-t-lg bg-fn-accent/20 transition-all duration-300 hover:bg-fn-accent/60 hover:shadow-[0_0_20px_rgba(10,217,196,0.3)] cursor-default"
                          style={{ height: `${heightPct}%` }}
                          title={`${e.date}: ${formatDisplayNumber(toDisplayWeight(e.weight, unitSystem), 1)} ${unitLabel}`}
                        />
                        <span className="text-[10px] font-black text-fn-ink/30 uppercase tracking-widest">{dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-between text-[11px] font-black uppercase tracking-[0.2em] text-fn-ink/20 px-2">
                  <span>{chartWeights[0]?.date}</span>
                  <span>Initial Scan Cycle Completion</span>
                  <span>{chartWeights[chartWeights.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <EmptyState className="mt-4" message="Add at least 2 progress entries to see your trend." />
            )}
          </Card>

          {/* PRs & 1RM Progression */}
          <Card className="mt-4" padding="lg">
            <CardHeader title="Strength Progression" subtitle="Verified PRs & Estimated 1RM History" />
            {analyticsLoading ? (
              <LoadingState className="mt-4" />
            ) : analytics?.recent_prs?.length ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {analytics.recent_prs.map((pr: any) => (
                  <div key={pr.exercise_name} className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-4 shadow-xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-fn-accent">{pr.exercise_name}</p>
                    <div className="flex justify-between items-end mt-2">
                      <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-fn-muted mb-0.5">Max Logged</p>
                        <p className="text-xl font-black text-white">{pr.max_weight} <span className="text-[10px] tracking-widest text-fn-muted">{unitLabel.toUpperCase()}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-black tracking-widest text-fn-muted mb-0.5">Est. 1RM</p>
                        <p className="text-xl font-black text-fn-accent italic">{Math.round(pr.highest_1rm)} <span className="text-[10px] tracking-widest text-fn-muted">{unitLabel.toUpperCase()}</span></p>
                      </div>
                    </div>
                    <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-white/30 text-right">
                      Last seen {new Date(pr.last_achieved_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState className="mt-4" message="No strength progression data available. Log heavy sets to establish a baseline." />
            )}
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* What changed */}
            <Card>
              <CardHeader title="What Changed" subtitle="Signals from latest entry" />
              <ul className="mt-6 space-y-3">
                {[
                  {
                    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
                    text: latestBodyFat != null ? `Composition: ${latestBodyFat}% Adipose` : "Composition not logged",
                    active: latestBodyFat != null,
                  },
                  {
                    icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
                    text: latestMeasurements && Object.keys(latestMeasurements).length > 0
                      ? `Metrics: ${Object.keys(latestMeasurements).join(", ")}`
                      : "No metrics captured",
                    active: !!(latestMeasurements && Object.keys(latestMeasurements).length > 0),
                  },
                  {
                    icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
                    text: latestEntry?.notes ? `Observation: ${latestEntry.notes}` : "No concierge observations",
                    active: !!latestEntry?.notes,
                  },
                ].map(({ icon, text, active }) => (
                  <li key={text} className="flex items-start gap-4">
                    <div className={`mt-1 shrink-0 h-8 w-8 rounded-xl flex items-center justify-center border ${active ? "bg-fn-accent/10 border-fn-accent/20" : "bg-white/5 border-white/5"}`}>
                      <svg className={`h-4 w-4 ${active ? "text-fn-accent" : "text-white/20"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                      </svg>
                    </div>
                    <span className={`text-base leading-relaxed ${active ? "text-white" : "text-fn-ink/40"}`}>{text}</span>
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
                <ul className="mt-6 space-y-3">
                  {entries.slice(0, 10).map((e) => (
                    <li key={e.track_id} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/40 px-5 py-4 transition-all hover:bg-black/60 shadow-fn-soft">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-fn-accent">{e.date}</span>
                        <span className="text-base font-black text-white italic">
                          {[
                            e.weight != null ? `${formatDisplayNumber(toDisplayWeight(e.weight, unitSystem), 1)} ${unitLabel}` : "",
                            e.body_fat_percent != null ? `${e.body_fat_percent}%` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          const supabase = createClient();
                          if (!supabase) return;
                          const { error } = await supabase.from("progress_tracking").delete().eq("track_id", e.track_id);
                          if (!error) {
                            setEntries(prev => prev.filter(item => item.track_id !== e.track_id));
                          }
                        }}
                        className="p-1 text-fn-muted hover:text-fn-danger transition-colors"
                        title="Delete entry"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="mt-8 space-y-8">
            <DashboardAnalyticsSection
              weeklyPlan={weeklyPlan}
              weeklyPlanLoading={weeklyPlanLoading}
              analytics={analytics as any}
              analyticsLoading={analyticsLoading}
            />

            <DashboardProgressSection
              last7Days={last7Days}
              projection={projection}
              unitSystem={unitSystem}
            />
          </div>
        </>
      )}
    </PageLayout>
  );
}
