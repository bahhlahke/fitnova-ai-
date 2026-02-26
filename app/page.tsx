"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, LoadingState } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

/* ── Images ─────────────────────────────────────────────────────── */
const HERO_IMAGE  = "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=85";
const HERO_IMAGE2 = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=85";
const NUTRITION_IMG = "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80";
const COACH_IMG   = "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&q=80";

/* ── Helpers ─────────────────────────────────────────────────────── */
function getWeekStart(d: Date): string {
  const day  = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon  = new Date(d);
  mon.setDate(diff);
  return toLocalDateString(mon);
}

const GOALS = ["weight loss", "muscle", "mobility", "endurance", "longevity"];

/* ── Day labels ──────────────────────────────────────────────────── */
const DAY_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

/* ─────────────────────────────────────────────────────────────────
   MARKETING LANDING (signed-out)
───────────────────────────────────────────────────────────────── */
function LandingPage() {
  const [goalIdx, setGoalIdx] = useState(0);
  const [imgIdx,  setImgIdx]  = useState(0);

  useEffect(() => {
    const t = setInterval(() => setGoalIdx((i) => (i + 1) % GOALS.length), 2600);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setImgIdx((i) => (i + 1) % 2), 5000);
    return () => clearInterval(t);
  }, []);

  const proofPoints = [
    { value: "12k+", label: "Plans generated" },
    { value: "94%",  label: "Goal adherence" },
    { value: "4.9★", label: "Avg coach rating" },
    { value: "38",   label: "Avg days to first result" },
  ];

  const features = [
    {
      icon: "⚡",
      title: "Adaptive workouts",
      body: "Volume, exercise selection, and session length recalibrate daily based on your recovery, schedule, and history.",
    },
    {
      icon: "🥗",
      title: "Nutrition intelligence",
      body: "Calorie and macro targets adjust around your trend, adherence, and training demands so progress stays sustainable.",
    },
    {
      icon: "🧠",
      title: "In-workout AI coaching",
      body: "Real-time set cues, rest pacing, and simplified alternatives when equipment or energy is limited.",
    },
    {
      icon: "📊",
      title: "Progress narrative",
      body: "AI-generated trend interpretation cuts through noise and tells you exactly what's working and what to adjust.",
    },
    {
      icon: "🎯",
      title: "Habit streaks",
      body: "Streak tracking and achievement badges reinforce the consistency that drives long-term transformation.",
    },
    {
      icon: "🗓",
      title: "Meal planner",
      body: "Plan your week of meals in advance with macro targets pre-filled and AI-suggested meal ideas.",
    },
  ];

  return (
    <div className="w-full">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative min-h-[90svh] overflow-hidden bg-fn-bg-dark">
        {/* Background images with crossfade */}
        <div className="absolute inset-0">
          {[HERO_IMAGE, HERO_IMAGE2].map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-opacity duration-[2000ms]"
              style={{ opacity: imgIdx === i ? 1 : 0 }}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover object-center"
                priority={i === 0}
                sizes="100vw"
              />
            </div>
          ))}
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-fn-bg-dark/30 via-fn-bg-dark/40 to-fn-bg-dark/95" />
          {/* Side gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-fn-bg-dark/60 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative mx-auto flex min-h-[90svh] max-w-shell flex-col justify-end px-5 pb-16 pt-28 sm:px-8 sm:pb-20 lg:pb-28">
          <div className="hero-reveal max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-fn-accent animate-pulse-soft" />
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/80">AI personal trainer + nutritionist</span>
            </div>
            <h1 className="display-xl text-white">
              Built for{" "}
              <span className="relative inline-block">
                <span className="text-gradient-accent">{GOALS[goalIdx]}</span>
              </span>
              <br />and executed daily.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/65 leading-relaxed">
              FitNova combines adaptive training, nutrition intelligence, and AI accountability into one coaching system — personal-trainer quality, available 24/7.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/start">
                <Button size="lg">
                  Start 1-minute assessment
                  <svg viewBox="0 0 20 20" fill="currentColor" className="ml-1 h-4 w-4">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="secondary" size="lg" className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20">
                  I have an account
                </Button>
              </Link>
            </div>
          </div>

          {/* Proof strip */}
          <div className="rise-reveal rise-reveal-delay-3 mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {proofPoints.map(({ value, label }) => (
              <div key={label} className="glass-dark rounded-2xl px-4 py-3">
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-white/55 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Goal selector strip ─────────────────────────────────── */}
      <section className="bg-fn-surface border-b border-fn-border">
        <div className="mx-auto max-w-shell px-5 py-5 sm:px-8">
          <div className="flex flex-wrap gap-2">
            {["Weight loss", "Muscle gain", "Mobility", "Endurance", "Longevity"].map((g) => (
              <Link key={g} href="/start">
                <button
                  type="button"
                  className="rounded-full border border-fn-border bg-fn-bg px-4 py-2 text-sm font-semibold text-fn-ink hover:border-fn-primary hover:bg-fn-primary-light hover:text-fn-primary transition-all duration-200"
                >
                  {g}
                </button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-12 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fn-primary">Platform capabilities</p>
          <h2 className="display-lg mt-3 text-fn-ink-rich">Everything a world-class coach would do</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon, title, body }, i) => (
            <Card
              key={title}
              variant="default"
              padding="lg"
              hover
              className={`rise-reveal rise-reveal-delay-${Math.min(i, 3)} group`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fn-primary-light text-xl transition-transform duration-300 group-hover:scale-110">
                {icon}
              </span>
              <h3 className="mt-4 text-base font-bold text-fn-ink-rich">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fn-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Split feature: Nutrition ─────────────────────────── */}
      <section className="overflow-hidden bg-fn-bg-dark">
        <div className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-24 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fn-accent">Nutrition intelligence</p>
            <h2 className="display-md mt-3 text-white">Macro targets that move with you</h2>
            <p className="mt-4 text-base leading-relaxed text-white/60">
              Most apps set static calorie targets and leave you guessing. FitNova reads your training load, adherence, and weight trend to recalibrate your daily nutrition targets automatically.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Meal-by-meal macro breakdown",
                "AI meal suggestions aligned to your targets",
                "Weekly meal planner with prep notes",
                "Hydration tracking alongside nutrition",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fn-accent/20 text-fn-accent">
                    <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/start">
                <Button variant="accent" size="lg">Get your nutrition plan</Button>
              </Link>
            </div>
          </div>
          <div className="order-1 mb-10 lg:order-2 lg:mb-0">
            <div className="relative overflow-hidden rounded-3xl shadow-fn-dark">
              <Image
                src={NUTRITION_IMG}
                alt="Nutrition planning"
                width={640}
                height={480}
                className="h-64 w-full object-cover sm:h-80 lg:h-96"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-fn-bg-dark/60 to-transparent" />
              {/* Floating macro card */}
              <div className="absolute bottom-4 left-4 right-4 glass-dark rounded-2xl p-4">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Today&apos;s macros</p>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[["156g", "Protein"], ["210g", "Carbs"], ["62g", "Fat"]].map(([val, lbl]) => (
                    <div key={lbl}>
                      <p className="text-lg font-bold text-white">{val}</p>
                      <p className="text-xs text-white/50">{lbl}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Coach section ─────────────────────────────────── */}
      <section className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-24 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="relative mb-10 lg:mb-0">
          <div className="overflow-hidden rounded-3xl shadow-fn-elevated">
            <Image
              src={COACH_IMG}
              alt="AI Coach"
              width={640}
              height={480}
              className="h-64 w-full object-cover sm:h-80 lg:h-96"
            />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-fn-ink/30 to-transparent" />
          </div>
          {/* Floating chat bubble */}
          <div className="absolute -bottom-4 -right-2 max-w-[220px] glass rounded-2xl p-3 shadow-fn-elevated sm:right-4 sm:-bottom-6">
            <p className="text-xs font-semibold text-fn-ink">AI Coach</p>
            <p className="mt-1 text-xs text-fn-muted leading-relaxed">&ldquo;Your recovery score is 82. I&apos;ve adjusted today&apos;s session to protect your shoulder.&rdquo;</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fn-primary">AI coaching</p>
          <h2 className="display-md mt-3 text-fn-ink-rich">Your coach knows your history</h2>
          <p className="mt-4 text-base leading-relaxed text-fn-muted">
            Every conversation is grounded in your logs, your progress, your injuries. No generic advice — FitNova&apos;s AI has full context every time you open the chat.
          </p>
          <div className="mt-8">
            <Link href="/start">
              <Button size="lg">Start training with AI</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="section-dark">
        <div className="mx-auto max-w-shell px-5 py-20 text-center sm:px-8 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fn-accent">Get started free</p>
          <h2 className="display-lg mt-4 text-white">Start with your baseline today</h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-white/55">
            No pricing gate. Build your personalized plan in 60 seconds and start training tonight.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/start"><Button size="lg">Start 1-minute assessment</Button></Link>
            <Link href="/auth">
              <Button size="lg" className="!bg-white/10 !border-white/15 !text-white hover:!bg-white/20 border">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/30">AI guidance is educational and not a substitute for medical advice.</p>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DASHBOARD (signed-in)
───────────────────────────────────────────────────────────────── */
function Dashboard() {
  const [weekCount,    setWeekCount]    = useState(0);
  const [last7Days,    setLast7Days]    = useState<number[]>([]);
  const [todayPlan,    setTodayPlan]    = useState<{ focus: string; calories: number } | null>(null);
  const [weeklyInsight,setWeeklyInsight]= useState<string | null>(null);
  const [weeklyLoading,setWeeklyLoading]= useState(false);
  const [readiness,    setReadiness]    = useState<string | null>(null);
  const [readyLoading, setReadyLoading] = useState(false);
  const [reminders,    setReminders]    = useState<{ daily_plan?: boolean; workout_log?: boolean; weigh_in?: string }>({});
  const [hasPlan,      setHasPlan]      = useState(false);
  const [hasWorkout,   setHasWorkout]   = useState(false);
  const [lastWeighIn,  setLastWeighIn]  = useState<string | null>(null);
  const [lastWorkout,  setLastWorkout]  = useState<string | null>(null);
  const [morningBrief, setMorningBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const today = toLocalDateString();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const weekStart = getWeekStart(new Date());

      const [weekRes, last7Res, planRes, profileRes, workoutRes, progressRes] = await Promise.all([
        supabase.from("workout_logs").select("date", { count: "exact", head: true })
          .eq("user_id", user.id).gte("date", weekStart).lte("date", today),
        supabase.from("workout_logs").select("date").eq("user_id", user.id)
          .gte("date", toLocalDateString(new Date(Date.now() - 7 * 86400000)))
          .lte("date", today).order("date", { ascending: true }),
        supabase.from("daily_plans").select("plan_json").eq("user_id", user.id)
          .eq("date_local", today).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("user_profile").select("devices").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_logs").select("date").eq("user_id", user.id)
          .eq("date", today).limit(1).maybeSingle(),
        supabase.from("progress_tracking").select("date").eq("user_id", user.id)
          .order("date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      setWeekCount(weekRes.count ?? 0);

      const byDate: Record<string, number> = {};
      (last7Res.data ?? []).forEach((r: { date: string }) => {
        byDate[r.date] = (byDate[r.date] ?? 0) + 1;
      });
      const days: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(byDate[toLocalDateString(d)] ?? 0);
      }
      setLast7Days(days);

      const plan = planRes.data?.plan_json as { training_plan?: { focus?: string }; nutrition_plan?: { calorie_target?: number } } | undefined;
      setHasPlan(!!plan?.training_plan?.focus);
      if (plan?.training_plan?.focus) {
        setTodayPlan({ focus: plan.training_plan.focus, calories: plan.nutrition_plan?.calorie_target ?? 0 });
      }

      const dev = (profileRes.data as { devices?: Record<string, unknown> } | null)?.devices ?? {};
      setReminders((dev.reminders as typeof reminders) ?? {});
      setHasWorkout(!!(workoutRes.data as { date: string }[] | null)?.length);
      setLastWeighIn((progressRes.data as { date: string }[] | null)?.[0]?.date ?? null);

      const last7Data = last7Res.data as { date: string }[] | null;
      setLastWorkout(last7Data?.length ? last7Data[last7Data.length - 1]?.date ?? null : null);
    }).catch(() => {});
  }, [today]);

  useEffect(() => {
    setReadyLoading(true);
    fetch("/api/v1/ai/readiness-insight", { method: "POST" })
      .then(r => r.json()).then((b: { insight?: string | null }) => { if (b.insight) setReadiness(b.insight); })
      .catch(() => {}).finally(() => setReadyLoading(false));
    setWeeklyLoading(true);
    fetch("/api/v1/ai/weekly-insight", { method: "POST" })
      .then(r => r.json()).then((b: { insight?: string | null }) => { if (b.insight) setWeeklyInsight(b.insight); })
      .catch(() => {}).finally(() => setWeeklyLoading(false));
    setBriefLoading(true);
    fetch("/api/v1/ai/readiness-insight", { method: "POST" })
      .then(r => r.json()).then((b: { insight?: string | null }) => { if (b.insight) setMorningBrief(b.insight); })
      .catch(() => {}).finally(() => setBriefLoading(false));
  }, []);

  const streak = useMemo(() => {
    let c = 0;
    for (let i = last7Days.length - 1; i >= 0 && last7Days[i] > 0; i--) c++;
    return c;
  }, [last7Days]);

  const daysSinceLast = useMemo(() => {
    if (!lastWorkout) return null;
    return Math.floor((new Date(today).setHours(0,0,0,0) - new Date(lastWorkout).setHours(0,0,0,0)) / 86400000);
  }, [lastWorkout, today]);

  const maxVal = Math.max(...last7Days, 1);
  const showReminders =
    (reminders.daily_plan && !hasPlan) ||
    (reminders.workout_log && !hasWorkout) ||
    (reminders.weigh_in === "weekly" && (!lastWeighIn || lastWeighIn < getWeekStart(new Date())));

  return (
    <div className="mx-auto w-full max-w-shell px-4 pb-8 pt-6 sm:px-6">

      {/* ── Morning brief banner ──────────────────────────────── */}
      <div className="hero-reveal mb-6 overflow-hidden rounded-3xl bg-gradient-dark shadow-fn-dark">
        <div className="relative px-6 py-6 sm:px-8 sm:py-7">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-fn-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-fn-accent/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-fn-accent animate-pulse-soft" />
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50">AI Morning Brief</p>
            </div>
            {briefLoading ? (
              <div className="mt-3 h-5 w-64 shimmer rounded-lg" />
            ) : (
              <p className="mt-2 text-lg font-semibold text-white leading-snug">
                {morningBrief ?? "Good morning. Your adaptive plan is ready."}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/coach"><Button size="sm" className="!bg-white/15 !border-white/15 !text-white hover:!bg-white/25 border">Open coach</Button></Link>
              <Link href="/check-in"><Button size="sm" className="!bg-white/10 !border-white/10 !text-white/70 hover:!bg-white/20 border">Daily check-in</Button></Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reminders ─────────────────────────────────────────── */}
      {showReminders && (
        <div className="mb-4 rise-reveal rounded-2xl border border-fn-primary/20 bg-fn-primary-light px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-fn-primary">Reminders</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {reminders.daily_plan && !hasPlan && (
              <Link href="/coach"><Button size="sm">Generate plan</Button></Link>
            )}
            {reminders.workout_log && !hasWorkout && (
              <Link href="/log/workout"><Button variant="secondary" size="sm">Log workout</Button></Link>
            )}
            {reminders.weigh_in === "weekly" && (!lastWeighIn || lastWeighIn < getWeekStart(new Date())) && (
              <Link href="/progress/add"><Button variant="secondary" size="sm">Weigh-in</Button></Link>
            )}
          </div>
        </div>
      )}

      {/* ── Primary grid ─────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Today's plan */}
        <Card variant="default" padding="lg" className="rise-reveal lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Today&apos;s plan</p>
          <h2 className="mt-2 font-display text-3xl text-fn-ink-rich sm:text-4xl">
            {todayPlan?.focus ?? "Generate your plan"}
          </h2>
          <p className="mt-2 text-fn-muted">
            {todayPlan
              ? `${todayPlan.calories} kcal target · progressive training cues included`
              : "Open Coach to generate your personalised workout and nutrition targets for today."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/coach"><Button>Open coach</Button></Link>
            <Link href="/log/workout"><Button variant="secondary">Log workout</Button></Link>
            <Link href="/log/nutrition"><Button variant="secondary">Log nutrition</Button></Link>
          </div>
        </Card>

        {/* This week */}
        <Card variant="default" padding="lg" className="rise-reveal rise-reveal-delay-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">This week</p>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-4xl font-bold text-fn-ink-rich">{weekCount}</p>
              <p className="text-xs text-fn-muted">workouts logged</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-fn-primary">{streak}</p>
              <p className="text-xs text-fn-muted">day streak</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-fn-bg-alt">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all duration-700"
              style={{ width: `${Math.min(100, weekCount * 20)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-fn-muted">{weekCount}/5 weekly goal</p>
          {weeklyLoading && <p className="mt-3 text-xs text-fn-muted animate-pulse-soft">Generating weekly recap…</p>}
          {weeklyInsight && !weeklyLoading && (
            <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2.5 text-xs leading-relaxed text-fn-ink">{weeklyInsight}</p>
          )}
        </Card>
      </div>

      {/* ── Activity + Readiness ──────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">

        {/* 7-day chart */}
        <Card variant="default" padding="lg" className="rise-reveal rise-reveal-delay-1 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">7-day training signal</p>
          <div className="mt-5 flex h-28 items-end gap-1.5 sm:gap-2">
            {last7Days.map((v, i) => {
              const pct   = maxVal > 0 ? Math.max(8, (v / maxVal) * 100) : 8;
              const isOn  = v > 0;
              const isToday = i === 6;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "96px" }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday
                          ? "bg-gradient-primary shadow-fn-primary"
                          : isOn
                          ? "bg-fn-primary/70"
                          : "bg-fn-bg-alt"
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold ${isToday ? "text-fn-primary" : "text-fn-muted"}`}>
                    {DAY_SHORT[i]}
                  </span>
                </div>
              );
            })}
          </div>
          {last7Days.every(v => v === 0) && (
            <p className="mt-2 text-xs text-fn-muted">No sessions logged yet — start your first workout to activate the signal.</p>
          )}
        </Card>

        {/* Readiness */}
        <Card variant="default" padding="lg" className="rise-reveal rise-reveal-delay-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Today&apos;s readiness</p>
          {daysSinceLast === 0 && (
            <p className="mt-3 text-xs text-fn-muted">You trained today. Consider rest or light mobility.</p>
          )}
          {daysSinceLast === 1 && (
            <p className="mt-3 text-xs text-fn-muted">You trained yesterday. Listen to your body today.</p>
          )}
          {readyLoading && <div className="mt-3 h-16 shimmer rounded-xl" />}
          {readiness && !readyLoading && (
            <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2.5 text-xs leading-relaxed text-fn-ink">{readiness}</p>
          )}
          {!readiness && !readyLoading && daysSinceLast === null && (
            <p className="mt-3 text-xs text-fn-muted">Complete a check-in to unlock your readiness score.</p>
          )}
          <Link href="/check-in" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-fn-primary hover:underline">
            Go to check-in
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" clipRule="evenodd" />
            </svg>
          </Link>
        </Card>
      </div>

      {/* ── AI insight feed + Quick actions ───────────────────── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Insight feed */}
        <Card variant="default" padding="default" className="rise-reveal rise-reveal-delay-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">AI insight feed</p>
          <ul className="mt-3 space-y-2">
            {[
              { icon: "🔴", text: "Protein is 20–30 g below target for 2 days running." },
              { icon: "🟢", text: "Wednesday volume supports a small load increase next session." },
              { icon: "🟡", text: "Recovery day recommended after this intensity pattern." },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-start gap-3 rounded-xl bg-fn-bg-alt px-3 py-2.5">
                <span className="mt-0.5 text-sm leading-none">{icon}</span>
                <p className="text-xs leading-relaxed text-fn-ink">{text}</p>
              </li>
            ))}
          </ul>
          <Link href="/coach" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-fn-primary hover:underline">
            Open full insights
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" clipRule="evenodd" />
            </svg>
          </Link>
        </Card>

        {/* Quick actions */}
        <Card variant="default" padding="default" className="rise-reveal rise-reveal-delay-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Quick actions</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { href: "/check-in",       label: "Check-in",      icon: "✅" },
              { href: "/log/workout",    label: "Workout",       icon: "💪" },
              { href: "/log/nutrition",  label: "Nutrition",     icon: "🥗" },
              { href: "/progress",       label: "Progress",      icon: "📈" },
              { href: "/habits",         label: "Habits",        icon: "🔥" },
              { href: "/planner",        label: "Meal planner",  icon: "🗓" },
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-xl border border-fn-border bg-fn-bg px-3 py-2.5 text-sm font-semibold text-fn-ink hover:border-fn-primary/30 hover:bg-fn-primary-light hover:text-fn-primary transition-all duration-200"
              >
                <span>{icon}</span>
                {label}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ── New features teaser ───────────────────────────────── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          { href: "/habits",    title: "Streak tracker",    sub: "Build consistency",       badge: "NEW", color: "from-amber-500 to-orange-500" },
          { href: "/templates", title: "Workout templates", sub: "Save & reuse sessions",   badge: "NEW", color: "from-fn-primary to-violet-600" },
          { href: "/planner",   title: "Meal planner",      sub: "Plan the week ahead",     badge: "NEW", color: "from-fn-accent to-teal-600" },
        ].map(({ href, title, sub, badge, color }) => (
          <Link key={href} href={href}>
            <Card variant="default" padding="default" hover className="rise-reveal group">
              <div className={`h-1.5 w-10 rounded-full bg-gradient-to-r ${color} mb-3 transition-all duration-300 group-hover:w-full`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-fn-ink-rich">{title}</p>
                  <p className="mt-0.5 text-xs text-fn-muted">{sub}</p>
                </div>
                <span className="rounded-full bg-fn-primary-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fn-primary">{badge}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ROOT PAGE
───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setAuth("out"); return; }
    supabase.auth.getUser()
      .then(({ data: { user } }) => setAuth(user ? "in" : "out"))
      .catch(() => setAuth("out"));
  }, []);

  if (auth === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Loading FitNova…" />
      </div>
    );
  }

  return auth === "in" ? <Dashboard /> : <LandingPage />;
}
