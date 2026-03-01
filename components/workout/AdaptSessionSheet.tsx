"use client";

import { useMemo, useState } from "react";
import type { DailyPlanTrainingExercise } from "@/lib/plan/types";
import { Button } from "@/components/ui";

type AdaptSessionResponse = {
  exercises: DailyPlanTrainingExercise[];
  rationale: string;
  reliability?: {
    confidence_score?: number;
    explanation?: string;
  };
};

export interface AdaptSessionSheetProps {
  open: boolean;
  loading?: boolean;
  currentExercises: DailyPlanTrainingExercise[];
  onClose: () => void;
  onApply: (payload: AdaptSessionResponse) => void;
}

export function AdaptSessionSheet({
  open,
  loading = false,
  currentExercises,
  onClose,
  onApply,
}: AdaptSessionSheetProps) {
  const [minutesAvailable, setMinutesAvailable] = useState(30);
  const [equipmentMode, setEquipmentMode] = useState<"full_gym" | "limited" | "bodyweight">("limited");
  const [intensityPreference, setIntensityPreference] = useState<"downshift" | "maintain" | "push">("maintain");
  const [noiseConstraint, setNoiseConstraint] = useState<"any" | "quiet">("any");
  const [avoidBodyRegions, setAvoidBodyRegions] = useState("");
  const [painFlags, setPainFlags] = useState("");
  const [error, setError] = useState<string | null>(null);

  const disabled = !open || loading || currentExercises.length === 0;

  const summary = useMemo(() => {
    return `${currentExercises.length} exercise${currentExercises.length === 1 ? "" : "s"} loaded`;
  }, [currentExercises.length]);

  async function runAdapt() {
    if (disabled) return;
    setError(null);

    try {
      const res = await fetch("/api/v1/plan/adapt-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes_available: minutesAvailable,
          equipment_mode: equipmentMode,
          noise_constraint: noiseConstraint,
          avoid_body_regions: avoidBodyRegions
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
          pain_flags: painFlags
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
          intensity_preference: intensityPreference,
          current_exercises: currentExercises,
        }),
      });

      const body = (await res.json()) as AdaptSessionResponse & { error?: string };
      if (!res.ok || !Array.isArray(body.exercises)) {
        throw new Error(body.error ?? "Could not adapt session.");
      }

      onApply(body);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not adapt session.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto mt-10 w-full max-w-xl rounded-3xl border border-white/10 bg-fn-surface p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">Adapt Session</p>
            <h3 className="mt-2 text-2xl font-black uppercase italic tracking-tight text-white">Adjust Today&apos;s Plan</h3>
            <p className="mt-1 text-xs text-fn-muted">{summary}</p>
          </div>
          <button type="button" className="text-sm font-semibold text-fn-muted hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-fn-muted">
            Minutes Available
            <input
              type="number"
              min={10}
              max={120}
              value={minutesAvailable}
              onChange={(event) => setMinutesAvailable(Number(event.target.value) || 30)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm text-fn-muted">
            Equipment
            <select
              value={equipmentMode}
              onChange={(event) => setEquipmentMode(event.target.value as any)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            >
              <option value="full_gym">Full gym</option>
              <option value="limited">Limited equipment</option>
              <option value="bodyweight">Bodyweight only</option>
            </select>
          </label>

          <label className="text-sm text-fn-muted">
            Intensity
            <select
              value={intensityPreference}
              onChange={(event) => setIntensityPreference(event.target.value as any)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            >
              <option value="downshift">Downshift</option>
              <option value="maintain">Maintain</option>
              <option value="push">Push</option>
            </select>
          </label>

          <label className="text-sm text-fn-muted">
            Noise
            <select
              value={noiseConstraint}
              onChange={(event) => setNoiseConstraint(event.target.value as any)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            >
              <option value="any">Any</option>
              <option value="quiet">Quiet</option>
            </select>
          </label>

          <label className="text-sm text-fn-muted sm:col-span-2">
            Avoid Body Regions (comma-separated)
            <input
              type="text"
              placeholder="knee, shoulder"
              value={avoidBodyRegions}
              onChange={(event) => setAvoidBodyRegions(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm text-fn-muted sm:col-span-2">
            Pain Flags (comma-separated movement names)
            <input
              type="text"
              placeholder="deadlift, overhead press"
              value={painFlags}
              onChange={(event) => setPainFlags(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-fn-danger">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void runAdapt()} disabled={disabled}>
            Adapt Session
          </Button>
        </div>
      </div>
    </div>
  );
}
