"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import { emitDataRefresh, useDataRefresh } from "@/lib/ui/data-sync";
import { Card, Button, LoadingState } from "@/components/ui";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardAiSection } from "@/components/dashboard/DashboardAiSection";
import {
  DashboardPlanSection,
  type DashboardTodayPlan,
} from "@/components/dashboard/DashboardPlanSection";
import { DashboardReadinessSection } from "@/components/dashboard/DashboardReadinessSection";
import {
  DashboardProgressSection,
  type DashboardProjection,
} from "@/components/dashboard/DashboardProgressSection";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import {
  DashboardAnalyticsSection,
  type DashboardPerformanceAnalytics,
  type DashboardWeeklyPlanSummary,
} from "@/components/dashboard/DashboardAnalyticsSection";
import {
  DashboardRetentionSection,
  type DashboardNudge,
  type DashboardRetentionRisk,
} from "@/components/dashboard/DashboardRetentionSection";

function getWeekStart(date: Date): string {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  return toLocalDateString(monday);
}

export default function HomePage() {
  const [authState, setAuthState] = useState<"loading" | "signed_in" | "signed_out">(
    "loading"
  );
  const [weekCount, setWeekCount] = useState(0);
  const [last7Days, setLast7Days] = useState<number[]>([]);
  const [todayPlan, setTodayPlan] = useState<DashboardTodayPlan | null>(null);
  const [hasPlanToday, setHasPlanToday] = useState(false);
  const [hasWorkoutToday, setHasWorkoutToday] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [weeklyInsight, setWeeklyInsight] = useState<string | null>(null);
  const [weeklyInsightLoading, setWeeklyInsightLoading] = useState(false);
  const [readinessInsight, setReadinessInsight] = useState<string | null>(null);
  const [readinessInsightLoading, setReadinessInsightLoading] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [projection, setProjection] = useState<DashboardProjection | null>(null);
  const [lastWorkoutDate, setLastWorkoutDate] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [focusAi, setFocusAi] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<DashboardWeeklyPlanSummary | null>(null);
  const [weeklyPlanLoading, setWeeklyPlanLoading] = useState(false);
  const [performanceAnalytics, setPerformanceAnalytics] = useState<DashboardPerformanceAnalytics | null>(null);
  const [performanceAnalyticsLoading, setPerformanceAnalyticsLoading] = useState(false);
  const [retentionRisk, setRetentionRisk] = useState<DashboardRetentionRisk | null>(null);
  const [retentionRiskLoading, setRetentionRiskLoading] = useState(false);
  const [nudges, setNudges] = useState<DashboardNudge[]>([]);

  const loadDashboardSnapshot = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setAuthState("signed_out");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAuthState("signed_out");
        return;
      }

      setAuthState("signed_in");

      const today = toLocalDateString();
      const weekStart = getWeekStart(new Date());

      const [weekRes, last7Res, planRes, profileRes, workoutTodayRes] =
        await Promise.all([
          supabase
            .from("workout_logs")
            .select("date", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("date", weekStart)
            .lte("date", today),
          supabase
            .from("workout_logs")
            .select("date")
            .eq("user_id", user.id)
            .gte(
              "date",
              toLocalDateString(
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              )
            )
            .lte("date", today)
            .order("date", { ascending: true }),
          supabase
            .from("daily_plans")
            .select("plan_json")
            .eq("user_id", user.id)
            .eq("date_local", today)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("user_profile")
            .select("subscription_status")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("workout_logs")
            .select("date")
            .eq("user_id", user.id)
            .eq("date", today)
            .limit(1)
            .maybeSingle(),
        ]);

      setWeekCount(weekRes.count ?? 0);

      const byDate: Record<string, number> = {};
      const last7Rows = (last7Res.data ?? []) as Array<{ date: string }>;
      last7Rows.forEach((row) => {
        byDate[row.date] = (byDate[row.date] ?? 0) + 1;
      });

      const nextLast7Days: number[] = [];
      for (let i = 6; i >= 0; i -= 1) {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - i);
        const key = toLocalDateString(currentDate);
        nextLast7Days.push(byDate[key] ?? 0);
      }
      setLast7Days(nextLast7Days);
      setLastWorkoutDate(last7Rows.length ? last7Rows[last7Rows.length - 1].date : null);

      const plan = planRes.data?.plan_json as
        | {
          training_plan?: { focus?: string };
          nutrition_plan?: { calorie_target?: number };
        }
        | undefined;
      const nextHasPlan = !!plan?.training_plan?.focus;
      setHasPlanToday(nextHasPlan);
      setTodayPlan(
        nextHasPlan
          ? {
            focus: plan?.training_plan?.focus ?? "Today’s protocol",
            calories: plan?.nutrition_plan?.calorie_target ?? 0,
          }
          : null
      );

      const profileData = profileRes.data as
        | { subscription_status?: string }
        | null;
      setIsPro(profileData?.subscription_status === "pro");

      setHasWorkoutToday(!!workoutTodayRes.data);
      try {
        const { data } = await supabase
          .from("coach_nudges")
          .select("nudge_id, nudge_type, message, risk_level")
          .eq("user_id", user.id)
          .eq("date_local", today)
          .order("created_at", { ascending: false })
          .limit(5);
        setNudges((data ?? []) as DashboardNudge[]);
      } catch {
        setNudges([]);
      }
    } catch {
      setAuthState("signed_out");
    }
  }, []);

  const loadReadinessInsight = useCallback(async () => {
    setReadinessInsightLoading(true);
    try {
      const res = await fetch("/api/v1/ai/readiness-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate: toLocalDateString() }),
      });
      const body = (await res.json()) as { insight?: string | null };
      if (typeof body.insight === "string" && body.insight) {
        setReadinessInsight(body.insight);
      }
    } catch {
      // Ignore degraded AI insight fetches.
    } finally {
      setReadinessInsightLoading(false);
    }
  }, []);

  const loadWeeklyInsight = useCallback(async () => {
    setWeeklyInsightLoading(true);
    try {
      const res = await fetch("/api/v1/ai/weekly-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate: toLocalDateString() }),
      });
      const body = (await res.json()) as { insight?: string | null };
      if (typeof body.insight === "string" && body.insight) {
        setWeeklyInsight(body.insight);
      }
    } catch {
      // Ignore degraded AI insight fetches.
    } finally {
      setWeeklyInsightLoading(false);
    }
  }, []);

  const loadProjection = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ai/projection");
      const body = (await res.json()) as DashboardProjection;
      if (body && typeof body.current === "number") {
        setProjection(body);
      }
    } catch {
      // Ignore degraded projection fetches.
    }
  }, []);

  const loadBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const res = await fetch("/api/v1/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate: toLocalDateString() }),
      });
      const body = (await res.json()) as { briefing?: string | null };
      if (typeof body.briefing === "string" && body.briefing) {
        setBriefing(body.briefing);
      }
    } catch {
      // Ignore degraded briefing fetches.
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  const loadWeeklyPlan = useCallback(async () => {
    setWeeklyPlanLoading(true);
    try {
      const res = await fetch("/api/v1/plan/weekly");
      const body = (await res.json()) as { plan?: DashboardWeeklyPlanSummary };
      if (body.plan) setWeeklyPlan(body.plan);
    } catch {
      // Ignore degraded weekly-plan requests.
    } finally {
      setWeeklyPlanLoading(false);
    }
  }, []);

  const loadPerformanceAnalytics = useCallback(async () => {
    setPerformanceAnalyticsLoading(true);
    try {
      const res = await fetch("/api/v1/analytics/performance");
      const body = (await res.json()) as DashboardPerformanceAnalytics;
      if (typeof body.period_days === "number") {
        setPerformanceAnalytics(body);
      }
    } catch {
      // Ignore degraded analytics requests.
    } finally {
      setPerformanceAnalyticsLoading(false);
    }
  }, []);

  const loadRetentionRisk = useCallback(async () => {
    setRetentionRiskLoading(true);
    try {
      const res = await fetch("/api/v1/ai/retention-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate: toLocalDateString() }),
      });
      const body = (await res.json()) as DashboardRetentionRisk;
      if (typeof body.risk_score === "number") {
        setRetentionRisk(body);
      }
    } catch {
      // Ignore degraded retention-risk requests.
    } finally {
      setRetentionRiskLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardSnapshot();
  }, [loadDashboardSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setFocusAi(params.get("focus") === "ai");
  }, []);

  useEffect(() => {
    if (authState !== "signed_in") return;
    void loadReadinessInsight();
    void loadWeeklyInsight();
    void loadProjection();
    void loadBriefing();
    void loadWeeklyPlan();
    void loadPerformanceAnalytics();
    void loadRetentionRisk();
  }, [
    authState,
    loadBriefing,
    loadPerformanceAnalytics,
    loadProjection,
    loadReadinessInsight,
    loadRetentionRisk,
    loadWeeklyPlan,
    loadWeeklyInsight,
  ]);

  useDataRefresh(["dashboard"], () => {
    if (authState !== "signed_in") return;
    void loadDashboardSnapshot();
    void loadReadinessInsight();
    void loadWeeklyInsight();
    void loadProjection();
    void loadBriefing();
    void loadWeeklyPlan();
    void loadPerformanceAnalytics();
    void loadRetentionRisk();
  });

  const streak = useMemo(() => {
    let count = 0;
    for (let i = last7Days.length - 1; i >= 0 && last7Days[i] > 0; i -= 1) {
      count += 1;
    }
    return count;
  }, [last7Days]);

  const recoverySuggestion = useMemo(() => {
    if (!lastWorkoutDate) return null;

    const today = toLocalDateString();
    const daysSinceLastWorkout = Math.floor(
      (new Date(today).setHours(0, 0, 0, 0) -
        new Date(lastWorkoutDate).setHours(0, 0, 0, 0)) /
      (24 * 60 * 60 * 1000)
    );

    if (daysSinceLastWorkout === 0) {
      return "You already trained today. Keep recovery and nutrition clean.";
    }
    if (daysSinceLastWorkout === 1) {
      return "You trained yesterday. Consider lighter loading or active recovery.";
    }
    return null;
  }, [lastWorkoutDate]);

  async function handleGeneratePlan() {
    setPlanLoading(true);

    try {
      const res = await fetch("/api/v1/plan/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await res.json()) as {
        plan?: {
          training_plan?: { focus?: string };
          nutrition_plan?: { calorie_target?: number };
        };
      };

      if (res.ok && body.plan?.training_plan?.focus) {
        setHasPlanToday(true);
        setTodayPlan({
          focus: body.plan.training_plan.focus ?? "Today’s protocol",
          calories: body.plan.nutrition_plan?.calorie_target ?? 0,
        });
        emitDataRefresh(["dashboard", "nutrition", "workout"]);
        void loadBriefing();
        void loadWeeklyPlan();
        void loadRetentionRisk();
      }
    } finally {
      setPlanLoading(false);
    }
  }

  if (authState === "loading") {
    return (
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6">
        <LoadingState message="Preparing your dashboard..." />
      </div>
    );
  }

  if (authState === "signed_out") {
    return (
      <div className="mx-auto w-full max-w-shell px-4 py-12 sm:px-6">
        <section className="rounded-[2rem] border border-white/5 bg-gradient-to-br from-white/5 to-transparent p-8 shadow-2xl backdrop-blur-3xl sm:p-12">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">
            FitNova Pro Experience
          </p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase italic tracking-tighter text-white sm:text-7xl">
            Build your legend
          </h1>
          <p className="mt-6 max-w-2xl text-xl font-medium leading-relaxed text-fn-muted">
            AI-backed fitness coaching with adaptive daily plans, streamlined
            logging, and a single dashboard command center.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/start">
              <Button>Start Assessment</Button>
            </Link>
            <Link href="/auth">
              <Button variant="secondary">Member Access</Button>
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Card padding="lg">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fn-muted">
              Dashboard AI
            </p>
            <h2 className="mt-2 text-xl font-semibold text-fn-ink">
              One command surface
            </h2>
            <p className="mt-2 text-sm text-fn-muted">
              The dashboard AI logs meals, workouts, and progress while syncing
              the rest of your app.
            </p>
          </Card>
          <Card padding="lg">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fn-muted">
              Nutrition
            </p>
            <h2 className="mt-2 text-xl font-semibold text-fn-ink">
              Fast meal capture
            </h2>
            <p className="mt-2 text-sm text-fn-muted">
              Log by description or photo, track hydration, and stay aligned to
              your calorie and macro targets.
            </p>
          </Card>
          <Card padding="lg">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fn-muted">
              Workout
            </p>
            <h2 className="mt-2 text-xl font-semibold text-fn-ink">
              Guided execution
            </h2>
            <p className="mt-2 text-sm text-fn-muted">
              Run guided sessions, quick-log completed work, and use motion
              analysis to tighten technique.
            </p>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-10 sm:px-8">
      <div className="space-y-8">
        <DashboardHero
          briefing={briefing}
          briefingLoading={briefingLoading}
          isPro={isPro}
        />
        <DashboardAiSection
          autoFocus={focusAi}
          planLoading={planLoading}
          hasPlanToday={hasPlanToday}
          onGeneratePlan={() => void handleGeneratePlan()}
        />
        <DashboardPlanSection
          todayPlan={todayPlan}
          weekCount={weekCount}
          streak={streak}
          weeklyInsight={weeklyInsight}
          weeklyInsightLoading={weeklyInsightLoading}
        />
        <DashboardReadinessSection
          recoverySuggestion={recoverySuggestion}
          readinessInsight={readinessInsight}
          readinessInsightLoading={readinessInsightLoading}
        />
        <DashboardProgressSection
          last7Days={last7Days}
          projection={projection}
        />
        <DashboardAnalyticsSection
          weeklyPlan={weeklyPlan}
          weeklyPlanLoading={weeklyPlanLoading}
          analytics={performanceAnalytics}
          analyticsLoading={performanceAnalyticsLoading}
        />
        <DashboardRetentionSection
          retentionRisk={retentionRisk}
          retentionLoading={retentionRiskLoading}
          nudges={nudges}
        />
        <DashboardQuickActions
          hasPlanToday={hasPlanToday}
          hasWorkoutToday={hasWorkoutToday}
        />
      </div>
    </div>
  );
}
