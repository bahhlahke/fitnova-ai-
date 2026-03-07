import Link from "next/link";
import { Button } from "@/components/ui/Button";

export type DashboardWeeklyPlanSummary = {
  week_start_local: string;
  cycle_goal: string;
  adaptation_summary: string;
  days: Array<{
    date_local: string;
    day_label: string;
    focus: string;
    intensity: "low" | "moderate" | "high";
    target_duration_minutes: number;
  }>;
};

export type DashboardPerformanceAnalytics = {
  period_days: number;
  workout_days: number;
  workout_minutes: number;
  estimated_total_sets: number;
  push_pull_balance: number;
  nutrition_compliance: number | null;
  recovery_debt: number;
};

export interface DashboardAnalyticsSectionProps {
  weeklyPlan: DashboardWeeklyPlanSummary | null;
  weeklyPlanLoading: boolean;
  analytics: DashboardPerformanceAnalytics | null;
  analyticsLoading: boolean;
}

export function DashboardAnalyticsSection({
  weeklyPlan,
  weeklyPlanLoading,
  analytics,
  analyticsLoading,
}: DashboardAnalyticsSectionProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
          Weekly Microcycle
        </p>
        {weeklyPlanLoading ? (
          <div className="mt-8 h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
        ) : weeklyPlan ? (
          <>
            <h2 className="mt-4 font-display text-4xl font-black uppercase italic tracking-tighter text-white leading-none">
              {weeklyPlan.cycle_goal}
            </h2>
            <p className="mt-6 text-base font-medium leading-relaxed text-fn-muted">
              {weeklyPlan.adaptation_summary}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-left">
              {weeklyPlan.days.slice(0, 7).map((day) => (
                <div key={day.date_local} className="rounded-xl border border-white/[0.08] bg-black/40 px-5 py-4 transition-all hover:bg-black/60">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent">
                    {day.day_label}
                  </p>
                  <p className="mt-2 text-base font-black text-white italic truncate uppercase">{day.focus}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-fn-ink/40">
                    {day.target_duration_minutes} min · {day.intensity}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-5 text-sm text-fn-muted">No weekly microcycle generated yet.</p>
        )}
      </div>

      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
          Performance Index
        </p>
        {analyticsLoading ? (
          <div className="mt-8 h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
        ) : analytics ? (
          <>
            <ul className="mt-8 space-y-3">
              {[
                {
                  label: "Active Days",
                  value: `${analytics.workout_days} of ${analytics.period_days} Days`,
                  sub: "last 14 days"
                },
                {
                  label: "Training Volume",
                  value: `${analytics.estimated_total_sets} Sets`,
                  sub: "estimated"
                },
                {
                  label: "Push / Pull Balance",
                  value: analytics.push_pull_balance === 1
                    ? "Balanced"
                    : analytics.push_pull_balance > 1.5
                      ? `${analytics.push_pull_balance}:1 Push-Heavy`
                      : analytics.push_pull_balance < 0.67
                        ? `1:${(1 / analytics.push_pull_balance).toFixed(1)} Pull-Heavy`
                        : `${analytics.push_pull_balance}:1`,
                  sub: "push-to-pull ratio"
                },
                {
                  label: "Recovery Debt",
                  value: `${Math.round(analytics.recovery_debt * 100)}%`,
                  sub: analytics.recovery_debt < 0.3 ? "well recovered" : analytics.recovery_debt < 0.6 ? "moderate fatigue" : "high fatigue"
                },
                ...(analytics.nutrition_compliance != null ? [{
                  label: "Nutrition Compliance",
                  value: `${Math.round(analytics.nutrition_compliance * 100)}%`,
                  sub: "vs calorie target"
                }] : []),
              ].map((item) => (
                <li key={item.label} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/40 px-5 py-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-fn-ink/40">{item.label}</span>
                    {item.sub && <p className="text-[9px] text-fn-muted/40 mt-0.5 uppercase tracking-wider">{item.sub}</p>}
                  </div>
                  <span className="text-sm font-black text-white italic">{item.value}</span>
                </li>
              ))}
            </ul>
            <Link href="/progress" className="mt-6 inline-block">
              <Button variant="secondary">Open Progress Analytics</Button>
            </Link>
          </>
        ) : (
          <p className="mt-5 text-sm text-fn-muted">Analytics will appear as activity data accumulates.</p>
        )}
      </div>
    </section>
  );
}
