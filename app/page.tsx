"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import { emitDataRefresh, useDataRefresh } from "@/lib/ui/data-sync";
import { DEFAULT_UNIT_SYSTEM, type UnitSystem, readUnitSystemFromProfile } from "@/lib/units";
import { Card, CardHeader, Button, LoadingState } from "@/components/ui";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { SocialFeed } from "@/components/social/SocialFeed";
import { AiCoachPanel } from "@/components/ai/AiCoachPanel";
import {
  DashboardPlanSection,
  type DashboardTodayPlan,
} from "@/components/dashboard/DashboardPlanSection";
import { DashboardReadinessSection } from "@/components/dashboard/DashboardReadinessSection";
import {
  DashboardProgressSection,
  type DashboardProjection,
} from "@/components/dashboard/DashboardProgressSection";
import { calculateReadiness, type MuscleReadiness } from "@/lib/workout/recovery";
import type { User } from "@supabase/supabase-js";
import type { DailyPlan } from "@/lib/plan/types";

export type DailyCheckIn = {
  energy_score?: number | null;
  sleep_hours?: number | null;
  soreness_notes?: string | null;
};
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

      const [weekRes, last7Res, last28Res, planRes, profileRes, workoutTodayRes] =
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
        ]);

      setWeekCount(weekRes.count ?? 0);

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
        <section className="relative overflow-hidden rounded-xl3 border border-white/10 bg-black p-8 shadow-fn-card sm:p-16 lg:p-24">
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
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-transparent to-black/30" />

          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-fn-accent">
              Legend Status Guaranteed
            </p>
            <h1 className="mt-6 font-display text-6xl font-black uppercase italic tracking-tighter text-white sm:text-8xl lg:text-9xl">
              Build<br />your legend
            </h1>
            <p className="mt-8 max-w-2xl text-xl font-medium leading-relaxed text-fn-muted/90 lg:text-2xl">
              AI-backed fitness coaching with adaptive daily plans, streamlined
              logging, and a single dashboard command center.
            </p>

            <div className="mt-12 flex flex-col gap-5 sm:flex-row">
              <Link href="/start">
                <Button className="h-touch-lg px-8 text-sm font-black uppercase tracking-widest">Start Assessment</Button>
              </Link>
              <Link href="/auth">
                <Button variant="secondary" className="h-touch-lg px-8 text-sm font-black uppercase tracking-widest">Member Access</Button>
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                <div className="h-10 w-10 rounded-full border-2 border-black bg-fn-surface-hover/80 shrink-0" />
                <div className="h-10 w-10 rounded-full border-2 border-black bg-fn-muted/50 shrink-0" />
                <div className="h-10 w-10 rounded-full border-2 border-black bg-fn-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-fn-accent">+10k</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-fn-muted leading-tight">Training protocols calibrated from<br /><span className="text-white">50,000+ scientific data points</span></p>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { value: "50K+", label: "Scientific Data Points" },
            { value: "10K+", label: "Legendary Members" },
            { value: "99.2%", label: "Protocol Accuracy" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-fn-surface/40 py-8 px-4 backdrop-blur-sm transition-all hover:bg-fn-surface/60">
              <p className="font-display text-4xl font-black italic tracking-tighter text-white lg:text-5xl">{value}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-fn-accent">{label}</p>
            </div>
          ))}
        </div>

        {/* Feature cards — 2 col on mobile, 4 col on desktop */}
        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              src: "/images/refined/athletic_female_gym_2.png",
              alt: "AI Chat Interface",
              label: "Command Surface",
              title: "Dashboard AI",
              desc: "Log meals, workouts, and progress via natural language — AI syncs the rest of your app.",
              accent: "border-fn-accent/30",
            },
            {
              src: "/images/refined/scanner.png",
              alt: "Nutrition Scanner",
              label: "Metabolic Autopilot",
              title: "Fast meal capture",
              desc: "Log by description or photo, track hydration, and stay aligned to your calorie targets.",
              accent: "border-fn-accent/30",
            },
            {
              src: "/images/refined/motion.png",
              alt: "Motion Analysis",
              label: "Motion Lab",
              title: "Real-time form AI",
              desc: "Camera-powered motion analysis gives instant feedback on your technique during sets.",
              accent: "border-fn-accent/30",
            },
            {
              src: "/images/refined/athletic_female_lifting.png",
              alt: "Pro Coaching",
              label: "Adaptive Logic",
              title: "Expert guidance",
              desc: "Adaptive plans that evolve with your performance — built from 50k+ scientific data points.",
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

        {/* Coach profiles strip */}
        <section className="mt-8 overflow-hidden rounded-xl3 border border-white/10 bg-black">
          <div className="flex flex-col md:flex-row">
            <div className="relative h-72 w-full md:h-auto md:w-1/2 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/refined/athletic_female_physique.png"
                alt="Athlete training"
                className="w-full h-full object-cover object-center grayscale opacity-60 transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black md:block hidden" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent md:hidden" />
            </div>
            <div className="flex flex-col justify-center p-10 md:p-20">
              <p className="text-[11px] font-black uppercase tracking-[0.5em] text-fn-accent">Adaptive Intelligence</p>
              <h2 className="mt-6 font-display text-4xl font-black uppercase italic tracking-tighter text-white sm:text-6xl">
                Plans that evolve<br />as you improve
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-fn-muted max-w-xl">
                Every rep, every meal, every check-in feeds your AI model. FitNova doesn&apos;t give you a generic program — it builds one that adapts in real-time to your recovery, performance, and lifestyle.
              </p>
              <div className="mt-10 flex gap-4">
                <Link href="/start">
                  <Button className="h-touch-lg px-8 text-sm font-black uppercase tracking-widest">Start Free Assessment</Button>
                </Link>
              </div>
            </div>
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
          { label: "Readiness", value: readiness.overall_score != null ? `${Math.round(readiness.overall_score * 100)}%` : "...", icon: "⚡", href: "/vitals" },
          { label: "Streak", value: `${streak} Days`, icon: "🔥", href: "/progress" },
          { label: "Volume", value: `${weekCount} Szn`, icon: "📊", href: "/history" },
          { label: "Today", value: todayPlan?.calories ? `${todayPlan.calories} kcal` : "No Protocol", icon: "🧬", href: "/log/nutrition" },
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

      {/* Main Command Workspace */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Signal Stream - Activity Log Feed (Fixed Sidebar) */}
        <aside className="hidden w-72 flex-col gap-4 overflow-y-auto lg:flex pr-2 custom-scrollbar">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-muted/50 border-b border-white/5 pb-2">Active Signal Feed</p>
          <div className="space-y-3">
            {/* Today's Protocol Focus */}
            <div className="rounded-xl bg-fn-accent/5 border border-fn-accent/20 p-4">
              <p className="text-[9px] font-black uppercase text-fn-accent mb-1">Target Protocol</p>
              <p className="font-display text-lg font-black italic text-white leading-tight">{todayPlan?.focus ?? "Analyzing Schedule..."}</p>
              {todayPlan && (
                <Link href="/log/workout/guided">
                  <button className="mt-3 text-[10px] font-black uppercase text-fn-accent hover:underline">Execute Now →</button>
                </Link>
              )}
            </div>

            {/* Recent Nudge / Insight */}
            {nudges.slice(0, 1).map(n => (
              <div key={n.nudge_id} className="rounded-xl bg-fn-surface/30 border border-white/5 p-4 italic text-sm text-fn-muted">
                "{n.message}"
              </div>
            ))}

            {/* Briefing Box */}
            <div className="rounded-xl bg-fn-surface/30 border border-white/5 p-4">
              <p className="text-[10px] font-black uppercase text-white/40 mb-2">Morning Brief</p>
              <p className="text-xs leading-relaxed text-fn-muted line-clamp-4 font-medium italic">
                {briefingLoading ? "Polling Nova..." : briefing ? `"${briefing}"` : "Executing standard startup sequence."}
              </p>
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
