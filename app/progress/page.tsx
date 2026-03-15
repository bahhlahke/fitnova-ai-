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
import { TrophyRoom } from "@/components/gamification/TrophyRoom";
import { toLocalDateString } from "@/lib/date/local-date";
import { toPlainFitnessLanguage } from "@/lib/ui/plain-language";
import { PerformanceInsights } from "@/components/progress/PerformanceInsights";
import { ProgressionTrendChart } from "@/components/progress/ProgressionTrendChart";

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
  const [evolutionaryNarrative, setEvolutionaryNarrative] = useState<string | null>(null);
  const [evolutionaryNarrativeLoading, setEvolutionaryNarrativeLoading] = useState(false);
  const [analytics, setAnalytics] = useState<{
    workout_days: number;
    workout_minutes: number;
    estimated_total_sets: number;
    push_pull_balance: number;
    recovery_debt: number;
    nutrition_compliance: number | null;
    recent_prs?: Array<{ exercise_name: string; max_weight: number; highest_1rm: number; last_achieved_at: string }>;
    progression_trend_points?: Array<{ date: string; exercise_name: string; e1rm: number; volume: number }>;
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
  const latestWeightDisplay = latestWeight != null ? formatDisplayNumber(toDisplayWeight(latestWeight, unitSystem), 1) : null;
  const unitLabel = weightUnitLabel(unitSystem);

  // 7-day Exponential Moving Average for smooth trend direction
  const ema7: number[] = [];
  const smoothingFactor = 2 / (7 + 1);
  const chronoWeights = [...weights].reverse(); // oldest first
  chronoWeights.forEach((entry, idx) => {
    if (idx === 0) {
      ema7.push(entry.weight);
    } else {
      ema7.push(entry.weight * smoothingFactor + ema7[idx - 1] * (1 - smoothingFactor));
    }
  });
  const latestEma = ema7[ema7.length - 1] ?? latestWeight;
  const prevEma = ema7.length >= 3 ? ema7[ema7.length - 3] : null;
  const trend =
    latestEma != null && prevEma != null
      ? latestEma < prevEma - 0.2
        ? "down"
        : latestEma > prevEma + 0.2
          ? "up"
          : "stable"
      : null;

  const latestEntry = entries[0];
  const latestBodyFat = latestEntry?.body_fat_percent;
  const latestMeasurements = latestEntry?.measurements && typeof latestEntry.measurements === "object"
    ? (latestEntry.measurements as Record<string, number>)
    : null;

  const fallbackNarrative = useMemo(() => {
    if (!entries.length) return "No clear trend yet. Add two check-ins to see your direction and coach summary.";
    if (trend === "down") return "Weight trend is moving down. Stay consistent and keep protein intake up.";
    if (trend === "up") return "Weight trend is rising. Review weekly calorie average and session consistency.";
    return "Trend is stable. Consider a small plan adjustment if body composition goals are stalled.";
  }, [entries.length, trend]);

  const nextProgressStep = useMemo(() => {
    if (entries.length === 0) {
      return "Best next step: add today’s first check-in, then add another one 3 to 7 days later so Koda can show a real trend.";
    }
    if (entries.length === 1) {
      return "Best next step: add one more check-in after your next workout or later this week to unlock a clearer trend.";
    }
    if (trend === "up") {
      return "Best next step: compare your last few meals and workouts, then decide whether to tighten nutrition or increase activity.";
    }
    if (trend === "down") {
      return "Best next step: keep your current routine steady and protect recovery so progress continues.";
    }
    return "Best next step: keep checking in on a regular rhythm so Koda can spot changes earlier.";
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

    setEvolutionaryNarrativeLoading(true);
    fetch("/api/v1/ai/evolutionary-narrative", { method: "POST" })
      .then((r) => r.json())
      .then((body: { narrative?: string | null }) => {
        if (body.narrative) setEvolutionaryNarrative(body.narrative);
      })
      .catch(() => { })
      .finally(() => setEvolutionaryNarrativeLoading(false));
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

  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(false);

  const aiNarrative = aiInsight ?? fallbackNarrative;

  const chartWeights = weights.slice(0, 14).reverse();
  // Dynamic Y-axis: zoom into the range ±5% around actual weights so changes are visible
  const rawMax = Math.max(...chartWeights.map((x) => toDisplayWeight(x.weight, unitSystem)), 1);
  const rawMin = Math.min(...chartWeights.map((x) => toDisplayWeight(x.weight, unitSystem)), rawMax);
  const padding = Math.max((rawMax - rawMin) * 0.5, rawMax * 0.02, 1);
  const chartMin = rawMin - padding;
  const chartMax = rawMax + padding;
  const chartRange = chartMax - chartMin;

  return (
    <PageLayout title="Progress" subtitle="Track check-ins, see trends, and know what to do next">
      {/* ... existing header remains same ... */}
      <section className="premium-panel animate-panel-rise mb-6 p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="premium-kicker">Progress control center</p>
            <h1 className="premium-headline mt-2 text-3xl sm:text-4xl">
              Know what changed, and what to do next.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              Check-ins feed trend, strength progression, and coach guidance. Keep a steady rhythm for cleaner signal quality.
            </p>
          </div>
          <div className="premium-panel-soft p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fn-accent">Next step now</p>
            <p className="mt-2 text-xs leading-relaxed text-white/75">Add today&apos;s check-in so Koda can refresh your trend direction and guidance.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/progress/add">
                <Button size="sm">Add check-in</Button>
              </Link>
              <Link href="/progress/scan">
                <Button size="sm" variant="secondary">Photo check-in</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* New Unique Insights Section */}
      <div className="mb-8">
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">Unique Performance Insights</p>
        <PerformanceInsights />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Evolutionary Narrative — wide */}
        <Card padding="lg" className="lg:col-span-2 border-fn-accent/20 bg-fn-accent/5 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-fn-accent/10 blur-[100px] pointer-events-none" />
          <CardHeader title="Coach Summary" subtitle="What changed recently and what to do next" />
          {evolutionaryNarrativeLoading ? (
            <div className="mt-8 space-y-4 animate-pulse">
              <div className="h-4 w-full rounded-full bg-white/5" />
              <div className="h-4 w-4/5 rounded-full bg-white/5" />
              <div className="h-4 w-3/5 rounded-full bg-white/5" />
            </div>
          ) : (
            <div className="mt-8">
              <div
                className={`relative cursor-pointer transition-all ${!isNarrativeExpanded ? "max-h-[160px] overflow-hidden" : ""}`}
                onClick={() => setIsNarrativeExpanded(!isNarrativeExpanded)}
              >
                <p className="text-xl text-white leading-relaxed font-medium italic border-l-4 border-fn-accent/30 pl-8">
                  {toPlainFitnessLanguage(evolutionaryNarrative || aiNarrative)}
                </p>
                {!isNarrativeExpanded && (
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex items-end justify-center pb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent animate-pulse">Click to expand</span>
                  </div>
                )}
              </div>
              <div className="mt-6 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-relaxed text-fn-muted">
                {nextProgressStep}
              </div>
            </div>
          )}
        </Card>

        {/* Latest check-in stats */}
        <Card className="border-white/5">
          <CardHeader title="Latest Check-in" />
          {latestWeight != null ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-fn-ink/40 mb-2">Body Weight</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-black text-white italic leading-none">{latestWeightDisplay}</p>
                  <p className="text-xl font-black uppercase tracking-widest text-fn-ink/40">{unitLabel}</p>
                </div>
                {trend && (
                  <div className="mt-4">
                    <p className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${trend === "down" ? "text-fn-accent" : trend === "up" ? "text-fn-danger" : "text-fn-muted"}`}>
                      {trend === "down" && <span>↓</span>}
                      {trend === "up" && <span>↑</span>}
                      {trend === "stable" && <span>→</span>}
                      {trend === "down" && "7-Day Trend: Decreasing"}
                      {trend === "up" && "7-Day Trend: Increasing"}
                      {trend === "stable" && "7-Day Trend: Stable"}
                    </p>
                    <p className="text-[9px] text-fn-muted/50 mt-1">Based on 7-day moving average</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center text-center pb-4">
              <p className="text-sm font-medium text-fn-muted mb-5 leading-relaxed">Add your first check-in to see your weight trend and coach feedback.</p>
              <div className="w-full max-w-[200px] flex flex-col gap-3">
                <Link href="/progress/add" className="w-full">
                  <Button className="w-full h-12">Manual Entry</Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Strength Progression Charts */}
      {analytics?.progression_trend_points && analytics.progression_trend_points.length > 0 && (
        <div className="mt-8">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">Strength Progression</p>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Filter points by exercise and show charts for top 2-4 */}
            {Array.from(new Set(analytics.progression_trend_points.map(p => p.exercise_name))).slice(0, 4).map(name => (
              <ProgressionTrendChart
                key={name}
                exerciseName={name}
                points={analytics.progression_trend_points!.filter(p => p.exercise_name === name).slice(-10)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Existing weight trend chart */}
      <Card className="mt-8" padding="lg">
        <CardHeader title="Weight Trend" subtitle={chartWeights.length > 1 ? `Last ${chartWeights.length} entries · chart zoomed to show smaller changes clearly` : "Add entries to see your trend"} />
        {chartWeights.length > 1 ? (
          <div className="mt-6">
            {/* ... rest of the existing weight chart remains ... */}
            <div className="relative flex">
              <div className="flex flex-col justify-between text-right pr-3 py-1" style={{ height: 224, width: 52 }}>
                <span className="text-[9px] font-black text-fn-muted/40">{formatDisplayNumber(chartMax, 1)}</span>
                <span className="text-[9px] font-black text-fn-muted/40">{formatDisplayNumber((chartMax + chartMin) / 2, 1)}</span>
                <span className="text-[9px] font-black text-fn-muted/40">{formatDisplayNumber(chartMin, 1)}</span>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="border-t border-white/[0.05] w-full" />
                  ))}
                </div>
                <div className="flex h-56 items-end gap-2 relative">
                  {chartWeights.map((e, idx) => {
                    const displayW = toDisplayWeight(e.weight, unitSystem);
                    const heightPct = chartRange > 0 ? Math.max(2, ((displayW - chartMin) / chartRange) * 100) : 50;
                    return (
                      <div key={e.track_id} className="group flex flex-1 flex-col items-center justify-end h-full gap-1">
                        <div
                          className="w-full rounded-t-md bg-fn-accent/25 hover:bg-fn-accent/70 transition-all duration-300"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-fn-muted/30 mt-3 pl-14 pr-1">
              <span>{new Date(chartWeights[0].date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span>{new Date(chartWeights[chartWeights.length - 1].date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
        ) : (
          <EmptyState className="mt-4" message="Add at least 2 check-ins to see your weight trend." />
        )}
      </Card>

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
    </PageLayout>
  );
}
