"use client";

import { useEffect, useRef } from "react";
import { AiCoachPanel } from "@/components/ai/AiCoachPanel";
import { Button } from "@/components/ui/Button";

export interface DashboardAiSectionProps {
  autoFocus: boolean;
  planLoading: boolean;
  hasPlanToday: boolean;
  onGeneratePlan: () => void;
}

export function DashboardAiSection({
  autoFocus,
  planLoading,
  hasPlanToday,
  onGeneratePlan,
}: DashboardAiSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [autoFocus]);

  return (
    <section ref={sectionRef} id="dashboard-ai" className="space-y-4">
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">
          Integrated Intelligence
        </p>
        <div className="flex items-center gap-3">
          <h2 className="mt-1 font-display text-2xl font-black uppercase italic tracking-tighter text-white leading-none sm:text-3xl">
            Concierge Core
          </h2>
          {hasPlanToday && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
              Calibrated
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Button onClick={onGeneratePlan} loading={planLoading} size="sm" className="h-9 px-4">
          {hasPlanToday ? "Recalibrate My Day" : "Generate Protocol"}
        </Button>
        {hasPlanToday && (
          <p className="text-[9px] font-bold uppercase tracking-tight text-fn-muted/60">
            Refresh insights based on current metrics
          </p>
        )}
      </div>

      <AiCoachPanel mode="embedded" autoFocus={autoFocus} />
    </section>
  );
}
