"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealEntry } from "@/types";
import { PageLayout, Card, CardHeader, Button, Input, Label, EmptyState, LoadingState, ErrorMessage } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

const FALLBACK_PROTEIN_TARGET = 150;

type NutritionPlanTargets = {
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export default function NutritionLogPage() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [logId, setLogId] = useState<string | null>(null);
  const [planTargets, setPlanTargets] = useState<NutritionPlanTargets | null>(null);
  const [planMealStructure, setPlanMealStructure] = useState<string[]>([]);
  const [hydrationLiters, setHydrationLiters] = useState<number | null>(null);
  const [hydrationGoal, setHydrationGoal] = useState<number>(2.5);
  const [loading, setLoading] = useState(true);
  const [refetch, setRefetch] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [mealSuggestions, setMealSuggestions] = useState<Array<{ name: string; calories?: number; protein_g?: number; note?: string }>>([]);
  const [mealSuggestionsLoading, setMealSuggestionsLoading] = useState(false);
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
      Promise.all([
        supabase
          .from("nutrition_logs")
          .select("log_id, meals, total_calories, hydration_liters")
          .eq("user_id", user.id)
          .eq("date", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("daily_plans")
          .select("plan_json")
          .eq("user_id", user.id)
          .eq("date_local", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]).then(([logRes, planRes]) => {
        if (logRes.data) {
          const row = logRes.data as { log_id: string; meals: MealEntry[]; total_calories?: number; hydration_liters?: number | null };
          setMeals(Array.isArray(row.meals) ? row.meals : []);
          setLogId(row.log_id);
          setHydrationLiters(row.hydration_liters != null ? Number(row.hydration_liters) : null);
        } else {
          setMeals([]);
          setLogId(null);
          setHydrationLiters(null);
        }
        const plan = planRes.data?.plan_json as { nutrition_plan?: { calorie_target?: number; macros?: { protein_g?: number; carbs_g?: number; fat_g?: number }; meal_structure?: string[]; hydration_goal_liters?: number } } | undefined;
        if (plan?.nutrition_plan?.calorie_target != null && plan.nutrition_plan.macros?.protein_g != null) {
          setPlanTargets({
            calorie_target: plan.nutrition_plan.calorie_target,
            protein_g: plan.nutrition_plan.macros.protein_g ?? 0,
            carbs_g: plan.nutrition_plan.macros.carbs_g ?? 0,
            fat_g: plan.nutrition_plan.macros.fat_g ?? 0,
          });
          setPlanMealStructure(Array.isArray(plan.nutrition_plan.meal_structure) ? plan.nutrition_plan.meal_structure : []);
          setHydrationGoal(plan.nutrition_plan.hydration_goal_liters ?? 2.5);
        } else {
          setPlanTargets(null);
          setPlanMealStructure([]);
        }
        setLoading(false);
      }).catch(() => {
        setError("Failed to load nutrition log.");
        setLoading(false);
      });
    }).then(undefined, () => {
      setError("Failed to load nutrition log.");
      setLoading(false);
    });
  }, [today]);

  useEffect(() => {
    setLoading(true);
    fetchToday();
  }, [fetchToday, refetch]);

  useEffect(() => {
    if (!loading) {
      setAiInsightLoading(true);
      fetch("/api/v1/ai/nutrition-insight", { method: "POST" })
        .then((r) => r.json())
        .then((body: { insight?: string | null }) => {
          if (body.insight && typeof body.insight === "string") setAiInsight(body.insight);
        })
        .catch(() => {})
        .finally(() => setAiInsightLoading(false));
    }
  }, [loading, refetch]);

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);
  const estimatedProtein = meals.reduce(
    (sum, m) => sum + (m.macros?.protein ?? 0),
    0
  ) || Math.round(meals.length * 28);
  const proteinTarget = planTargets?.protein_g ?? FALLBACK_PROTEIN_TARGET;
  const calorieTarget = planTargets?.calorie_target ?? null;
  const proteinGap = Math.max(0, proteinTarget - estimatedProtein);

  return (
    <PageLayout title="Nutrition" subtitle="Meal timeline + macro awareness" backHref="/log" backLabel="Log">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader title="Quick add meal" subtitle="Keep entries simple and consistent" />
          {planMealStructure.length > 0 && (
            <div className="mt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const times = ["08:00", "12:00", "15:00", "18:00", "21:00"];
                  const placeholders: MealEntry[] = planMealStructure.slice(0, 5).map((desc, i) => ({
                    time: times[i] ?? "12:00",
                    description: desc,
                  }));
                  const supabase = createClient();
                  if (!supabase) return;
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  const updatedMeals = [...meals, ...placeholders];
                  const totalCal = updatedMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
                  if (logId) {
                    await supabase
                      .from("nutrition_logs")
                      .update({ meals: updatedMeals, total_calories: totalCal || null })
                      .eq("log_id", logId);
                  } else {
                    const { data } = await supabase
                      .from("nutrition_logs")
                      .insert({ user_id: user.id, date: today, meals: updatedMeals, total_calories: totalCal || null })
                      .select("log_id")
                      .single();
                    if (data) setLogId((data as { log_id: string }).log_id);
                  }
                  setMeals(updatedMeals);
                  setRefetch((n) => n + 1);
                }}
              >
                Add from plan
              </Button>
              <p className="mt-1 text-xs text-fn-muted">Pre-fill meal slots from today&apos;s plan</p>
            </div>
          )}
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
          <CardHeader
            title="AI nutrition check"
            subtitle={planTargets ? "Today's plan targets" : "Based on today's entries"}
          />
          <div className="mt-3 space-y-2 text-sm">
            {calorieTarget != null ? (
              <>
                <p className="text-fn-muted">
                  Calories: <span className="font-semibold text-fn-ink">{totalCalories}</span> / <span className="font-semibold text-fn-ink">{calorieTarget}</span>
                </p>
                <p className="text-fn-muted">
                  Protein: <span className="font-semibold text-fn-ink">{estimatedProtein}g</span> / <span className="font-semibold text-fn-ink">{proteinTarget}g</span>
                </p>
                {planTargets && (planTargets.carbs_g > 0 || planTargets.fat_g > 0) && (
                  <p className="text-fn-muted">
                    Plan macros: {planTargets.carbs_g}g carbs, {planTargets.fat_g}g fat
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-fn-muted">Calories logged: <span className="font-semibold text-fn-ink">{totalCalories || 0}</span></p>
                <p className="text-fn-muted">Estimated protein: <span className="font-semibold text-fn-ink">{estimatedProtein}g</span></p>
                <p className="text-fn-muted">Protein gap: <span className="font-semibold text-fn-ink">{proteinGap}g</span></p>
              </>
            )}
          </div>
          {aiInsightLoading ? (
            <p className="mt-3 text-sm text-fn-muted">Generating today&apos;s insight...</p>
          ) : aiInsight ? (
            <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2 text-sm text-fn-ink">{aiInsight}</p>
          ) : (
            <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2 text-sm text-fn-muted">
              Next best meal: {proteinGap > 0 ? "lean protein + fiber-rich carb" : "balanced maintenance meal"}.
            </p>
          )}
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={mealSuggestionsLoading}
              onClick={() => {
                setMealSuggestionsLoading(true);
                setMealSuggestions([]);
                fetch("/api/v1/ai/meal-suggestions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                })
                  .then((r) => r.json())
                  .then((body: { suggestions?: Array<{ name: string; calories?: number; protein_g?: number; note?: string }> }) => {
                    setMealSuggestions(body.suggestions ?? []);
                  })
                  .catch(() => {})
                  .finally(() => setMealSuggestionsLoading(false));
              }}
            >
              {mealSuggestionsLoading ? "Loading…" : "Suggest meals"}
            </Button>
            {mealSuggestions.length > 0 && (
              <ul className="mt-2 space-y-2">
                {mealSuggestions.map((s, i) => (
                  <li key={i} className="rounded-lg bg-fn-bg-alt px-3 py-2 text-sm text-fn-ink">
                    <span className="font-semibold">{s.name}</span>
                    {(s.calories != null || s.protein_g != null) && (
                      <span className="ml-2 text-fn-muted">
                        {s.calories != null ? `${s.calories} cal` : ""}
                        {s.calories != null && s.protein_g != null ? " · " : ""}
                        {s.protein_g != null ? `${s.protein_g}g protein` : ""}
                      </span>
                    )}
                    {s.note && <p className="mt-1 text-fn-muted">{s.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Hydration" subtitle="Today&apos;s goal from your plan" />
        <p className="mt-2 text-lg font-semibold text-fn-ink">
          {(hydrationLiters ?? 0).toFixed(1)} L / {hydrationGoal} L
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={async () => {
            const add = 0.25;
            const next = (hydrationLiters ?? 0) + add;
            const supabase = createClient();
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            if (logId) {
              await supabase.from("nutrition_logs").update({ hydration_liters: next }).eq("log_id", logId);
            } else {
              const { data } = await supabase
                .from("nutrition_logs")
                .insert({ user_id: user.id, date: today, meals: [], hydration_liters: next })
                .select("log_id")
                .single();
              if (data) setLogId((data as { log_id: string }).log_id);
            }
            setHydrationLiters(next);
            setRefetch((n) => n + 1);
          }}
        >
          +1 glass (~0.25 L)
        </Button>
      </Card>

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
