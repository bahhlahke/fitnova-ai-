"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealEntry } from "@/types";
import { PageLayout, Card, CardHeader, Button, Input, Label, EmptyState, LoadingState } from "@/components/ui";

export default function NutritionLogPage() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [logId, setLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetch, setRefetch] = useState(0);
  const today = new Date().toISOString().slice(0, 10);

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
          () => setLoading(false)
        );
    }).then(undefined, () => setLoading(false));
  }, [today]);

  useEffect(() => {
    setLoading(true);
    fetchToday();
  }, [fetchToday, refetch]);

  return (
    <PageLayout
      title="Nutrition"
      subtitle="Meals & macros — quick-add"
      backHref="/log"
      backLabel="Log"
    >
      <Card>
        <CardHeader title="Quick add meal" />
        <NutritionQuickAdd
          onAdded={(newLogId, newMeals) => {
            if (newLogId != null) setLogId(newLogId);
            if (newMeals != null) setMeals(newMeals);
            setRefetch((n) => n + 1);
          }}
          existingMeals={meals}
          existingLogId={logId}
        />
      </Card>

      {loading ? (
        <div className="mt-6">
          <LoadingState />
        </div>
      ) : meals.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {meals.map((meal, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-fn-border bg-fn-surface p-3 text-sm text-white"
            >
              <span>
                {meal.time} — {meal.description}
              </span>
              {meal.calories != null && (
                <span className="text-fn-muted">{meal.calories} cal</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-6"
          message="No meals logged today. Use quick add above."
        />
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
  const today = new Date().toISOString().slice(0, 10);
  const time = new Date().toTimeString().slice(0, 5);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickDesc.trim()) return;
    setSaving(true);
    const supabase = createClient();
    if (!supabase) {
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const calNum = quickCals.trim() ? parseInt(quickCals, 10) : undefined;
    const calories = calNum != null && Number.isFinite(calNum) && calNum >= 0 && calNum <= 50000 ? calNum : undefined;
    const newMeal: MealEntry = {
      time,
      description: quickDesc.trim(),
      calories,
    };
    const updatedMeals = [...existingMeals, newMeal];
    const totalCalories = updatedMeals.reduce(
      (sum, m) => sum + (m.calories ?? 0),
      0
    );

    if (existingLogId) {
      const { error } = await supabase
        .from("nutrition_logs")
        .update({
          meals: updatedMeals,
          total_calories: totalCalories || null,
        })
        .eq("log_id", existingLogId);
      if (error) {
        setSaving(false);
        return;
      }
      setQuickDesc("");
      setQuickCals("");
      setSaving(false);
      onAdded(undefined, updatedMeals);
    } else {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .insert({
          user_id: user.id,
          date: today,
          meals: updatedMeals,
          total_calories: totalCalories || null,
        })
        .select("log_id")
        .single();
      if (error) {
        setSaving(false);
        return;
      }
      setQuickDesc("");
      setQuickCals("");
      setSaving(false);
      onAdded((data as { log_id: string })?.log_id ?? null, updatedMeals);
    }
  }

  return (
    <form
      onSubmit={handleQuickAdd}
      className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Label htmlFor="desc" className="sr-only">
          Description
        </Label>
        <Input
          id="desc"
          type="text"
          value={quickDesc}
          onChange={(e) => setQuickDesc(e.target.value)}
          placeholder="e.g. Chicken salad"
        />
      </div>
      <div className="w-24">
        <Label htmlFor="cals" className="sr-only">
          Calories
        </Label>
        <Input
          id="cals"
          type="number"
          value={quickCals}
          onChange={(e) => setQuickCals(e.target.value)}
          placeholder="Cal"
        />
      </div>
      <Button type="submit" loading={saving} disabled={!quickDesc.trim()}>
        Add
      </Button>
    </form>
  );
}
