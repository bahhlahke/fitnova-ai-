"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageLayout,
  Card,
  CardHeader,
  Button,
  LoadingState,
  ErrorMessage,
  Input,
  Label,
  Select,
  Checkbox,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import type {
  EnhancedMeal,
  EnhancedMealPlan,
  EnhancedGroceryItem,
  MealPlanPreferences,
  MealSwapOption,
} from "@/types";

// ── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS: Array<{ days: MealPlanPreferences["duration_days"]; label: string }> = [
  { days: 1, label: "1 Day" },
  { days: 3, label: "3 Days" },
  { days: 7, label: "1 Week" },
  { days: 14, label: "2 Weeks" },
  { days: 30, label: "30 Days" },
];

const DIETARY_RESTRICTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Halal",
  "Kosher",
  "Low-Sodium",
  "Low-Carb",
];

const CUISINE_OPTIONS = [
  "American",
  "Mediterranean",
  "Mexican",
  "Asian",
  "Italian",
  "Indian",
  "Japanese",
  "Thai",
  "Greek",
  "Middle Eastern",
];

const GROCERY_CATEGORIES: EnhancedGroceryItem["category"][] = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Canned & Jarred",
  "Dry & Pantry",
  "Frozen",
  "Bakery",
  "Beverages",
  "Other",
];

const MEAL_TYPE_COLORS: Record<EnhancedMeal["meal_type"], string> = {
  breakfast: "bg-amber-100 text-amber-800",
  lunch: "bg-sky-100 text-sky-800",
  dinner: "bg-purple-100 text-purple-800",
  snack: "bg-emerald-100 text-emerald-800",
};

// ── Default Preferences ───────────────────────────────────────────────────────

const DEFAULT_PREFS: MealPlanPreferences = {
  duration_days: 7,
  meals_per_day: 3,
  dietary_restrictions: [],
  allergies: [],
  cuisine_preferences: [],
  cooking_skill: "intermediate",
  prep_time_budget: "moderate",
  weekly_budget_usd: null,
  servings_per_meal: 1,
  meal_prep_mode: false,
  include_snacks: false,
};

// ── Sub-components ───────────────────────────────────────────────────────────

function MacroBadge({ label, value, unit = "g" }: { label: string; value: number; unit?: string }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-fn-muted">
      {label}: {value}
      {unit}
    </span>
  );
}

