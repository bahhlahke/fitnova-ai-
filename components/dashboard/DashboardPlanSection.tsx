import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface DashboardTodayPlan {
  focus: string;
  calories: number;
}

export interface DashboardPlanSectionProps {
  todayPlan: DashboardTodayPlan | null;
  weekCount: number;
  streak: number;
  weeklyInsight: string | null;
  weeklyInsightLoading: boolean;
}

export function DashboardPlanSection({
  todayPlan,
  weekCount,
  streak,
  weeklyInsight,
  weeklyInsightLoading,
}: DashboardPlanSectionProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Today&apos;s Plan
        </p>
        <h2 className="mt-3 font-display text-4xl font-black uppercase italic tracking-tighter text-white sm:text-5xl">
          {todayPlan?.focus ?? "Protocol not generated"}
        </h2>
        <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-fn-muted">
          {todayPlan
            ? `Nutrition target is set to ${todayPlan.calories} kcal. Open the workout tab to run the session and the nutrition tab to fill the target gap.`
            : "Generate today’s protocol from the dashboard AI section to create a focused training and nutrition plan."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/log/workout">
            <Button>{todayPlan ? "Open Workout" : "Go to Workout"}</Button>
          </Link>
          <Link href="/log/nutrition">
            <Button variant="secondary">Open Nutrition</Button>
          </Link>
        </div>

        {weeklyInsightLoading ? (
          <div className="mt-6 h-14 rounded-3xl bg-white/5" />
        ) : weeklyInsight ? (
          <div className="mt-6 rounded-3xl border border-white/5 bg-black/20 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">
              Weekly Insight
            </p>
            <p className="mt-3 text-sm font-medium italic leading-relaxed text-fn-muted">
              &quot;{weeklyInsight}&quot;
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-[2rem] border border-fn-accent/20 bg-fn-accent/5 p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Adherence
        </p>
        <div className="mt-6 flex items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted">
              Weekly Volume
            </p>
            <p className="mt-2 text-6xl font-black italic text-white">{weekCount}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted">
              Streak
            </p>
            <p className="mt-2 text-6xl font-black italic text-fn-accent">{streak}</p>
          </div>
        </div>
        <div className="mt-8 h-3 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-fn-accent transition-all duration-700"
            style={{ width: `${Math.min(100, (weekCount / 5) * 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}
