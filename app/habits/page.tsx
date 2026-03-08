"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, LoadingState } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

/* ── Types ──────────────────────────────────────────────────────── */
interface Badge {
  id: string;
  label: string;
  icon: string;
  description: string;
  earned: boolean;
  threshold: number;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = dates.filter((d, i, a) => a.indexOf(d) === i).sort().reverse();
  const today  = toLocalDateString();
  let streak   = 0;
  let cursor   = new Date(today);
  for (const d of sorted) {
    const expected = toLocalDateString(cursor);
    if (d === expected) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

const BADGE_DEFS: Omit<Badge, "earned">[] = [
  { id: "first",    label: "First step",     icon: "👣", description: "Logged your first workout",           threshold: 1  },
  { id: "week",     label: "Week warrior",   icon: "🗓", description: "7 consecutive days logged",           threshold: 7  },
  { id: "biweek",   label: "Fortnight",      icon: "⚡", description: "14 consecutive days logged",          threshold: 14 },
  { id: "month",    label: "Monthly grind",  icon: "🔥", description: "30 workouts logged",                  threshold: 30 },
  { id: "fifty",    label: "Fifty strong",   icon: "💪", description: "50 total workouts logged",            threshold: 50 },
  { id: "century",  label: "Century club",   icon: "🏆", description: "100 total workouts logged",           threshold: 100 },
  { id: "streak21", label: "Habit formed",   icon: "🧠", description: "21-day streak — habit locked in",     threshold: 21 },
  { id: "streak66", label: "Automatic",      icon: "🤖", description: "66-day streak — fully automatic",     threshold: 66 },
];

const HABIT_ITEMS = [
  { id: "workout",   label: "Workout",         icon: "💪", key: "workout_logs"    },
  { id: "nutrition", label: "Nutrition log",   icon: "🥗", key: "nutrition_logs"  },
  { id: "checkin",   label: "Daily check-in",  icon: "✅", key: "check_ins"       },
  { id: "progress",  label: "Weight log",      icon: "⚖️", key: "progress_tracking" },
];

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */
export default function HabitsPage() {
  const [loading,      setLoading]      = useState(true);
  const [totalWorkouts,setTotalWorkouts]= useState(0);
  const [streak,       setStreak]       = useState(0);
  const [last30,       setLast30]       = useState<string[]>([]);
  const [badges,       setBadges]       = useState<Badge[]>([]);
  const [userId,       setUserId]       = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const thirtyDaysAgo = toLocalDateString(new Date(Date.now() - 30 * 86400000));
      const [totalRes, last30Res] = await Promise.all([
        supabase.from("workout_logs").select("date", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("workout_logs").select("date").eq("user_id", user.id)
          .gte("date", thirtyDaysAgo).order("date", { ascending: false }),
      ]);

      const total   = totalRes.count ?? 0;
      const dates   = (last30Res.data ?? []).map((r: { date: string }) => r.date);
      const calcStr = computeStreak(dates);

      setTotalWorkouts(total);
      setStreak(calcStr);
      setLast30(dates);

      const earned = BADGE_DEFS.map(b => ({
        ...b,
        earned: b.id.startsWith("streak")
          ? calcStr >= b.threshold
          : total >= b.threshold,
      }));
      setBadges(earned);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Loading your achievements…" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-shell px-4 py-16 text-center sm:px-6">
        <p className="text-fn-muted">Sign in to track your habits and achievements.</p>
        <Link href="/auth" className="mt-4 inline-block"><Button>Sign in</Button></Link>
      </div>
    );
  }

  /* ── Build 30-day grid ─────────────────────────────────────── */
  const today = new Date();
  const grid30: { date: string; active: boolean }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = toLocalDateString(d);
    grid30.push({ date: ds, active: last30.includes(ds) });
  }

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="mx-auto w-full max-w-shell px-4 pb-10 pt-6 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="hero-reveal mb-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-fn-muted hover:text-fn-ink mb-4">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 rotate-180">
            <path fillRule="evenodd" d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" clipRule="evenodd" />
          </svg>
          Back
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fn-primary">Gamification</p>
        <h1 className="display-md mt-2 text-fn-ink-rich">Streaks & Achievements</h1>
        <p className="mt-2 text-fn-muted">Build consistency. Earn badges. Track your momentum.</p>
      </div>

