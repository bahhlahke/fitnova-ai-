"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import { emitDataRefresh, useDataRefresh } from "@/lib/ui/data-sync";
import { DEFAULT_UNIT_SYSTEM, type UnitSystem, readUnitSystemFromProfile } from "@/lib/units";
import { toPlainFitnessLanguage, toTitleCaseLabel } from "@/lib/ui/plain-language";
import { Card, CardHeader, Button, LoadingState } from "@/components/ui";
import { AiCoachPanel } from "@/components/ai/AiCoachPanel";
import { SpotifyMiniPlayer } from "@/components/music/SpotifyMiniPlayer";
import {
  type DashboardTodayPlan,
} from "@/components/dashboard/DashboardPlanSection";
import {
  type DashboardProjection,
} from "@/components/dashboard/DashboardProgressSection";
import { calculateReadiness, type MuscleReadiness } from "@/lib/workout/recovery";
import type { User } from "@supabase/supabase-js";
import type { DailyPlan } from "@/lib/plan/types";

export type DailyCheckIn = {
  energy_score?: number | null;
  adherence_score?: number | null;
  sleep_hours?: number | null;
  soreness_notes?: string | null;
};
import {
  type DashboardPerformanceAnalytics,
  type DashboardWeeklyPlanSummary,
} from "@/components/dashboard/DashboardAnalyticsSection";
import {
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

function simplifyCoachInsightTitle(title?: string): string {
  const normalized = title?.toLowerCase() ?? "";
  if (normalized.includes("overreach")) return "Recovery warning";
  if (normalized.includes("protein")) return "Protein target check";
  if (normalized.includes("sleep")) return "Sleep reminder";
  if (normalized.includes("hydration")) return "Hydration reminder";
  if (normalized.includes("fatigue")) return "Fatigue warning";
  return toTitleCaseLabel(toPlainFitnessLanguage(title));
}

export default function HomePage() {
  const [authState, setAuthState] = useState<"loading" | "signed_in" | "signed_out">(
    "loading"
  );
  const [weekCount, setWeekCount] = useState(0);
  const [last7Days, setLast7Days] = useState<number[]>([]);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [todayPlan, setTodayPlan] = useState<DashboardTodayPlan | null>(null);
  const [hasPlanToday, setHasPlanToday] = useState(false);
  const [hasWorkoutToday, setHasWorkoutToday] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [weeklyInsight, setWeeklyInsight] = useState<string | null>(null);
  const [weeklyInsightLoading, setWeeklyInsightLoading] = useState(false);
  const [readinessInsight, setReadinessInsight] = useState<string | null>(null);
  const [readinessInsightLoading, setReadinessInsightLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSurvey, setShowSurvey] = useState(false);
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Quick-log state
  const [quickMeals, setQuickMeals] = useState<any[]>([]);
  const [quickWorkouts, setQuickWorkouts] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<{ briefing: string, rationale: string, inputs: string[] } | null>(null);
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
  const [coachInsights, setCoachInsights] = useState<any[]>([]);
  const [coachInsightsLoading, setCoachInsightsLoading] = useState(false);

  // Telemetry state
  const [telemetryOptIn, setTelemetryOptIn] = useState<boolean>(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);

  // Fatigue & Achievement state
  const [readiness, setReadiness] = useState<Partial<MuscleReadiness>>({});

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
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

      const [weekRes, last7Res, last28Res, planRes, profileRes, workoutTodayRes, checkInRes] =
        await Promise.all([
          supabase
            .from("workout_logs")
            .select("date", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("date", weekStart),
          supabase
            .from("workout_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", sevenDaysAgoStr)
            .lte("date", today)
            .order("date", { ascending: true }),
          supabase
            .from("workout_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", new Date(new Date().setDate(new Date().getDate() - 28)).toISOString().split("T")[0])
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
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("workout_logs")
            .select("log_id")
            .eq("user_id", user.id)
            .eq("date", today)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("check_ins")
            .select("energy_score, adherence_score, sleep_hours, soreness_notes")
            .eq("user_id", user.id)
            .eq("date_local", today)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      setWeekCount(weekRes.count ?? 0);

      if (checkInRes.data) {
        setCheckIn(checkInRes.data as DailyCheckIn);
      }

      if (last28Res.data) {
        setReadiness(calculateReadiness(last28Res.data));
      }

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
        | { subscription_status?: string; devices?: unknown }
        | null;
      setIsPro(profileData?.subscription_status === "pro");
      setUnitSystem(readUnitSystemFromProfile(profileData as Record<string, unknown> | null));

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
      const localDate = toLocalDateString();
      const res = await fetch("/api/v1/ai/readiness-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate, readiness }),
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
  }, [readiness]);

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
      const body = (await res.json()) as { briefing?: string | null, rationale?: string, inputs?: string[] };
      if (typeof body.briefing === "string" && body.briefing) {
        setBriefing({
          briefing: body.briefing,
          rationale: body.rationale || "Optimization parameters validated.",
          inputs: body.inputs || ["System Base"]
        });
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
      const res = await fetch(`/api/v1/plan/weekly?today=${toLocalDateString()}`);
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
      const res = await fetch(`/api/v1/analytics/performance?today=${toLocalDateString()}`);
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

  const loadCoachDesk = useCallback(async () => {
    setCoachInsightsLoading(true);
    try {
      const res = await fetch("/api/v1/ai/coach-desk");
      const body = await res.json();
      if (body.insights) setCoachInsights(body.insights);
    } catch {
    } finally {
      setCoachInsightsLoading(false);
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
    void loadPerformanceAnalytics();
    void loadRetentionRisk();
    void loadCoachDesk();
  }, [
    authState,
    loadBriefing,
    loadPerformanceAnalytics,
    loadProjection,
    loadReadinessInsight,
    loadRetentionRisk,
    loadWeeklyPlan,
    loadWeeklyInsight,
    loadCoachDesk,
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
    void loadCoachDesk();
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
        <section className="relative overflow-hidden rounded-xl3 border border-white/10 bg-black p-6 shadow-fn-card sm:p-16 lg:p-24">
          <div className="absolute inset-0 z-0">
            <video
              src="/images/push-ups.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover object-center opacity-40 grayscale contrast-125 transition-opacity duration-1000"
            />
          </div>
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black via-black/90 to-transparent" />
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-transparent to-black/30" />

          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-fn-accent">
              Daily Coaching That Adapts
            </p>
            <h1 className="mt-6 font-display text-6xl font-black uppercase italic tracking-tighter text-white sm:text-8xl lg:text-9xl leading-[0.85]">
              Build Your<br />Legend
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-medium leading-relaxed text-fn-muted/90 lg:text-2xl">
              Koda gives you a clear daily workout, meal targets, and coach guidance that adjusts to your energy, schedule, and goals.
            </p>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <Link href="/start">
                <Button className="h-touch-lg px-8 text-xs font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-white/90">Start Free Assessment</Button>
              </Link>
              <Link href="/auth">
                <Button variant="secondary" className="h-touch-lg px-8 text-xs font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 hover:bg-white/10 text-white">Sign In</Button>
              </Link>
            </div>

            {/* Proof-First: The First 7 Days Preview */}
            <div className="mt-20 border-t border-white/10 pt-12">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-6">What Your First Week Looks Like</p>
              <h2 className="font-display text-4xl font-black uppercase italic tracking-tighter text-white sm:text-5xl mb-10">Your First 7 Days</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { day: "D1", title: "Starting Point", desc: "Koda learns your goals, schedule, and current baseline.", icon: "target" },
                  { day: "D3", title: "Plan Tune-Up", desc: "Your workout and food targets adjust to early feedback.", icon: "zap" },
                  { day: "D5", title: "Progress Check", desc: "Koda spots what is working and where you may need a lighter day.", icon: "activity" },
                  { day: "D7", title: "Week 1 Review", desc: "You get a simple recap and a better plan for week two.", icon: "trending-up" },
                ].map((item, i) => (
                  <div key={item.day} className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
                    <div className="absolute -top-4 -left-4 h-10 w-10 rounded-full bg-fn-accent flex items-center justify-center text-black font-black text-xs shadow-[0_0_15px_rgba(10,217,196,0.5)]">
                      {item.day}
                    </div>
                    <p className="text-sm font-black text-white uppercase tracking-widest mb-2 mt-2">{item.title}</p>
                    <p className="text-xs text-fn-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                <div className="h-10 w-10 rounded-full border-2 border-black bg-fn-surface-hover/80 shrink-0" />
                <div className="h-10 w-10 rounded-full border-2 border-black bg-fn-muted/50 shrink-0" />
                <div className="h-10 w-10 rounded-full border-2 border-black bg-fn-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-fn-accent">+10k</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-fn-muted leading-tight">Plans informed by<br /><span className="text-white">50,000+ training and nutrition signals</span></p>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { value: "50+ M", label: "Health And Training Signals Reviewed" },
            { value: "10K+", label: "Members Coached" },
            { value: "99.2%", label: "Plan Reliability" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-fn-surface/40 py-8 px-4 backdrop-blur-sm transition-all hover:bg-fn-surface/60">
              <p className="font-display text-4xl font-black italic tracking-tighter text-white lg:text-5xl">{value}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-fn-accent text-center">{label}</p>
            </div>
          ))}
        </div>

        {/* Feature cards — 2 col on mobile, 4 col on desktop */}
        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              src: "/images/refined/athletic_female_gym_2.png",
              alt: "AI Coaching Interface",
              label: "Daily Coaching",
              title: "Clear Next Step",
              desc: "See today’s workout, meal targets, and coach guidance in one place.",
              accent: "border-fn-accent/30",
            },
            {
              src: "/images/refined/scanner.png",
              alt: "Hormonal Cycle Tracking",
              label: "Women’s Health",
              title: "Cycle-Aware Coaching",
              desc: "Training and recovery guidance can adapt around menstrual-cycle needs.",
              accent: "border-fn-accent/30",
            },
            {
              src: "/images/refined/athletic_female_lifting.png",
              alt: "Progression Intelligence",
              label: "Strength Progress",
              title: "Progress Tracking",
              desc: "Track PRs and estimated strength changes without guessing what to lift next.",
              accent: "border-fn-accent/30",
            },
            {
              src: "/images/refined/motion.png",
              alt: "Wearable Sync",
              label: "Recovery Data",
              title: "Wearable Sync",
              desc: "Connect wearables so Koda can factor in sleep, recovery, and activity data.",
              accent: "border-fn-accent/30",
            },
          ].map(({ src, alt, label, title, desc, accent }) => (
            <Card key={label} padding="none" className={`overflow-hidden group border ${accent} bg-fn-bg/50 backdrop-blur-md`}>
              <div className="relative w-full overflow-hidden" style={{ height: "16rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover object-center opacity-80 transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-fn-bg via-fn-bg/20 to-transparent" />
              </div>
              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">
                  {label}
                </p>
                <h2 className="mt-3 font-display text-xl font-black uppercase italic tracking-tight text-white">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-fn-muted">
                  {desc}
                </p>
              </div>
            </Card>
          ))}
        </section>

        {/* Scientific Methodology Section */}
        <section className="mt-16 rounded-xl3 border border-fn-accent/20 bg-fn-accent/5 p-10 md:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <svg className="w-64 h-64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="relative z-10 max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-fn-accent">Why People Trust Koda</p>
            <h2 className="mt-6 font-display text-4xl font-black uppercase italic tracking-tighter text-white sm:text-6xl">
              Daily coaching built from real training and recovery data
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-fn-muted">
              Koda combines your workouts, check-ins, food logs, and optional wearable data so it can recommend when to push, when to maintain, and when to back off.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-8 border-t border-fn-accent/20 pt-10">
              <div>
                <p className="text-2xl font-black text-white italic">99.2%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-fn-muted">Protocol Accuracy</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white italic">&lt; 30s</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-fn-muted">Deep Sleep Re-Sync Latency</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Surface */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="lg" className="bg-white/5 border-white/10">
            <p className="text-lg font-medium italic text-white/90">
              &ldquo;The motion analysis caught a hitch in my squat that two human coaches missed. Koda AI is on a different level.&rdquo;
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-fn-surface-hover shrink-0" />
              <div>
                <p className="text-sm font-bold text-white uppercase">Sarah L.</p>
                <p className="text-[10px] font-bold text-fn-accent uppercase tracking-widest">D1 Track Athlete</p>
              </div>
            </div>
          </Card>
          <Card padding="lg" className="bg-white/5 border-white/10">
            <p className="text-lg font-medium italic text-white/90">
              &ldquo;I stopped thinking about my macros. Koda handles the math, I just focus on the execution. 12lbs down, zero guesswork.&rdquo;
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-fn-surface-hover shrink-0" />
              <div>
                <p className="text-sm font-bold text-white uppercase">James T.</p>
                <p className="text-[10px] font-bold text-fn-accent uppercase tracking-widest">Executive / Hybrid Athlete</p>
              </div>
            </div>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="mt-16 py-10 border-t border-white/10">
          <h2 className="text-center font-display text-4xl font-black uppercase italic tracking-tighter text-white">Reliability & Ethics</h2>
          <div className="mt-12 max-w-3xl mx-auto space-y-8">
            <div className="group border-b border-white/5 pb-6">
              <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-3">Is my data secure?</h3>
              <p className="text-fn-muted leading-relaxed">Everything is encrypted at rest and in transit. We follow strict data isolation protocols (RLS) to ensure your biometric signatures are yours and yours alone. We never sell your data.</p>
            </div>
            <div className="group border-b border-white/5 pb-6">
              <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-3">Does it work offline?</h3>
              <p className="text-fn-muted leading-relaxed">Koda AI requires a connection for model inference, but your daily protocol is cached locally for reliable access in the weights room.</p>
            </div>
            <div className="group border-b border-white/5 pb-6">
              <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-3">What makes the &quot;Pro&quot; tier different?</h3>
              <p className="text-fn-muted leading-relaxed">Pro unlocks high-fidelity forecasting, AI-assisted motion analysis, and prioritized AI inference for even faster responses.</p>
            </div>
          </div>
        </section>

        {/* Final CTA Strip */}
        <section className="mt-20 text-center py-20 bg-fn-accent text-black rounded-xl3 mb-10">
          <h2 className="font-display text-5xl font-black uppercase italic tracking-tighter sm:text-7xl">Ready To Start?</h2>
          <p className="mt-6 text-xl font-bold uppercase tracking-tight opacity-80 max-w-xl mx-auto">Start your free assessment and get your first personalized plan.</p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/start">
              <Button className="bg-black text-white hover:bg-black/90 border-0 h-16 px-10 text-sm font-black uppercase tracking-widest">Start Free Assessment</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="secondary" className="bg-black/10 border-black/20 text-black hover:bg-black/20 h-16 px-10 text-sm font-black uppercase tracking-widest">View Plans</Button>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Quick-action items
  const quickActions = [
    {
      href: "/log/nutrition", label: "Log Meal", color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", iconColor: "text-emerald-400", icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: "/log/workout", label: "Log Workout", color: "from-blue-500/20 to-blue-600/5 border-blue-500/20", iconColor: "text-blue-400", icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 5v14m12-14v14M4 9h4m8 0h4M7 15h10" />
        </svg>
      )
    },
    {
      href: "/check-in", label: "Check In", color: "from-violet-500/20 to-violet-600/5 border-violet-500/20", iconColor: "text-violet-400", icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      href: "/coach", label: "Ask Coach", color: "from-fn-accent/20 to-fn-accent/5 border-fn-accent/20", iconColor: "text-fn-accent", icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-100px)] w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 md:h-[calc(100vh-40px)]">
      {/* High-Density Vitals Header */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 shrink-0">
        {[
          { label: "Ready For Today", value: (() => {
            if (checkIn?.energy_score != null) {
              const energy = (checkIn.energy_score / 5.0) * 0.7;
              const adherence = ((checkIn.adherence_score ?? checkIn.energy_score) / 5.0) * 0.3;
              return `${Math.round(Math.min(1.0, Math.max(0.0, energy + adherence)) * 100)}%`;
            }
            return readiness.overall_score != null ? `${Math.round(readiness.overall_score * 100)}%` : "...";
          })(), icon: "⚡", href: "/vitals" },
          { label: "Current Streak", value: `${streak} days`, icon: "🔥", href: "/progress" },
          { label: "Workouts This Week", value: `${weekCount}`, icon: "📊", href: "/history" },
          { label: "Food Target Today", value: todayPlan?.calories ? `${todayPlan.calories} kcal` : "Build plan", icon: "🥗", href: "/log/nutrition" },
        ].map((item) => (
          <Link key={item.label} href={item.href}>
            <div className="group rounded-2xl border border-white/[0.05] bg-fn-surface/40 p-4 transition-all hover:bg-fn-surface/60">
              <div className="flex items-center justify-between opacity-50">
                <p className="text-[9px] font-black uppercase tracking-wider">{item.label}</p>
                <span className="text-xs">{item.icon}</span>
              </div>
              <p className="mt-1 font-display text-xl font-black italic uppercase italic tracking-tighter text-white sm:text-2xl">
                {item.value}
              </p>
            </div>
          </Link>
        ))}
      </section>

      <section className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">Start Here Today</p>
        <p className="mt-2 text-sm leading-relaxed text-fn-muted">
          {hasPlanToday
            ? "Check how ready you are, then complete one key action: start today's workout, log a meal, or ask Coach to adapt the plan."
            : "Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in."}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-fn-muted/80">
          Ready For Today combines your recent training, check-ins, and recovery signals so you know whether to push, maintain, or take it easier.
        </p>
        <div className="mt-3 grid gap-2 text-xs text-fn-muted sm:grid-cols-3">
          {[
            "1. Review your energy today.",
            hasPlanToday ? "2. Start the workout or adapt it." : "2. Generate today’s plan.",
            "3. Come back after one action for coach feedback.",
          ].map((step) => (
            <div key={step} className="rounded-xl border border-white/8 bg-black/15 px-3 py-2">
              {step}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {hasPlanToday ? (
            <>
              <Link href="/log/workout/guided">
                <Button size="sm">Start today&apos;s workout</Button>
              </Link>
              <Link href="/check-in">
                <Button size="sm" variant="secondary">Quick check-in</Button>
              </Link>
            </>
          ) : (
            <>
              <Button size="sm" loading={planLoading || generating} onClick={() => void handleGeneratePlan()}>
                Generate today&apos;s plan
              </Button>
              <Link href="/check-in">
                <Button size="sm" variant="secondary">Quick check-in first</Button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Main Command Workspace */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Signal Stream - Activity Log Feed (Fixed Sidebar) */}
        <aside className="hidden w-72 flex-col gap-4 overflow-y-auto md:flex pr-2 custom-scrollbar">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-muted/50 border-b border-white/5 pb-2">Today&apos;s Coaching Summary</p>
          <div className="space-y-3">
            {/* Today's Protocol Focus */}
            <div className="rounded-xl bg-fn-accent/5 border border-fn-accent/20 p-4">
              <p className="text-[9px] font-black uppercase text-fn-accent mb-1">Today&apos;s Focus</p>
              <p className="font-display text-lg font-black italic text-white leading-tight">{todayPlan?.focus ?? "Building today’s plan..."}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-fn-muted">
                {todayPlan
                  ? "This is the main training priority Koda wants you to complete next."
                  : "Step 1 is to generate your plan so Koda can show the recommended workout focus."}
              </p>
              {todayPlan && (
                <Link href="/log/workout/guided">
                  <button className="mt-3 text-[10px] font-black uppercase text-fn-accent hover:underline">Start Workout →</button>
                </Link>
              )}
            </div>

            {/* Recent Nudge / Insight */}
            {nudges.slice(0, 1).map(n => (
              <div key={n.nudge_id} className="rounded-xl bg-fn-surface/30 border border-white/5 p-4 italic text-sm text-fn-muted">
                &ldquo;{n.message}&rdquo;
              </div>
            ))}

            {/* Elite AI Synthesis Terminal */}
            <div className="rounded-xl bg-gradient-to-br from-fn-bg to-fn-surface/50 border border-fn-accent/20 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fn-accent/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-fn-accent/10 transition-all duration-700"></div>

              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fn-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-fn-accent"></span>
                </span>
                <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent">Coach Summary</p>
              </div>

              {briefingLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 w-3/4 bg-white/10 rounded"></div>
                  <div className="h-3 w-1/2 bg-white/10 rounded"></div>
                  <div className="h-3 w-5/6 bg-white/10 rounded"></div>
                </div>
              ) : briefing ? (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-white italic leading-relaxed border-l-2 border-fn-accent/50 pl-2">
                    &ldquo;{toPlainFitnessLanguage(briefing.briefing)}&rdquo;
                  </p>

                  <div className="bg-black/40 rounded-lg p-3 border border-white/5 space-y-2">
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Why Koda Is Suggesting This</p>
                    <p className="text-[10px] text-fn-muted leading-relaxed">{toPlainFitnessLanguage(briefing.rationale)}</p>
                  </div>

                  {briefing.inputs && briefing.inputs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {briefing.inputs.map((input, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[8px] font-mono text-fn-accent uppercase tracking-wider">
                          {input}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs leading-relaxed text-fn-muted font-mono h-[80px] flex items-center justify-center border border-dashed border-white/10 rounded-lg">
                  Step 1: generate today&apos;s plan. Step 2: complete one action. Step 3: return here for your coach summary.
                </div>
              )}
              {/* Coach's Desk Mastery Insights */}
              {(coachInsights.length > 0 || coachInsightsLoading) && (
                <div className="rounded-xl bg-fn-accent/5 border border-fn-accent/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🛡️</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent">Why This Matters</p>
                  </div>
                  <p className="text-[10px] leading-relaxed text-fn-muted">
                    Plain-English rule: if readiness looks low, choose an easier day or ask Coach to adapt the plan before you start.
                  </p>
                  {coachInsightsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-2 w-full bg-fn-accent/10 rounded"></div>
                      <div className="h-2 w-2/3 bg-fn-accent/10 rounded"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {coachInsights.map((insight: any, idx: number) => (
                        <div
                          key={idx}
                          className={`space-y-1 ${insight.cta_route ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                          onClick={() => {
                            if (insight.cta_route) {
                              window.location.href = insight.cta_route;
                            }
                          }}
                        >
                          <p className="text-[11px] font-black text-white uppercase italic">{simplifyCoachInsightTitle(insight.title)}</p>
                          <p className="text-[10px] text-fn-ink/60 leading-relaxed line-clamp-2">{toPlainFitnessLanguage(insight.message)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Weekly Insight */}
            {(weeklyInsightLoading || weeklyInsight) && (
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-mono">Weekly Insight</p>
                {weeklyInsightLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-2.5 w-full bg-emerald-500/10 rounded"></div>
                    <div className="h-2.5 w-4/5 bg-emerald-500/10 rounded"></div>
                  </div>
                ) : (
                  <p className="text-xs text-white/85 leading-relaxed">{weeklyInsight}</p>
                )}
              </div>
            )}

            {/* Spotify Integration */}
            <SpotifyMiniPlayer />

            {/* Workout Music */}
            <div className="rounded-xl border border-fn-accent/20 bg-gradient-to-br from-fn-accent/10 via-black/40 to-black/70 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎵</span>
                <p className="text-[9px] font-black uppercase tracking-widest text-fn-accent">Workout Music</p>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-fn-muted">
                Connect Spotify once, then launch guided workouts with device-ready playback controls and fewer interruptions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/integrations">
                  <Button size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest">
                    Connect Spotify
                  </Button>
                </Link>
                <Link href="/log/workout/guided">
                  <Button size="sm" variant="ghost" className="h-8 border border-white/10 text-[9px] font-black uppercase tracking-widest">
                    Open Guided Workout
                  </Button>
                </Link>
              </div>
            </div>

            {/* Sensor Sync / Biometrics Status */}
            <div className="rounded-xl bg-black/40 border border-white/5 p-4 group hover:bg-black/60 transition-all">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black uppercase text-fn-accent">Connected Tools</p>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fn-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fn-accent"></span>
                </span>
              </div>
              <div className="space-y-2">
                <Link href="/integrations" className="block p-2 rounded-lg bg-white/5 hover:bg-fn-accent/10 border border-white/5 hover:border-fn-accent/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⌚</span>
                    <span className="text-[10px] font-bold text-white uppercase tracking-tight">Wearables</span>
                  </div>
                </Link>
                <Link href="/log/nutrition/fridge" className="block p-2 rounded-lg bg-white/5 hover:bg-fn-accent/10 border border-white/5 hover:border-fn-accent/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📸</span>
                    <span className="text-[10px] font-bold text-white uppercase tracking-tight">Photo Food Scan</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Centerpiece Agent Interface */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            <AiCoachPanel
              mode="embedded"
              autoFocus={focusAi}
              className="h-full border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
