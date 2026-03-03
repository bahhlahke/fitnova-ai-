"use client";

import { useState, useEffect } from "react";
import { PageLayout, Card, CardHeader, Button, LoadingState, ErrorMessage } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";

interface Meal {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    recipe: string;
    ingredients: string[];
}

interface DayPlan {
    date: string;
    meals: Meal[];
}

interface GroceryItem {
    item: string;
    category: string;
    quantity: string;
}

interface FullPlan {
    days: DayPlan[];
    grocery_list: GroceryItem[];
}

export default function MealPlanPage() {
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [plan, setPlan] = useState<FullPlan | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLatestPlan() {
            const supabase = createClient();
            if (!supabase) { setLoading(false); return; }
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data, error } = await supabase
                .from("meal_plans")
                .select("plan_json")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) setPlan(data.plan_json as FullPlan);
            setLoading(false);
        }
        fetchLatestPlan();
    }, []);

    async function handleGeneratePlan() {
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch("/api/v1/ai/recipe-gen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startDate: toLocalDateString(), durationDays: 7 }),
            });
            const data = await res.json();
            if (res.ok) {
                setPlan(data.plan);
            } else {
                setError(data.error || "Generation failed");
            }
        } catch (err) {
            setError("Network error generating plan.");
        } finally {
            setGenerating(false);
        }
    }

    if (loading) return <LoadingState message="Loading your plans..." />;

    return (
        <PageLayout title="AI Meal Planner" subtitle="Weekly recipes and aggregate grocery lists">
            <div className="space-y-8">
                {!plan && !generating && (
                    <Card className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-fn-primary-light p-4">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-fn-primary">
                                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-fn-ink">No active plan found</h2>
                        <p className="mt-2 text-fn-muted max-w-sm">Generate a 7-day meal plan tailored to your targets and preferences.</p>
                        <Button onClick={handleGeneratePlan} className="mt-6">Generate 7-Day Plan</Button>
                    </Card>
                )}

                {generating && <LoadingState message="AI is drafting your recipes and grocery list..." />}

                {error && <ErrorMessage message={error} />}

                {plan && !generating && (
                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* ── Meal Plan ─────────────────────────────────────── */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-fn-ink">7-Day Meal Plan</h3>
                                <Button variant="secondary" size="sm" onClick={handleGeneratePlan}>Regenerate</Button>
                            </div>

                            {plan.days.map((day, idx) => (
                                <Card key={idx}>
                                    <CardHeader title={new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} />
                                    <div className="mt-4 space-y-4">
                                        {day.meals.map((meal, mIdx) => (
                                            <div key={mIdx} className="border-l-4 border-fn-primary bg-fn-bg-alt p-4 rounded-r-xl">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-fn-ink">{meal.name}</h4>
                                                    <span className="text-xs font-semibold text-fn-primary">{meal.calories} kcal</span>
                                                </div>
                                                <p className="mt-2 text-xs text-fn-muted line-clamp-2">{meal.recipe}</p>
                                                <div className="mt-3 flex gap-4 text-[10px] font-bold uppercase tracking-wider text-fn-muted">
                                                    <span>P: {meal.protein}g</span>
                                                    <span>C: {meal.carbs}g</span>
                                                    <span>F: {meal.fat}g</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* ── Grocery List ──────────────────────────────────── */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-fn-ink">Grocery List</h3>
                            <Card>
                                <div className="space-y-6">
                                    {["Produce", "Meat", "Dairy", "Canned", "Dry", "Other"].map(cat => {
                                        const items = plan.grocery_list.filter(i => i.category === cat);
                                        if (items.length === 0) return null;
                                        return (
                                            <div key={cat}>
                                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-fn-primary mb-3">{cat}</h4>
                                                <ul className="space-y-2">
                                                    {items.map((item, iIdx) => (
                                                        <li key={iIdx} className="flex items-center gap-3 text-sm text-fn-ink">
                                                            <input type="checkbox" className="h-4 w-4 rounded border-fn-border bg-fn-bg text-fn-primary focus:ring-fn-primary/20" />
                                                            <span>{item.quantity} {item.item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
