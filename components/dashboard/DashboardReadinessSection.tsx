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
      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative flex h-6 w-12 items-center justify-start rounded-md bg-fn-bg-alt border border-white/[0.08] p-[3px]">
              <div className={`h-full rounded-sm transition-all duration-1000 ${recoverySuggestion?.toLowerCase().includes("optimal") || !recoverySuggestion
                ? "w-full bg-fn-accent shadow-[0_0_15px_rgba(10,217,196,0.6)]"
                : recoverySuggestion?.toLowerCase().includes("moderate")
                  ? "w-2/3 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                  : "w-1/3 bg-fn-danger shadow-[0_0_15px_rgba(255,59,48,0.6)]"
                }`} />
              <div className="absolute -right-[3px] top-[4px] bottom-[4px] w-[2px] rounded-r bg-white/20" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
              System Readiness
            </p>
          </div>
          <h2 className="mt-4 font-display text-4xl font-black uppercase italic tracking-tighter text-white leading-none">
            {recoverySuggestion ?? "Optimal Recovery"}
          </h2>
          <p className="mt-6 text-base font-medium leading-relaxed text-fn-muted">
            Synchronize your data via the check-in flow to refine today&apos;s recommendations with local biomechanical feedback.
          </p>

          {readinessInsightLoading ? (
            <div className="mt-8 h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
          ) : readinessInsight ? (
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-black/40 p-6 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-fn-accent">
                Physiological Signal
              </p>
              <p className="mt-4 text-base font-medium italic leading-relaxed text-fn-muted">
                {readinessInsight}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <Link href="/check-in">
            <Button variant="secondary" className="w-full">Initialize Check-In</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent mb-8">
          Muscle Stress Analysis
        </p>
        <BodyHeatmap readiness={readiness} />
        <p className="mt-6 text-[10px] text-center text-fn-muted uppercase tracking-[0.2em] font-black">
          Computed via 28-day ACWR Protocol
        </p>
      </div>
    </section>
  );
}
