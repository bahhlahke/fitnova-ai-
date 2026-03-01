"use client";

import type { ProgressionAnalytics } from "@/lib/analytics/progression";

export interface ProgressionChartsProps {
  analytics: ProgressionAnalytics | null;
  loading?: boolean;
}

function trendClass(value: number): string {
  if (value >= 2) return "text-fn-accent";
  if (value <= -2) return "text-fn-danger";
  return "text-fn-muted";
}

export function ProgressionCharts({ analytics, loading = false }: ProgressionChartsProps) {
  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/5" />;
  }

  if (!analytics || analytics.metrics.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-sm text-fn-muted">
        Progression charts will appear after a few logged sessions with set load data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">Progression Summary</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {analytics.metrics.slice(0, 6).map((metric) => (
            <div key={metric.exercise_name} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-widest text-white">{metric.exercise_name}</p>
              <p className="mt-2 text-sm text-fn-muted">E1RM {metric.current_e1rm} kg</p>
              <p className={`text-xs font-semibold ${trendClass(metric.trend_pct)}`}>
                {metric.trend_pct >= 0 ? "+" : ""}
                {metric.trend_pct}% trend
              </p>
              <p className="mt-1 text-xs text-fn-muted">Volume {metric.volume_landmark}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">E1RM Timeline</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-fn-muted">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-fn-muted">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Exercise</th>
                <th className="px-2 py-2">E1RM</th>
                <th className="px-2 py-2">Volume</th>
              </tr>
            </thead>
            <tbody>
              {analytics.trend_points.slice(-14).map((point, index) => (
                <tr key={`${point.date}-${point.exercise_name}-${index}`} className="border-b border-white/5">
                  <td className="px-2 py-2">{point.date}</td>
                  <td className="px-2 py-2">{point.exercise_name}</td>
                  <td className="px-2 py-2">{point.e1rm} kg</td>
                  <td className="px-2 py-2">{point.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
