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
    ? "w-full bg-fn-accent shadow-[0_0_20px_rgba(10,217,196,0.8)]"
    : isModerate
      ? "w-2/3 bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
      : "w-1/3 bg-fn-danger shadow-[0_0_20px_rgba(255,59,48,0.8)]";

  return (
    <section className="space-y-6">
      {/* System Readiness Card */}
      <div className="premium-panel p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <svg viewBox="0 0 24 24" fill="none" className="h-32 w-32 border-none text-white" stroke="currentColor" strokeWidth="1">
            <polyline points="2,12 6,12 8,4 10,20 12,10 14,16 16,12 22,12" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex h-8 w-16 items-center justify-start rounded-full bg-black/40 border border-white/10 p-[4px]">
              <div className={`h-full rounded-full transition-all duration-1000 ${statusDotClass}`} />
            </div>
            <p className={`text-[12px] font-black uppercase tracking-[0.5em] ${statusColor}`}>
              Neuromuscular Readiness
            </p>
          </div>

          <h2 className="premium-headline text-4xl sm:text-6xl leading-[0.9] mb-6">
            {recoverySuggestion ?? "Ready for High Intensity"}
          </h2>

          {readinessInsight ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-fn-accent animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">Neural Insights</p>
              </div>
              <p className="text-sm font-medium italic text-white/60 leading-relaxed">
                "{readinessInsight}"
              </p>
            </div>
          ) : null}

          <div className="mt-8">
            <Link href="/check-in">
              <Button variant="secondary" className="w-full h-14 bg-white/5 border-white/10 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-widest shadow-xl">
                Recalibrate Readiness
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Muscle Stress Analysis Card */}
      <div className="premium-panel p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            {/* Pulse icon */}
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-fn-accent/20 bg-fn-accent/5">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-fn-accent" stroke="currentColor" strokeWidth="2">
                <polyline points="2,12 6,12 8,4 10,20 12,10 14,16 16,12 22,12" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fn-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-fn-accent" />
              </span>
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-fn-accent leading-none">
                Structural Integrity
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mt-1.5">
                localized fatigue gradients · ATL:CTL
              </p>
            </div>
          </div>
          <div className="premium-badge">
            Live
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
