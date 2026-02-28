import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface DashboardProjection {
  current: number;
  projected_4w: number;
  projected_12w: number;
  confidence: number;
}

export interface DashboardProgressSectionProps {
  last7Days: number[];
  projection: DashboardProjection | null;
}

export function DashboardProgressSection({
  last7Days,
  projection,
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
              {projection.projected_12w}kg
            </p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">
              {Math.round(projection.confidence * 100)}% confidence
            </p>
            <p className="mt-6 text-sm font-medium leading-relaxed text-fn-muted">
              4-week projection: {projection.projected_4w}kg. Dashboard and
              progress views will refresh after AI biometric logs.
            </p>
          </>
        ) : (
          <p className="mt-6 text-sm font-medium leading-relaxed text-fn-muted">
            Add more workout and progress data to unlock the 4-week and 12-week
            projection cards.
          </p>
        )}
      </div>
    </section>
  );
}
