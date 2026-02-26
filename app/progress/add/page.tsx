"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  PageLayout,
  Button,
  Input,
  Label,
  ErrorMessage,
  Card,
  CardHeader,
} from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";
import {
  DEFAULT_UNIT_SYSTEM,
  UnitSystem,
  formatDisplayNumber,
  fromDisplayLength,
  fromDisplayWeight,
  readUnitSystemFromProfile,
  toDisplayLength,
  toDisplayWeight,
  weightUnitLabel,
} from "@/lib/units";

export default function AddProgressPage() {
  const router = useRouter();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [hip, setHip] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("user_profile")
        .select("devices")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const nextUnits = readUnitSystemFromProfile((data ?? {}) as Record<string, unknown>);
          setUnitSystem(nextUnits);
        });
    });
  }, []);

  function parseNum(s: string, min: number, max: number): number | null {
    const n = parseFloat(s);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return n;
  }

  function convertEntryInput(value: string, fromUnits: UnitSystem, toUnits: UnitSystem, type: "weight" | "length"): string {
    if (!value.trim()) return "";
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) return value;
    const metric = type === "weight" ? fromDisplayWeight(parsed, fromUnits) : fromDisplayLength(parsed, fromUnits);
    const display = type === "weight" ? toDisplayWeight(metric, toUnits) : toDisplayLength(metric, toUnits);
    return formatDisplayNumber(display, 1);
  }

  function handleUnitSystemChange(nextUnits: UnitSystem) {
    if (nextUnits === unitSystem) return;
    setWeight((prev) => convertEntryInput(prev, unitSystem, nextUnits, "weight"));
    setWaist((prev) => convertEntryInput(prev, unitSystem, nextUnits, "length"));
    setChest((prev) => convertEntryInput(prev, unitSystem, nextUnits, "length"));
    setHip((prev) => convertEntryInput(prev, unitSystem, nextUnits, "length"));
    setUnitSystem(nextUnits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const wDisplay = weight.trim() ? parseFloat(weight) : undefined;
    const w = wDisplay != null && Number.isFinite(wDisplay) ? fromDisplayWeight(wDisplay, unitSystem) : undefined;
    const bf = bodyFat.trim() ? parseNum(bodyFat, 0, 100) : undefined;
    const measurements: Record<string, number> = {};
    if (waist.trim()) {
      const raw = parseFloat(waist);
      if (Number.isFinite(raw)) {
        const v = parseNum(String(fromDisplayLength(raw, unitSystem)), 30, 300);
        if (v != null) measurements.waist = v;
      }
    }
    if (chest.trim()) {
      const raw = parseFloat(chest);
      if (Number.isFinite(raw)) {
        const v = parseNum(String(fromDisplayLength(raw, unitSystem)), 30, 300);
        if (v != null) measurements.chest = v;
      }
    }
    if (hip.trim()) {
      const raw = parseFloat(hip);
      if (Number.isFinite(raw)) {
        const v = parseNum(String(fromDisplayLength(raw, unitSystem)), 30, 300);
        if (v != null) measurements.hip = v;
      }
    }
    const hasData = w != null || bf != null || Object.keys(measurements).length > 0 || notes.trim();
    if (!hasData) return;
    if (weight.trim() && (w == null || !Number.isFinite(w) || w < 20 || w > 500)) {
      setError(`Weight must be between ${unitSystem === "imperial" ? "44 and 1102 lb" : "20 and 500 kg"}.`);
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
      date: toLocalDateString(),
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
    <PageLayout title="Add progress" subtitle="Capture one checkpoint" backHref="/progress" backLabel="Progress">
      <Card padding="lg" className="max-w-3xl">
        <CardHeader title="Today&apos;s check-in" subtitle="Consistent entries improve AI trend interpretation" />
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="units">Units</Label>
              <select
                id="units"
                value={unitSystem}
                onChange={(e) => handleUnitSystemChange(e.target.value === "metric" ? "metric" : "imperial")}
                className="mt-1 min-h-touch w-full rounded-xl border border-fn-border bg-white px-4 py-3 text-black focus:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600/20"
              >
                <option value="imperial">in / lbs</option>
                <option value="metric">cm / kg</option>
              </select>
            </div>
            <div>
              <Label htmlFor="weight">Weight ({weightUnitLabel(unitSystem)})</Label>
              <Input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={unitSystem === "imperial" ? "154" : "70"} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bodyFat">Body fat (%)</Label>
              <Input id="bodyFat" type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Measurements ({unitSystem === "imperial" ? "in" : "cm"}, optional)</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Input type="number" step="0.1" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="Waist" />
              <Input type="number" step="0.1" value={chest} onChange={(e) => setChest(e.target.value)} placeholder="Chest" />
              <Input type="number" step="0.1" value={hip} onChange={(e) => setHip(e.target.value)} placeholder="Hip" />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sleep quality, stress, training feel" className="mt-1" />
          </div>

          {error && <ErrorMessage message={error} />}
          <Button type="submit" loading={saving} className="w-full">Save checkpoint</Button>
        </form>
      </Card>
    </PageLayout>
  );
}
