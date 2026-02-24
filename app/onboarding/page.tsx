"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { ErrorMessage } from "@/components/ui";

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
  const [currentStep, setCurrentStep] = useState(0);
  const [stats, setStats] = useState({ name: "", age: "", sex: "", height: "", weight: "" });
  const [goals, setGoals] = useState<string[]>([]);
  const [injuries, setInjuries] = useState("");
  const [diet, setDiet] = useState("");
  const [allergies, setAllergies] = useState("");
  const [devices, setDevices] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const inputClass =
    "min-h-touch w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white placeholder-fn-muted focus:border-fn-teal focus:outline-none focus:ring-1 focus:ring-fn-teal";
  const labelClass = "block text-sm font-medium text-fn-muted mt-4 first:mt-0";

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
    const height = heightNum != null && Number.isFinite(heightNum) && heightNum >= 100 && heightNum <= 250 ? heightNum : null;
    const weight = weightNum != null && Number.isFinite(weightNum) && weightNum >= 30 && weightNum <= 500 ? weightNum : null;
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
        devices: devices.trim() ? { apps: devices.trim() } : {},
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
    setSaving(false);
    setCompleted(true);
  }

  function handleNext() {
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
    else void handleFinish();
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <Card padding="lg" className="border-fn-teal text-center">
          <h2 className="text-lg font-medium text-white">You’re all set</h2>
          <p className="mt-2 text-fn-muted">
            {saveError
              ? `Could not complete onboarding: ${saveError}`
              : "Onboarding complete. Your profile has been saved."}
          </p>
          {saveError && (
            <p className="mt-2 text-sm text-fn-muted">
              You can update your profile anytime in Settings.
            </p>
          )}
          <Link href="/" className="mt-6 inline-block">
            <Button>Go to dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Welcome to FitNova AI</h1>
        <p className="mt-1 text-fn-muted">Quick setup — mobile-optimized</p>
      </header>

      <div className="mb-8" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Onboarding progress">
        <div className="flex justify-between gap-1">
          {steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={`h-2 flex-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-fn-teal ${
                i <= currentStep ? "bg-fn-teal" : "bg-fn-border"
              }`}
              aria-current={i === currentStep ? "step" : undefined}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-sm text-fn-muted">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep].label}
        </p>
      </div>

      <div className="rounded-xl border border-fn-border bg-fn-surface p-6">
        <h2 className="text-lg font-medium text-white">{steps[currentStep].label}</h2>

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
            <label className={labelClass}>Height (cm)</label>
            <input type="number" value={stats.height} onChange={(e) => setStats((s) => ({ ...s, height: e.target.value }))} className={inputClass} placeholder="170" />
            <label className={labelClass}>Weight (kg)</label>
            <input type="number" value={stats.weight} onChange={(e) => setStats((s) => ({ ...s, weight: e.target.value }))} className={inputClass} placeholder="70" />
          </div>
        )}

        {steps[currentStep].id === "goals" && (
          <div className="mt-4 space-y-2">
            {goalOptions.map((g) => (
              <label key={g} className="flex min-h-touch cursor-pointer items-center gap-3 rounded-lg border border-fn-border px-4 py-3">
                <input type="checkbox" checked={goals.includes(g)} onChange={() => toggleGoal(g)} className="h-5 w-5 rounded border-fn-border" />
                <span className="text-white">{g}</span>
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
            <label className={labelClass}>Wearables or apps (optional)</label>
            <input type="text" value={devices} onChange={(e) => setDevices(e.target.value)} className={inputClass} placeholder="e.g. Apple Watch, Strava" />
          </div>
        )}

        {steps[currentStep].id === "baseline" && (
          <p className="mt-4 text-fn-muted">Baseline metrics can be added later from the progress screen.</p>
        )}

        <div className="mt-6 flex gap-3">
          {currentStep > 0 && (
            <button type="button" onClick={() => setCurrentStep((s) => s - 1)} className="min-h-touch min-w-touch rounded-lg border border-fn-border px-4 py-3 text-sm font-medium text-white hover:bg-fn-surface-hover">
              Back
            </button>
          )}
          <Button
            type="button"
            variant="primary"
            className="min-h-touch min-w-touch flex-1 bg-fn-magenta hover:bg-fn-magenta-dim text-white"
            onClick={handleNext}
            loading={saving}
          >
            {currentStep < steps.length - 1 ? "Next" : "Finish"}
          </Button>
        </div>
        {saveError && <ErrorMessage className="mt-3" message={saveError} />}
      </div>
    </div>
  );
}
