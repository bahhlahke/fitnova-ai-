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
    <section className="space-y-4">
      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-6 shadow-fn-card">
        <div className="flex items-center gap-3">
          <div className="relative flex h-6 w-12 items-center justify-start rounded-md bg-fn-bg-alt border border-white/[0.08] p-[3px]">
            <div className={`h-full rounded-sm transition-all duration-1000 ${recoverySuggestion?.toLowerCase().includes("optimal") || !recoverySuggestion
              ? "w-full bg-fn-accent shadow-[0_0_15px_rgba(10,217,196,0.6)]"
              : recoverySuggestion?.toLowerCase().includes("moderate")
                ? "w-2/3 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                : "w-1/3 bg-fn-danger shadow-[0_0_15px_rgba(255,59,48,0.6)]"
              }`} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
            System Readiness
          </p>
        </div>
        <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-white leading-tight sm:text-4xl">
          {recoverySuggestion ?? "Optimal Recovery"}
        </h2>

        {readinessInsight ? (
          <div className="mt-5 rounded-xl border border-white/[0.05] bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent mb-1">Insight</p>
            <p className="text-sm font-medium italic text-fn-muted leading-relaxed">
              {readinessInsight}
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <Link href="/check-in">
            <Button variant="secondary" className="w-full h-11">Initialize Check-In</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-6 shadow-fn-card">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-6">
          Muscle Stress Analysis
        </p>
        <div className="relative h-[320px] w-full overflow-hidden" style={{ height: '320px', maxHeight: '320px' }}>
          <BodyHeatmap
            readiness={readiness as MuscleReadiness}
            className="w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}
