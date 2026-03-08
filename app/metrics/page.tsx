"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, LoadingState } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

/* ── Types ──────────────────────────────────────────────────────── */
interface ProgressEntry {
  date: string;
  weight: number | null;
  body_fat_percent: number | null;
  measurements: Record<string, number> | null;
}

interface MetricDelta {
  label: string;
  current: number | null;
  previous: number | null;
  unit: string;
  icon: string;
  higherIsBetter?: boolean;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function delta(curr: number | null, prev: number | null): string {
  if (curr == null || prev == null) return "—";
  const d = curr - prev;
  return (d >= 0 ? "+" : "") + d.toFixed(1);
}
function trend(curr: number | null, prev: number | null, higherIsBetter = false): "up" | "down" | "flat" {
  if (curr == null || prev == null) return "flat";
  if (curr > prev) return higherIsBetter ? "up" : "down";
  if (curr < prev) return higherIsBetter ? "down" : "up";
  return "flat";
}
const TREND_COLORS = { up: "text-fn-accent", down: "text-fn-danger", flat: "text-fn-muted" };
const TREND_ICONS  = { up: "↑", down: "↓", flat: "→" };

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */
export default function MetricsPage() {
  const [loading,  setLoading]  = useState(true);
  const [entries,  setEntries]  = useState<ProgressEntry[]>([]);
  const [unit,     setUnit]     = useState<"kg" | "lbs">("kg");
  const [userId,   setUserId]   = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [profileRes, entriesRes] = await Promise.all([
        supabase.from("user_profile").select("devices").eq("user_id", user.id).maybeSingle(),
        supabase.from("progress_tracking")
          .select("date, weight, body_fat_percent, measurements")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(20),
      ]);

      const prefs = (profileRes.data as { devices?: { unit_system?: string } } | null)?.devices ?? {};
      if ((prefs as { unit_system?: string }).unit_system === "imperial") setUnit("lbs");

      setEntries((entriesRes.data as ProgressEntry[]) ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><LoadingState message="Loading metrics…" /></div>;
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-shell px-4 py-16 text-center">
        <p className="text-fn-muted">Sign in to view your body metrics.</p>
        <Link href="/auth" className="mt-4 inline-block"><Button>Sign in</Button></Link>
      </div>
    );
  }

  const latest   = entries[0]  ?? null;
  const previous = entries[1]  ?? null;
  const wFactor  = unit === "lbs" ? 2.20462 : 1;
  const wUnit    = unit;

  const metricCards: MetricDelta[] = [
    {
      label: "Body weight",
      current:  latest?.weight   != null ? latest.weight  * wFactor : null,
      previous: previous?.weight != null ? previous.weight * wFactor : null,
      unit: wUnit, icon: "⚖️",
    },
    {
      label: "Body fat %",
      current:  latest?.body_fat_percent   ?? null,
      previous: previous?.body_fat_percent ?? null,
      unit: "%", icon: "📊",
    },
    {
      label: "Waist",
      current:  (latest?.measurements?.waist   ?? null),
      previous: (previous?.measurements?.waist ?? null),
      unit: "cm", icon: "📏",
    },
    {
      label: "Chest",
      current:  (latest?.measurements?.chest   ?? null),
      previous: (previous?.measurements?.chest ?? null),
      unit: "cm", icon: "💪", higherIsBetter: true,
    },
    {
      label: "Hip",
      current:  (latest?.measurements?.hip   ?? null),
      previous: (previous?.measurements?.hip ?? null),
      unit: "cm", icon: "📐",
    },
    {
      label: "Thigh",
      current:  (latest?.measurements?.thigh   ?? null),
      previous: (previous?.measurements?.thigh ?? null),
      unit: "cm", icon: "🦵", higherIsBetter: true,
    },
  ];

  /* ── Weight sparkline data (last 12 entries reversed) ───────── */
  const sparkData = [...entries].reverse().slice(-12).map(e =>
    e.weight != null ? e.weight * wFactor : null
  );
  const sparkMin  = Math.min(...sparkData.filter(Boolean) as number[]);
  const sparkMax  = Math.max(...sparkData.filter(Boolean) as number[]);
  const sparkRange = sparkMax - sparkMin || 1;

