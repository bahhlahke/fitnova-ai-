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
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Progress Snapshot
        </p>
        <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-white">
          7-Day Training Load
        </h2>
        <div className="mt-8 flex h-40 items-end gap-3">
          {last7Days.map((value, index) => (
            <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-xl bg-white/10 transition-colors hover:bg-fn-accent/40"
                style={{ height: `${Math.max(14, (value / maxValue) * 100)}%` }}
              />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-fn-muted">
                D{7 - index}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/progress">
            <Button variant="secondary">Open Progress</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Projection
        </p>
        {projection ? (
          <>
            <p className="mt-6 text-5xl font-black italic tracking-tighter text-white">
              {formatDisplayNumber(toDisplayWeight(projection.projected_12w, unitSystem), 1)}
              <span className="text-xl ml-1">{weightUnitLabel(unitSystem)}</span>
            </p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">
              {Math.round(projection.confidence * 100)}% confidence
            </p>
            <p className="mt-6 text-sm font-medium leading-relaxed text-fn-muted">
              4-week projection: {formatDisplayNumber(toDisplayWeight(projection.projected_4w, unitSystem), 1)} {weightUnitLabel(unitSystem)}. Dashboard and
              progress views will refresh after AI biometric logs.
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
