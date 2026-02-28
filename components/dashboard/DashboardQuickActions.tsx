import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface DashboardQuickActionsProps {
  hasPlanToday: boolean;
  hasWorkoutToday: boolean;
}

export function DashboardQuickActions({
  hasPlanToday,
  hasWorkoutToday,
}: DashboardQuickActionsProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Intelligence Feed
        </p>
        <ul className="mt-6 space-y-3">
          <li className="rounded-3xl border border-white/5 bg-white/5 p-5 text-sm font-medium leading-relaxed text-fn-muted">
            {hasPlanToday
              ? "Today’s protocol is live. Use the workout and nutrition tabs to execute without leaving the four-tab flow."
              : "No daily protocol is active yet. Generate one from the embedded coach section above."}
          </li>
          <li className="rounded-3xl border border-white/5 bg-white/5 p-5 text-sm font-medium leading-relaxed text-fn-muted">
            {hasWorkoutToday
              ? "A workout is already logged for today. Use the dashboard AI if you need to adjust nutrition or recovery."
              : "No workout logged today yet. The workout tab owns guided sessions, quick logging, and motion analysis."}
          </li>
        </ul>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Tab Shortcuts
        </p>
        <div className="mt-6 grid gap-3">
          <Link href="/log/nutrition">
            <Button className="w-full">Nutrition Tab</Button>
          </Link>
          <Link href="/log/workout">
            <Button variant="secondary" className="w-full">
              Workout Tab
            </Button>
          </Link>
          <Link href="/history?tab=nutrition">
            <Button variant="ghost" className="w-full border border-white/10">
              Nutrition History
            </Button>
          </Link>
          <Link href="/history?tab=workouts">
            <Button variant="ghost" className="w-full border border-white/10">
              Workout History
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
