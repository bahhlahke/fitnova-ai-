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
    <section className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card">
      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
        Primary Protocol
      </p>
      <h2 className="mt-4 font-display text-5xl font-black uppercase italic tracking-tighter text-white sm:text-6xl leading-[0.9]">
        {todayPlan?.focus ?? "Protocol not generated"}
      </h2>
      <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-fn-muted">
        {todayPlan
          ? `Nutrition target is set to ${todayPlan.calories} kcal. Open the global command to synchronize your session and fill the target gap.`
          : "Generate today’s protocol from the concierge AI section to create a focused training and nutrition plan."}
      </p>

      <div className="mt-8">
        <Link href={todayPlan ? "/log/workout/guided" : "/log/workout"}>
          <Button size="default" className="w-full sm:w-auto">
            {todayPlan ? "Execute Session" : "View Schedule"}
          </Button>
        </Link>
      </div>

      {weeklyInsightLoading ? (
        <div className="mt-8 h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
      ) : weeklyInsight ? (
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-black/40 p-6 backdrop-blur-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-fn-accent">
            Concierge Insight
          </p>
          <p className="mt-4 text-base font-medium italic leading-relaxed text-fn-muted">
            &quot;{weeklyInsight}&quot;
          </p>
        </div>
      ) : null}
    </section>
  );
}
