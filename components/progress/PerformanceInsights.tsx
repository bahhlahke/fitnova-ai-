"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, LoadingState } from "@/components/ui";

interface Insight {
  title: string;
  description: string;
  type: "recovery" | "performance" | "consistency" | "composition";
}

export function PerformanceInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/ai/unique-insights", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.insights) {
          setInsights(data.insights);
        }
      })
      .catch((err) => console.error("Failed to load insights", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (insights.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight, idx) => (
        <div
          key={idx}
          className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-5 transition-all hover:bg-black/60 shadow-fn-soft"
        >
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-fn-accent/5 blur-2xl group-hover:bg-fn-accent/10 transition-all" />
          <div className="flex items-start gap-3">
            <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
              insight.type === 'performance' ? 'bg-fn-accent' :
              insight.type === 'recovery' ? 'bg-blue-400' :
              insight.type === 'composition' ? 'bg-purple-400' : 'bg-fn-muted'
            }`} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-ink/40 mb-1">
                {insight.type} insight
              </p>
              <h4 className="text-sm font-black text-white italic uppercase mb-2">
                {insight.title}
              </h4>
              <p className="text-xs leading-relaxed text-fn-muted">
                {insight.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