      {/* ── Hero stats ─────────────────────────────────────────── */}
      <div className="rise-reveal mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Current streak",  value: `${streak}d`, sub: streak >= 7 ? "🔥 On fire" : "Keep going",   color: "text-amber-500" },
          { label: "Total workouts",  value: totalWorkouts, sub: "all time",      color: "text-fn-primary" },
          { label: "Badges earned",   value: `${earnedCount}/${badges.length}`, sub: "achievements", color: "text-fn-accent" },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} variant="default" padding="default" className="text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs font-semibold text-fn-ink">{label}</p>
            <p className="text-[10px] text-fn-muted">{sub}</p>
          </Card>
        ))}
      </div>

      {/* ── 30-day activity heatmap ────────────────────────────── */}
      <Card variant="default" padding="lg" className="rise-reveal rise-reveal-delay-1 mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted mb-4">30-day workout heatmap</p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
          {grid30.map(({ date, active }) => (
            <div
              key={date}
              title={date}
              className={`aspect-square rounded-md transition-all duration-200 ${
                active
                  ? "bg-gradient-primary shadow-fn-primary/30 shadow-sm"
                  : "bg-fn-bg-alt hover:bg-fn-border"
              }`}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-fn-bg-alt" />
            <span className="text-xs text-fn-muted">Rest</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gradient-primary" />
            <span className="text-xs text-fn-muted">Trained</span>
          </div>
        </div>
      </Card>

      {/* ── Streak milestone bar ───────────────────────────────── */}
      <Card variant="default" padding="lg" className="rise-reveal rise-reveal-delay-2 mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted mb-1">Streak milestones</p>
        <p className="mb-4 text-xs text-fn-muted">Next milestone: {streak < 7 ? "7 days" : streak < 14 ? "14 days" : streak < 21 ? "21 days" : streak < 30 ? "30 days" : streak < 66 ? "66 days" : "100 days 🎯"}</p>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-fn-bg-alt">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-1000"
            style={{ width: `${Math.min(100, (streak / 66) * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-fn-muted font-medium">
          {[0, 7, 14, 21, 30, 66].map(n => <span key={n}>{n}d</span>)}
        </div>
      </Card>

      {/* ── Badges grid ───────────────────────────────────────── */}
      <div className="rise-reveal rise-reveal-delay-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Achievement badges</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((b) => (
            <Card
              key={b.id}
              variant="default"
              padding="default"
              className={`text-center transition-all duration-300 ${
                b.earned
                  ? "border-fn-primary/20 bg-fn-primary-light shadow-fn-primary/10"
                  : "opacity-50 grayscale"
              }`}
            >
              <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${b.earned ? "bg-white shadow-fn-soft" : "bg-fn-bg-alt"}`}>
                {b.icon}
              </div>
              <p className={`text-sm font-bold ${b.earned ? "text-fn-ink-rich" : "text-fn-muted"}`}>{b.label}</p>
              <p className="mt-0.5 text-[10px] text-fn-muted leading-snug">{b.description}</p>
              {b.earned && (
                <span className="mt-2 inline-block rounded-full bg-fn-primary px-2 py-0.5 text-[10px] font-bold text-white">EARNED</span>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* ── Habit tracking checklist ──────────────────────────── */}
      <Card variant="default" padding="lg" className="rise-reveal rise-reveal-delay-4 mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted mb-4">Today&apos;s habits</p>
        <div className="space-y-3">
          {HABIT_ITEMS.map(({ id, label, icon }) => (
            <div key={id} className="flex items-center justify-between rounded-xl border border-fn-border px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-semibold text-fn-ink">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href={id === "workout" ? "/log/workout" : id === "nutrition" ? "/log/nutrition" : id === "checkin" ? "/check-in" : "/progress/add"}>
                  <Button variant="secondary" size="sm">Log now</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex gap-3">
        <Link href="/log/workout"><Button>Log workout</Button></Link>
        <Link href="/progress"><Button variant="secondary">View progress</Button></Link>
      </div>
    </div>
  );
}
