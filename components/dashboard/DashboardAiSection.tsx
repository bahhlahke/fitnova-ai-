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
    <section ref={sectionRef} id="dashboard-ai" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">
            Concierge Core
          </p>
          <h2 className="mt-4 font-display text-4xl font-black uppercase italic tracking-tighter text-white leading-none">
            Embedded Intelligence
          </h2>
        </div>
        <Button onClick={onGeneratePlan} loading={planLoading}>
          {hasPlanToday ? "Recalibrate My Day" : "Optimize Plan"}
        </Button>
      </div>

      <AiCoachPanel mode="embedded" autoFocus={autoFocus} />
    </section>
  );
}
