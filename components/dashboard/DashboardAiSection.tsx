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
    <section ref={sectionRef} id="dashboard-ai" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
            AI Control
          </p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase italic tracking-tighter text-white">
            Embedded Coach
          </h2>
        </div>
        <Button onClick={onGeneratePlan} loading={planLoading}>
          {hasPlanToday ? "Refresh Protocol" : "Generate Protocol"}
        </Button>
      </div>

      <AiCoachPanel mode="embedded" autoFocus={autoFocus} />
    </section>
  );
}
