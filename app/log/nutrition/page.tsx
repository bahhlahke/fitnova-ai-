"use client";

import Link from "next/link";
import { useState } from "react";

export default function NutritionLogPage() {
  const [meals, setMeals] = useState<{ time: string; description: string; calories?: string }[]>([]);
  const [quickDesc, setQuickDesc] = useState("");
  const [quickCals, setQuickCals] = useState("");

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickDesc.trim()) return;
    setMeals((m) => [
      ...m,
      {
        time: new Date().toTimeString().slice(0, 5),
        description: quickDesc.trim(),
        calories: quickCals || undefined,
      },
    ]);
    setQuickDesc("");
    setQuickCals("");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6">
        <Link href="/log" className="text-fn-muted hover:text-white">← Log</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Nutrition</h1>
        <p className="mt-1 text-fn-muted">Meals & macros — quick-add</p>
      </header>

      <section className="rounded-xl border border-fn-border bg-fn-surface p-4">
        <h2 className="text-sm font-medium text-fn-muted">Quick add meal</h2>
        <form onSubmit={handleQuickAdd} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="desc" className="sr-only">Description</label>
            <input
              id="desc"
              type="text"
              value={quickDesc}
              onChange={(e) => setQuickDesc(e.target.value)}
              placeholder="e.g. Chicken salad"
              className="min-h-touch w-full rounded-lg border border-fn-border bg-fn-black px-4 py-3 text-white placeholder-fn-muted"
            />
          </div>
          <div className="w-24">
            <label htmlFor="cals" className="sr-only">Calories</label>
            <input
              id="cals"
              type="number"
              value={quickCals}
              onChange={(e) => setQuickCals(e.target.value)}
              placeholder="Cal"
              className="min-h-touch w-full rounded-lg border border-fn-border bg-fn-black px-4 py-3 text-white placeholder-fn-muted"
            />
          </div>
          <button type="submit" className="min-h-touch min-w-touch rounded-lg bg-fn-teal px-4 py-3 font-medium text-fn-black hover:bg-fn-teal-dim">
            Add
          </button>
        </form>
      </section>

      {meals.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {meals.map((meal, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-fn-border bg-fn-surface p-3 text-sm text-white">
              <span>{meal.time} — {meal.description}</span>
              {meal.calories && <span className="text-fn-muted">{meal.calories} cal</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-fn-muted">No meals logged today. Use quick add above.</p>
      )}
    </div>
  );
}
