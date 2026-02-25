"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, Button, LoadingState, EmptyState } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80";

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
  const [helpTab, setHelpTab] = useState<HelpTab>("adaptive");
  const [authState, setAuthState] = useState<"loading" | "signed_in" | "signed_out">("loading");
  const [weekCount, setWeekCount] = useState<number>(0);
  const [last7Days, setLast7Days] = useState<number[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setGoalIndex((idx) => (idx + 1) % rotatingGoals.length);
    }, 2200);
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
          supabase.from("user_profile").select("devices").eq("user_id", user.id).maybeSingle(),
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
        const dev = (profileRes.data as { devices?: Record<string, unknown> } | null)?.devices ?? {};
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
      .catch(() => {})
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
      .catch(() => {})
      .finally(() => setWeeklyInsightLoading(false));
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

  if (authState === "loading") {
    return (
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6">
        <LoadingState message="Preparing your experience..." />
      </div>
    );
  }

  if (authState === "signed_out") {
    return (
      <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
        <section className="hero-reveal overflow-hidden rounded-3xl border border-fn-border bg-white shadow-fn-card">
          <div className="relative h-56 w-full sm:h-72 md:h-80">
            <Image
              src={HERO_IMAGE}
              alt="Fitness training"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 72rem"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-fn-ink/70 via-fn-ink/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/90">AI personal trainer + nutritionist</p>
              <h1 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl md:text-5xl">
                Build a plan for <span className="text-fn-accent">{rotatingGoals[goalIndex]}</span> and execute it daily.
              </h1>
            </div>
          </div>
          <div className="p-6 sm:p-10">
            <p className="max-w-2xl text-base text-fn-muted">
              FitNova combines adaptive workouts, nutrition guidance, and accountability insights into one coaching system.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/start">
              <Button>Start 1-minute assessment</Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary">See how it works</Button>
            </a>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {["Weight loss", "Muscle gain", "Mobility"].map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-xl border border-fn-border bg-fn-surface-hover px-4 py-3 text-left text-sm font-semibold text-fn-ink"
              >
                I want to focus on {item}
              </button>
            ))}
          </div>

            <div className="mt-7 rounded-2xl border border-fn-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-fn-muted">Mock weekly plan preview</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {["Mon Strength", "Tue Recovery", "Wed Hybrid", "Thu Strength"].map((item) => (
                  <div key={item} className="rounded-xl bg-fn-bg-alt px-3 py-2 text-sm font-semibold text-fn-ink">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card padding="lg" className="rise-reveal">
            <CardHeader title="How FitNova helps" subtitle="Future-grade structure, AI-first delivery" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setHelpTab("adaptive")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${helpTab === "adaptive" ? "bg-fn-primary text-white" : "bg-fn-bg-alt text-fn-ink"}`}>Adaptive workouts</button>
              <button type="button" onClick={() => setHelpTab("nutrition")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${helpTab === "nutrition" ? "bg-fn-primary text-white" : "bg-fn-bg-alt text-fn-ink"}`}>Nutrition intelligence</button>
              <button type="button" onClick={() => setHelpTab("coaching")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${helpTab === "coaching" ? "bg-fn-primary text-white" : "bg-fn-bg-alt text-fn-ink"}`}>In-workout coaching</button>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-fn-ink">{tabContent.title}</h3>
            <p className="mt-2 text-fn-muted">{tabContent.body}</p>
          </Card>

          <Card padding="lg" className="rise-reveal rise-reveal-delay-1">
            <CardHeader title="Adaptive proof" subtitle="Plan updates when life changes" />
            <ul className="mt-4 space-y-3 text-sm text-fn-muted">
              <li>Schedule shift leads to rebalanced session time and exercise density.</li>
              <li>Low recovery day triggers reduced load and joint-friendly alternatives.</li>
              <li>Strong adherence unlocks progression recommendations with guardrails.</li>
            </ul>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Workout", "Guided plan with adaptive alternatives"],
            ["Nutrition", "Macro gap awareness and next meal guidance"],
            ["Progress", "Trend interpretation and plateau actions"],
            ["Insights", "Accountability feed with decision prompts"],
          ].map(([title, desc], idx) => (
            <Card key={title} className={`rise-reveal ${idx > 0 ? `rise-reveal-delay-${Math.min(idx, 3)}` : ""}`}>
              <h3 className="font-semibold text-fn-ink">{title}</h3>
              <p className="mt-1 text-sm text-fn-muted">{desc}</p>
            </Card>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-fn-border bg-white p-6 text-center shadow-fn-card sm:p-8">
          <h2 className="font-display text-3xl text-fn-ink">Start with your personalized baseline</h2>
          <p className="mt-2 text-fn-muted">No pricing gate here yet. Build your plan first and start training today.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/start"><Button>Start assessment</Button></Link>
            <Link href="/auth"><Button variant="secondary">I already have an account</Button></Link>
          </div>
          <p className="mt-3 text-xs text-fn-muted">AI guidance is educational and not medical care.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
      <header className="mb-6 rounded-3xl border border-fn-border bg-white p-6 shadow-fn-card sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-fn-muted">Today&apos;s coaching cockpit</p>
        <h1 className="mt-2 font-display text-4xl text-fn-ink">FitNova AI</h1>
        <p className="mt-2 text-fn-muted">Adaptive training, nutrition, and accountability in one view.</p>
      </header>

      {(reminders.daily_plan && !hasPlanToday) || (reminders.workout_log && !hasWorkoutToday) || (reminders.weigh_in === "weekly" && (!lastWeighInDate || lastWeighInDate < getWeekStart(new Date()))) ? (
        <section className="mb-4 rounded-xl border border-fn-primary/30 bg-fn-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-fn-muted">Reminders</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {reminders.daily_plan && !hasPlanToday && (
              <Link href="/coach">
                <Button size="sm">Generate today&apos;s plan</Button>
              </Link>
            )}
            {reminders.workout_log && !hasWorkoutToday && (
              <Link href="/log/workout">
                <Button variant="secondary" size="sm">Log workout</Button>
              </Link>
            )}
            {reminders.weigh_in === "weekly" && (!lastWeighInDate || lastWeighInDate < getWeekStart(new Date())) && (
              <Link href="/progress/add">
                <Button variant="secondary" size="sm">Weigh-in reminder</Button>
              </Link>
            )}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <CardHeader title="Today" subtitle="Your primary action" />
          <p className="mt-4 text-2xl font-semibold text-fn-ink">{todayPlan?.focus ?? "Generate today\'s adaptive plan"}</p>
          <p className="mt-1 text-fn-muted">
            {todayPlan ? `${todayPlan.calories} calorie target with progressive training cues.` : "Open Coach to generate your personalized workout and nutrition targets."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/coach"><Button>Open coach</Button></Link>
            <Link href="/log/workout"><Button variant="secondary">Log workout</Button></Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="This week" subtitle="Workouts, streak & AI recap" />
          <div className="mt-4 space-y-3">
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs text-fn-muted">Workouts this week</p>
                <p className="text-2xl font-semibold text-fn-ink">{weekCount}</p>
              </div>
              <div>
                <p className="text-xs text-fn-muted">Logging streak</p>
                <p className="text-2xl font-semibold text-fn-ink">{streak} day{streak !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-fn-bg-alt">
              <div className="h-full bg-fn-accent" style={{ width: `${Math.min(100, weekCount * 20)}%` }} />
            </div>
            {weeklyInsightLoading && (
              <p className="text-xs text-fn-muted">Generating weekly recap...</p>
            )}
            {weeklyInsight && !weeklyInsightLoading && (
              <p className="rounded-xl bg-fn-bg-alt px-3 py-2 text-sm text-fn-ink">{weeklyInsight}</p>
            )}
            {!weeklyInsight && !weeklyInsightLoading && (
              <p className="text-xs text-fn-muted">Consistency builds automatic weekly progression.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="7-day training signal" subtitle="Recent activity trend" />
          {last7Days.length === 0 ? (
            <EmptyState className="mt-4" message="No logs yet. Start your first session to activate insight tracking." />
          ) : (
            <div className="mt-4 flex h-28 items-end gap-2">
              {last7Days.map((value, idx) => (
                <div key={idx} className="flex-1 rounded-t-md bg-fn-primary/70" style={{ height: `${Math.max(8, (value / Math.max(...last7Days, 1)) * 100)}%` }} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Today&apos;s readiness" subtitle="Recovery & training" />
          {recoverySuggestion && (
            <p className="mt-2 text-sm text-fn-muted">{recoverySuggestion}</p>
          )}
          {readinessInsightLoading && (
            <p className="mt-2 text-sm text-fn-muted">Checking readiness...</p>
          )}
          {readinessInsight && !readinessInsightLoading && (
            <p className="mt-2 rounded-xl bg-fn-bg-alt px-3 py-2 text-sm text-fn-ink">{readinessInsight}</p>
          )}
          {!readinessInsight && !readinessInsightLoading && !recoverySuggestion && (
            <p className="mt-2 text-sm text-fn-muted">Complete a check-in for a readiness insight.</p>
          )}
          <Link href="/check-in" className="mt-3 inline-block text-sm font-semibold text-fn-primary hover:underline">Check-in</Link>
        </Card>

        <Card>
          <CardHeader title="AI insight feed" subtitle="Unread: 3" />
          <ul className="mt-4 space-y-2 text-sm text-fn-muted">
            <li className="rounded-lg bg-fn-bg-alt px-3 py-2">Protein is 20-30g below target for 2 days.</li>
            <li className="rounded-lg bg-fn-bg-alt px-3 py-2">Your Wednesday volume supports a small load increase.</li>
            <li className="rounded-lg bg-fn-bg-alt px-3 py-2">Recovery day recommended after current intensity pattern.</li>
          </ul>
          <Link href="/coach" className="mt-4 inline-block text-sm font-semibold text-fn-primary hover:text-fn-primary-dim">Open full insights</Link>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader title="Quick actions" subtitle="Secondary shortcuts" />
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/check-in"><Button variant="secondary">Today&apos;s check-in</Button></Link>
            <Link href="/log/workout"><Button variant="secondary">Workout log</Button></Link>
            <Link href="/log/nutrition"><Button variant="secondary">Nutrition log</Button></Link>
            <Link href="/progress"><Button variant="secondary">Progress</Button></Link>
            {!onboardingComplete && <Link href="/onboarding"><Button variant="secondary">Complete onboarding</Button></Link>}
          </div>
        </Card>
      </section>
    </div>
  );
}
