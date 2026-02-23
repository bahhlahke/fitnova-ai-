import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          FitNova <span className="text-fn-teal">AI</span>
        </h1>
        <p className="mt-1 text-fn-muted">Your progress at a glance</p>
      </header>

      {/* MVP dashboard wireframe — key metrics above the fold */}
      <section className="space-y-4" aria-label="Dashboard summary">
        <div className="rounded-xl border border-fn-border bg-fn-surface p-4">
          <h2 className="text-sm font-medium text-fn-muted">This week</h2>
          <p className="mt-2 text-2xl font-semibold text-white">— workouts</p>
          <p className="text-sm text-fn-muted">Progress chart placeholder</p>
        </div>
        <div className="rounded-xl border border-fn-border bg-fn-surface p-4">
          <h2 className="text-sm font-medium text-fn-muted">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/log/workout"
              className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg bg-fn-teal px-4 py-3 text-sm font-medium text-fn-black hover:bg-fn-teal-dim focus:outline-none focus:ring-2 focus:ring-white"
            >
              Start workout
            </Link>
            <Link
              href="/coach"
              className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-sm font-medium text-white hover:bg-fn-surface-hover focus:outline-none focus:ring-2 focus:ring-fn-teal"
            >
              Ask coach
            </Link>
            <Link
              href="/onboarding"
              className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-sm font-medium text-white hover:bg-fn-surface-hover focus:outline-none focus:ring-2 focus:ring-fn-teal"
            >
              Onboarding
            </Link>
            <Link
              href="/progress"
              className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-sm font-medium text-white hover:bg-fn-surface-hover focus:outline-none focus:ring-2 focus:ring-fn-teal"
            >
              Progress
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
