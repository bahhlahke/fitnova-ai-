"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import { emitDataRefresh, useDataRefresh } from "@/lib/ui/data-sync";
import { DEFAULT_UNIT_SYSTEM, type UnitSystem, readUnitSystemFromProfile } from "@/lib/units";
import { toPlainFitnessLanguage, toTitleCaseLabel } from "@/lib/ui/plain-language";
import { Card, Button, LoadingState } from "@/components/ui";
import { AiCoachPanel } from "@/components/ai/AiCoachPanel";
import { CoachInsightDetail } from "@/components/dashboard/CoachInsightDetail";
import { ShieldAlert, BarChart3 } from "lucide-react";
import { SpotifyMiniPlayer } from "@/components/music/SpotifyMiniPlayer";
import { SpotifyProvider } from "@/lib/music/SpotifyProvider";
import {
  type DashboardTodayPlan,
} from "@/components/dashboard/DashboardPlanSection";
import {
  type DashboardProjection,
} from "@/components/dashboard/DashboardProgressSection";
import { calculateReadiness, type MuscleReadiness, RECOVERY_WINDOW_DAYS, getRecoverySuggestion as getSharedRecoverySuggestion } from "@/lib/workout/recovery";
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
  const [recoverySuggestion, setRecoverySuggestion] = useState<string | null>(null);
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
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null);

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
            .gte("date", toLocalDateString(new Date(new Date().setDate(new Date().getDate() - RECOVERY_WINDOW_DAYS))))
            .lte("date", today)
            .order("date", { ascending: false }),
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
        const calculated = calculateReadiness(last28Res.data);
        setReadiness(calculated);
        setLastWorkoutDate(last28Res.data.length ? last28Res.data[0].date : null);
        setRecoverySuggestion(getSharedRecoverySuggestion(last28Res.data));
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

  // recoverySuggestion is now a state updated during load

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
              iOS Coaching Platform
            </p>
            <h1 className="mt-6 font-display text-6xl font-black uppercase italic tracking-tighter text-white sm:text-8xl lg:text-9xl leading-[0.85]">
              Build Your<br />Legend
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-medium leading-relaxed text-fn-muted/90 lg:text-2xl">
              Your AI coach now lives in your pocket. Koda for iPhone delivers adaptive daily plans,
              wearable-powered readiness, and instant nutrition + workout logging wherever you train.
            </p>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <Link href="/start" aria-label="Set Up My iPhone Coach">
                <Button className="h-touch-lg px-8 text-xs font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-white/90">Set Up My iPhone Coach</Button>
              </Link>
              <Link href="/auth" aria-label="Member Access">
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
            { value: "24/7", label: "iPhone + Apple Watch Coaching" },
            { value: "4 sec", label: "Average AI Coach Response" },
            { value: "99.2%", label: "Daily Plan Personalization Accuracy" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-fn-surface/40 py-8 px-4 backdrop-blur-sm transition-all hover:bg-fn-surface/60">
              <p className="font-display text-4xl font-black italic tracking-tighter text-white lg:text-5xl">{value}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-fn-accent text-center">{label}</p>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-r from-fn-accent/20 via-fn-surface/40 to-fn-surface/30 p-6 sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">Why iOS Athletes Pick Koda</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Realtime AI Check-Ins",
                desc: "Speak or type one update and Koda updates training load, macros, and recovery focus instantly.",
              },
              {
                title: "Adaptive Daily Protocol",
                desc: "Each day plan reflects sleep, soreness, cycle phase, and workout history before you start training.",
              },
              {
                title: "Progress You Can See",
                desc: "Track PRs, body trends, and adherence in one iPhone dashboard designed for fast decisions.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fn-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

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

        {/* Feature FAQ Section */}
        <section className="mt-16 py-10 border-t border-white/10">
          <h2 className="text-center font-display text-4xl font-black uppercase italic tracking-tighter text-white">Feature FAQ</h2>
          <p className="mt-4 text-center text-fn-muted max-w-3xl mx-auto">
            Everything the Koda app offers across iPhone and web, from planning to coaching to progress tracking.
          </p>
          <div className="mt-12 max-w-4xl mx-auto space-y-8">
            {[
              {
                q: "What does Koda do each day?",
                a: "Koda builds an adaptive daily plan that combines training focus, nutrition targets, and recovery priorities from your recent activity.",
              },
              {
                q: "Can I chat with an AI coach in the app?",
                a: "Yes. The coach can answer questions, adjust sessions, and explain why your day is structured a certain way.",
              },
              {
                q: "How do workout and nutrition logs work?",
                a: "You can log meals, workouts, and check-ins quickly inside the app, and Koda uses those logs to tune your next recommendations.",
              },
              {
                q: "Does Koda track progress and analytics?",
                a: "Yes. You get trend views for adherence, performance, and milestones so you can see what is working over time.",
              },
              {
                q: "What is the daily check-in feature for?",
                a: "Check-ins capture energy, sleep, soreness, and consistency so Koda can adapt intensity and recovery guidance before training.",
              },
              {
                q: "Can I connect wearables like Apple Watch?",
                a: "Yes. Koda supports wearable-informed coaching signals (including Apple Watch metrics) to improve readiness and plan quality.",
              },
              {
                q: "Is my data secure and private?",
                a: "Data is encrypted in transit and at rest with row-level access controls, and we do not sell personal health data.",
              },
              {
                q: "What makes Pro different?",
                a: "Pro includes higher-fidelity forecasting, deeper AI insights, and faster priority model access for advanced users.",
              },
            ].map((item) => (
              <div key={item.q} className="group border-b border-white/5 pb-6">
                <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-3">{item.q}</h3>
                <p className="text-fn-muted leading-relaxed">{item.a}</p>
              </div>
            ))}
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
      href: "/check-in", label: "Check In", color: "from-amber-500/20 to-orange-500/5 border-amber-500/20", iconColor: "text-amber-300", icon: (
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

  const readyForTodayPercent = (() => {
    if (checkIn?.energy_score != null) {
      const energy = (checkIn.energy_score / 5.0) * 0.7;
      const adherence = ((checkIn.adherence_score ?? checkIn.energy_score) / 5.0) * 0.3;
      return Math.round(Math.min(1.0, Math.max(0.0, energy + adherence)) * 100);
    }
    if (readiness.overall_score != null) {
      return Math.round(readiness.overall_score * 100);
    }
    return null;
  })();

  const readyForTodayGuide =
    readyForTodayPercent == null
      ? "Score guide: 85-100% push, 70-84% moderate, below 70% recovery. Add a quick check-in to personalize."
      : `Score guide: 85-100% push, 70-84% moderate, below 70% recovery. Today: ${readyForTodayPercent}% ${readyForTodayPercent >= 85 ? "(push)" : readyForTodayPercent >= 70 ? "(moderate)" : "(recovery)"}.`;

  const readinessBand =
    readyForTodayPercent == null
      ? "Needs check-in"
      : readyForTodayPercent >= 85
        ? "Push day"
        : readyForTodayPercent >= 70
          ? "Moderate day"
          : "Recovery day";

  const retentionRiskLabel =
    typeof retentionRisk?.risk_score === "number"
      ? `${Math.round(retentionRisk.risk_score * 100)}% risk`
      : "Risk syncing";

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-8 md:min-h-[calc(100vh-40px)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_15%_0%,rgba(10,217,196,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.08),transparent_45%)]" />

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-7">
        <div className="absolute -right-16 -top-14 h-48 w-48 rounded-full bg-fn-accent/15 blur-3xl" />
        <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">Koda premium coach</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-black italic tracking-tight text-white sm:text-5xl">
              Your personal trainer brief for today.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              {hasPlanToday
                ? "Your guided session, meal targets, and AI coaching are synced. Start the workout and keep execution tight."
                : "No plan is loaded yet. Generate today’s session and Koda will set exercise flow, coaching cues, and logging targets."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
                Readiness: {readyForTodayPercent != null ? `${readyForTodayPercent}%` : "--"}
              </span>
              <span className="rounded-full border border-fn-accent/30 bg-fn-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-fn-accent">
                {readinessBand}
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {hasWorkoutToday ? "Workout logged today" : "No workout logged yet"}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {hasPlanToday ? (
                <>
                  <Link href="/log/workout/guided">
                    <Button size="sm">Start Guided Workout</Button>
                  </Link>
                  <Link href="/plan#adjust-workout">
                    <Button size="sm" variant="secondary">Adjust Workout</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button size="sm" loading={planLoading || generating} onClick={() => void handleGeneratePlan()}>
                    Generate Today&apos;s Plan
                  </Button>
                  <Link href="/check-in">
                    <Button size="sm" variant="secondary">Quick Check-In</Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.12] bg-black/[0.35] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-fn-accent">Execution plan</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60">
                {retentionRiskLabel}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-fn-muted">{readyForTodayGuide}</p>
            <div className="mt-4 space-y-2.5">
              {[
                "Review readiness and pain level.",
                hasPlanToday ? "Start guided workout with video cues." : "Generate plan and verify today’s focus.",
                "Log at least one set and one meal before noon.",
              ].map((step, idx) => (
                <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-fn-accent/20 text-[10px] font-bold text-fn-accent">
                    {idx + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-white/80">{step}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/65">
              Next best step:{" "}
              <span className="text-white">
                {hasPlanToday
                  ? "Open guided mode and complete the first movement."
                  : "Generate your plan so Koda can lock today’s workout and nutrition targets."}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Ready for Today", value: readyForTodayPercent != null ? `${readyForTodayPercent}%` : "Pending", icon: "RT", href: "/vitals", hint: readinessBand },
          { label: "Current Streak", value: `${streak} days`, icon: "ST", href: "/progress" },
          { label: "Workouts This Week", value: `${weekCount}`, icon: "WK", href: "/history" },
          { label: "Food Target Today", value: todayPlan?.calories ? `${todayPlan.calories} kcal` : "Build plan", icon: "KC", href: "/log/nutrition" },
        ].map((item) => (
          <Link key={item.label} href={item.href}>
            <div className="group h-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/55">{item.label}</p>
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-fn-accent">{item.icon}</span>
              </div>
              <p className="mt-2 font-display text-2xl font-black italic tracking-tight text-white sm:text-3xl">
                {item.value}
              </p>
              {"hint" in item && <p className="mt-1 text-[10px] leading-relaxed text-fn-muted/75">{item.hint}</p>}
            </div>
          </Link>
        ))}
      </section>

      <section className="grid shrink-0 gap-3 md:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`group rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 ${action.color}`}
          >
            <div className={`inline-flex rounded-xl border border-white/10 bg-black/25 p-2 ${action.iconColor}`}>
              {action.icon}
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{action.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/65">
              {action.label === "Ask Coach"
                ? "Get a tactical answer and a direct next step."
                : action.label === "Log Workout"
                  ? "Record completed sets so progression stays accurate."
                  : action.label === "Log Meal"
                    ? "Capture nutrition quickly and update macro targets."
                    : "Update recovery and soreness for better daily adaptation."}
            </p>
          </Link>
        ))}
      </section>

      {/* Main Command Workspace */}
      <div className="flex flex-1 gap-5 overflow-hidden">
        {/* Left Signal Stream - Activity Log Feed (Fixed Sidebar) */}
        <aside className="hidden w-80 flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar md:flex">
          <p className="border-b border-white/10 pb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45">Today&apos;s Coaching Summary</p>
          <div className="space-y-3">
            {/* Today's Protocol Focus */}
            <div className="rounded-2xl border border-fn-accent/30 bg-[linear-gradient(145deg,rgba(10,217,196,0.14),rgba(10,217,196,0.05))] p-4">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-fn-accent">Today&apos;s Focus</p>
              <p className="font-display text-xl font-black italic tracking-tight text-white leading-tight">{todayPlan?.focus ?? "Building today’s plan..."}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-fn-muted">
                {todayPlan
                  ? "This is the main training priority Koda wants you to complete next."
                  : "Step 1 is to generate your plan so Koda can show the recommended workout focus."}
              </p>
              {todayPlan && (
                <Link href="/log/workout/guided">
                  <button className="mt-3 rounded-full border border-fn-accent/30 bg-black/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-fn-accent transition-colors hover:bg-black/45">
                    Start Workout
                  </button>
                </Link>
              )}
            </div>

            {/* Recent Nudge / Insight */}
            {nudges.slice(0, 1).map(n => (
              <div key={n.nudge_id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm italic text-fn-muted">
                &ldquo;{n.message}&rdquo;
              </div>
            ))}

            {/* Elite AI Synthesis Terminal */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[linear-gradient(150deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fn-accent/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-fn-accent/10 transition-all duration-700"></div>

              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fn-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-fn-accent"></span>
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fn-accent">Coach Summary</p>
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

                  <div className="bg-black/30 rounded-xl p-3 border border-white/10 space-y-2">
                    <p className="text-[9px] font-semibold text-white/60 uppercase tracking-[0.2em]">Why Koda Is Suggesting This</p>
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
                <div className="text-xs leading-relaxed text-fn-muted font-mono h-[80px] flex items-center justify-center border border-dashed border-white/20 rounded-xl">
                  Step 1: generate today&apos;s plan. Step 2: complete one action. Step 3: return here for your coach summary.
                </div>
              )}
            {/* Coach's Desk Mastery Insights */}
            {(coachInsights.length > 0 || coachInsightsLoading) && (
              <div className="group/desk relative overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,rgba(10,217,196,0.12),rgba(0,0,0,0.4))] border border-fn-accent/25 p-5 shadow-[0_15px_40px_rgba(10,217,196,0.1)] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(10,217,196,0.2)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-fn-accent/5 rounded-full blur-[60px] -mr-16 -mt-16 animate-pulse-soft"></div>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-fn-accent/20 border border-fn-accent/30">
                    <ShieldAlert size={14} className="text-fn-accent" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-fn-accent">Why This Matters</p>
                </div>

                <div className="space-y-4">
                  {coachInsightsLoading ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-3 w-full bg-fn-accent/10 rounded-full"></div>
                      <div className="h-2 w-2/3 bg-fn-accent/10 rounded-full"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {coachInsights.map((insight: any, idx: number) => (
                        <div
                          key={idx}
                          role="button"
                          className="group relative flex flex-col gap-1.5 p-3 rounded-2xl border border-white/5 bg-white/[0.03] transition-all duration-300 hover:bg-white/[0.08] hover:border-fn-accent/30 hover:translate-x-1 cursor-pointer"
                          onClick={() => setSelectedInsight(insight)}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-black text-white uppercase italic tracking-tight">{simplifyCoachInsightTitle(insight.title)}</p>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <BarChart3 size={12} className="text-fn-accent" />
                            </span>
                          </div>
                          <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2 pr-4">{toPlainFitnessLanguage(insight.message)}</p>
                          
                          {/* Hover indicator */}
                          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1 h-4 bg-fn-accent rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300" />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-[9px] text-white/30 italic text-center mt-2">
                    Click any insight to reveal supporting biometric data.
                  </p>
                </div>
              </div>
            )}
            
            {/* Modal Injection */}
            {selectedInsight && (
              <CoachInsightDetail 
                insight={selectedInsight} 
                onClose={() => setSelectedInsight(null)} 
              />
            )}

            </div>

            {/* Weekly Insight */}
            {(weeklyInsightLoading || weeklyInsight) && (
              <div className="rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 p-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Weekly Insight</p>
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
            <SpotifyProvider>
              <SpotifyMiniPlayer />
            </SpotifyProvider>

            {/* Workout Music */}
            <div className="rounded-2xl border border-fn-accent/25 bg-gradient-to-br from-fn-accent/[0.12] via-black/[0.35] to-black/70 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎵</span>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-fn-accent">Workout Music</p>
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
            <div className="group rounded-2xl border border-white/10 bg-black/[0.35] p-4 transition-all hover:bg-black/55">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-fn-accent">Connected Tools</p>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fn-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fn-accent"></span>
                </span>
              </div>
              <div className="space-y-2">
                <Link href="/integrations" className="block p-2 rounded-lg bg-white/5 hover:bg-fn-accent/10 border border-white/10 hover:border-fn-accent/30 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⌚</span>
                    <span className="text-[10px] font-semibold text-white uppercase tracking-[0.16em]">Wearables</span>
                  </div>
                </Link>
                <Link href="/log/nutrition/fridge" className="block p-2 rounded-lg bg-white/5 hover:bg-fn-accent/10 border border-white/10 hover:border-fn-accent/30 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📸</span>
                    <span className="text-[10px] font-semibold text-white uppercase tracking-[0.16em]">Photo Food Scan</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Centerpiece Agent Interface */}
        <main className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
          <div className="relative flex-1 overflow-hidden">
            <AiCoachPanel
              mode="embedded"
              autoFocus={focusAi}
              className="h-full border-0 bg-transparent p-4 shadow-none backdrop-blur-none sm:p-5"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
