"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardHeader } from "@/components/ui";
import {
  writePreAuthDraft,
} from "@/lib/funnel/preauth";

const goalOptions = ["Weight loss", "Muscle gain", "Mobility", "General fitness"];
const experienceOptions = ["Beginner", "Intermediate", "Advanced"];
const daysOptions = ["2 days", "3 days", "4 days", "5+ days"];
const locationOptions = ["Gym", "Home", "Hybrid"];
const nutritionOptions = ["Calorie control", "High protein", "Performance fueling", "Balanced habits"];

export default function StartAssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState(goalOptions[0]);
  const [experience, setExperience] = useState(experienceOptions[0]);
  const [days, setDays] = useState(daysOptions[1]);
  const [location, setLocation] = useState(locationOptions[0]);
  const [nutrition, setNutrition] = useState(nutritionOptions[0]);
  const [generating, setGenerating] = useState(false);

  const totalSteps = 6;
  const progressPct = ((step + 1) / totalSteps) * 100;

  const headline = useMemo(() => {
    if (step === 0) return "What is your primary goal right now?";
    if (step === 1) return "How often do you plan to train?";
    if (step === 2) return "Where will you train most days?";
    if (step === 3) return "How should we shape nutrition guidance?";
    if (step === 4) return "Generating Your Protocol...";
    return "Unlock Your Performance Protocol";
  }, [step]);

  const options = useMemo(() => {
    if (step === 0) return goalOptions;
    if (step === 1) return daysOptions;
    if (step === 2) return locationOptions;
    if (step === 3) return nutritionOptions;
    return [];
  }, [step]);

  const selectedValue =
    step === 0 ? goal : step === 1 ? days : step === 2 ? location : step === 3 ? nutrition : null;

  function selectOption(value: string) {
    if (step === 0) setGoal(value);
    else if (step === 1) setDays(value);
    else if (step === 2) setLocation(value);
    else if (step === 3) setNutrition(value);
  }

  async function handleNext() {
    if (step === 4) return; // Wait for generator

    if (step === 5) {
      if (!email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }
      writePreAuthDraft(typeof window !== "undefined" ? window.localStorage : null, {
        email_lead: email,
        goal,
        experience_level: experience,
        days_per_week: days,
        location_preference: location,
        nutrition_focus: nutrition,
      });
      router.push("/auth?next=/onboarding?resume=1&intent=assessment");
      return;
    }

    if (step === 3) {
      setStep(4);
      setGenerating(true);
      setTimeout(() => {
        setGenerating(false);
        setStep(5);
      }, 3000);
      return;
    }

    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }
  }

  function handleBack() {
    if (step === 0) {
      router.push("/");
      return;
    }
    if (step === 5) {
      setStep(3); // Skip generating
      return;
    }
    setStep((s) => s - 1);
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card padding="lg" className="rise-reveal">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">AI assessment</p>
            <h1 className="mt-3 font-display text-3xl text-fn-ink sm:text-4xl italic uppercase font-black tracking-tighter">Build Your Legend</h1>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-fn-bg-alt">
              <div className="h-full rounded-full bg-fn-accent shadow-[0_0_10px_rgba(10,217,196,0.5)] transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2 text-sm text-fn-muted font-mono">STEP_IDENT_0{step + 1} // TOTAL_0{totalSteps}</p>
          </div>

          <h2 className="text-xl font-semibold text-fn-ink uppercase tracking-tight italic">{headline}</h2>

          {step === 5 && (
            <div className="mt-6 flex flex-col gap-3">
              <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-fn-muted">
                Satellite Uplink / Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@koda.ai"
                className="rounded-xl border border-fn-border bg-white px-4 py-3 text-fn-ink focus:border-fn-accent focus:outline-none focus:ring-2 focus:ring-fn-accent/20 transition-all"
                autoFocus
              />
              <p className="text-xs text-fn-muted italic">
                Secure your protocol link. Results calculated based on proprietary SIT benchmarks.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-col gap-3">
                {[
                  "Synthesizing biometrics...",
                  "Calculating mechanical load...",
                  "optimizing metabolic windows...",
                  "Calibrating recovery debt..."
                ].map((text, i) => (
                  <div key={text} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 0.4}s` }}>
                    <div className="h-1.5 w-1.5 rounded-full bg-fn-accent" />
                    <span className="text-[10px] font-mono text-fn-muted uppercase tracking-widest">{text}</span>
                  </div>
                ))}
              </div>
              <div className="h-1 w-full bg-fn-bg-alt rounded-full overflow-hidden">
                <div className="h-full bg-fn-accent animate-progress" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-fn-muted">Experience level</p>
              <div className="flex flex-wrap gap-2">
                {experienceOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setExperience(option)}
                    className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition ${experience === option
                        ? "border-fn-accent bg-fn-accent/10 text-fn-accent shadow-sm"
                        : "border-fn-border bg-white text-fn-muted hover:border-fn-accent/30"
                      }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectOption(option)}
                className={`min-h-[80px] rounded-xl border px-4 py-3 text-left transition-all duration-300 ${selectedValue === option
                    ? "border-fn-accent bg-fn-accent/10 text-white shadow-[0_0_15px_rgba(10,217,196,0.1)] scale-[1.02]"
                    : "border-fn-border bg-white text-fn-ink hover:border-fn-accent/40"
                  }`}
              >
                <span className={`block text-xs font-black uppercase tracking-widest ${selectedValue === option ? "text-fn-accent" : "text-fn-muted"}`}>{option}</span>
                <span className="mt-1 block text-[10px] font-medium text-fn-muted">Protocol selection optimized for performance.</span>
              </button>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between gap-3 pt-6 border-t border-fn-border">
            <Button variant="ghost" onClick={handleBack} disabled={step === 0 || step === 4}>
              <span className="text-[10px] font-black uppercase tracking-widest">Abort / Back</span>
            </Button>
            {step !== 4 && (
              <Button onClick={handleNext} disabled={step === 4}>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {step === 5 ? "Claim Protocol" : "Initialize Next Step"}
                </span>
              </Button>
            )}
          </div>

          <p className="mt-6 text-[9px] font-mono text-fn-muted/50 uppercase tracking-[0.2em] text-center">LEGEND_OS v2.4 // SECURE_INTEL_GATED</p>
        </Card>

        <Card padding="lg" className="rise-reveal rise-reveal-delay-1 lg:sticky lg:top-8 lg:h-fit border-fn-accent/10 bg-fn-accent/[0.02]">
          <CardHeader title="Live Build" subtitle="Selections shape your neural net" />
          <dl className="mt-4 space-y-4 text-[11px]">
            <div>
              <dt className="font-black uppercase tracking-widest text-fn-muted mb-1">Target Goal</dt>
              <dd className="font-bold text-white uppercase italic">{goal}</dd>
            </div>
            <div>
              <dt className="font-black uppercase tracking-widest text-fn-muted mb-1">XP Baseline</dt>
              <dd className="font-bold text-white uppercase italic">{experience}</dd>
            </div>
            <div>
              <dt className="font-black uppercase tracking-widest text-fn-muted mb-1">Frequency</dt>
              <dd className="font-bold text-white uppercase italic">{days}</dd>
            </div>
            <div>
              <dt className="font-black uppercase tracking-widest text-fn-muted mb-1">Environment</dt>
              <dd className="font-bold text-white uppercase italic">{location}</dd>
            </div>
            <div>
              <dt className="font-black uppercase tracking-widest text-fn-muted mb-1">Metabolic Focus</dt>
              <dd className="font-bold text-white uppercase italic">{nutrition}</dd>
            </div>
            {email && (
              <div className="pt-3 border-t border-fn-accent/10">
                <dt className="font-black uppercase tracking-widest text-fn-accent mb-1">Satellite Lead</dt>
                <dd className="font-bold text-fn-accent truncate">{email}</dd>
              </div>
            )}
          </dl>
          <div className="mt-8 rounded-xl bg-fn-accent/10 p-4 border border-fn-accent/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2">Neural Rationale</p>
            <p className="text-[10px] text-fn-muted leading-relaxed">
              Based on your {experience.toLowerCase()} status, we are calibrating a {goal.toLowerCase()} protocol focused on {location.toLowerCase()} execution {days.toLowerCase()}.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
