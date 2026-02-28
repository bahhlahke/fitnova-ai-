import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface DashboardReadinessSectionProps {
  recoverySuggestion: string | null;
  readinessInsight: string | null;
  readinessInsightLoading: boolean;
}

export function DashboardReadinessSection({
  recoverySuggestion,
  readinessInsight,
  readinessInsightLoading,
}: DashboardReadinessSectionProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Readiness
        </p>
        <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-white">
          {recoverySuggestion ?? "Optimal recovery detected"}
        </h2>
        <p className="mt-4 text-sm font-medium leading-relaxed text-fn-muted">
          Use the check-in flow to refine today&apos;s recommendations with energy,
          soreness, and sleep data.
        </p>

        {readinessInsightLoading ? (
          <div className="mt-6 h-14 rounded-3xl bg-white/5" />
        ) : readinessInsight ? (
          <div className="mt-6 rounded-3xl border border-white/5 bg-black/20 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">
              Recovery Signal
            </p>
            <p className="mt-3 text-sm font-medium italic leading-relaxed text-fn-muted">
              {readinessInsight}
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Actions
        </p>
        <div className="mt-6 grid gap-3">
          <Link href="/check-in">
            <Button className="w-full">Open Daily Check-In</Button>
          </Link>
          <Link href="/progress/scan">
            <Button variant="secondary" className="w-full">
              Run Body Comp Scan
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
