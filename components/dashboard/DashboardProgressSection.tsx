import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { type UnitSystem, formatDisplayNumber, toDisplayWeight, weightUnitLabel } from "@/lib/units";

export interface DashboardProjection {
  current: number;
  projected_4w: number;
  projected_12w: number;
  rate?: number;
  confidence: number;
}

export interface DashboardProgressSectionProps {
  last7Days: number[];
  projection: DashboardProjection | null;
  unitSystem: UnitSystem;
}

function ProjectionChart({ projection, unitSystem }: { projection: DashboardProjection; unitSystem: UnitSystem }) {
  const W = 300;
  const H = 120;
  const PAD = { top: 20, right: 20, bottom: 20, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const pts = [
    { label: "Now", week: 0, val: projection.current },
    { label: "+4w", week: 4, val: projection.projected_4w },
    { label: "+12w", week: 12, val: projection.projected_12w },
  ];
  const vals = pts.map((p) => p.val);
  const minV = Math.min(...vals) * 0.99;
  const maxV = Math.max(...vals) * 1.01;
  const xScale = (w: number) => PAD.left + (w / 12) * chartW;
  const yScale = (v: number) => PAD.top + chartH - ((v - minV) / (maxV - minV)) * chartH;

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.week)},${yScale(p.val)}`).join(" ");

  // Confidence band (simple upper/lower offset)
  const band = (1 - projection.confidence) * 0.04;
  const bandPath =
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.week)},${yScale(p.val * (1 + band))}`).join(" ") +
    " " +
    [...pts].reverse().map((p, i) => `${i === 0 ? "L" : "L"}${xScale(p.week)},${yScale(p.val * (1 - band))}`).join(" ") +
    " Z";

  const rateSign = (projection.rate ?? 0) >= 0 ? "+" : "";
  const rateLabel = `${rateSign}${(projection.rate ?? 0).toFixed(2)} ${weightUnitLabel(unitSystem)}/week avg. rate`;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="12-week weight projection chart">
        {/* Confidence band */}
        <path d={bandPath} fill="rgba(10,217,196,0.10)" />
        {/* Trend line */}
        <path d={linePath} fill="none" stroke="#0AD9C4" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Data points + labels */}
        {pts.map((p) => (
          <g key={p.label}>
            <circle cx={xScale(p.week)} cy={yScale(p.val)} r={4} fill="#0AD9C4" />
            <text
              x={xScale(p.week)}
              y={yScale(p.val) - 10}
              textAnchor="middle"
              fontSize="9"
              fill="white"
              fontFamily="monospace"
              fontWeight="700"
            >
              {formatDisplayNumber(toDisplayWeight(p.val, unitSystem), 1)}
            </text>
            <text
              x={xScale(p.week)}
              y={H - 4}
              textAnchor="middle"
              fontSize="8"
              fill="rgba(255,255,255,0.4)"
              fontFamily="monospace"
              fontWeight="900"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] font-mono font-semibold text-fn-muted">{rateLabel}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent">
          {Math.round(projection.confidence * 100)}% confidence
        </p>
      </div>
    </div>
  );
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
          <ProjectionChart projection={projection} unitSystem={unitSystem} />
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
