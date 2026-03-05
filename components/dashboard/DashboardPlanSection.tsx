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
    <section className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-6 shadow-fn-card">
      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
        Primary Protocol
      </p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase italic tracking-tighter text-white sm:text-5xl leading-[0.9]">
        {todayPlan?.focus ?? "Protocol not generated"}
      </h2>
      <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-fn-muted">
        {todayPlan
          ? `Nutrition target is set to ${todayPlan.calories} kcal. Open the global command to synchronize your session.`
          : "Generate today’s protocol from the concierge AI section."}
      </p>

      <div className="mt-6">
        <Link href={todayPlan ? "/log/workout/guided" : "/log/workout"}>
          <Button size="default" className="w-full sm:w-auto h-11 px-8">
            {todayPlan ? "Execute Session" : "View Schedule"}
          </Button>
        </Link>
      </div>

      {weeklyInsight ? (
        <div className="mt-6 rounded-2xl border border-white/[0.05] bg-black/20 p-5 backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">
            Concierge Insight
          </p>
          <p className="mt-3 text-sm font-medium italic leading-relaxed text-fn-muted">
            &quot;{weeklyInsight}&quot;
          </p>
        </div>
      ) : null}
    </section>
  );
}