function MealTypeTag({ type }: { type: EnhancedMeal["meal_type"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${MEAL_TYPE_COLORS[type]}`}>
      {type}
    </span>
  );
}

// ── Meal Card ────────────────────────────────────────────────────────────────

function MealCard({
  meal,
  planId,
  dayDate,
  mealIndex,
  onSwap,
  onLogMeal,
}: {
  meal: EnhancedMeal;
  planId: string;
  dayDate: string;
  mealIndex: number;
  onSwap: (dayDate: string, mealIndex: number, meal: EnhancedMeal) => void;
  onLogMeal: (meal: EnhancedMeal) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-l-4 border-fn-primary bg-fn-bg-alt p-4 rounded-r-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <MealTypeTag type={meal.meal_type} />
            {meal.cuisine_type && (
              <span className="text-[10px] text-fn-muted">{meal.cuisine_type}</span>
            )}
            <span className="text-[10px] text-fn-muted">⏱ {meal.prep_time_minutes}min</span>
          </div>
          <h4 className="font-bold text-fn-ink leading-snug">{meal.name}</h4>
        </div>
        <span className="text-sm font-bold text-fn-primary shrink-0">{meal.calories} kcal</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-3">
        <MacroBadge label="P" value={meal.protein} />
        <MacroBadge label="C" value={meal.carbs} />
        <MacroBadge label="F" value={meal.fat} />
        {meal.fiber_g != null && <MacroBadge label="Fiber" value={meal.fiber_g} />}
        {meal.estimated_cost_usd != null && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-fn-muted">
            ~${meal.estimated_cost_usd.toFixed(2)}
          </span>
        )}
      </div>

      {meal.goal_alignment_rationale && (
        <p className="mt-2 text-xs font-medium text-fn-primary border-t border-fn-border/50 pt-2 italic">
          Coach: {meal.goal_alignment_rationale}
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-fn-muted">{meal.recipe}</p>
          {meal.recipe_url && (
            <a
              href={meal.recipe_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-fn-primary hover:underline bg-fn-primary/5 px-2 py-1 rounded-lg"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M12.222 2.003L12.5 2.222l.5.5.219.278L13.5 3.5l.219.278.281.222.219.5.5.5.278.219L15.5 6l-.219.278-.281.5-.5.219-.219.281L14 8l-.219.278-.5.219-.278-.5-.5.219-.5.219-.281.5-.219.278L11 9l.219-.278.5-.219.281-.5.5-.219.219-.281z"/></svg>
              Full Recipe on {meal.recipe_source || "Source"}
            </a>
          )}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-fn-primary mb-1">
              Ingredients
            </p>
            <ul className="space-y-0.5">
              {meal.ingredients.map((ing, i) => (
                <li key={i} className="text-xs text-fn-ink">• {ing}</li>
              ))}
            </ul>
          </div>
          {meal.servings > 1 && (
            <p className="text-[10px] text-fn-muted italic">Makes {meal.servings} servings</p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-fn-primary font-semibold hover:underline"
        >
          {expanded ? "▲ Hide recipe" : "▼ View recipe"}
        </button>
        <button
          onClick={() => onSwap(dayDate, mealIndex, meal)}
          className="text-xs text-fn-muted font-semibold hover:text-fn-ink"
        >
          ↕ Swap
        </button>
        <button
          onClick={() => onLogMeal(meal)}
          className="text-xs text-fn-muted font-semibold hover:text-fn-ink"
        >
          + Log this
        </button>
      </div>
    </div>
  );
}

// ── Swap Modal ────────────────────────────────────────────────────────────────

function SwapModal({
  planId,
  dayDate,
  mealIndex,
  currentMeal,
  onConfirm,
  onClose,
}: {
  planId: string;
  dayDate: string;
  mealIndex: number;
  currentMeal: EnhancedMeal;
  onConfirm: (meal: EnhancedMeal) => void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<MealSwapOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch("/api/v1/ai/meal-swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, dayDate, mealIndex, currentMeal }),
        });
        const data = await res.json();
        if (res.ok) setOptions(data.options ?? []);
        else setError(data.error || "Failed to load alternatives.");
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, [planId, dayDate, mealIndex, currentMeal]);

  async function handleConfirm(option: MealSwapOption, idx: number) {
    setConfirming(idx);
    const newMeal: EnhancedMeal = {
      ...option,
      fiber_g: undefined,
      sodium_mg: undefined,
      servings: 1,
      cuisine_type: undefined,
      estimated_cost_usd: undefined,
    };
    try {
      const res = await fetch("/api/v1/ai/meal-swap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, dayDate, mealIndex, newMeal }),
      });
      if (res.ok) {
        onConfirm(newMeal);
        onClose();
      } else {
        setError("Failed to save swap.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-fn-bg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-fn-ink">Swap Meal</h3>
          <button onClick={onClose} className="text-fn-muted hover:text-fn-ink text-xl">×</button>
        </div>
        <p className="text-sm text-fn-muted mb-4">
          Replacing: <span className="font-semibold text-fn-ink">{currentMeal.name}</span>
        </p>
        {loading && <LoadingState message="Finding alternatives..." />}
        {error && <ErrorMessage message={error} />}
        {!loading && options.length === 0 && !error && (
          <p className="text-sm text-fn-muted text-center py-4">No alternatives found.</p>
        )}
        <div className="space-y-3">
          {options.map((opt, i) => (
            <div key={i} className="border border-fn-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-fn-ink">{opt.name}</p>
                  <p className="text-xs text-fn-muted mt-0.5">{opt.reason}</p>
                  <div className="mt-2 flex gap-3">
                    <MacroBadge label="P" value={opt.protein} />
                    <MacroBadge label="C" value={opt.carbs} />
                    <MacroBadge label="F" value={opt.fat} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-fn-muted">
                      ⏱ {opt.prep_time_minutes}min
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-fn-primary">{opt.calories} kcal</p>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => handleConfirm(opt, i)}
                    disabled={confirming !== null}
                  >
                    {confirming === i ? "Saving…" : "Use This"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Eating Out Modal ──────────────────────────────────────────────────────────

function EatingOutModal({
  dateLocal,
  onClose,
  onLogged,
}: {
  dateLocal: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [restaurant, setRestaurant] = useState("");
  const [meal, setMeal] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleEstimate() {
    if (!meal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/nutrition/eating-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_name: restaurant.trim() || undefined,
          meal_name: meal.trim(),
          date_local: dateLocal,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreview({ calories: data.calories, protein_g: data.protein_g, carbs_g: data.carbs_g, fat_g: data.fat_g });
        setSaved(true);
        onLogged();
      } else {
        setError(data.error || "Failed to log meal.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-fn-bg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-fn-ink">🍽️ Ate Out</h3>
          <button onClick={onClose} className="text-fn-muted hover:text-fn-ink text-xl">×</button>
        </div>

        {saved && preview ? (
          <div className="text-center py-4">
            <p className="text-fn-primary font-bold text-lg mb-2">✓ Logged successfully!</p>
            <p className="text-sm text-fn-muted mb-3">Estimated nutrition added to your log:</p>
            <div className="flex justify-center gap-4">
              <MacroBadge label="Cal" value={preview.calories} unit=" kcal" />
              <MacroBadge label="P" value={preview.protein_g} />
              <MacroBadge label="C" value={preview.carbs_g} />
              <MacroBadge label="F" value={preview.fat_g} />
            </div>
            <Button className="mt-4" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="eo-restaurant">Restaurant (optional)</Label>
              <Input
                id="eo-restaurant"
                placeholder="e.g. Chipotle, Olive Garden"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="eo-meal">What did you eat? *</Label>
              <Input
                id="eo-meal"
                placeholder="e.g. Chicken burrito bowl with rice and beans"
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="eo-notes">Notes (optional)</Label>
              <Input
                id="eo-notes"
                placeholder="e.g. Extra guac, no sour cream"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {error && <ErrorMessage message={error} />}
            <Button
              onClick={handleEstimate}
              disabled={loading || !meal.trim()}
              className="w-full"
            >
              {loading ? "Estimating & Logging…" : "Log Eating Out"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Grocery List Panel ────────────────────────────────────────────────────────

function GroceryListPanel({
  items,
  planId,
  onItemsChange,
}: {
  items: EnhancedGroceryItem[];
  planId: string;
  onItemsChange: (items: EnhancedGroceryItem[]) => void;
}) {
  const [addItem, setAddItem] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addCat, setAddCat] = useState<EnhancedGroceryItem["category"]>("Other");
  const [adding, setAdding] = useState(false);

  async function toggleCheck(itemIndex: number, checked: boolean) {
    const updated = items.map((item, i) => (i === itemIndex ? { ...item, checked } : item));
    onItemsChange(updated);
    await fetch("/api/v1/nutrition/grocery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, itemIndex, checked }),
    });
  }

  async function handleAddItem() {
    if (!addItem.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/v1/nutrition/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          item: { item: addItem.trim(), quantity: addQty.trim(), category: addCat },
        }),
      });
      if (res.ok) {
        const newItem: EnhancedGroceryItem = {
          item: addItem.trim(),
          quantity: addQty.trim(),
          category: addCat,
          checked: false,
          custom: true,
        };
        onItemsChange([...items, newItem]);
        setAddItem("");
        setAddQty("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(itemIndex: number) {
    await fetch(`/api/v1/nutrition/grocery?planId=${planId}&itemIndex=${itemIndex}`, {
      method: "DELETE",
    });
    onItemsChange(items.filter((_, i) => i !== itemIndex));
  }

  function exportList() {
    const lines: string[] = ["=== Grocery List ===", ""];
    for (const cat of GROCERY_CATEGORIES) {
      const catItems = items.filter((i) => i.category === cat);
      if (catItems.length === 0) continue;
      lines.push(`[${cat}]`);
      catItems.forEach((i) => lines.push(`  ${i.checked ? "✓" : "○"} ${i.quantity} ${i.item}`));
      lines.push("");
    }
    const totalCost = items.reduce((s, i) => s + (i.estimated_cost_usd ?? 0), 0);
    if (totalCost > 0) lines.push(`Estimated total: $${totalCost.toFixed(2)}`);
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grocery-list.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCost = items.reduce((s, i) => s + (i.estimated_cost_usd ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-fn-ink">
          Grocery List
          {items.length > 0 && (
            <span className="ml-2 text-sm font-normal text-fn-muted">
              {checkedCount}/{items.length}
            </span>
          )}
        </h3>
        <button
          onClick={exportList}
          className="text-xs text-fn-primary font-semibold hover:underline"
        >
          ↓ Export
        </button>
      </div>

      <Card>
        <div className="space-y-5">
          {GROCERY_CATEGORIES.map((cat) => {
            const catItems = items
              .map((item, idx) => ({ item, idx }))
              .filter(({ item }) => item.category === cat);
            if (catItems.length === 0) return null;

            const catCost = catItems.reduce((s, { item }) => s + (item.estimated_cost_usd ?? 0), 0);

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-fn-primary">
                    {cat}
                  </h4>
                  {catCost > 0 && (
                    <span className="text-[10px] text-fn-muted">~${catCost.toFixed(2)}</span>
                  )}
                </div>
                <ul className="space-y-2">
                  {catItems.map(({ item, idx }) => (
                    <li key={idx} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => toggleCheck(idx, e.target.checked)}
                        className="h-4 w-4 rounded border-fn-border bg-fn-bg text-fn-primary focus:ring-fn-primary/20 shrink-0"
                      />
                      <span
                        className={`flex-1 text-sm ${item.checked ? "line-through text-fn-muted" : "text-fn-ink"}`}
                      >
                        {item.quantity && (
                          <span className="font-semibold">{item.quantity} </span>
                        )}
                        {item.item}
                        {item.source_recipe_name && (
                          <span className="ml-1 text-[10px] text-fn-muted">
                            (for {item.source_recipe_name})
                          </span>
                        )}
                        {item.custom && (
                          <span className="ml-1 text-[10px] text-fn-muted">(custom)</span>
                        )}
                      </span>
                      {item.estimated_cost_usd != null && item.estimated_cost_usd > 0 && (
                        <span className="text-[10px] text-fn-muted shrink-0">
                          ${item.estimated_cost_usd.toFixed(2)}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemove(idx)}
                        className="opacity-0 group-hover:opacity-100 text-fn-muted hover:text-red-500 text-xs shrink-0 transition-opacity"
                        title="Remove item"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {items.length === 0 && (
            <p className="text-sm text-fn-muted text-center py-4">No items yet.</p>
          )}
        </div>

        {totalCost > 0 && (
          <div className="mt-4 pt-4 border-t border-fn-border flex items-center justify-between">
            <span className="text-sm font-bold text-fn-ink">Estimated Total</span>
            <span className="text-sm font-bold text-fn-primary">${totalCost.toFixed(2)}</span>
          </div>
        )}
      </Card>

      {/* Add custom item */}
      <Card>
        <p className="text-xs font-black uppercase tracking-[0.15em] text-fn-primary mb-3">
          + Add Item
        </p>
        <div className="space-y-2">
          <Input
            placeholder="Item name"
            value={addItem}
            onChange={(e) => setAddItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Qty (e.g. 2 lbs)"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              className="flex-1"
            />
            <Select
              value={addCat}
              onChange={(e) => setAddCat(e.target.value as EnhancedGroceryItem["category"])}
              className="flex-1"
            >
              {GROCERY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddItem}
            disabled={adding || !addItem.trim()}
            className="w-full"
          >
            {adding ? "Adding…" : "Add to List"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Preferences Panel ─────────────────────────────────────────────────────────

function PreferencesPanel({
  prefs,
  onChange,
}: {
  prefs: MealPlanPreferences;
  onChange: (prefs: MealPlanPreferences) => void;
}) {
  function update<K extends keyof MealPlanPreferences>(key: K, value: MealPlanPreferences[K]) {
    onChange({ ...prefs, [key]: value });
  }

  function toggleMulti(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* Meals per day */}
      <div>
        <Label>Meals per day</Label>
        <Select
          value={String(prefs.meals_per_day)}
          onChange={(e) => update("meals_per_day", Number(e.target.value) as MealPlanPreferences["meals_per_day"])}
        >
          {[3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n} meals</option>
          ))}
        </Select>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="snacks"
            checked={prefs.include_snacks}
            onChange={(e) => update("include_snacks", e.target.checked)}
            className="h-4 w-4 rounded border-fn-border text-fn-primary"
          />
          <label htmlFor="snacks" className="text-sm text-fn-ink cursor-pointer">Include snacks</label>
        </div>
      </div>

      {/* Cooking skill */}
      <div>
        <Label>Cooking skill</Label>
        <Select
          value={prefs.cooking_skill}
          onChange={(e) => update("cooking_skill", e.target.value as MealPlanPreferences["cooking_skill"])}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
      </div>

      {/* Prep time */}
      <div>
        <Label>Max prep time</Label>
        <Select
          value={prefs.prep_time_budget}
          onChange={(e) => update("prep_time_budget", e.target.value as MealPlanPreferences["prep_time_budget"])}
        >
          <option value="quick">Quick (under 15 min)</option>
          <option value="moderate">Moderate (15–30 min)</option>
          <option value="elaborate">Elaborate (30+ min)</option>
        </Select>
      </div>

      {/* Servings */}
      <div>
        <Label>Servings per recipe</Label>
        <Select
          value={String(prefs.servings_per_meal)}
          onChange={(e) => update("servings_per_meal", Number(e.target.value) as MealPlanPreferences["servings_per_meal"])}
        >
          <option value="1">Just me (×1)</option>
          <option value="2">2 people (×2)</option>
          <option value="4">Meal prep (×4)</option>
        </Select>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="meal-prep"
            checked={prefs.meal_prep_mode}
            onChange={(e) => update("meal_prep_mode", e.target.checked)}
            className="h-4 w-4 rounded border-fn-border text-fn-primary"
          />
          <label htmlFor="meal-prep" className="text-sm text-fn-ink cursor-pointer">Batch cook mode</label>
        </div>
      </div>

      {/* Budget */}
      <div>
        <Label>Weekly food budget (optional)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fn-muted text-sm">$</span>
          <Input
            type="number"
            min="0"
            step="10"
            placeholder="No limit"
            value={prefs.weekly_budget_usd ?? ""}
            onChange={(e) => update("weekly_budget_usd", e.target.value ? Number(e.target.value) : null)}
            className="pl-7"
          />
        </div>
      </div>

      {/* Allergies */}
      <div>
        <Label>Allergies (comma-separated)</Label>
        <Input
          placeholder="e.g. peanuts, shellfish, tree nuts"
          value={prefs.allergies.join(", ")}
          onChange={(e) =>
            update(
              "allergies",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      </div>

      {/* Dietary restrictions */}
      <div className="sm:col-span-2 lg:col-span-3">
        <Label>Dietary Restrictions</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIETARY_RESTRICTIONS.map((r) => (
            <button
              key={r}
              onClick={() => update("dietary_restrictions", toggleMulti(prefs.dietary_restrictions, r))}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                prefs.dietary_restrictions.includes(r)
                  ? "bg-fn-primary text-white border-fn-primary"
                  : "bg-fn-bg text-fn-muted border-fn-border hover:border-fn-primary hover:text-fn-primary"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Cuisine preferences */}
      <div className="sm:col-span-2 lg:col-span-3">
        <Label>Cuisine Preferences</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => update("cuisine_preferences", toggleMulti(prefs.cuisine_preferences, c))}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                prefs.cuisine_preferences.includes(c)
                  ? "bg-fn-primary text-white border-fn-primary"
                  : "bg-fn-bg text-fn-muted border-fn-border hover:border-fn-primary hover:text-fn-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MealPlanPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<EnhancedMealPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [groceryItems, setGroceryItems] = useState<EnhancedGroceryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<MealPlanPreferences>(DEFAULT_PREFS);
  const [showPrefs, setShowPrefs] = useState(false);
  const [activeTab, setActiveTab] = useState<"plan" | "grocery">("plan");

  // Swap modal state
  const [swapModal, setSwapModal] = useState<{
    dayDate: string;
    mealIndex: number;
    meal: EnhancedMeal;
  } | null>(null);

  // Eating out modal state
  const [eatingOutDate, setEatingOutDate] = useState<string | null>(null);

  // Load profile prefs + latest plan on mount
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      if (!supabase) { setLoading(false); return; }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [profileRes, planRes] = await Promise.all([
        supabase.from("user_profile").select("dietary_preferences").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("meal_plans")
          .select("plan_id, plan_json, preferences_json, duration_days")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Load meal planning prefs from profile
      const profilePrefs = (profileRes.data?.dietary_preferences as Record<string, unknown>)
        ?.meal_planning as Partial<MealPlanPreferences> | undefined;
      if (profilePrefs) {
        setPrefs((p) => ({ ...p, ...profilePrefs }));
      }

      if (planRes.data) {
        const savedPlan = planRes.data.plan_json as EnhancedMealPlan;
        const savedPrefs = planRes.data.preferences_json as Partial<MealPlanPreferences> | null;
        setPlan(savedPlan);
        setPlanId(planRes.data.plan_id);
        if (savedPrefs?.duration_days) {
          setPrefs((p) => ({ ...p, ...savedPrefs }));
        }

        // Load grocery list with checked state
        if (planRes.data.plan_id) {
          const grocRes = await supabase
            .from("grocery_lists")
            .select("items_json")
            .eq("plan_id", planRes.data.plan_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (grocRes.data) {
            setGroceryItems(grocRes.data.items_json as EnhancedGroceryItem[] ?? []);
          } else if (savedPlan?.grocery_list) {
            setGroceryItems(savedPlan.grocery_list as EnhancedGroceryItem[]);
          }
        }
      }

      setLoading(false);
    }
    init();
  }, []);

  async function handleGeneratePlan() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai/recipe-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: toLocalDateString(),
          preferences: prefs,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlan(data.plan as EnhancedMealPlan);
        setPlanId(data.planId);
        setGroceryItems(data.plan.grocery_list ?? []);
      } else {
        setError(data.error || "Generation failed.");
      }
    } catch {
      setError("Network error generating plan.");
    } finally {
      setGenerating(false);
    }
  }

  function handleMealSwapConfirm(dayDate: string, mealIndex: number, newMeal: EnhancedMeal) {
    if (!plan) return;
    const updatedDays = plan.days.map((d) => {
      if (d.date !== dayDate) return d;
      const meals = [...d.meals];
      meals[mealIndex] = newMeal;
      return { ...d, meals };
    });
    setPlan({ ...plan, days: updatedDays });
  }

  async function handleLogMeal(meal: EnhancedMeal) {
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = toLocalDateString();
    const newEntry = {
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      description: meal.name,
      calories: meal.calories,
      macros: { protein: meal.protein, carbs: meal.carbs, fat: meal.fat },
    };

    const { data: existing } = await supabase
      .from("nutrition_logs")
      .select("log_id, meals, total_calories")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const meals = Array.isArray(existing.meals) ? [...existing.meals, newEntry] : [newEntry];
      const total = meals.reduce((s: number, m: { calories?: number }) => s + (m.calories ?? 0), 0);
      await supabase
        .from("nutrition_logs")
        .update({ meals, total_calories: total, updated_at: new Date().toISOString() })
        .eq("log_id", existing.log_id);
    } else {
      await supabase.from("nutrition_logs").insert({
        user_id: user.id,
        date: today,
        meals: [newEntry],
        total_calories: meal.calories,
      });
    }
  }

  if (loading) return <LoadingState message="Loading your meal plan…" />;

  const totalCost = plan?.total_estimated_cost_usd
    ?? groceryItems.reduce((s, i) => s + (i.estimated_cost_usd ?? 0), 0);

  return (
    <PageLayout title="AI Meal Planner" subtitle="Personalized plans tailored to your goals and preferences">
      {/* Swap modal */}
      {swapModal && planId && (
        <SwapModal
          planId={planId}
          dayDate={swapModal.dayDate}
          mealIndex={swapModal.mealIndex}
          currentMeal={swapModal.meal}
          onConfirm={(newMeal) => handleMealSwapConfirm(swapModal.dayDate, swapModal.mealIndex, newMeal)}
          onClose={() => setSwapModal(null)}
        />
      )}

      {/* Eating out modal */}
      {eatingOutDate && (
        <EatingOutModal
          dateLocal={eatingOutDate}
          onClose={() => setEatingOutDate(null)}
          onLogged={() => {}}
        />
      )}

      <div className="space-y-6">
        {/* ── Controls ──────────────────────────────────────────────────── */}
        <Card>
          <div className="space-y-4">
            {/* Duration + generate */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-fn-border overflow-hidden">
                {DURATION_OPTIONS.map(({ days, label }) => (
                  <button
                    key={days}
                    onClick={() => setPrefs((p) => ({ ...p, duration_days: days }))}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      prefs.duration_days === days
                        ? "bg-fn-primary text-white"
                        : "bg-fn-bg text-fn-muted hover:bg-fn-bg-alt"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowPrefs((s) => !s)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  showPrefs
                    ? "border-fn-primary bg-fn-primary-light text-fn-primary"
                    : "border-fn-border bg-fn-bg text-fn-muted hover:border-fn-primary hover:text-fn-primary"
                }`}
              >
                ⚙ Preferences
                {(prefs.dietary_restrictions.length > 0 || prefs.cuisine_preferences.length > 0) && (
                  <span className="rounded-full bg-fn-primary text-white text-[9px] px-1.5 py-0.5 font-black">
                    {prefs.dietary_restrictions.length + prefs.cuisine_preferences.length}
                  </span>
                )}
              </button>

              <div className="flex-1" />

              {totalCost > 0 && (
                <span className="text-xs font-semibold text-fn-muted">
                  ~${totalCost.toFixed(2)} est.
                </span>
              )}

              <Button onClick={handleGeneratePlan} disabled={generating}>
                {generating
                  ? "Generating…"
                  : plan
                  ? `Regenerate (${prefs.duration_days}d)`
                  : `Generate ${prefs.duration_days}-Day Plan`}
              </Button>
            </div>

            {/* Preferences panel */}
            {showPrefs && (
              <div className="border-t border-fn-border pt-4">
                <PreferencesPanel prefs={prefs} onChange={setPrefs} />
              </div>
            )}
          </div>
        </Card>

        {error && <ErrorMessage message={error} />}
        {generating && <LoadingState message={`AI is crafting your ${prefs.duration_days}-day plan with grocery list…`} />}

        {/* ── No plan state ────────────────────────────────────────────── */}
        {!plan && !generating && (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-fn-primary-light p-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-fn-primary">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-fn-ink">No active plan found</h2>
            <p className="mt-2 text-fn-muted max-w-sm">
              Set your preferences above and generate a personalized meal plan with recipes, macros, and a complete grocery list.
            </p>
            <Button onClick={handleGeneratePlan} className="mt-6">
              Generate My First Plan
            </Button>
          </Card>
        )}

        {/* ── Plan + Grocery ───────────────────────────────────────────── */}
        {plan && !generating && (
          <>
            {/* Mobile tab switcher */}
            <div className="flex rounded-lg border border-fn-border overflow-hidden lg:hidden">
              <button
                onClick={() => setActiveTab("plan")}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${
                  activeTab === "plan" ? "bg-fn-primary text-white" : "bg-fn-bg text-fn-muted"
                }`}
              >
                Meal Plan
              </button>
              <button
                onClick={() => setActiveTab("grocery")}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${
                  activeTab === "grocery" ? "bg-fn-primary text-white" : "bg-fn-bg text-fn-muted"
                }`}
              >
                Grocery List {groceryItems.length > 0 && `(${groceryItems.filter((i) => i.checked).length}/${groceryItems.length})`}
              </button>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* ── Day-by-day plan ─────────────────────────────────── */}
              <div className={`lg:col-span-2 space-y-6 ${activeTab === "grocery" ? "hidden lg:block" : ""}`}>
                {plan.days.map((day, dayIdx) => {
                  const dayTotal = day.meals.reduce((s, m) => s + m.calories, 0);
                  const dayProtein = day.meals.reduce((s, m) => s + m.protein, 0);
                  const dayCarbs = day.meals.reduce((s, m) => s + m.carbs, 0);
                  const dayFat = day.meals.reduce((s, m) => s + m.fat, 0);

                  return (
                    <Card key={dayIdx}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardHeader
                          title={new Date(day.date + "T12:00:00").toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        />
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider text-fn-muted">
                            <span className="text-fn-primary">{dayTotal} kcal</span>
                            <span>P: {dayProtein}g</span>
                            <span>C: {dayCarbs}g</span>
                            <span>F: {dayFat}g</span>
                          </div>
                          <button
                            onClick={() => setEatingOutDate(day.date)}
                            className="text-xs text-fn-muted border border-fn-border rounded-full px-2.5 py-0.5 hover:border-fn-primary hover:text-fn-primary transition-colors"
                          >
                            🍽️ Ate Out
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {day.meals.map((meal, mealIdx) => (
                          <MealCard
                            key={mealIdx}
                            meal={meal}
                            planId={planId!}
                            dayDate={day.date}
                            mealIndex={mealIdx}
                            onSwap={(d, i, m) => setSwapModal({ dayDate: d, mealIndex: i, meal: m })}
                            onLogMeal={handleLogMeal}
                          />
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* ── Grocery list ─────────────────────────────────────── */}
              <div className={`${activeTab === "plan" ? "hidden lg:block" : ""}`}>
                {planId && (
                  <GroceryListPanel
                    items={groceryItems}
                    planId={planId}
                    onItemsChange={setGroceryItems}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
