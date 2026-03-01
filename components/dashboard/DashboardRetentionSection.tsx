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
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Retention Monitor
        </p>
        <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-white">
          Daily Risk Signal
        </h2>

        {retentionLoading ? (
          <div className="mt-6 h-16 rounded-2xl bg-white/5" />
        ) : retentionRisk ? (
          <>
            <div className="mt-6 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${badgeClass}`}>
                {retentionRisk.risk_level} risk
              </span>
              <span className="text-xs font-semibold text-fn-muted">
                {Math.round(retentionRisk.risk_score * 100)}% score
              </span>
            </div>
            <p className="mt-4 text-sm font-medium leading-relaxed text-fn-muted">
              {retentionRisk.recommended_action}
            </p>
            {retentionRisk.reasons.length > 0 && (
              <ul className="mt-4 space-y-2">
                {retentionRisk.reasons.slice(0, 3).map((reason) => (
                  <li key={reason} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-fn-muted">
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-fn-muted">No retention signal available yet.</p>
        )}
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">
          Coach Nudges
        </p>
        {nudges.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {nudges.slice(0, 3).map((nudge) => (
              <li key={nudge.nudge_id} className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-fn-muted">
                {nudge.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-fn-muted">No active nudges today.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/check-in">
            <Button variant="secondary">Run Check-In</Button>
          </Link>
          <Link href="/coach/escalate">
            <Button variant="ghost" className="border border-white/10">
              Escalate to Coach
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
