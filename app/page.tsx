"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageLayout, Card, CardHeader, Button, LoadingState } from "@/components/ui";

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [weekCount, setWeekCount] = useState<number | null>(null);
  const [last7Days, setLast7Days] = useState<number[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setWeekCount(0);
        setLast7Days([]);
        setOnboardingComplete(false);
        setLoading(false);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const weekStart = getWeekStart(new Date());

      Promise.all([
        supabase
          .from("workout_logs")
          .select("date", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("date", weekStart)
          .lte("date", today),
        supabase
          .from("workout_logs")
          .select("date")
          .eq("user_id", user.id)
          .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .lte("date", today)
          .order("date", { ascending: true }),
        supabase
          .from("onboarding")
          .select("completed_at")
          .eq("user_id", user.id)
          .not("completed_at", "is", null)
          .limit(1)
          .maybeSingle(),
      ]).then(
        ([weekRes, last7Res, onboardingRes]) => {
          if (weekRes.count != null) setWeekCount(weekRes.count);
          else setWeekCount(0);

          const byDate: Record<string, number> = {};
          (last7Res.data ?? []).forEach((row: { date: string }) => {
            byDate[row.date] = (byDate[row.date] ?? 0) + 1;
          });
          const days: number[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            days.push(byDate[key] ?? 0);
          }
          setLast7Days(days);

          setOnboardingComplete(!!onboardingRes.data);
          setLoading(false);
        },
        () => setLoading(false)
      );
    }).then(undefined, () => setLoading(false));
  }, []);

  return (
    <PageLayout
      title={
        <>
          FitNova <span className="text-fn-teal">AI</span>
        </>
      }
      subtitle="Your progress at a glance"
    >
      <section className="space-y-4" aria-label="Dashboard summary">
        <Card>
          <CardHeader title="This week" />
          {loading ? (
            <LoadingState className="mt-2" />
          ) : (
            <>
              <p className="mt-2 text-2xl font-semibold text-white">
                {weekCount ?? 0} workout{(weekCount ?? 0) === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-fn-muted mt-1">Last 7 days</p>
              <div className="mt-4 h-12 flex items-end gap-1">
                {last7Days.map((n, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-fn-teal/60 min-h-[4px]"
                    style={{
                      height: `${Math.max(8, (n / Math.max(...last7Days, 1)) * 100)}%`,
                    }}
                    title={`${n} workout(s)`}
                  />
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/log/workout">
              <Button variant="primary">Start workout</Button>
            </Link>
            <Link href="/coach">
              <Button variant="secondary">Ask coach</Button>
            </Link>
            {onboardingComplete === false && (
              <Link href="/onboarding">
                <Button variant="secondary">Onboarding</Button>
              </Link>
            )}
            <Link href="/progress">
              <Button variant="secondary">Progress</Button>
            </Link>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}
