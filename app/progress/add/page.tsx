"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  PageLayout,
  Button,
  Input,
  Label,
  ErrorMessage,
} from "@/components/ui";

export default function AddProgressPage() {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [hip, setHip] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseNum(s: string, min: number, max: number): number | null {
    const n = parseFloat(s);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return n;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = weight.trim() ? parseNum(weight, 20, 500) : undefined;
    const bf = bodyFat.trim() ? parseNum(bodyFat, 0, 100) : undefined;
    const measurements: Record<string, number> = {};
    if (waist.trim()) { const v = parseNum(waist, 30, 300); if (v != null) measurements.waist = v; }
    if (chest.trim()) { const v = parseNum(chest, 30, 300); if (v != null) measurements.chest = v; }
    if (hip.trim()) { const v = parseNum(hip, 30, 300); if (v != null) measurements.hip = v; }
    const hasData = w != null || bf != null || Object.keys(measurements).length > 0 || notes.trim();
    if (!hasData) return;
    if (weight.trim() && w == null) {
      setError("Weight must be between 20 and 500 kg.");
      return;
    }
    if (bodyFat.trim() && bf == null) {
      setError("Body fat must be between 0 and 100%.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase not configured.");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in to save progress.");
      setSaving(false);
      return;
    }
    const { error: err } = await supabase.from("progress_tracking").insert({
      user_id: user.id,
      date: new Date().toISOString().slice(0, 10),
      weight: w ?? null,
      body_fat_percent: bf ?? null,
      measurements: Object.keys(measurements).length ? measurements : {},
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/progress");
  }

  return (
    <PageLayout
      title="Add progress"
      backHref="/progress"
      backLabel="Progress"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="70"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="bodyFat">Body fat (%)</Label>
          <Input
            id="bodyFat"
            type="number"
            step="0.1"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            placeholder="Optional"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Measurements (cm, optional)</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Input
              type="number"
              step="0.1"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              placeholder="Waist"
            />
            <Input
              type="number"
              step="0.1"
              value={chest}
              onChange={(e) => setChest(e.target.value)}
              placeholder="Chest"
            />
            <Input
              type="number"
              step="0.1"
              value={hip}
              onChange={(e) => setHip(e.target.value)}
              placeholder="Hip"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="mt-1"
          />
        </div>
        {error && <ErrorMessage message={error} />}
        <Button type="submit" loading={saving} className="w-full">
          Save
        </Button>
      </form>
    </PageLayout>
  );
}