  return (
    <div className="mx-auto w-full max-w-shell px-4 pb-10 pt-6 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="hero-reveal mb-8">
        <Link href="/progress" className="inline-flex items-center gap-1.5 text-sm font-medium text-fn-muted hover:text-fn-ink mb-4">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 rotate-180">
            <path fillRule="evenodd" d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" clipRule="evenodd" />
          </svg>
          Back to Progress
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fn-primary">Body composition</p>
            <h1 className="display-md mt-2 text-fn-ink-rich">Advanced Metrics</h1>
            <p className="mt-2 text-fn-muted">Multi-point body composition tracking with trend analysis.</p>
          </div>
          <Link href="/progress/add"><Button>Add measurement</Button></Link>
        </div>
      </div>

      {/* ── Metric cards ───────────────────────────────────────── */}
      <div className="rise-reveal mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metricCards.map(({ label, current, previous: prev, unit: u, icon, higherIsBetter }) => {
          const t    = trend(current, prev, higherIsBetter);
          const diff = delta(current, prev);
          return (
            <Card key={label} variant="default" padding="default">
              <div className="flex items-start justify-between">
                <span className="text-xl">{icon}</span>
                {diff !== "—" && (
                  <span className={`text-sm font-bold ${TREND_COLORS[t]}`}>
                    {TREND_ICONS[t]} {diff}{u}
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold text-fn-ink-rich">
                {current != null ? `${current.toFixed(1)}${u}` : "—"}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-fn-muted">{label}</p>
              {prev != null && (
                <p className="mt-0.5 text-[10px] text-fn-muted">
                  Was {prev.toFixed(1)}{u}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Weight sparkline ───────────────────────────────────── */}
      {sparkData.filter(Boolean).length > 1 && (
        <Card variant="default" padding="lg" className="rise-reveal rise-reveal-delay-1 mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted mb-1">Weight trend</p>
          {latest?.weight && (
            <p className="mb-4 font-display text-3xl text-fn-ink-rich">
              {(latest.weight * wFactor).toFixed(1)} {wUnit}
            </p>
          )}
          {/* SVG sparkline */}
          <div className="relative h-24 w-full">
            <svg viewBox={`0 0 ${sparkData.length * 36} 80`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
              {/* Area fill */}
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#335cff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#335cff" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {sparkData.filter(Boolean).length > 1 && (() => {
                const pts = sparkData.map((v, i) => {
                  const x = i * 36 + 18;
                  const y = v != null ? 72 - ((v - sparkMin) / sparkRange) * 64 : null;
                  return { x, y };
                }).filter(p => p.y != null) as { x: number; y: number }[];

                const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                const areaPath = `${linePath} L${pts[pts.length-1].x},80 L${pts[0].x},80 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#sparkGrad)" />
                    <path d={linePath} fill="none" stroke="#335cff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#335cff" />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-fn-muted">
            <span>{entries[entries.length - 1]?.date ?? ""}</span>
            <span>Today</span>
          </div>
        </Card>
      )}

      {/* ── Body composition visual ────────────────────────────── */}
      <Card variant="default" padding="lg" className="rise-reveal rise-reveal-delay-2 mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted mb-4">Composition breakdown</p>
        {latest?.body_fat_percent ? (
          <div className="space-y-3">
            {[
              { label: "Fat mass",   pct: latest.body_fat_percent,          color: "bg-fn-danger/60" },
              { label: "Lean mass",  pct: 100 - latest.body_fat_percent,    color: "bg-gradient-primary" },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-medium text-fn-ink mb-1">
                  <span>{label}</span>
                  <span>{pct.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-fn-bg-alt">
                  <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-fn-muted text-sm">Add body fat % to see your composition breakdown.</p>
            <Link href="/progress/add" className="mt-3 inline-block">
              <Button size="sm" variant="secondary">Add now</Button>
            </Link>
          </div>
        )}
      </Card>

      {/* ── Recent entries table ───────────────────────────────── */}
      <Card variant="default" padding="default" className="rise-reveal rise-reveal-delay-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted mb-4">History</p>
        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-fn-muted text-sm">No measurements yet.</p>
            <Link href="/progress/add" className="mt-3 inline-block"><Button size="sm">Add first entry</Button></Link>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-fn-border text-fn-muted">
                  <th className="pb-2 text-left font-semibold">Date</th>
                  <th className="pb-2 text-right font-semibold">Weight</th>
                  <th className="pb-2 text-right font-semibold">Body fat</th>
                  <th className="pb-2 text-right font-semibold">Waist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fn-border">
                {entries.slice(0, 10).map(e => (
                  <tr key={e.date} className="hover:bg-fn-bg-alt transition-colors">
                    <td className="py-2.5 text-fn-ink font-medium">{e.date}</td>
                    <td className="py-2.5 text-right text-fn-muted">
                      {e.weight != null ? `${(e.weight * wFactor).toFixed(1)} ${wUnit}` : "—"}
                    </td>
                    <td className="py-2.5 text-right text-fn-muted">
                      {e.body_fat_percent != null ? `${e.body_fat_percent}%` : "—"}
                    </td>
                    <td className="py-2.5 text-right text-fn-muted">
                      {e.measurements?.waist != null ? `${e.measurements.waist} cm` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 flex gap-3">
        <Link href="/progress/add"><Button>Add measurement</Button></Link>
        <Link href="/progress"><Button variant="secondary">Progress overview</Button></Link>
      </div>
    </div>
  );
}
