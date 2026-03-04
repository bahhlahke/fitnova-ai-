"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MealEntry } from "@/types";
import { PageLayout, Card, CardHeader, Button, ErrorMessage, LoadingState, EmptyState } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";
import { emitDataRefresh, useDataRefresh } from "@/lib/ui/data-sync";
import { BarcodeScanner } from "@/components/tracking/BarcodeScanner";

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

type EstimateReliability = {
  confidence_score: number;
  explanation: string;
  limitations: string[];
};

/* ── Constants ──────────────────────────────────────────────────── */
const FALLBACK_PROTEIN_TARGET = 150;

const CONFIDENCE_BADGE: Record<MealEstimate["confidence"], { label: string; cls: string }> = {
  high: { label: "High confidence", cls: "bg-fn-accent-light text-fn-accent" },
  medium: { label: "Medium confidence", cls: "bg-amber-50 text-amber-700" },
  low: { label: "Low confidence", cls: "bg-fn-danger-light text-fn-danger" },
};

/* ── Image resize helper ─────────────────────────────────────────── */
function resizeImage(file: File, maxPx = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
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
type EntryMode = "describe" | "photo" | "barcode";
const ENTRY_MODES: EntryMode[] = ["describe", "photo", "barcode"];

function SmartMealEntry({
  onAdded,
  existingMeals,
  existingLogId,
  editIndex = null,
  onCancelEdit,
}: {
  onAdded: (newLogId?: string | null, newMeals?: MealEntry[]) => void;
  existingMeals: MealEntry[];
  existingLogId: string | null;
  editIndex?: number | null;
  onCancelEdit?: () => void;
}) {
  const [mode, setMode] = useState<EntryMode>("photo");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI state
  const [analyzing, setAnalyzing] = useState(false);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [reliability, setReliability] = useState<EstimateReliability | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Editable estimate fields
  const [editName, setEditName] = useState("");
  const [editCal, setEditCal] = useState("");
  const [editPro, setEditPro] = useState("");
  const [editCarb, setEditCarb] = useState("");
  const [editFat, setEditFat] = useState("");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const today = searchParams.get("date") || toLocalDateString();
  const time = new Date().toTimeString().slice(0, 5);

  // Populate editable fields when estimate arrives OR when editing starts
  useEffect(() => {
    if (editIndex !== null && existingMeals[editIndex]) {
      const m = existingMeals[editIndex];
      setEditName(m.description);
      setEditCal(String(m.calories ?? ""));
      setEditPro(String(m.macros?.protein ?? ""));
      setEditCarb(String(m.macros?.carbs ?? ""));
      setEditFat(String(m.macros?.fat ?? ""));
      setEstimate({
        name: m.description,
        calories: m.calories ?? 0,
        protein: m.macros?.protein ?? 0,
        carbs: m.macros?.carbs ?? 0,
        fat: m.macros?.fat ?? 0,
        confidence: "high",
        notes: "Editing existing entry",
      });
    } else if (estimate) {
      setEditName(estimate.name);
      setEditCal(String(estimate.calories));
      setEditPro(String(estimate.protein));
      setEditCarb(String(estimate.carbs));
      setEditFat(String(estimate.fat));
    }
  }, [estimate, editIndex, existingMeals]);

  const [showScanner, setShowScanner] = useState(false);

  async function handleBarcodeScan(barcode: string) {
    setShowScanner(false);
    setAnalyzing(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/v1/nutrition/barcode?barcode=${barcode}`);
      const data = await res.json();
      if (!res.ok || !data.nutrition) {
        setAiError(data.error || "Product not found. Try describing it instead.");
      } else {
        const n = data.nutrition;
        setEstimate({
          name: `${n.brand} ${n.name}`.trim(),
          calories: n.calories,
          protein: n.protein,
          carbs: n.carbs,
          fat: n.fat,
          confidence: "high",
          notes: `Scanned barcode: ${barcode}. Values per ${n.serving_size}.`,
        });
      }
    } catch (err) {
      setAiError("Network error scanning barcode.");
    } finally {
      setAnalyzing(false);
    }
  }

  function switchMode(m: EntryMode) {
    setMode(m);
    setEstimate(null); setAiError(null);
    setReliability(null);
    setDescription(""); setImagePreview(null); setImageData(null); setSaveError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiError(null); setEstimate(null); setReliability(null);
    try {
      const dataUrl = await resizeImage(file);
      setImageData(dataUrl); setImagePreview(dataUrl);
    } catch (_e) { setAiError("Could not process image. Please try again."); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function analyzeWithAI() {
    setAnalyzing(true); setAiError(null); setEstimate(null); setReliability(null);
    try {
      const body = mode === "describe"
        ? { type: "text", description }
        : { type: "image", data: imageData };
      const res = await fetch("/api/v1/ai/analyze-meal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { estimate?: MealEstimate; reliability?: EstimateReliability; error?: string };
      if (!res.ok || !data.estimate) {
        setAiError(data.error ?? "Could not estimate nutrition. Please try again.");
      } else {
        setEstimate(data.estimate);
        if (data.reliability) setReliability(data.reliability);
      }
    } catch (_e) { setAiError("Network error — check your connection."); }
    finally { setAnalyzing(false); }
  }

  async function saveMeal() {
    const name = editName.trim() || description.trim() || "Meal";
    const calories = Number(editCal) || 0;
    const protein = Number(editPro) || 0;
    const carbs = Number(editCarb) || 0;
    const fat = Number(editFat) || 0;
    setSaving(true); setSaveError(null);
    const supabase = createClient();
    if (!supabase) { setSaveError("Supabase not configured."); setSaving(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveError("Sign in to log meals."); setSaving(false); return; }

    const newMeal: MealEntry = {
      time: editIndex !== null ? existingMeals[editIndex].time : time,
      description: name,
      calories: calories > 0 ? calories : undefined,
      macros: { protein, carbs, fat },
    };

    let updated: MealEntry[];
    if (editIndex !== null) {
      updated = [...existingMeals];
      updated[editIndex] = newMeal;
    } else {
      updated = [...existingMeals, newMeal];
    }
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
    setDescription(""); setImagePreview(null); setImageData(null); setEstimate(null); setReliability(null);
    setEditName(""); setEditCal(""); setEditPro(""); setEditCarb(""); setEditFat("");
    setSaving(false);
    if (onCancelEdit) onCancelEdit();
  }

  async function quickSave(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    if (!supabase) {
      setSaveError("Supabase not configured.");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaveError("Sign in to log meals.");
      setSaving(false);
      return;
    }
    const newMeal: MealEntry = { time, description: description.trim() };
    const updated = [...existingMeals, newMeal];
    const totalCals = updated.reduce((s, m) => s + (m.calories ?? 0), 0);
    if (existingLogId) {
      const { error } = await supabase
        .from("nutrition_logs")
        .update({ meals: updated, total_calories: totalCals || null })
        .eq("log_id", existingLogId);
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
      onAdded(undefined, updated);
    } else {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .insert({
          user_id: user.id,
          date: today,
          meals: updated,
          total_calories: totalCals || null,
        })
        .select("log_id")
        .single();
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
      onAdded((data as { log_id: string })?.log_id ?? null, updated);
    }
    setDescription(""); setSaving(false);
  }

  const canAnalyze = mode === "describe" ? description.trim().length >= 3 : !!imageData;

  return (
    <div className="mt-4 space-y-4">
      {/* Mode tabs */}
      <div className="inline-flex rounded-xl border border-white/[0.08] bg-black/40 p-1 backdrop-blur-md">
        {ENTRY_MODES.map((m) => (
          <button key={m} type="button" onClick={() => switchMode(m)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${mode === m ? "bg-fn-accent/20 text-fn-accent shadow-fn-soft border border-fn-accent/20" : "text-fn-ink/40 hover:text-white"
              }`}
          >
            {m === "describe" ? (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                Describe
              </>
            ) : m === "photo" ? (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Photo
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm2 2h-1V5h1v1z" clipRule="evenodd" />
                  <path d="M11 13a1 1 0 011-1h1v1h-1v1h1v1h-1v1h-1v-2h-1v-1h1v-1zm2 2h1v1h-1v-1zm1-2h1v1h-1v-1zm0 3h1v1h-1v-1zm2-3h1v1h-1v-1zm0 2h1v1h-1v-1z" />
                </svg>
                Barcode
              </>
            )}
          </button>
        ))}
      </div>

      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}

      {/* ── Describe mode ───────────────────────────────────────── */}
      {mode === "describe" && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setEstimate(null); setAiError(null); }}
              placeholder={'Describe meal (e.g. "Two fried eggs on wholegrain toast")'}
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-2xl border border-white/[0.08] bg-black/40 px-5 py-4 text-base text-white placeholder:text-fn-ink/30 focus:border-fn-accent/50 focus:outline-none focus:ring-4 focus:ring-fn-accent/5 transition-all"
            />
            <span className="absolute bottom-3 right-4 text-[10px] font-black uppercase tracking-widest text-fn-ink/20">
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
            className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition-all duration-300 ${imagePreview
              ? "border-fn-accent/30"
              : "border-dashed border-white/[0.08] bg-black/40 hover:border-fn-accent/40 hover:bg-black/60 shadow-fn-soft"
              }`}
          >
            {imagePreview ? (
              <>
                <Image src={imagePreview} alt="Meal preview" fill className="object-cover" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-10 w-10 mb-3">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Replace Media</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fn-accent/10 border border-fn-accent/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 text-fn-accent">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-white">Visual Capture</p>
                  <p className="mt-2 text-[11px] font-medium text-fn-ink/40 uppercase tracking-widest">Supports primary lens intake</p>
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

      {/* ── Barcode mode ────────────────────────────────────────── */}
      {mode === "barcode" && (
        <div className="space-y-4 rounded-2xl border border-fn-border bg-fn-surface p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-fn-primary-light">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-fn-primary">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <path d="M7 12h10M8 8h0M12 8h0M16 8h0M8 16h0M12 16h0M16 16h0" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-fn-ink">Barcode Scanner</h4>
            <p className="mt-1 text-sm text-fn-muted">Scan any packaged food to automatically import its nutritional data.</p>
          </div>
          <Button onClick={() => setShowScanner(true)} className="w-full">
            Launch Scanner
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-fn-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-fn-surface px-2 text-fn-muted">or enter manually</span>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter barcode manually"
              className="flex-1 rounded-xl border border-fn-border bg-fn-bg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fn-primary/20"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleBarcodeScan((e.target as HTMLInputElement).value);
                }
              }}
            />
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
        <div className="scale-reveal overflow-hidden rounded-xl3 border border-fn-accent/20 bg-fn-surface/60 shadow-fn-card backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-5">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-fn-accent">Neural Scan Result</span>
                <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${CONFIDENCE_BADGE[estimate.confidence].cls} border-current opacity-80`}>
                  {CONFIDENCE_BADGE[estimate.confidence].label}
                </span>
              </div>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="mt-2 w-full bg-transparent text-lg font-black italic text-white focus:outline-none focus:ring-none uppercase tracking-tight" />
            </div>
            <button type="button" onClick={() => { setEstimate(null); setAiError(null); }}
              className="shrink-0 rounded-xl p-2 text-fn-ink/40 hover:bg-white/5 hover:text-white transition-all"
              aria-label="Dismiss estimate"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5">
                <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
              </svg>
            </button>
          </div>

          {/* Macro grid — all editable */}
          <div className="grid grid-cols-4 gap-px bg-white/[0.08] border-b border-white/[0.08]">
            {[
              { label: "Calories", field: editCal, setter: setEditCal, unit: "kcal", hi: true },
              { label: "Protein", field: editPro, setter: setEditPro, unit: "g" },
              { label: "Carbs", field: editCarb, setter: setEditCarb, unit: "g" },
              { label: "Fat", field: editFat, setter: setEditFat, unit: "g" },
            ].map(({ label, field, setter, unit, hi }) => (
              <div key={label} className={`flex flex-col items-center px-2 py-5 ${hi ? "bg-fn-accent/10" : "bg-black/60"}`}>
                <div className="flex items-baseline gap-1">
                  <input type="number" value={field} onChange={(e) => setter(e.target.value)} min="0" max="9999"
                    className={`w-16 bg-transparent text-center text-2xl font-black italic focus:outline-none ${hi ? "text-fn-accent" : "text-white"}`}
                  />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${hi ? "text-fn-accent/60" : "text-fn-ink/40"}`}>{unit}</span>
                </div>
                <span className={`mt-1 text-[10px] font-black uppercase tracking-widest ${hi ? "text-fn-accent" : "text-fn-ink/30"}`}>{label}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="px-4 py-3">
              <p className="text-xs text-fn-muted leading-relaxed">{estimate.notes}</p>
              {reliability && (
                <div className="mt-2 rounded-lg border border-fn-border bg-white px-2 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-fn-muted">
                    AI confidence {Math.round(reliability.confidence_score * 100)}%
                  </p>
                  <p className="mt-1 text-[11px] text-fn-muted">{reliability.explanation}</p>
                  {reliability.limitations.length > 0 && (
                    <p className="mt-1 text-[10px] text-fn-muted">
                      Limitation: {reliability.limitations[0]}
                    </p>
                  )}
                </div>
              )}
              {/* Macro sanity check */}
              {(() => {
                const cal = Number(editCal);
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
          <div className="border-t border-fn-primary/10 px-4 py-3 flex gap-2">
            <Button className="flex-1" loading={saving} onClick={saveMeal}
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            >
              {editIndex !== null ? "Update meal" : "Add to log"}
            </Button>
            {editIndex !== null && (
              <Button variant="ghost" onClick={onCancelEdit}>Cancel</Button>
            )}
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
function NutritionLogContent() {
  const searchParams = useSearchParams();
  const targetDate = searchParams.get("date") || toLocalDateString();
  const isPastDay = targetDate !== toLocalDateString();

  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [logId, setLogId] = useState<string | null>(null);
  const [planTargets, setPlanTargets] = useState<NutritionPlanTargets | null>(null);
  const [planMealStructure, setPlanMealStructure] = useState<string[]>([]);
  const [hydrationLiters, setHydrationLiters] = useState<number | null>(null);
  const [hydrationGoal, setHydrationGoal] = useState<number>(2.5);
  const [loading, setLoading] = useState(true);
  const [refetch, setRefetch] = useState(0);
  const [pageError, setPageError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [mealSuggestions, setMealSuggestions] = useState<Array<{ name: string; calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; note?: string }>>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const fetchTargetDate = useCallback(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setPageError(null);
      Promise.all([
        supabase.from("nutrition_logs")
          .select("log_id, meals, total_calories, hydration_liters")
          .eq("user_id", user.id).eq("date", targetDate)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("daily_plans")
          .select("plan_json")
          .eq("user_id", user.id).eq("date_local", targetDate)
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
  }, [targetDate]);

  useEffect(() => { setLoading(true); fetchTargetDate(); }, [fetchTargetDate, refetch]);

  useDataRefresh(["nutrition"], () => {
    setRefetch((current) => current + 1);
  });

  useEffect(() => {
    if (loading) return;
    setAiInsightLoading(true);
    fetch("/api/v1/ai/nutrition-insight", { method: "POST" })
      .then(r => r.json()).then((b: { insight?: string | null }) => { if (b.insight) setAiInsight(b.insight); })
      .catch(() => { }).finally(() => setAiInsightLoading(false));
  }, [loading, refetch]);

  // Derived totals
  const totalCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.macros?.protein ?? 0), 0) || Math.round(meals.length * 28);
  const totalCarbs = meals.reduce((s, m) => s + (m.macros?.carbs ?? 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.macros?.fat ?? 0), 0);
  const proteinTarget = planTargets?.protein_g ?? FALLBACK_PROTEIN_TARGET;
  const calorieTarget = planTargets?.calorie_target ?? null;
  const calPct = calorieTarget ? Math.min(100, (totalCalories / calorieTarget) * 100) : 0;
  const proPct = Math.min(100, (totalProtein / proteinTarget) * 100);
  const carbPct = planTargets?.carbs_g ? Math.min(100, (totalCarbs / planTargets.carbs_g) * 100) : 0;
  const fatPct = planTargets?.fat_g ? Math.min(100, (totalFat / planTargets.fat_g) * 100) : 0;

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
        .insert({ user_id: user.id, date: targetDate, meals: [], hydration_liters: next })
        .select("log_id").single();
      if (data) setLogId((data as { log_id: string })?.log_id ?? null);
    }
    setHydrationLiters(next);
    emitDataRefresh(["dashboard", "nutrition"]);
  }

  async function resetHydration() {
    const supabase = createClient();
    if (!supabase || !logId) return;
    await supabase.from("nutrition_logs").update({ hydration_liters: 0 }).eq("log_id", logId);
    setHydrationLiters(0);
    emitDataRefresh(["dashboard", "nutrition"]);
  }

  async function deleteMeal(index: number) {
    const updated = meals.filter((_, i) => i !== index);
    const totalCal = updated.reduce((s, m) => s + (m.calories ?? 0), 0);
    const supabase = createClient();
    if (!supabase || !logId) return;
    const { error } = await supabase.from("nutrition_logs").update({ meals: updated, total_calories: totalCal || null }).eq("log_id", logId);
    if (!error) {
      setMeals(updated);
      emitDataRefresh(["dashboard", "nutrition"]);
    }
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
        .insert({ user_id: user.id, date: targetDate, meals: updated, total_calories: totalCal || null })
        .select("log_id").single();
      if (data) setLogId((data as { log_id: string }).log_id);
    }
    setMeals(updated);
    setRefetch(n => n + 1);
    emitDataRefresh(["dashboard", "nutrition"]);
  }

  return (
    <PageLayout title="Metabolic Intake" subtitle={isPastDay ? `Viewing ${targetDate}` : "Meal timeline · macro tracking"}>
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
              emitDataRefresh(["dashboard", "nutrition"]);
              setEditingIndex(null);
              // Trigger award check
              fetch("/api/v1/awards/check", { method: "POST" }).catch(() => { });
            }}
            existingMeals={meals}
            existingLogId={logId}
            editIndex={editingIndex}
            onCancelEdit={() => setEditingIndex(null)}
          />
          {pageError && <ErrorMessage className="mt-3" message={pageError} />}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/history?tab=nutrition">
              <Button type="button" variant="secondary" size="sm">
                View history
              </Button>
            </Link>
            <Link href="/log/nutrition/meal-plan">
              <Button type="button" variant="primary" size="sm">
                Meal Planner
              </Button>
            </Link>
            <Link href="/?focus=ai">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="border border-white/10"
              >
                Ask AI on Dashboard
              </Button>
            </Link>
          </div>
        </Card>

        {/* ── Macro summary ────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Today's targets" subtitle={planTargets ? "From your AI plan" : "Based on logged meals"} />

            {/* Calorie ring + macro bars */}
            <div className="mt-4 flex items-center gap-5">
              <div className="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray="213.6"
                    strokeDashoffset={213.6 - (213.6 * calPct) / 100}
                    className="text-fn-accent transition-all duration-1000 shadow-[0_0_15px_rgba(10,217,196,0.5)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-black text-white italic leading-none">{totalCalories}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-fn-ink/30 italic">{calorieTarget ? `/ ${calorieTarget}` : "kcal"}</p>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                {[
                  { label: "Protein", val: totalProtein, target: proteinTarget, pct: proPct, color: "bg-white", shadow: "shadow-[0_0_10px_rgba(255,255,255,0.3)]" },
                  { label: "Carbs", val: totalCarbs, target: planTargets?.carbs_g, pct: carbPct, color: "bg-fn-ink/40", shadow: "" },
                  { label: "Fat", val: totalFat, target: planTargets?.fat_g, pct: fatPct, color: "bg-fn-accent", shadow: "shadow-[0_0_10px_rgba(10,217,196,0.3)]" },
                ].map(({ label, val, target, pct, color, shadow }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-1.5">
                      <span className="text-white/60">{label}</span>
                      <span className="text-fn-accent italic">{val}g <span className="text-fn-ink/20 font-medium">/ {target ? `${target}g` : "—"}</span></span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                      <div className={`h-full rounded-full ${color} ${shadow} transition-all duration-700`} style={{ width: `${pct}%` }} />
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
                    .catch(() => { }).finally(() => setSuggestLoading(false));
                }}
              >
                {suggestLoading ? "Loading…" : "Suggest next meal"}
              </Button>
              {mealSuggestions.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {mealSuggestions.map((s, i) => (
                    <li key={i} className="rounded-xl bg-fn-bg-alt px-3 py-2 text-xs">
                      <span className="font-semibold text-fn-ink">{s.name}</span>
                      {(s.calories != null || s.protein_g != null || s.carbs_g != null || s.fat_g != null) && (
                        <span className="ml-2 text-fn-muted">
                          {s.calories != null ? `${s.calories} kcal` : ""}
                          {s.calories != null && (s.protein_g != null || s.carbs_g != null || s.fat_g != null) ? " · " : ""}
                          {[
                            s.protein_g != null ? `${s.protein_g}g P` : null,
                            s.carbs_g != null ? `${s.carbs_g}g C` : null,
                            s.fat_g != null ? `${s.fat_g}g F` : null,
                          ].filter(Boolean).join(" · ")}
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
            <CardHeader title="Hydration System" subtitle={`Daily Target: ${hydrationGoal} L`} />
            <div className="mt-6 flex items-center gap-6">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4"
                    strokeLinecap="round" strokeDasharray="150.7"
                    strokeDashoffset={150.7 - (150.7 * Math.min(1, (hydrationLiters ?? 0) / hydrationGoal))}
                    className="text-fn-accent transition-all duration-700 shadow-[0_0_10px_rgba(10,217,196,0.3)]"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-lg font-black text-white italic">{(hydrationLiters ?? 0).toFixed(1)}<span className="text-[10px] ml-0.5 not-italic uppercase text-fn-ink/40">L</span></p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Intake Volume</p>
                <div className="flex flex-wrap gap-2">
                  {[0.25, 0.5].map(amt => (
                    <button key={amt} type="button" onClick={() => addHydration(amt)}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white/60 hover:border-fn-accent/40 hover:bg-fn-accent/10 hover:text-fn-accent transition-all duration-300"
                    >
                      +{amt}L
                    </button>
                  ))}
                  {(hydrationLiters ?? 0) > 0 && (
                    <button type="button" onClick={resetHydration}
                      className="rounded-xl border border-fn-danger/20 bg-fn-danger/5 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-fn-danger hover:bg-fn-danger/10 transition-all duration-300"
                    >
                      Reset
                    </button>
                  )}
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
          <ul className="mt-8 space-y-3">
            {meals.map((meal, i) => (
              <li key={i} className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-black/40 px-5 py-4 shadow-fn-soft transition-all hover:bg-black/60">
                <span className="shrink-0 rounded-lg bg-fn-accent/10 border border-fn-accent/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-fn-accent italic">{meal.time}</span>
                <span className="flex-1 text-sm font-black text-white italic uppercase tracking-tight">{meal.description}</span>
                <div className="shrink-0 text-right flex items-center gap-6">
                  <div>
                    {meal.calories != null && <p className="text-base font-black text-white italic leading-none">{meal.calories} <span className="text-[10px] uppercase font-black tracking-widest text-fn-ink/40 not-italic">kcal</span></p>}
                    {meal.macros?.protein != null && <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent">{meal.macros.protein}g protein</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingIndex(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-fn-ink/40 hover:bg-white/5 hover:text-white rounded-lg transition-all">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteMeal(i)} className="p-2 text-fn-ink/40 hover:bg-fn-danger/10 hover:text-fn-danger rounded-lg transition-all">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
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

export default function NutritionLogPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NutritionLogContent />
    </Suspense>
  );
}
