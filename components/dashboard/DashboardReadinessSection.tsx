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
  const isOptimal =
    recoverySuggestion?.toLowerCase().includes("optimal") || !recoverySuggestion;
  const isModerate = recoverySuggestion?.toLowerCase().includes("moderate");

  const statusColor = isOptimal
    ? "text-fn-accent"
    : isModerate
      ? "text-amber-400"
      : "text-fn-danger";

  const statusDotClass = isOptimal
    ? "w-full bg-fn-accent shadow-[0_0_15px_rgba(10,217,196,0.6)]"
    : isModerate
      ? "w-2/3 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
      : "w-1/3 bg-fn-danger shadow-[0_0_15px_rgba(255,59,48,0.6)]";

  return (
    <section className="space-y-4">
      {/* System Readiness Card */}
      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-6 shadow-fn-card">
        <div className="flex items-center gap-3">
          <div className="relative flex h-6 w-12 items-center justify-start rounded-md bg-fn-bg-alt border border-white/[0.08] p-[3px]">
            <div className={`h-full rounded-sm transition-all duration-1000 ${statusDotClass}`} />
          </div>
          <p className={`text-[11px] font-black uppercase tracking-[0.4em] ${statusColor}`}>
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

      {/* Muscle Stress Analysis Card */}
      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-6 shadow-fn-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Pulse icon */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-fn-accent/20 bg-fn-accent/5">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-fn-accent" stroke="currentColor" strokeWidth="2">
                <polyline points="2,12 6,12 8,4 10,20 12,10 14,16 16,12 22,12" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fn-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fn-accent" />
              </span>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent leading-none">
                Muscle Stress Analysis
              </p>
              <p className="text-[9px] font-medium uppercase tracking-widest text-white/25 mt-0.5">
                10 Muscle Groups · ATL/CTL Ratio
              </p>
            </div>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Live</span>
          </div>
        </div>

        {/* Body Heatmap */}
        <BodyHeatmap
          readiness={readiness as MuscleReadiness}
          className="w-full"
        />
      </div>
    </section>
  );
}
