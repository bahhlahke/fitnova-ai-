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

  const totalSteps = 5;
  const progressPct = ((step + 1) / totalSteps) * 100;

  const headline = useMemo(() => {
    if (step === 0) return "Where should we send your results?";
    if (step === 1) return "What is your primary goal right now?";
    if (step === 2) return "How often do you plan to train?";
    if (step === 3) return "Where will you train most days?";
    return "How should we shape nutrition guidance?";
  }, [step]);

  const options = useMemo(() => {
    if (step === 1) return goalOptions;
    if (step === 2) return daysOptions;
    if (step === 3) return locationOptions;
    if (step === 4) return nutritionOptions;
    return [];
  }, [step]);

  const selectedValue =
    step === 1 ? goal : step === 2 ? days : step === 3 ? location : step === 4 ? nutrition : null;

  function selectOption(value: string) {
    if (step === 1) setGoal(value);
    else if (step === 2) setDays(value);
    else if (step === 3) setLocation(value);
    else if (step === 4) setNutrition(value);
  }

  async function handleNext() {
    if (step === 0 && !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
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
  }

  function handleBack() {
    if (step === 0) {
      router.push("/");
      return;
    }
    setStep((s) => s - 1);
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card padding="lg" className="rise-reveal">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">1-minute assessment</p>
            <h1 className="mt-3 font-display text-3xl text-fn-ink sm:text-4xl">Build your adaptive training and nutrition plan</h1>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-fn-bg-alt">
              <div className="h-full rounded-full bg-fn-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2 text-sm text-fn-muted">Step {step + 1} of {totalSteps}</p>
          </div>

          <h2 className="text-xl font-semibold text-fn-ink">{headline}</h2>

          {step === 0 && (
            <div className="mt-6 flex flex-col gap-3">
              <label htmlFor="email" className="text-sm font-semibold text-fn-ink-soft">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@example.com"
                className="rounded-xl border border-fn-border px-4 py-3 text-fn-ink focus:border-fn-primary focus:outline-none focus:ring-1 focus:ring-fn-primary"
                autoFocus
              />
              <p className="text-xs text-fn-muted">
                We use this to save your assessment and send your custom plan.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-fn-ink-soft">Experience level</p>
              <div className="flex flex-wrap gap-2">
                {experienceOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setExperience(option)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${experience === option
                        ? "border-fn-primary bg-fn-primary text-white"
                        : "border-fn-border bg-white text-black hover:bg-fn-surface-hover"
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
                className={`min-h-touch rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${selectedValue === option
                    ? "border-fn-primary bg-fn-primary text-white"
                    : "border-fn-border bg-white text-black hover:bg-fn-surface-hover"
                  }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={handleBack} disabled={step === 0}>Back</Button>
            <Button onClick={handleNext}>{step < totalSteps - 1 ? "Continue" : "Continue to sign up"}</Button>
          </div>

          <p className="mt-4 text-xs text-fn-muted">AI guidance is educational and not medical care.</p>
        </Card>

        <Card padding="lg" className="rise-reveal rise-reveal-delay-1 lg:sticky lg:top-8 lg:h-fit">
          <CardHeader title="Plan preview" subtitle="Your selections shape day one" />
          <dl className="mt-4 space-y-3 text-sm">
            {email && (
              <div>
                <dt className="text-fn-muted">Athlete</dt>
                <dd className="font-semibold text-fn-ink truncate">{email}</dd>
              </div>
            )}
            <div>
              <dt className="text-fn-muted">Goal</dt>
              <dd className="font-semibold text-fn-ink">{goal}</dd>
            </div>
            <div>
              <dt className="text-fn-muted">Experience</dt>
              <dd className="font-semibold text-fn-ink">{experience}</dd>
            </div>
            <div>
              <dt className="text-fn-muted">Frequency</dt>
              <dd className="font-semibold text-fn-ink">{days} / week</dd>
            </div>
            <div>
              <dt className="text-fn-muted">Environment</dt>
              <dd className="font-semibold text-fn-ink">{location}</dd>
            </div>
            <div>
              <dt className="text-fn-muted">Nutrition focus</dt>
              <dd className="font-semibold text-fn-ink">{nutrition}</dd>
            </div>
          </dl>
          <Link href="/" className="mt-5 inline-block text-sm font-semibold text-fn-primary hover:text-fn-primary-dim">
            Return to home
          </Link>
        </Card>
      </div>
    </div>
  );
}
