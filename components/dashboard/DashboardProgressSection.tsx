import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { type UnitSystem, formatDisplayNumber, toDisplayWeight, weightUnitLabel } from "@/lib/units";

export interface DashboardProjection {
  current: number;
  projected_4w: number;
  projected_12w: number;
  confidence: number;
}

export interface DashboardProgressSectionProps {
  last7Days: number[];
  projection: DashboardProjection | null;
  unitSystem: UnitSystem;
}

export function DashboardProgressSection({
  last7Days,
  projection,
  unitSystem,
}: DashboardProgressSectionProps) {
  const maxValue = Math.max(...last7Days, 1);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
          Biometric Trend
        </p>
        <h2 className="mt-4 font-display text-4xl font-black uppercase italic tracking-tighter text-white leading-none">
          Weekly Load Analysis
        </h2>
        <div className="mt-8 flex h-40 items-end gap-3">
          {last7Days.map((value, index) => (
            <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-3">
              <div
                className="w-full rounded-t-lg bg-white/5 transition-all duration-300 hover:bg-fn-accent/30 hover:shadow-[0_0_15px_rgba(10,217,196,0.2)]"
                style={{ height: `${Math.max(14, (value / maxValue) * 100)}%` }}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-ink/40">
                D{7 - index}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/progress">
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">Detailed Analytics</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
          AI Projection
        </p>
        {projection ? (
          <>
            <p className="mt-8 text-6xl font-black italic tracking-tighter text-white leading-none">
              {formatDisplayNumber(toDisplayWeight(projection.projected_12w, unitSystem), 1)}
              <span className="text-xl ml-2 font-black uppercase tracking-widest text-fn-ink/40">{weightUnitLabel(unitSystem)}</span>
            </p>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] text-fn-accent">
              {Math.round(projection.confidence * 100)}% Precision Confidence
            </p>
            <p className="mt-8 text-base font-medium leading-relaxed text-fn-muted">
              4-week projection: {formatDisplayNumber(toDisplayWeight(projection.projected_4w, unitSystem), 1)} {weightUnitLabel(unitSystem)}. Data will refresh after subsequent biometric calibration.
            </p>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium leading-relaxed text-fn-muted mb-5">
              Log your first weight to unlock your AI trend projection.
            </p>
            <div className="flex gap-3 w-full max-w-[240px]">
              <Link href="/progress/add" className="w-full">
                <Button className="w-full min-h-[48px] shadow-[0_0_20px_rgba(255,255,255,0.1)]">Manual Entry</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
