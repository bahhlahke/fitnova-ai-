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
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Weekly Microcycle
        </p>
        {weeklyPlanLoading ? (
          <div className="mt-5 h-20 rounded-2xl bg-white/5" />
        ) : weeklyPlan ? (
          <>
            <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-white">
              {weeklyPlan.cycle_goal}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-fn-muted">
              {weeklyPlan.adaptation_summary}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {weeklyPlan.days.slice(0, 6).map((day) => (
                <div key={day.date_local} className="rounded-xl border border-white/5 bg-black/20 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent">
                    {day.day_label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{day.focus}</p>
                  <p className="mt-1 text-xs text-fn-muted">
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

      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Performance Index
        </p>
        {analyticsLoading ? (
          <div className="mt-5 h-20 rounded-2xl bg-white/5" />
        ) : analytics ? (
          <>
            <ul className="mt-5 space-y-3 text-sm text-fn-muted">
              <li className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                {analytics.workout_days} workout days / {analytics.period_days} days
              </li>
              <li className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                {analytics.estimated_total_sets} estimated sets
              </li>
              <li className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                Push/pull balance {analytics.push_pull_balance}
              </li>
              <li className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                Recovery debt {Math.round(analytics.recovery_debt * 100)}%
              </li>
              {analytics.nutrition_compliance != null && (
                <li className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                  Nutrition compliance {Math.round(analytics.nutrition_compliance * 100)}%
                </li>
              )}
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
