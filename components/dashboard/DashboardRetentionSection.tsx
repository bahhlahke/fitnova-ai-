import Link from "next/link";
import { Button } from "@/components/ui/Button";

export type DashboardRetentionRisk = {
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  reasons: string[];
  recommended_action: string;
};

export type DashboardNudge = {
  nudge_id: string;
  nudge_type: string;
  message: string;
  risk_level: "low" | "medium" | "high";
};

export interface DashboardRetentionSectionProps {
  retentionRisk: DashboardRetentionRisk | null;
  retentionLoading: boolean;
  nudges: DashboardNudge[];
}

export function DashboardRetentionSection({
  retentionRisk,
  retentionLoading,
  nudges,
}: DashboardRetentionSectionProps) {
  const badgeClass =
    retentionRisk?.risk_level === "high"
      ? "bg-fn-danger-light text-fn-danger"
      : retentionRisk?.risk_level === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-fn-accent-light text-fn-accent";

  return (
    <section className="space-y-6">
      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Retention Monitor
        </p>
        <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-white">
          Risk Signal
        </h2>

        {retentionLoading ? (
          <div className="mt-6 h-16 rounded-2xl bg-white/5 animate-pulse" />
        ) : retentionRisk ? (
          <>
            <div className="mt-6 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${badgeClass}`}>
                {retentionRisk.risk_level} risk
              </span>
              <span className="text-xs font-semibold text-fn-muted">
                {Math.round(retentionRisk.risk_score * 100)}%
              </span>
            </div>
            <p className="mt-4 text-sm font-medium leading-relaxed text-fn-muted">
              {retentionRisk.recommended_action}
            </p>
          </>
        ) : null}
      </div>

      <div className="rounded-xl3 border border-white/[0.08] bg-fn-surface/40 backdrop-blur-md p-8 shadow-fn-card">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Coach Nudges
        </p>
        {nudges.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {nudges.slice(0, 2).map((nudge) => (
              <li key={nudge.nudge_id} className="rounded-xl border border-white/5 bg-black/20 p-4 text-xs text-fn-muted italic">
                &quot;{nudge.message}&quot;
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-xs text-fn-muted uppercase tracking-widest font-black opacity-30">No active nudges</p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/coach/escalate">
            <Button variant="secondary" className="w-full">Escalate to Coach</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
