"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, Button, LoadingState, EmptyState } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

const HERO_IMAGES = [
  "/images/refined/hero.png",
  "https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=1600",
];

type HelpTab = "adaptive" | "nutrition" | "coaching";

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return toLocalDateString(monday);
}

const rotatingGoals = ["weight loss", "muscle", "mobility"];

export default function HomePage() {
  const [goalIndex, setGoalIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [helpTab, setHelpTab] = useState<HelpTab>("adaptive");
  const [authState, setAuthState] = useState<"loading" | "signed_in" | "signed_out">("loading");
  const [weekCount, setWeekCount] = useState<number>(0);
  const [last7Days, setLast7Days] = useState<number[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [todayPlan, setTodayPlan] = useState<{ focus: string; calories: number } | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<string | null>(null);
  const [weeklyInsightLoading, setWeeklyInsightLoading] = useState(false);
  const [reminders, setReminders] = useState<{ daily_plan?: boolean; workout_log?: boolean; weigh_in?: string }>({});
  const [hasPlanToday, setHasPlanToday] = useState(false);
  const [hasWorkoutToday, setHasWorkoutToday] = useState(false);
  const [lastWeighInDate, setLastWeighInDate] = useState<string | null>(null);
  const [readinessInsight, setReadinessInsight] = useState<string | null>(null);
  const [readinessInsightLoading, setReadinessInsightLoading] = useState(false);
  const [lastWorkoutDate, setLastWorkoutDate] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [projection, setProjection] = useState<{ current: number; projected_4w: number; projected_12w: number; confidence: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setGoalIndex((idx) => (idx + 1) % rotatingGoals.length);
      setHeroIndex((idx) => (idx + 1) % HERO_IMAGES.length);
    }, 4000); // Slower rotation for hero
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setAuthState("signed_out");
      return;
    }

    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          setAuthState("signed_out");
          return;
        }

        setAuthState("signed_in");

        const today = toLocalDateString();
        const weekStart = getWeekStart(new Date());

        const [weekRes, last7Res, onboardingRes, planRes, profileRes, workoutTodayRes, progressRes] = await Promise.all([
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
            .gte("date", toLocalDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
            .lte("date", today)
            .order("date", { ascending: true }),
          supabase
            .from("onboarding")
            .select("completed_at")
            .eq("user_id", user.id)
            .not("completed_at", "is", null)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("daily_plans")
            .select("plan_json")
            .eq("user_id", user.id)
            .eq("date_local", today)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("user_profile").select("devices, subscription_status").eq("user_id", user.id).maybeSingle(),
          supabase
            .from("workout_logs")
            .select("date")
            .eq("user_id", user.id)
            .eq("date", today)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("progress_tracking")
            .select("date")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        setWeekCount(weekRes.count ?? 0);
        const byDate: Record<string, number> = {};
        (last7Res.data ?? []).forEach((row: { date: string }) => {
          byDate[row.date] = (byDate[row.date] ?? 0) + 1;
        });
        const days: number[] = [];
        for (let i = 6; i >= 0; i -= 1) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = toLocalDateString(d);
          days.push(byDate[key] ?? 0);
        }
        setLast7Days(days);
        setOnboardingComplete(!!onboardingRes.data);

        const plan = planRes.data?.plan_json as
          | { training_plan?: { focus?: string }; nutrition_plan?: { calorie_target?: number } }
          | undefined;
        setHasPlanToday(!!plan?.training_plan?.focus);
        if (plan?.training_plan?.focus) {
          setTodayPlan({
            focus: plan.training_plan.focus,
            calories: plan.nutrition_plan?.calorie_target ?? 0,
          });
        }

        const profileData = profileRes.data as { devices?: Record<string, unknown>, subscription_status?: string } | null;
        const dev = profileData?.devices ?? {};
        setIsPro(profileData?.subscription_status === 'pro');

        setReminders((dev.reminders as { daily_plan?: boolean; workout_log?: boolean; weigh_in?: string }) ?? {});
        setHasWorkoutToday(!!(workoutTodayRes.data as { date: string }[] | null)?.length);
        const lastProgress = progressRes.data as { date: string }[] | null;
        setLastWeighInDate(lastProgress?.[0]?.date ?? null);
        const last7Data = last7Res.data as { date: string }[] | null;
        const mostRecent = last7Data?.length ? last7Data[last7Data.length - 1]?.date : null;
        setLastWorkoutDate(mostRecent ?? null);
      })
      .catch(() => setAuthState("signed_out"));
  }, []);

  useEffect(() => {
    if (authState !== "signed_in") return;
    setReadinessInsightLoading(true);
    fetch("/api/v1/ai/readiness-insight", { method: "POST" })
      .then((r) => r.json())
      .then((body: { insight?: string | null }) => {
        if (body.insight && typeof body.insight === "string") setReadinessInsight(body.insight);
      })
      .catch(() => { })
      .finally(() => setReadinessInsightLoading(false));
  }, [authState]);

  useEffect(() => {
    if (authState !== "signed_in") return;
    setWeeklyInsightLoading(true);
    fetch("/api/v1/ai/weekly-insight", { method: "POST" })
      .then((r) => r.json())
      .then((body: { insight?: string | null }) => {
        if (body.insight && typeof body.insight === "string") setWeeklyInsight(body.insight);
      })
      .catch(() => { })
      .finally(() => setWeeklyInsightLoading(false));
  }, [authState]);
  useEffect(() => {
    if (authState !== "signed_in") return;
    fetch("/api/v1/ai/projection")
      .then((r) => r.json())
      .then((body) => {
        if (body.current) setProjection(body);
      })
      .catch(() => { });
  }, [authState]);
  useEffect(() => {
    if (authState !== "signed_in") return;
    setBriefingLoading(true);
    fetch("/api/v1/ai/briefing", { method: "POST" })
      .then((r) => r.json())
      .then((body: { briefing?: string | null }) => {
        if (body.briefing && typeof body.briefing === "string") setBriefing(body.briefing);
      })
      .catch(() => { })
      .finally(() => setBriefingLoading(false));
  }, [authState]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = last7Days.length - 1; i >= 0 && last7Days[i] > 0; i -= 1) count += 1;
    return count;
  }, [last7Days]);

  const today = toLocalDateString();
  const daysSinceLastWorkout = useMemo(() => {
    if (!lastWorkoutDate) return null;
    return Math.floor(
      (new Date(today).setHours(0, 0, 0, 0) - new Date(lastWorkoutDate).setHours(0, 0, 0, 0)) /
      (24 * 60 * 60 * 1000)
    );
  }, [lastWorkoutDate, today]);
  const recoverySuggestion =
    daysSinceLastWorkout === 0
      ? "You already trained today. Rest or light mobility."
      : daysSinceLastWorkout === 1
        ? "Consider rest or light movement—you trained yesterday."
        : null;

  const tabContent = useMemo(() => {
    if (helpTab === "adaptive") {
      return {
        title: "Adaptive workouts",
        body: "FitNova recalibrates volume, exercise selection, and session duration when your schedule or recovery changes.",
      };
    }
    if (helpTab === "nutrition") {
      return {
        title: "Nutrition intelligence",
        body: "Calorie and macro targets adjust around your trend, adherence, and training demands so progress is sustainable.",
      };
    }
    return {
      title: "In-workout AI coaching",
      body: "Get real-time set cues, rest pacing, and simplified alternatives when equipment or energy is limited.",
    };
  }, [helpTab]);

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/v1/stripe/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Checkout failed", e);
    }
  };

  if (authState === "loading") {
    return (
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6">
        <LoadingState message="Preparing your experience..." />
      </div>
    );
  }

  if (authState === "signed_out") {
    return (
      <div className="w-full">
        {/* Hero Section */}
        <section className="relative min-h-screen w-full flex flex-col justify-end overflow-hidden">
          <Image
            src={HERO_IMAGES[heroIndex]}
            alt="Elite training"
            fill
            className="object-cover transition-opacity duration-1000"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

          <div className="relative mx-auto w-full max-w-shell px-6 pb-20 pt-40 sm:px-10">
            <div className="max-w-4xl">
              <p className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-white/90 backdrop-blur-md ring-1 ring-white/20">
                FitNova Pro Experience
              </p>
              <h1 className="mt-8 font-display text-5xl font-black leading-[1.1] text-white sm:text-7xl md:text-8xl lg:text-9xl tracking-tighter uppercase italic">
                Build your <span className="text-fn-accent">legend</span>
              </h1>
              <p className="mt-8 max-w-xl text-xl font-medium text-white/70 sm:text-2xl">
                The most advanced AI coaching engine ever built. Personalized training, metabolic autopilot, and 24/7 accountability.
              </p>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                <Link href="/start">
                  <Button className="w-full sm:w-auto">Start Assessment</Button>
                </Link>
                <Link href="/auth">
                  <Button variant="secondary" className="w-full sm:w-auto">Member Access</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition Grid */}
        <section className="mx-auto max-w-shell px-4 py-24 sm:px-6">
          <div className="mb-16 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-4 shrink-0">Premium Experience Parity</p>
            <h2 className="font-display text-4xl sm:text-6xl font-black text-white italic uppercase tracking-tighter leading-[1.1]">
              The $200/mo Coaching Experience.<br />
              <span className="text-fn-accent">For $9.99/mo.</span>
            </h2>
            <p className="mt-6 text-xl text-fn-muted max-w-2xl mx-auto font-medium leading-relaxed">
              We stripped out the human overhead and automated the exact methodologies used by elite personal trainers, creating a hyper-advanced suite of tools.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Omni-Logging */}
            <Card padding="lg" className="border-white/5 bg-white/[0.02] flex flex-col justify-between group hover:border-fn-accent/30 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-40 opacity-20 group-hover:opacity-40 transition-opacity">
                <Image src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg" alt="omni-log" fill className="object-cover grayscale" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-fn-accent/10 flex items-center justify-center mb-6 border border-fn-accent/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Omni-Logging AI Chatbot</h3>
                <p className="mt-3 text-fn-muted leading-relaxed text-sm">
                  Zero-Friction Logging. Just text your coach what you ate or what you lifted, and it autonomously parses the data and updates your charts.
                </p>
              </div>
            </Card>

            {/* SMS Accountability */}
            <Card padding="lg" className="border-white/5 bg-white/[0.02] flex flex-col justify-between group hover:border-fn-accent/30 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-40 opacity-20 group-hover:opacity-60 transition-opacity">
                <Image src="/images/refined/sms.png" alt="sms" fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700" title="Refined SMS View" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-fn-accent/10 flex items-center justify-center mb-6 border border-fn-accent/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Smart SMS Accountability</h3>
                <p className="mt-3 text-fn-muted leading-relaxed text-sm">
                  Your Coach in Your Pocket. Proactive daily text messages checking in on your sleep, soreness, and adherence to ensure you never miss a beat.
                </p>
              </div>
            </Card>

            {/* Cinematic Workouts */}
            <Card padding="lg" className="border-white/5 bg-white/[0.02] flex flex-col justify-between group hover:border-fn-accent/30 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-40 opacity-20 group-hover:opacity-40 transition-opacity">
                <Image src="https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg" alt="cinematic" fill className="object-cover grayscale" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-fn-accent/10 flex items-center justify-center mb-6 border border-fn-accent/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Cinematic Guided Workouts</h3>
                <p className="mt-3 text-fn-muted leading-relaxed text-sm">
                  Premium AV Experience. Ditch the generic stick-figures. Train alongside 4K, dark-aesthetic cinematic loops designed to push your limits.
                </p>
              </div>
            </Card>

            {/* Body Comp Scanner */}
            <Card padding="lg" className="border-white/5 bg-white/[0.02] flex flex-col justify-between group hover:border-fn-accent/30 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-40 opacity-25 group-hover:opacity-70 transition-opacity">
                <Image src="/images/refined/scanner.png" alt="body scanner" fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700" title="Refined Scanner View" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-fn-accent/10 flex items-center justify-center mb-6 border border-fn-accent/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">AI Body Comp Scanner</h3>
                <p className="mt-3 text-fn-muted leading-relaxed text-sm">
                  DEXA-Grade Insights. Snap a photo and let our vision AI instantly estimate your body fat composition to feed accurate data directly to your coach.
                </p>
              </div>
            </Card>

            {/* Real-time Audio */}
            <Card padding="lg" className="border-white/5 bg-white/[0.02] flex flex-col justify-between group hover:border-fn-accent/30 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-40 opacity-20 group-hover:opacity-40 transition-opacity">
                <Image src="https://images.pexels.com/photos/1103242/pexels-photo-1103242.jpeg" alt="audio" fill className="object-cover grayscale" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-fn-accent/10 flex items-center justify-center mb-6 border border-fn-accent/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Real-Time Audio Coach</h3>
                <p className="mt-3 text-fn-muted leading-relaxed text-sm">
                  Voice-Activated Cues. Put your phone away. The system&apos;s neural voice actively guides your pacing, reps, and precise rest times during your session.
                </p>
              </div>
            </Card>

            {/* Motion Lab */}
            <Card padding="lg" className="border-white/5 bg-white/[0.02] flex flex-col justify-between group hover:border-fn-accent/30 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-40 opacity-20 group-hover:opacity-60 transition-opacity">
                <Image src="/images/refined/motion.png" alt="motion lab" fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700" title="Refined Motion View" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-fn-accent/10 flex items-center justify-center mb-6 border border-fn-accent/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Motion Lab: Vision AI</h3>
                <p className="mt-3 text-fn-muted leading-relaxed text-sm">
                  Biological Pathing. Our Vision Lab analyzes your movement frame-by-frame to identify velocity leaks and ensure clinical mechanical efficiency.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mx-auto max-w-shell px-4 py-32 sm:px-6">
          <div className="rounded-xl3 border border-white/5 bg-gradient-to-br from-white/5 to-transparent p-12 text-center backdrop-blur-3xl">
            <h2 className="font-display text-4xl font-black text-white sm:text-6xl tracking-tighter uppercase italic leading-tight">
              Ready to redefine <br /> <span className="text-fn-accent">human potential?</span>
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-xl text-fn-muted">
              Join the elite tier of digital-first coaching. No guesswork, just science and execution.
            </p>
            <div className="mt-12">
              <Link href="/start">
                <Button>Get Started Now</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-12 sm:px-8">
      <header className="mb-12 relative overflow-hidden rounded-xl3 border border-white/5 bg-gradient-to-br from-fn-accent/10 to-transparent p-10 backdrop-blur-3xl shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <svg className="w-24 h-24 text-fn-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-4">Command Center</p>
        <h1 className="font-display text-5xl font-black text-white tracking-tighter uppercase italic leading-none">FitNova Pro</h1>
        <p className="mt-6 text-xl text-fn-muted max-w-xl font-medium">Elite-tier adaptive training and metabolic intelligence.</p>

        {briefing && (
          <div className="mt-8 flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="shrink-0 h-10 w-10 rounded-full border border-fn-accent/30 overflow-hidden bg-black/40 flex items-center justify-center">
              <span className="text-xs font-black text-fn-accent uppercase tracking-tighter">AI</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent mb-2">Lead Coach Briefing</p>
              <p className="text-lg font-medium text-white/90 leading-relaxed italic">&quot;{briefing}&quot;</p>
            </div>
          </div>
        )}

        {!isPro && (
          <div className="mt-8 flex items-center justify-between p-6 rounded-2xl bg-fn-accent/10 border border-fn-accent/20 backdrop-blur-3xl">
            <div>
              <p className="text-sm font-black text-fn-accent uppercase tracking-tighter mb-1">Upgrade Required</p>
              <p className="text-white/80 font-medium">Unlock full metabolic intelligence and unlimited coaching.</p>
            </div>
            <Button onClick={handleUpgrade} size="sm">Upgrade to Pro</Button>
          </div>
        )}
      </header>

      {/* Primary Actions Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2 border-white/10 bg-white/[0.03] flex flex-col justify-between">
          <div>
            <CardHeader title="Current Focus" subtitle="Today's optimized training target" />
            <p className="mt-8 text-4xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight">
              {todayPlan?.focus ?? "Initialize Daily Plan"}
            </p>
            <p className="mt-4 text-lg text-fn-muted font-medium">
              {todayPlan ? `Targeting ${todayPlan.calories} calories with progressive load adjustments.` : "Ready for your next evolution? Open Coach to generate your targets."}
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/coach"><Button className="w-full sm:w-auto">Enter Coach Room</Button></Link>
            <Link href="/log/workout"><Button variant="secondary" className="w-full sm:w-auto">Manual Log</Button></Link>
          </div>
        </Card>

        <Card padding="lg" className="border-fn-accent/20 bg-fn-accent/5">
          <CardHeader title="Elite Performance" subtitle="Weekly consistency & trend" />
          <div className="mt-8 space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-1">Sessions</p>
                <p className="text-5xl font-black text-white italic">{weekCount}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-1">Streak</p>
                <p className="text-5xl font-black text-fn-accent italic">{streak}</p>
              </div>
            </div>

            <div className="h-4 w-full overflow-hidden rounded-full bg-white/5 p-1">
              <div className="h-full rounded-full bg-fn-accent shadow-[0_0_15px_rgba(10,217,196,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, weekCount * 25)}%` }} />
            </div>

            {weeklyInsight && (
              <div className="relative p-6 rounded-2xl bg-white/5 border border-white/5 italic text-fn-muted text-sm leading-relaxed">
                <span className="absolute -top-3 left-4 bg-fn-bg px-2 text-[10px] font-black uppercase tracking-widest text-fn-accent">Coach Insight</span>
                &quot;{weeklyInsight}&quot;
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Signal Feed */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-white/5 bg-white/[0.01]">
          <CardHeader title="Biological Signal" subtitle="7-day training volume trend" />
          <div className="mt-8 flex h-40 items-end gap-3 px-2">
            {last7Days.map((value, idx) => (
              <div
                key={idx}
                className="group relative flex-1"
              >
                <div
                  className="rounded-t-lg bg-white/10 group-hover:bg-white/30 transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                  style={{ height: `${Math.max(10, (value / Math.max(...last7Days, 1)) * 100)}%` }}
                />
                <div className="absolute -bottom-6 left-0 right-0 text-center text-[8px] font-black text-fn-muted uppercase opacity-40">D{7 - idx}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-white/5 bg-white/[0.01]">
          <CardHeader title="Readiness" subtitle="Recovery & adaptive baseline" />
          <div className="mt-6 space-y-6">
            {recoverySuggestion && (
              <p className="text-lg font-bold text-fn-accent uppercase italic leading-tight">{recoverySuggestion}</p>
            )}
            {readinessInsight && (
              <p className="text-fn-muted text-sm leading-relaxed italic border-l-2 border-fn-accent pl-4">{readinessInsight}</p>
            )}
            <Link href="/check-in">
              <Button size="sm" variant="secondary" className="w-full">Update Bio-Data</Button>
            </Link>
          </div>
        </Card>

        {projection && (
          <Card className="lg:col-span-3 border-fn-accent/10 bg-gradient-to-br from-fn-accent/[0.03] to-transparent">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8">
              <div className="flex-1 space-y-4 text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">Performance Projection Engine</p>
                <h3 className="font-display text-4xl font-black text-white italic tracking-tighter uppercase">Signal Trajectory</h3>
                <p className="text-fn-muted text-sm max-w-md leading-relaxed">
                  Based on your current adherence velocity, the system projects your metabolic baseline to shift towards <span className="text-white font-bold">{projection.projected_12w}kg</span> over the next 12 weeks.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8 md:gap-12 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-2">4-Week Target</p>
                  <p className="text-4xl font-black text-white italic">{projection.projected_4w}kg</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-2">Confidence</p>
                  <p className="text-4xl font-black text-fn-accent italic">{Math.round(projection.confidence * 100)}%</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Feed & Shortcuts */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-white/5 bg-white/[0.01]">
          <CardHeader title="Intelligence Feed" subtitle="3 critical alerts detected" />
          <ul className="mt-4 space-y-4">
            <li className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="h-2 w-2 rounded-full bg-fn-accent mt-2" />
              <p className="text-sm font-medium text-fn-muted leading-relaxed">System detects protein deficiency for 48h. Adjusting tomorrow&apos;s targets.</p>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 opacity-60">
              <div className="h-2 w-2 rounded-full bg-white mt-2" />
              <p className="text-sm font-medium text-fn-muted leading-relaxed">Volume spike on Wednesday. Recommended active recovery session.</p>
            </li>
          </ul>
        </Card>

        <Card className="border-white/5 bg-white/[0.01]">
          <CardHeader title="Hyper-Speed Actions" subtitle="Direct routing" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/log/workout"><Button size="sm" variant="ghost" className="w-full justify-start border border-white/5 bg-white/5">Log Training</Button></Link>
            <Link href="/log/nutrition"><Button size="sm" variant="ghost" className="w-full justify-start border border-white/5 bg-white/5">Log Fuel</Button></Link>
            <Link href="/motion"><Button size="sm" variant="ghost" className="w-full justify-start border border-white/5 bg-white/5 group-hover:border-fn-accent/50 transition-colors">AI Motion Lab</Button></Link>
            <Link href="/progress"><Button size="sm" variant="ghost" className="w-full justify-start border border-white/5 bg-white/5">Signal Analytics</Button></Link>
            <Link href="/onboarding"><Button size="sm" variant="ghost" className="w-full justify-start border border-fn-accent/30 bg-fn-accent/5">Onboarding</Button></Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
