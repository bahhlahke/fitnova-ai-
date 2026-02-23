import Link from "next/link";

export default function LogPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Log</h1>
        <p className="mt-1 text-fn-muted">Workout & nutrition</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/log/workout"
          className="min-h-touch flex flex-col justify-center rounded-xl border border-fn-border bg-fn-surface p-6 text-left transition-colors hover:bg-fn-surface-hover focus:outline-none focus:ring-2 focus:ring-fn-teal"
        >
          <span className="text-lg" aria-hidden>◆</span>
          <span className="mt-2 font-medium text-white">Workout</span>
          <span className="text-sm text-fn-muted">Guided or quick log</span>
        </Link>
        <Link
          href="/log/nutrition"
          className="min-h-touch flex flex-col justify-center rounded-xl border border-fn-border bg-fn-surface p-6 text-left transition-colors hover:bg-fn-surface-hover focus:outline-none focus:ring-2 focus:ring-fn-teal"
        >
          <span className="text-lg" aria-hidden>◇</span>
          <span className="mt-2 font-medium text-white">Nutrition</span>
          <span className="text-sm text-fn-muted">Meals & macros</span>
        </Link>
      </div>
    </div>
  );
}
