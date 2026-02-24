"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  PageLayout,
  Card,
  CardHeader,
  Button,
  LoadingState,
  EmptyState,
} from "@/components/ui";

type Entry = {
  date: string;
  weight?: number;
  body_fat_percent?: number;
  measurements?: Record<string, number>;
  notes?: string;
};

export default function ProgressPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
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
        .select("date, weight, body_fat_percent, measurements, notes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30)
        .then(
          ({ data }) => {
            setEntries((data ?? []) as Entry[]);
            setLoading(false);
          },
          () => setLoading(false)
        );
    }).then(undefined, () => setLoading(false));
  }, []);

  const weights = entries.filter((e) => e.weight != null) as { date: string; weight: number }[];
  const latestWeight = weights[0]?.weight;
  const previousWeight = weights[1]?.weight;
  const trend =
    latestWeight != null && previousWeight != null
      ? latestWeight < previousWeight
        ? "down"
        : latestWeight > previousWeight
          ? "up"
          : "stable"
      : null;

  const latestEntry = entries[0];
  const latestBodyFat = latestEntry?.body_fat_percent;
  const latestMeasurements = latestEntry?.measurements && typeof latestEntry.measurements === "object"
    ? (latestEntry.measurements as Record<string, number>)
    : null;

  return (
    <PageLayout
      title="Progress"
      subtitle="Weight, measurements, and insights"
    >
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <Card>
            <CardHeader title="Weight" />
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
          </Card>

          {latestBodyFat != null && (
            <Card className="mt-4">
              <CardHeader title="Body fat" />
              <p className="mt-2 text-xl font-semibold text-white">{latestBodyFat}%</p>
            </Card>
          )}

          {latestMeasurements && Object.keys(latestMeasurements).length > 0 && (
            <Card className="mt-4">
              <CardHeader title="Measurements (cm)" />
              <ul className="mt-2 space-y-1 text-sm text-white">
                {Object.entries(latestMeasurements).map(([key, value]) => (
                  <li key={key}>
                    <span className="capitalize">{key}</span>: {value} cm
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="mt-4">
            <CardHeader title="Weight trend" />
            <div className="mt-4 h-32 flex items-end gap-1">
              {weights.slice(0, 14).reverse().map((e) => (
                <div
                  key={e.date}
                  className="flex-1 rounded-t bg-fn-teal/60 min-h-[4px]"
                  style={{
                    height: `${Math.max(8, (e.weight / (Math.max(...weights.map((x) => x.weight), 1) || 1)) * 80)}%`,
                  }}
                  title={`${e.date}: ${e.weight} kg`}
                />
              ))}
            </div>
            {weights.length === 0 && (
              <EmptyState
                className="py-4"
                message="Add progress entries to see a trend."
              />
            )}
          </Card>

          <Card className="mt-4">
            <CardHeader title="Recent entries" />
            {entries.length === 0 ? (
              <EmptyState
                className="py-4"
                message="No entries yet."
              />
            ) : (
              <ul className="mt-2 space-y-2">
                {entries.slice(0, 10).map((e) => (
                  <li key={e.date} className="flex justify-between text-sm text-white">
                    <span>{e.date}</span>
                    <span>
                      {[
                        e.weight != null ? `${e.weight} kg` : "",
                        e.body_fat_percent != null ? `${e.body_fat_percent}%` : "",
                        e.notes ?? "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/progress/add" className="mt-4 inline-block">
              <Button>Add entry</Button>
            </Link>
          </Card>
        </>
      )}
    </PageLayout>
  );
}
