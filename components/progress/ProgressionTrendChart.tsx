"use client";

import type { ProgressionTrendPoint } from "@/lib/analytics/progression";
import { formatDisplayNumber } from "@/lib/units";

interface ProgressionTrendChartProps {
  points: ProgressionTrendPoint[];
  exerciseName: string;
}

export function ProgressionTrendChart({ points, exerciseName }: ProgressionTrendChartProps) {
  if (points.length < 2) return null;

  const values = points.map(p => p.e1rm);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, max);
  const range = max - min;
  const padding = Math.max(range * 0.2, 5);
  const chartMin = Math.max(0, min - padding);
  const chartMax = max + padding;
  const chartRange = chartMax - chartMin;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent mb-1">Strength Trend</p>
          <h4 className="text-lg font-black text-white italic uppercase">{exerciseName}</h4>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-ink/40">Est. 1RM Max</p>
          <p className="text-xl font-black text-white italic">{Math.round(max)} kg</p>
        </div>
      </div>
      
      <div className="h-32 flex items-end gap-1.5 relative">
        {/* Simple inline SVG for line path or bars */}
        {points.map((p, i) => {
          const height = chartRange > 0 ? ((p.e1rm - chartMin) / chartRange) * 100 : 50;
          return (
            <div key={i} className="group relative flex-1 flex flex-col justify-end h-full">
              <div 
                className="w-full bg-fn-accent/20 rounded-t-sm group-hover:bg-fn-accent/60 transition-all duration-300"
                style={{ height: `${Math.max(2, height)}%` }}
              />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-fn-surface border border-white/10 rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-xl">
                  {p.date}: {p.e1rm} kg
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[9px] font-black uppercase tracking-widest text-fn-muted/30">
        <span>{points[0].date}</span>
        <span>Est. 1RM (kg)</span>
        <span>{points[points.length-1].date}</span>
      </div>
    </div>
  );
}
