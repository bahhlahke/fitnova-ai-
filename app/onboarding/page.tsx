"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ErrorMessage } from "@/components/ui";
import { clearPreAuthDraft, readPreAuthDraft } from "@/lib/funnel/preauth";
import {
  DEFAULT_UNIT_SYSTEM,
  UnitSystem,
  fromDisplayHeight,
  fromDisplayWeight,
  heightUnitLabel,
  weightUnitLabel,
} from "@/lib/units";

const steps = [
  { id: "stats", label: "Stats" },
  { id: "goals", label: "Goals" },
  { id: "injuries", label: "Injuries" },
  { id: "diet", label: "Diet" },
  { id: "devices", label: "Devices" },
  { id: "baseline", label: "Baseline" },
] as const;

const goalOptions = [
  "Weight loss",
  "Muscle gain",
  "Endurance",
  "General fitness",
  "Mobility",
];

const dietOptions = ["None", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Other"];

export default function OnboardingPage() {
  const [resume, setResume] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [stats, setStats] = useState({ name: "", age: "", sex: "", height: "", weight: "" });
  const [goals, setGoals] = useState<string[]>([]);
  const [injuries, setInjuries] = useState("");
  const [diet, setDiet] = useState("");
  const [allergies, setAllergies] = useState("");
  const [devices, setDevices] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resumedFromAssessment, setResumedFromAssessment] = useState(false);

  const inputClass =
    "min-h-touch w-full rounded-xl border border-fn-border bg-white px-4 py-3 text-black placeholder-neutral-400 focus:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600/20";
  const labelClass = "block text-sm font-semibold text-fn-ink-soft mt-4 first:mt-0";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setResume(params.get("resume") === "1");
  }, []);

  useEffect(() => {
    if (!resume) return;
    const draft = readPreAuthDraft(typeof window !== "undefined" ? window.localStorage : null);
    if (!draft) return;

    setResumedFromAssessment(true);
    if (draft.goal) {
      setGoals((prev) => (prev.includes(draft.goal) ? prev : [...prev, draft.goal]));
    }
    if (draft.nutrition_focus) {
      setDiet(draft.nutrition_focus.toLowerCase());
    }
    if (draft.location_preference) {
      setDevices(`${draft.location_preference} setup`);
    }
  }, [resume]);

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function handleFinish() {
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
      setSaveError("Sign in to save your profile.");
      setSaving(false);
      return;
    }
    const ageNum = stats.age ? parseInt(stats.age, 10) : undefined;
    const heightNum = stats.height ? parseFloat(stats.height) : undefined;
    const weightNum = stats.weight ? parseFloat(stats.weight) : undefined;
    const age = ageNum != null && Number.isFinite(ageNum) && ageNum >= 13 && ageNum <= 120 ? ageNum : null;
    const heightCm = heightNum != null && Number.isFinite(heightNum) ? fromDisplayHeight(heightNum, unitSystem) : undefined;
    const weightKg = weightNum != null && Number.isFinite(weightNum) ? fromDisplayWeight(weightNum, unitSystem) : undefined;
    const height = heightCm != null && Number.isFinite(heightCm) && heightCm >= 100 && heightCm <= 250 ? heightCm : null;
    const weight = weightKg != null && Number.isFinite(weightKg) && weightKg >= 30 && weightKg <= 500 ? weightKg : null;
    const { error: profileErr } = await supabase.from("user_profile").upsert(
      {
        user_id: user.id,
        name: stats.name || null,
        email: user.email || null,
        age,
        sex: stats.sex || null,
        height,
        weight,
        goals: goals.length ? goals : null,
        injuries_limitations: injuries.trim() ? { notes: injuries.trim() } : {},
        dietary_preferences: { preference: diet || "none", allergies: allergies.trim() || null },
        activity_level: null,
        devices: { ...(devices.trim() ? { apps: devices.trim() } : {}), units_system: unitSystem },
      },
      { onConflict: "user_id" }
    );
    if (profileErr) {
      setSaveError(profileErr.message);
      setSaving(false);
      return;
    }
    const responses = {
      stats,
      goals,
      injuries,
      diet,
      allergies,
      devices,
      units_system: unitSystem,
      resumed_from_assessment: resumedFromAssessment,
    };
    const { data: existing } = await supabase
      .from("onboarding")
      .select("onboarding_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let onboardingErr: { message: string } | null = null;
    if (existing && "onboarding_id" in existing) {
      const { error } = await supabase
        .from("onboarding")
        .update({ completed_at: new Date().toISOString(), responses })
        .eq("onboarding_id", (existing as { onboarding_id: string }).onboarding_id);
      onboardingErr = error;
    } else {
      const { error } = await supabase.from("onboarding").insert({
        user_id: user.id,
        completed_at: new Date().toISOString(),
        responses,
      });
      onboardingErr = error;
    }
    if (onboardingErr) {
      setSaveError(onboardingErr.message);
      setSaving(false);
      return;
    }

    clearPreAuthDraft(typeof window !== "undefined" ? window.localStorage : null);
    setSaving(false);
    setCompleted(true);
  }

  function handleNext() {
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
    else void handleFinish();
  }

  if (completed) {
    return (
      <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
        <Card padding="lg" className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Setup complete</p>
          <h2 className="mt-2 font-display text-3xl text-fn-ink">Your plan is ready</h2>
          <p className="mt-2 text-fn-muted">
            {saveError
              ? `Could not complete onboarding: ${saveError}`
              : "Onboarding complete. Your profile has been saved and your adaptive plan can now guide day one."}
          </p>
          <Link href="/" className="mt-6 inline-block">
            <Button>Go to dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card padding="lg">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Onboarding</p>
            <h1 className="mt-2 font-display text-4xl text-fn-ink">Build your AI coaching profile</h1>
            <p className="mt-2 text-fn-muted">This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments.</p>
            {resumedFromAssessment && (
              <div className="mt-3 inline-flex rounded-full bg-fn-bg-alt px-3 py-1 text-xs font-semibold text-fn-ink">
                Resumed from assessment
              </div>
            )}
          </header>

          <div className="mb-6" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Onboarding progress">
            <div className="flex justify-between gap-2">
              {steps.map((step, i) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 flex-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-fn-primary/30 ${
                    i <= currentStep ? "bg-fn-primary" : "bg-fn-bg-alt"
                  }`}
                  aria-current={i === currentStep ? "step" : undefined}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-fn-muted">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].label}
            </p>
          </div>

          <div className="rounded-2xl border border-fn-border bg-fn-surface-hover p-5">
            <h2 className="text-xl font-semibold text-fn-ink">{steps[currentStep].label}</h2>

            {steps[currentStep].id === "stats" && (
              <div className="mt-4 space-y-0">
                <label className={labelClass}>Name</label>
                <input type="text" value={stats.name} onChange={(e) => setStats((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Your name" />
                <label className={labelClass}>Age</label>
                <input type="number" value={stats.age} onChange={(e) => setStats((s) => ({ ...s, age: e.target.value }))} className={inputClass} placeholder="25" min={13} max={120} />
                <label className={labelClass}>Sex</label>
                <select value={stats.sex} onChange={(e) => setStats((s) => ({ ...s, sex: e.target.value }))} className={inputClass}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <label className={labelClass}>Units</label>
                <select value={unitSystem} onChange={(e) => setUnitSystem(e.target.value === "metric" ? "metric" : "imperial")} className={inputClass}>
                  <option value="imperial">in / lbs</option>
                  <option value="metric">cm / kg</option>
                </select>
                <label className={labelClass}>Height ({heightUnitLabel(unitSystem)})</label>
                <input
                  type="number"
                  step={unitSystem === "imperial" ? "0.1" : "1"}
                  value={stats.height}
                  onChange={(e) => setStats((s) => ({ ...s, height: e.target.value }))}
                  className={inputClass}
                  placeholder={unitSystem === "imperial" ? "67" : "170"}
                />
                <label className={labelClass}>Weight ({weightUnitLabel(unitSystem)})</label>
                <input
                  type="number"
                  step="0.1"
                  value={stats.weight}
                  onChange={(e) => setStats((s) => ({ ...s, weight: e.target.value }))}
                  className={inputClass}
                  placeholder={unitSystem === "imperial" ? "154" : "70"}
                />
              </div>
            )}

            {steps[currentStep].id === "goals" && (
              <div className="mt-4 space-y-2">
                {goalOptions.map((g) => (
                  <label key={g} className="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border border-fn-border bg-white px-4 py-3">
                    <input type="checkbox" checked={goals.includes(g)} onChange={() => toggleGoal(g)} className="h-5 w-5 rounded border-fn-border" />
                    <span className="font-semibold text-black">{g}</span>
                  </label>
                ))}
              </div>
            )}

            {steps[currentStep].id === "injuries" && (
              <div className="mt-4">
                <label className={labelClass}>Injuries or limitations (optional)</label>
                <textarea value={injuries} onChange={(e) => setInjuries(e.target.value)} className={`${inputClass} min-h-[120px]`} placeholder="e.g. lower back pain, knee history" rows={4} />
              </div>
            )}

            {steps[currentStep].id === "diet" && (
              <div className="mt-4 space-y-0">
                <label className={labelClass}>Dietary preference</label>
                <select value={diet} onChange={(e) => setDiet(e.target.value)} className={inputClass}>
                  {dietOptions.map((o) => (
                    <option key={o} value={o.toLowerCase()}>{o}</option>
                  ))}
                </select>
                <label className={labelClass}>Allergies or restrictions</label>
                <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} className={inputClass} placeholder="e.g. nuts, gluten" />
              </div>
            )}

            {steps[currentStep].id === "devices" && (
              <div className="mt-4">
                <label className={labelClass}>Training setup and wearables (optional)</label>
                <input type="text" value={devices} onChange={(e) => setDevices(e.target.value)} className={inputClass} placeholder="e.g. Home dumbbells, Apple Watch" />
              </div>
            )}

            {steps[currentStep].id === "baseline" && (
              <p className="mt-4 text-fn-muted">You can add body metrics after onboarding from the progress screen.</p>
            )}

            <div className="mt-6 flex gap-3">
              {currentStep > 0 && (
                <Button type="button" variant="ghost" onClick={() => setCurrentStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              <Button type="button" className="flex-1" onClick={handleNext} loading={saving}>
                {currentStep < steps.length - 1 ? "Next" : "Finish"}
              </Button>
            </div>
            {saveError && <ErrorMessage className="mt-3" message={saveError} />}
          </div>
        </Card>

        <Card padding="lg" className="lg:sticky lg:top-8 lg:h-fit">
          <h3 className="font-semibold text-fn-ink">Confidence builder</h3>
          <ul className="mt-3 space-y-2 text-sm text-fn-muted">
            <li>Adaptive daily plan based on your goal and schedule.</li>
            <li>Nutrition targets tuned to your progress trend.</li>
            <li>Safety-aware alternatives for limitations and low-energy days.</li>
          </ul>
          <p className="mt-4 text-xs text-fn-muted">Educational AI coaching only. Not medical care.</p>
        </Card>
      </div>
    </div>
  );
}
