"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { MealEntry } from "@/types";
import { PageLayout, Card, CardHeader, Button, ErrorMessage, LoadingState, EmptyState } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

/* ── Types ──────────────────────────────────────────────────────── */
type NutritionPlanTargets = {
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

interface MealEstimate {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "high" | "medium" | "low";
  notes: string;
}

/* ── Constants ──────────────────────────────────────────────────── */
const FALLBACK_PROTEIN_TARGET = 150;

const CONFIDENCE_BADGE: Record<MealEstimate["confidence"], { label: string; cls: string }> = {
  high:   { label: "High confidence",   cls: "bg-fn-accent-light text-fn-accent"  },
  medium: { label: "Medium confidence", cls: "bg-amber-50 text-amber-700"          },
  low:    { label: "Low confidence",    cls: "bg-fn-danger-light text-fn-danger"   },
};

/* ── Image resize helper ─────────────────────────────────────────── */
function resizeImage(file: File, maxPx = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas unavailable")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────────────────────────────────────────────────
   SmartMealEntry — describe or snap a photo, AI fills macros
───────────────────────────────────────────────────────────────── */
type EntryMode = "describe" | "photo";
const ENTRY_MODES: EntryMode[] = ["describe", "photo"];

function SmartMealEntry({
  onAdded,
  existingMeals,
  existingLogId,
}: {
  onAdded: (newLogId?: string | null, newMeals?: MealEntry[]) => void;
  existingMeals: MealEntry[];
  existingLogId: string | null;
}) {
  const [mode,         setMode]         = useState<EntryMode>("describe");
  const [description,  setDescription]  = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData,    setImageData]    = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI state
  const [analyzing,    setAnalyzing]    = useState(false);
  const [estimate,     setEstimate]     = useState<MealEstimate | null>(null);
  const [aiError,      setAiError]      = useState<string | null>(null);

  // Editable estimate fields
  const [editName,     setEditName]     = useState("");
  const [editCal,      setEditCal]      = useState("");
  const [editPro,      setEditPro]      = useState("");
  const [editCarb,     setEditCarb]     = useState("");
  const [editFat,      setEditFat]      = useState("");

  // Save state
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);

  const today = toLocalDateString();
  const time  = new Date().toTimeString().slice(0, 5);

  // Populate editable fields when estimate arrives
  useEffect(() => {
    if (!estimate) return;
    setEditName(estimate.name);
    setEditCal (String(estimate.calories));
    setEditPro (String(estimate.protein));
    setEditCarb(String(estimate.carbs));
    setEditFat (String(estimate.fat));
  }, [estimate]);

  function switchMode(m: EntryMode) {
    setMode(m);
    setEstimate(null); setAiError(null);
    setDescription(""); setImagePreview(null); setImageData(null); setSaveError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiError(null); setEstimate(null);
    try {
      const dataUrl = await resizeImage(file);
      setImageData(dataUrl); setImagePreview(dataUrl);
    } catch (_e) { setAiError("Could not process image. Please try again."); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function analyzeWithAI() {
    setAnalyzing(true); setAiError(null); setEstimate(null);
    try {
      const body = mode === "describe"
        ? { type: "text", description }
        : { type: "image", data: imageData };
      const res  = await fetch("/api/v1/ai/analyze-meal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { estimate?: MealEstimate; error?: string };
      if (!res.ok || !data.estimate) {
        setAiError(data.error ?? "Could not estimate nutrition. Please try again.");
      } else {
        setEstimate(data.estimate);
      }
    } catch (_e) { setAiError("Network error — check your connection."); }
    finally      { setAnalyzing(false); }
  }

  async function saveMeal() {
    const name     = editName.trim() || description.trim() || "Meal";
    const calories = Number(editCal)  || 0;
    const protein  = Number(editPro)  || 0;
    const carbs    = Number(editCarb) || 0;
    const fat      = Number(editFat)  || 0;
    setSaving(true); setSaveError(null);
    const supabase = createClient();
    if (!supabase) { setSaveError("Supabase not configured."); setSaving(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveError("Sign in to log meals."); setSaving(false); return; }

    const newMeal: MealEntry = {
      time, description: name,
      calories: calories > 0 ? calories : undefined,
      macros: { protein, carbs, fat },
    };
    const updated   = [...existingMeals, newMeal];
    const totalCals = updated.reduce((s, m) => s + (m.calories ?? 0), 0);

    if (existingLogId) {
      const { error } = await supabase.from("nutrition_logs")
        .update({ meals: updated, total_calories: totalCals || null }).eq("log_id", existingLogId);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      onAdded(undefined, updated);
    } else {
      const { data, error } = await supabase.from("nutrition_logs")
        .insert({ user_id: user.id, date: today, meals: updated, total_calories: totalCals || null })
        .select("log_id").single();
      if (error) { setSaveError(error.message); setSaving(false); return; }
      onAdded((data as { log_id: string })?.log_id ?? null, updated);
    }
    // Reset
    setDescription(""); setImagePreview(null); setImageData(null); setEstimate(null);
    setEditName(""); setEditCal(""); setEditPro(""); setEditCarb(""); setEditFat("");
    setSaving(false);
  }

  async function quickSave(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    const supabase = createClient();
    if (!supabase) { setSaving(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const newMeal: MealEntry = { time, description: description.trim() };
    const updated = [...existingMeals, newMeal];
    if (existingLogId) {
      await supabase.from("nutrition_logs").update({ meals: updated }).eq("log_id", existingLogId);
      onAdded(undefined, updated);
    } else {
      const { data } = await supabase.from("nutrition_logs")
        .insert({ user_id: user.id, date: today, meals: updated }).select("log_id").single();
      onAdded((data as { log_id?: string })?.log_id ?? null, updated);
    }
    setDescription(""); setSaving(false);
  }

  const canAnalyze = mode === "describe" ? description.trim().length >= 3 : !!imageData;

  return (
    <div className="mt-4 space-y-4">
      {/* Mode tabs */}
      <div className="inline-flex rounded-xl border border-fn-border bg-fn-bg p-1">
        {ENTRY_MODES.map((m) => (
          <button key={m} type="button" onClick={() => switchMode(m)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              mode === m ? "bg-fn-ink-rich text-white shadow-fn-soft" : "text-fn-muted hover:text-fn-ink"
            }`}
          >
            {m === "describe" ? (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                Describe meal
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Snap a photo
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── Describe mode ───────────────────────────────────────── */}
      {mode === "describe" && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setEstimate(null); setAiError(null); }}
              placeholder={'e.g. "Two fried eggs on wholegrain toast with butter and half an avocado"'}
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-2xl border border-fn-border bg-fn-surface px-4 py-3 text-sm text-fn-ink placeholder:text-fn-muted-light focus:border-fn-primary/50 focus:outline-none focus:ring-2 focus:ring-fn-primary/20 transition-all"
            />
            <span className="absolute bottom-2.5 right-3 text-[10px] text-fn-muted">
              {description.length}/1000
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="default" disabled={!canAnalyze || analyzing} loading={analyzing}
              onClick={analyzeWithAI}
              icon={!analyzing ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
              ) : undefined}
            >
              {analyzing ? "Estimating…" : "Estimate with AI"}
            </Button>
            {description.trim().length >= 3 && !estimate && (
              <form onSubmit={quickSave}>
                <Button type="submit" variant="ghost" size="default" loading={saving}>
                  Add without estimate
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Photo mode ──────────────────────────────────────────── */}
      {mode === "photo" && (
        <div className="space-y-3">
          <div
            role="button" tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
              imagePreview
                ? "border-fn-primary/30"
                : "border-dashed border-fn-border hover:border-fn-primary/50 hover:bg-fn-primary-light/30"
            }`}
          >
            {imagePreview ? (
              <>
                <Image src={imagePreview} alt="Meal preview" fill className="object-cover" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-fn-ink-rich/40 opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="h-8 w-8 mb-2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="text-sm font-semibold text-white">Change photo</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fn-primary-light">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7 text-fn-primary">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-fn-ink">Take a photo or upload</p>
                  <p className="mt-1 text-xs text-fn-muted">Works best with good lighting from above</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFileChange} />
          <div className="flex flex-wrap gap-2">
            {!imagePreview ? (
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>}
              >
                Choose photo
              </Button>
            ) : (
              <Button disabled={!canAnalyze || analyzing} loading={analyzing} onClick={analyzeWithAI}
                icon={!analyzing ? <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" /></svg> : undefined}
              >
                {analyzing ? "Analysing photo…" : "Analyse with AI"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── AI error ────────────────────────────────────────────── */}
      {aiError && (
        <div className="flex items-start gap-2 rounded-xl border border-fn-danger/20 bg-fn-danger-light px-3 py-2.5 text-sm text-fn-danger">
          <svg viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
            <path fillRule="evenodd" d="M8 15A7 7 0 118 1a7 7 0 010 14zm-.75-4.5a.75.75 0 001.5 0v-4a.75.75 0 00-1.5 0v4zm.75-6a.75.75 0 100 1.5.75.75 0 000-1.5z" clipRule="evenodd" />
          </svg>
          {aiError}
        </div>
      )}

      {/* ── Estimate card ────────────────────────────────────────── */}
      {estimate && (
        <div className="scale-reveal overflow-hidden rounded-2xl border border-fn-primary/20 bg-gradient-to-br from-fn-primary-light to-white shadow-fn-soft">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-fn-primary/10 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-fn-primary">AI estimate</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CONFIDENCE_BADGE[estimate.confidence].cls}`}>
                  {CONFIDENCE_BADGE[estimate.confidence].label}
                </span>
              </div>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-semibold text-black focus:outline-none focus:underline" />
            </div>
            <button type="button" onClick={() => { setEstimate(null); setAiError(null); }}
              className="shrink-0 rounded-lg p-1 text-fn-muted hover:bg-fn-primary/10 hover:text-fn-ink transition-colors"
              aria-label="Dismiss estimate"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
              </svg>
            </button>
          </div>

          {/* Macro grid — all editable */}
          <div className="grid grid-cols-4 gap-px bg-fn-primary/10 border-b border-fn-primary/10">
            {[
              { label: "Calories", field: editCal,  setter: setEditCal,  unit: "kcal", hi: true },
              { label: "Protein",  field: editPro,  setter: setEditPro,  unit: "g" },
              { label: "Carbs",    field: editCarb, setter: setEditCarb, unit: "g" },
              { label: "Fat",      field: editFat,  setter: setEditFat,  unit: "g" },
            ].map(({ label, field, setter, unit, hi }) => (
              <div key={label} className={`flex flex-col items-center px-2 py-3 ${hi ? "bg-fn-primary-light" : "bg-white"}`}>
                <div className="flex items-baseline gap-0.5">
                  <input type="number" value={field} onChange={(e) => setter(e.target.value)} min="0" max="9999"
                    className="w-16 bg-transparent text-center text-lg font-bold text-black focus:outline-none focus:underline"
                  />
                  <span className="text-[10px] text-neutral-500">{unit}</span>
                </div>
                <span className="mt-0.5 text-[10px] font-semibold text-neutral-600">{label}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="px-4 py-3">
              <p className="text-xs text-fn-muted leading-relaxed">{estimate.notes}</p>
              {/* Macro sanity check */}
              {(() => {
                const cal  = Number(editCal);
                const calc = Number(editPro) * 4 + Number(editCarb) * 4 + Number(editFat) * 9;
                if (cal > 0 && Math.abs(cal - calc) > cal * 0.2) {
                  return (
                    <p className="mt-1 text-[10px] text-amber-600">
                      Macros add up to ~{calc} kcal vs {cal} kcal — adjust above if needed.
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {/* Save */}
          <div className="border-t border-fn-primary/10 px-4 py-3">
            <Button className="w-full" loading={saving} onClick={saveMeal}
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            >
              Add to log
            </Button>
          </div>
        </div>
      )}

      {saveError && <ErrorMessage message={saveError} />}

      {!estimate && !analyzing && (
        <p className="text-[11px] text-fn-muted">
          {mode === "describe"
            ? "Tip: include cooking method, quantities, and brand for the best estimate."
            : "Tip: a clear top-down photo with good lighting gives the best results."}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────────── */
export default function NutritionLogPage() {
  const [meals,             setMeals]           = useState<MealEntry[]>([]);
  const [logId,             setLogId]           = useState<string | null>(null);
  const [planTargets,       setPlanTargets]     = useState<NutritionPlanTargets | null>(null);
  const [planMealStructure, setPlanMealStructure] = useState<string[]>([]);
  const [hydrationLiters,   setHydrationLiters] = useState<number | null>(null);
  const [hydrationGoal,     setHydrationGoal]   = useState<number>(2.5);
  const [loading,           setLoading]         = useState(true);
  const [refetch,           setRefetch]         = useState(0);
  const [pageError,         setPageError]       = useState<string | null>(null);
  const [aiInsight,         setAiInsight]       = useState<string | null>(null);
  const [aiInsightLoading,  setAiInsightLoading]= useState(false);
  const [mealSuggestions,   setMealSuggestions] = useState<Array<{ name: string; calories?: number; protein_g?: number; note?: string }>>([]);
  const [suggestLoading,    setSuggestLoading]  = useState(false);
  const today = toLocalDateString();

  const fetchToday = useCallback(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setPageError(null);
      Promise.all([
        supabase.from("nutrition_logs")
          .select("log_id, meals, total_calories, hydration_liters")
          .eq("user_id", user.id).eq("date", today)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("daily_plans")
          .select("plan_json")
          .eq("user_id", user.id).eq("date_local", today)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]).then(([logRes, planRes]) => {
        if (logRes.data) {
          const row = logRes.data as { log_id: string; meals: MealEntry[]; total_calories?: number; hydration_liters?: number | null };
          setMeals(Array.isArray(row.meals) ? row.meals : []);
          setLogId(row.log_id);
          setHydrationLiters(row.hydration_liters != null ? Number(row.hydration_liters) : null);
        } else { setMeals([]); setLogId(null); setHydrationLiters(null); }
        const plan = planRes.data?.plan_json as { nutrition_plan?: { calorie_target?: number; macros?: { protein_g?: number; carbs_g?: number; fat_g?: number }; meal_structure?: string[]; hydration_goal_liters?: number } } | undefined;
        if (plan?.nutrition_plan?.calorie_target != null) {
          setPlanTargets({ calorie_target: plan.nutrition_plan.calorie_target, protein_g: plan.nutrition_plan.macros?.protein_g ?? 0, carbs_g: plan.nutrition_plan.macros?.carbs_g ?? 0, fat_g: plan.nutrition_plan.macros?.fat_g ?? 0 });
          setPlanMealStructure(Array.isArray(plan.nutrition_plan.meal_structure) ? plan.nutrition_plan.meal_structure : []);
          setHydrationGoal(plan.nutrition_plan.hydration_goal_liters ?? 2.5);
        } else { setPlanTargets(null); setPlanMealStructure([]); }
        setLoading(false);
      }).catch(() => { setPageError("Failed to load nutrition log."); setLoading(false); });
    }).catch(() => { setPageError("Failed to load nutrition log."); setLoading(false); });
  }, [today]);

  useEffect(() => { setLoading(true); fetchToday(); }, [fetchToday, refetch]);

  useEffect(() => {
    if (loading) return;
    setAiInsightLoading(true);
    fetch("/api/v1/ai/nutrition-insight", { method: "POST" })
      .then(r => r.json()).then((b: { insight?: string | null }) => { if (b.insight) setAiInsight(b.insight); })
      .catch(() => {}).finally(() => setAiInsightLoading(false));
  }, [loading, refetch]);

  // Derived totals
  const totalCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProtein  = meals.reduce((s, m) => s + (m.macros?.protein ?? 0), 0) || Math.round(meals.length * 28);
  const totalCarbs    = meals.reduce((s, m) => s + (m.macros?.carbs   ?? 0), 0);
  const totalFat      = meals.reduce((s, m) => s + (m.macros?.fat     ?? 0), 0);
  const proteinTarget = planTargets?.protein_g ?? FALLBACK_PROTEIN_TARGET;
  const calorieTarget = planTargets?.calorie_target ?? null;
  const calPct        = calorieTarget ? Math.min(100, (totalCalories / calorieTarget) * 100) : 0;
  const proPct        = Math.min(100, (totalProtein / proteinTarget) * 100);
  const carbPct       = planTargets?.carbs_g ? Math.min(100, (totalCarbs / planTargets.carbs_g) * 100) : 0;
  const fatPct        = planTargets?.fat_g   ? Math.min(100, (totalFat   / planTargets.fat_g)   * 100) : 0;

  async function addHydration(amt: number) {
    const next = (hydrationLiters ?? 0) + amt;
    const supabase = createClient();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (logId) {
      await supabase.from("nutrition_logs").update({ hydration_liters: next }).eq("log_id", logId);
    } else {
      const { data } = await supabase.from("nutrition_logs")
        .insert({ user_id: user.id, date: today, meals: [], hydration_liters: next })
        .select("log_id").single();
      if (data) setLogId((data as { log_id: string }).log_id);
    }
    setHydrationLiters(next);
  }

  async function loadFromPlan() {
    const times = ["08:00", "12:00", "15:00", "18:00", "21:00"];
    const placeholders: MealEntry[] = planMealStructure.slice(0, 5).map((desc, i) => ({ time: times[i] ?? "12:00", description: desc }));
    const supabase = createClient();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const updated = [...meals, ...placeholders];
    const totalCal = updated.reduce((s, m) => s + (m.calories ?? 0), 0);
    if (logId) {
      await supabase.from("nutrition_logs").update({ meals: updated, total_calories: totalCal || null }).eq("log_id", logId);
    } else {
      const { data } = await supabase.from("nutrition_logs")
        .insert({ user_id: user.id, date: today, meals: updated, total_calories: totalCal || null })
        .select("log_id").single();
      if (data) setLogId((data as { log_id: string }).log_id);
    }
    setMeals(updated);
    setRefetch(n => n + 1);
  }

  return (
    <PageLayout title="Nutrition" subtitle="Meal timeline · macro tracking" backHref="/log" backLabel="Log">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">

        {/* ── Smart entry ─────────────────────────────────────── */}
        <Card>
          <CardHeader title="Log a meal" subtitle="Describe it or snap a photo — AI fills in the macros" />
          {planMealStructure.length > 0 && (
            <div className="mt-3">
              <Button type="button" variant="secondary" size="sm" onClick={loadFromPlan}>
                Pre-fill from today&apos;s plan
              </Button>
              <p className="mt-1 text-xs text-fn-muted">Adds meal slots from your AI-generated plan</p>
            </div>
          )}
          <SmartMealEntry
            onAdded={(newLogId, newMeals) => {
              if (newLogId != null) setLogId(newLogId);
              if (newMeals != null) setMeals(newMeals);
              setRefetch(n => n + 1);
            }}
            existingMeals={meals}
            existingLogId={logId}
          />
          {pageError && <ErrorMessage className="mt-3" message={pageError} />}
        </Card>

        {/* ── Macro summary ────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Today's targets" subtitle={planTargets ? "From your AI plan" : "Based on logged meals"} />

            {/* Calorie ring + macro bars */}
            <div className="mt-4 flex items-center gap-5">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#eef1fb" strokeWidth="8" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#335cff" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray="201"
                    strokeDashoffset={201 - (201 * calPct) / 100}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-sm font-bold text-fn-ink-rich leading-none">{totalCalories}</p>
                  <p className="text-[9px] text-fn-muted">{calorieTarget ? `/ ${calorieTarget}` : "kcal"}</p>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: "Protein", val: totalProtein, target: proteinTarget,        pct: proPct,  color: "bg-fn-primary" },
                  { label: "Carbs",   val: totalCarbs,   target: planTargets?.carbs_g, pct: carbPct, color: "bg-amber-400"  },
                  { label: "Fat",     val: totalFat,     target: planTargets?.fat_g,   pct: fatPct,  color: "bg-fn-accent"  },
                ].map(({ label, val, target, pct, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold text-fn-ink">{label}</span>
                      <span className="text-fn-muted">{val}g{target ? ` / ${target}g` : ""}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-fn-bg-alt">
                      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {aiInsightLoading ? (
              <div className="mt-3 h-10 shimmer rounded-xl" />
            ) : aiInsight ? (
              <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2.5 text-xs leading-relaxed text-fn-ink">{aiInsight}</p>
            ) : null}

            {/* Meal suggestions */}
            <div className="mt-3">
              <Button type="button" variant="secondary" size="sm" loading={suggestLoading}
                onClick={() => {
                  setSuggestLoading(true); setMealSuggestions([]);
                  fetch("/api/v1/ai/meal-suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
                    .then(r => r.json())
                    .then((b: { suggestions?: Array<{ name: string; calories?: number; protein_g?: number; note?: string }> }) => setMealSuggestions(b.suggestions ?? []))
                    .catch(() => {}).finally(() => setSuggestLoading(false));
                }}
              >
                {suggestLoading ? "Loading…" : "Suggest next meal"}
              </Button>
              {mealSuggestions.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {mealSuggestions.map((s, i) => (
                    <li key={i} className="rounded-xl bg-fn-bg-alt px-3 py-2 text-xs">
                      <span className="font-semibold text-fn-ink">{s.name}</span>
                      {(s.calories != null || s.protein_g != null) && (
                        <span className="ml-2 text-fn-muted">
                          {s.calories != null ? `${s.calories} kcal` : ""}
                          {s.calories != null && s.protein_g != null ? " · " : ""}
                          {s.protein_g != null ? `${s.protein_g}g protein` : ""}
                        </span>
                      )}
                      {s.note && <p className="mt-0.5 text-fn-muted">{s.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* Hydration */}
          <Card>
            <CardHeader title="Hydration" subtitle={`Goal: ${hydrationGoal} L today`} />
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#eef1fb" strokeWidth="6" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#15b69c" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray="138"
                    strokeDashoffset={138 - (138 * Math.min(1, (hydrationLiters ?? 0) / hydrationGoal))}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs font-bold text-fn-accent">{(hydrationLiters ?? 0).toFixed(1)}L</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-fn-ink">{(hydrationLiters ?? 0).toFixed(2)} / {hydrationGoal} L</p>
                <div className="mt-1.5 flex gap-2">
                  {[0.25, 0.5].map(amt => (
                    <button key={amt} type="button" onClick={() => addHydration(amt)}
                      className="rounded-lg border border-fn-border px-3 py-1.5 text-xs font-semibold text-fn-muted hover:border-fn-accent/40 hover:bg-fn-accent-light hover:text-fn-accent transition-all duration-200"
                    >
                      +{amt} L
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Meal timeline ─────────────────────────────────────── */}
      {loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : meals.length > 0 ? (
        <Card className="mt-4">
          <CardHeader title="Meal timeline" subtitle="Today" />
          <ul className="mt-3 space-y-2">
            {meals.map((meal, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-fn-border bg-fn-surface-hover p-3">
                <span className="shrink-0 rounded-lg bg-fn-bg-alt px-2 py-1 text-xs font-semibold text-fn-muted">{meal.time}</span>
                <span className="flex-1 text-sm text-fn-ink">{meal.description}</span>
                <div className="shrink-0 text-right">
                  {meal.calories != null && <span className="text-xs font-semibold text-fn-ink">{meal.calories} kcal</span>}
                  {meal.macros?.protein != null && <span className="ml-2 text-xs text-fn-muted">{meal.macros.protein}g P</span>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-fn-border pt-3 text-xs font-semibold">
            <span className="text-fn-muted">Total</span>
            <span className="text-fn-ink">{totalCalories} kcal · {totalProtein}g protein</span>
          </div>
        </Card>
      ) : (
        <EmptyState className="mt-6" message="No meals logged yet — use the form above to get started." />
      )}
    </PageLayout>
  );
}
