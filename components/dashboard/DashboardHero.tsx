import Link from "next/link";

export interface DashboardHeroProps {
  briefing: string | null;
  briefingLoading: boolean;
  isPro: boolean;
}

export function DashboardHero({
  briefing,
  briefingLoading,
  isPro,
}: DashboardHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-gradient-to-br from-fn-accent/10 to-transparent p-8 shadow-2xl backdrop-blur-3xl sm:p-10">
      <div className="absolute right-0 top-0 p-8 opacity-15">
        <svg className="h-24 w-24 text-fn-accent" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">
            Daily Command
          </p>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
            {isPro ? "Pro active" : "Free plan"}
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-black uppercase italic tracking-tighter text-white sm:text-6xl">
          Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-medium leading-relaxed text-fn-muted">
          Your central surface for AI coaching, readiness, progress, and direct
          access into nutrition and workout execution.
        </p>

        {briefingLoading ? (
          <div className="mt-6 h-16 max-w-3xl rounded-3xl bg-white/5" />
        ) : briefing ? (
          <div className="mt-6 flex items-start gap-4 rounded-3xl border border-white/5 bg-white/5 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-fn-accent/30 bg-black/30">
              <span className="text-xs font-black uppercase tracking-tight text-fn-accent">
                AI
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">
                Lead Coach Briefing
              </p>
              <p className="mt-2 text-base font-medium italic leading-relaxed text-white/90">
                &quot;{briefing}&quot;
              </p>
            </div>
          </div>
        ) : null}

        {!isPro && (
          <div className="mt-6 rounded-3xl border border-white/5 bg-black/20 p-5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-fn-accent">
              Billing now lives in Settings
            </p>
            <p className="mt-2 text-sm leading-relaxed text-fn-muted">
              Upgrade and subscription management have been moved out of the
              dashboard to keep the main command surface focused.
            </p>
            <Link
              href="/settings#billing"
              className="mt-4 inline-flex min-h-touch items-center justify-center rounded-xl border border-fn-border px-5 py-3 text-xs font-black uppercase tracking-widest text-fn-ink transition-colors hover:bg-fn-surface-hover"
            >
              Open Settings
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
