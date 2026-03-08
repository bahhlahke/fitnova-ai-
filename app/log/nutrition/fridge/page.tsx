"use client";

import { useState, useRef } from "react";
import { PageLayout, Card, CardHeader, Button, ErrorMessage, LoadingState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import { useRouter } from "next/navigation";

// Video/Image resize helper to keep payloads manageable
function compressMedia(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (file.type.startsWith("video/")) {
            // For video, we'll just read it as base64 for now, but in a real app
            // we'd use a form-data approach or chunked upload. Let's base64 it for simulation.
            // Using a max file size constraint a real API would enforce.
            if (file.size > 20 * 1024 * 1024) return reject(new Error("Video too large (max 20MB)"));
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new window.Image();
                img.onload = () => {
                    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
                    const w = Math.round(img.width * scale);
                    const h = Math.round(img.height * scale);
                    const canvas = document.createElement("canvas");
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) { reject(new Error("Canvas unavailable")); return; }
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
                img.onerror = reject;
                img.src = ev.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }
    });
}

export default function FridgeScannerPage() {
    const [mediaData, setMediaData] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recipes, setRecipes] = useState<any[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setRecipes(null);
        setMediaType(file.type.startsWith("video/") ? "video" : "image");

        try {
            const dataUrl = await compressMedia(file);
            setMediaData(dataUrl);
        } catch (err: any) {
            setError(err.message || "Failed to process media.");
        }
    }

    async function analyzeFridge() {
        if (!mediaData) return;
        setLoading(true);
        setError(null);
        setRecipes(null);

        try {
            const supabase = createClient();
            if (!supabase) throw new Error("Supabase internal error");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Must be logged in.");

            const res = await fetch("/api/v1/nutrition/fridge-scanner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    media: mediaData,
                    type: mediaType,
                    localDate: toLocalDateString()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Analysis failed");

            setRecipes(data.recipes);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function saveRecipe(recipe: any) {
        setLoading(true);
        try {
            const supabase = createClient();
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const today = toLocalDateString();
            const { data: planData } = await supabase.from("daily_plans").select("plan_json").eq("user_id", user.id).eq("date_local", today).maybeSingle();

            let currentPlan = planData?.plan_json || {};
            if (!currentPlan.nutrition_plan) currentPlan.nutrition_plan = {};
            if (!currentPlan.nutrition_plan.meal_structure) currentPlan.nutrition_plan.meal_structure = [];

            currentPlan.nutrition_plan.meal_structure.push(`${recipe.name} (${recipe.calories} kcal)`);

            if (planData) {
                await supabase.from("daily_plans").update({ plan_json: currentPlan }).eq("user_id", user.id).eq("date_local", today);
            } else {
                await supabase.from("daily_plans").insert({ user_id: user.id, date_local: today, plan_json: currentPlan });
            }

            alert(`Added ${recipe.name} to today's plan!`);
            router.push("/log/nutrition");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <PageLayout title="Fridge Scanner" subtitle="Upload a video or photo of your fridge to generate a plan">
            <div className="max-w-3xl mx-auto space-y-6">
                <Card padding="lg">
                    <CardHeader title="Environment Scan" subtitle="Supports panning video or high-res photos" />

                    {error && <ErrorMessage message={error} className="mb-4" />}

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition-all ${mediaData ? "border-fn-accent/30 bg-black/40" : "border-dashed border-white/20 hover:border-fn-accent/50 hover:bg-black/40"
                            }`}
                    >
                        {mediaData ? (
                            mediaType === "video" ? (
                                <video src={mediaData} controls className="h-full w-full object-cover opacity-80" />
                            ) : (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={mediaData} className="h-full w-full object-cover opacity-80" alt="Scanned" />
                                </>
                            )
                        ) : (
                            <div className="flex flex-col items-center p-8 text-center text-fn-muted">
                                <svg className="h-12 w-12 mb-4 text-fn-accent opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <p className="font-bold text-white mb-2 uppercase tracking-widest text-sm">Tap to scan</p>
                                <p className="text-xs">Take a short video panning across your fridge and pantry shelves.</p>
                            </div>
                        )}

                        {mediaData && !loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                                <p className="text-white font-bold uppercase tracking-widest text-sm">Tap to Replace</p>
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {mediaData && !recipes && (
                        <div className="mt-6">
                            <Button
                                className="w-full text-sm font-black uppercase tracking-widest"
                                size="default"
                                onClick={analyzeFridge}
                                loading={loading}
                            >
                                {loading ? "Extracting Ingredients..." : "Generate Meal Plan"}
                            </Button>
                        </div>
                    )}
                </Card>

                {loading && !recipes && mediaData && (
                    <Card padding="lg" className="border-fn-accent/20">
                        <LoadingState message="Neural Vision Model scanning for ingredients, macro-matching, and generating recipes..." />
                    </Card>
                )}

                {recipes && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div>
                                <h3 className="text-xl font-black italic uppercase text-white">Generated Protocol</h3>
                                <p className="text-xs text-fn-accent font-bold uppercase tracking-widest">Matched to Target Macros</p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {recipes.map((r, i) => (
                                <Card key={i} padding="default" className="border-white/10 flex flex-col">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg text-white leading-tight">{r.name}</h4>
                                            <span className="bg-black text-[10px] font-black uppercase text-white px-2 py-1 rounded-md">{r.calories} kcal</span>
                                        </div>

                                        <div className="flex gap-3 text-[10px] font-bold uppercase tracking-widest text-fn-muted mb-4 pb-4 border-b border-white/5">
                                            <span>{r.protein}g P</span>
                                            <span>{r.carbs}g C</span>
                                            <span>{r.fat}g F</span>
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-xs font-bold text-white mb-2 uppercase tracking-wide">Ingredients found:</p>
                                            <ul className="text-sm text-fn-muted space-y-1 pl-4 list-disc">
                                                {r.ingredients.map((ing: string, j: number) => <li key={j}>{ing}</li>)}
                                            </ul>
                                        </div>
                                    </div>

                                    <Button
                                        variant="secondary"
                                        size="default"
                                        className="w-full mt-4"
                                        onClick={() => saveRecipe(r)}
                                    >
                                        Add to Daily Plan
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
