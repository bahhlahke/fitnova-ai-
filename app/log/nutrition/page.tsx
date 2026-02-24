"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealEntry } from "@/types";
import { PageLayout, Card, CardHeader, Button, Input, Label, EmptyState, LoadingState, ErrorMessage } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

const PROTEIN_TARGET = 150;

export default function NutritionLogPage() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [logId, setLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetch, setRefetch] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const today = toLocalDateString();

  const fetchToday = useCallback(() => {
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
      setError(null);
      supabase
        .from("nutrition_logs")
        .select("log_id, meals, total_calories")
        .eq("user_id", user.id)
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(
          ({ data }) => {
            if (data) {
              const row = data as { log_id: string; meals: MealEntry[]; total_calories?: number };
              setMeals(Array.isArray(row.meals) ? row.meals : []);
              setLogId(row.log_id);
            } else {
              setMeals([]);
              setLogId(null);
            }
            setLoading(false);
          },
          () => {
            setError("Failed to load nutrition log.");
            setLoading(false);
          }
        );
    }).then(undefined, () => {
      setError("Failed to load nutrition log.");
      setLoading(false);
    });
  }, [today]);

  useEffect(() => {
    setLoading(true);
    fetchToday();
  }, [fetchToday, refetch]);

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);
  const estimatedProtein = Math.round(meals.length * 28);
  const proteinGap = Math.max(0, PROTEIN_TARGET - estimatedProtein);

  return (
    <PageLayout title="Nutrition" subtitle="Meal timeline + macro awareness" backHref="/log" backLabel="Log">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader title="Quick add meal" subtitle="Keep entries simple and consistent" />
          <NutritionQuickAdd
            onAdded={(newLogId, newMeals) => {
              if (newLogId != null) setLogId(newLogId);
              if (newMeals != null) setMeals(newMeals);
              setRefetch((n) => n + 1);
            }}
            existingMeals={meals}
            existingLogId={logId}
          />
          {error && <ErrorMessage className="mt-3" message={error} />}
        </Card>

        <Card>
          <CardHeader title="AI nutrition check" subtitle="Based on today's entries" />
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-fn-muted">Calories logged: <span className="font-semibold text-fn-ink">{totalCalories || 0}</span></p>
            <p className="text-fn-muted">Estimated protein: <span className="font-semibold text-fn-ink">{estimatedProtein}g</span></p>
            <p className="text-fn-muted">Protein gap: <span className="font-semibold text-fn-ink">{proteinGap}g</span></p>
          </div>
          <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2 text-sm text-fn-muted">
            Next best meal: {proteinGap > 0 ? "lean protein + fiber-rich carb" : "balanced maintenance meal"}.
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="mt-6">
          <LoadingState />
        </div>
      ) : meals.length > 0 ? (
        <Card className="mt-6">
          <CardHeader title="Meal timeline" subtitle="Today" />
          <ul className="mt-3 space-y-2">
            {meals.map((meal, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-fn-border bg-fn-surface-hover p-3 text-sm text-fn-ink">
                <span>{meal.time} · {meal.description}</span>
                {meal.calories != null && <span className="text-fn-muted">{meal.calories} cal</span>}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState className="mt-6" message="No meals logged today. Use quick add above." />
      )}
    </PageLayout>
  );
}

function NutritionQuickAdd({
  onAdded,
  existingMeals,
  existingLogId,
}: {
  onAdded: (newLogId?: string | null, newMeals?: MealEntry[]) => void;
  existingMeals: MealEntry[];
  existingLogId: string | null;
}) {
  const [quickDesc, setQuickDesc] = useState("");
  const [quickCals, setQuickCals] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = toLocalDateString();
  const time = new Date().toTimeString().slice(0, 5);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickDesc.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in to add nutrition entries.");
      setSaving(false);
      return;
    }
    const calNum = quickCals.trim() ? parseInt(quickCals, 10) : undefined;
    const calories = calNum != null && Number.isFinite(calNum) && calNum >= 0 && calNum <= 50000 ? calNum : undefined;
    const newMeal: MealEntry = { time, description: quickDesc.trim(), calories };
    const updatedMeals = [...existingMeals, newMeal];
    const totalCalories = updatedMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

    if (existingLogId) {
      const { error: updateErr } = await supabase
        .from("nutrition_logs")
        .update({ meals: updatedMeals, total_calories: totalCalories || null })
        .eq("log_id", existingLogId);
      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
      setQuickDesc("");
      setQuickCals("");
      setSaving(false);
      onAdded(undefined, updatedMeals);
      return;
    }

    const { data, error: insertErr } = await supabase
      .from("nutrition_logs")
      .insert({ user_id: user.id, date: today, meals: updatedMeals, total_calories: totalCalories || null })
      .select("log_id")
      .single();
    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }
    setQuickDesc("");
    setQuickCals("");
    setSaving(false);
    onAdded((data as { log_id: string })?.log_id ?? null, updatedMeals);
  }

  return (
    <form onSubmit={handleQuickAdd} className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
      <div>
        <Label htmlFor="desc">Meal</Label>
        <Input id="desc" type="text" value={quickDesc} onChange={(e) => setQuickDesc(e.target.value)} placeholder="e.g. Greek yogurt + berries" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="cals">Calories</Label>
        <Input id="cals" type="number" value={quickCals} onChange={(e) => setQuickCals(e.target.value)} placeholder="450" className="mt-1" />
      </div>
      <Button type="submit" loading={saving} disabled={!quickDesc.trim()}>Add meal</Button>
      {error && <ErrorMessage className="sm:col-span-3" message={error} />}
    </form>
  );
}
