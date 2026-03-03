import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BodyHeatmap } from "@/components/tracking/BodyHeatmap";
import type { MuscleReadiness } from "@/lib/workout/recovery";

export interface DashboardReadinessSectionProps {
  recoverySuggestion: string | null;
  readinessInsight: string | null;
  readinessInsightLoading: boolean;
  readiness?: Partial<MuscleReadiness>;
}

export function DashboardReadinessSection({
  recoverySuggestion,
  readinessInsight,
  readinessInsightLoading,
  readiness = {},
}: DashboardReadinessSectionProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative flex h-5 w-10 items-center justify-start rounded bg-fn-bg-alt border border-fn-border p-[2px]">
              <div className={`h-full rounded-[2px] transition-all duration-1000 ${recoverySuggestion?.toLowerCase().includes("optimal") || !recoverySuggestion
                ? "w-full bg-fn-accent shadow-[0_0_10px_rgba(10,217,196,0.5)]"
                : recoverySuggestion?.toLowerCase().includes("moderate")
                  ? "w-2/3 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                  : "w-1/3 bg-fn-danger shadow-[0_0_10px_rgba(255,59,48,0.5)]"
                }`} />
              <div className="absolute -right-[3px] top-[4px] bottom-[4px] w-[2px] rounded-r bg-fn-border" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
              Readiness
            </p>
          </div>
          <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-white">
            {recoverySuggestion ?? "Optimal recovery detected"}
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-fn-muted">
            Use the check-in flow to refine today&apos;s recommendations with energy,
            soreness, and sleep data.
          </p>

          {readinessInsightLoading ? (
            <div className="mt-6 h-14 rounded-3xl bg-white/5" />
          ) : readinessInsight ? (
            <div className="mt-6 rounded-3xl border border-white/5 bg-black/20 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">
                Recovery Signal
              </p>
              <p className="mt-3 text-sm font-medium italic leading-relaxed text-fn-muted">
                {readinessInsight}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <Link href="/check-in">
            <Button className="w-full">Open Daily Check-In</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent mb-6">
          Muscle Readiness Heatmap
        </p>
        <BodyHeatmap readiness={readiness} />
        <p className="mt-4 text-[10px] text-center text-fn-muted uppercase tracking-widest">
          Based on last 28 days of training (ACWR)
        </p>
      </div>
    </section>
  );
}
