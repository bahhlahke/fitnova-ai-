"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ProgressPage() {
  const [entries, setEntries] = useState<{ date: string; weight?: number; notes?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      supabase
        .from("progress_tracking")
        .select("date, weight, notes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30)
        .then(({ data }) => {
          setEntries((data ?? []) as { date: string; weight?: number; notes?: string }[]);
          setLoading(false);
        });
    });
  }, []);

  const weights = entries.filter((e) => e.weight != null) as { date: string; weight: number }[];
  const latestWeight = weights[0]?.weight;
  const previousWeight = weights[1]?.weight;
  const trend = latestWeight != null && previousWeight != null ? (latestWeight < previousWeight ? "down" : latestWeight > previousWeight ? "up" : "stable") : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="mt-1 text-fn-muted">Weight, measurements, and insights</p>
      </header>

      {loading ? (
        <p className="text-fn-muted">Loading…</p>
      ) : (
        <>
          <section className="rounded-xl border border-fn-border bg-fn-surface p-4">
            <h2 className="text-sm font-medium text-fn-muted">Weight</h2>
            {latestWeight != null ? (
              <>
                <p className="mt-2 text-2xl font-bold text-white">{latestWeight} kg</p>
                {trend && (
                  <p className="mt-1 text-sm text-fn-muted">
                    {trend === "down" && "Trending down"}
                    {trend === "up" && "Trending up"}
                    {trend === "stable" && "Stable"} vs previous entry
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-fn-muted">No weight entries yet.</p>
            )}
          </section>

          <section className="mt-4 rounded-xl border border-fn-border bg-fn-surface p-4">
            <h2 className="text-sm font-medium text-fn-muted">Chart placeholder</h2>
            <div className="mt-4 h-32 flex items-end gap-1">
              {weights.slice(0, 14).reverse().map((e, i) => (
                <div
                  key={e.date}
                  className="flex-1 rounded-t bg-fn-teal/60 min-h-[4px]"
                  style={{ height: `${Math.max(8, (e.weight / (Math.max(...weights.map((x) => x.weight), 1) || 1)) * 80)}%` }}
                  title={`${e.date}: ${e.weight} kg`}
                />
              ))}
              {weights.length === 0 && <p className="text-sm text-fn-muted">Add progress entries to see a trend.</p>}
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-fn-border bg-fn-surface p-4">
            <h2 className="text-sm font-medium text-fn-muted">Recent entries</h2>
            {entries.length === 0 ? (
              <p className="mt-2 text-fn-muted">No entries yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {entries.slice(0, 10).map((e) => (
                  <li key={e.date} className="flex justify-between text-sm text-white">
                    <span>{e.date}</span>
                    <span>{e.weight != null ? `${e.weight} kg` : e.notes ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/progress/add" className="mt-4 inline-block min-h-touch rounded-lg bg-fn-teal px-4 py-2 text-sm font-medium text-fn-black">
              Add entry
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
