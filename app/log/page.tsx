import Link from "next/link";
import { Card } from "@/components/ui";

export default function LogPage() {
  return (
    <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Data capture</p>
        <h1 className="mt-2 font-display text-4xl text-fn-ink">Log training and nutrition</h1>
        <p className="mt-2 text-fn-muted">Consistent logging improves plan adaptation and insight quality.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/history" className="group order-last sm:order-none sm:col-span-2">
          <Card padding="lg" className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-fn-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fn-muted">History</p>
            <h2 className="mt-2 text-xl font-semibold text-fn-ink">Workout & nutrition history</h2>
            <p className="mt-2 text-sm text-fn-muted">Browse past sessions and meals by date.</p>
          </Card>
        </Link>
        <Link href="/log/workout" className="group">
          <Card padding="lg" className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-fn-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fn-muted">Workout</p>
            <h2 className="mt-2 text-xl font-semibold text-fn-ink">Guided or quick log</h2>
            <p className="mt-2 text-sm text-fn-muted">Start a structured session or capture your completed work in seconds.</p>
          </Card>
        </Link>

        <Link href="/log/nutrition" className="group">
          <Card padding="lg" className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-fn-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fn-muted">Nutrition</p>
            <h2 className="mt-2 text-xl font-semibold text-fn-ink">Meal timeline and macros</h2>
            <p className="mt-2 text-sm text-fn-muted">Track meals quickly and let AI evaluate your daily target gap.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
