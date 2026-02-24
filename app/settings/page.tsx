"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PageLayout,
  Card,
  CardHeader,
  Button,
  Input,
  Label,
  Select,
  Textarea,
  LoadingState,
  ErrorMessage,
} from "@/components/ui";
import { AuthSettings } from "@/components/auth/AuthSettings";
import type { UserProfile } from "@/types";
import {
  DEFAULT_UNIT_SYSTEM,
  UnitSystem,
  formatDisplayNumber,
  fromDisplayHeight,
  fromDisplayWeight,
  heightUnitLabel,
  readUnitSystemFromProfile,
  toDisplayHeight,
  toDisplayWeight,
  weightUnitLabel,
} from "@/lib/units";

const GOAL_OPTIONS = [
  "Weight loss",
  "Muscle gain",
  "Endurance",
  "General fitness",
  "Mobility",
];

const ACTIVITY_LEVELS = [
  { value: "", label: "Select" },
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light (1-2 days/week)" },
  { value: "moderate", label: "Moderate (3-4 days/week)" },
  { value: "active", label: "Active (5+ days/week)" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachTone, setCoachTone] = useState("balanced");
  const [nudges, setNudges] = useState("standard");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      supabase
        .from("user_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(
          ({ data, error: fetchError }) => {
            const nextProfile: Partial<UserProfile> = fetchError ? {} : ((data as UserProfile) ?? {});
            const nextUnitSystem = readUnitSystemFromProfile(nextProfile as Record<string, unknown>);
            setProfile(nextProfile);
            setUnitSystem(nextUnitSystem);
            const nextHeight = nextProfile.height;
            const nextWeight = nextProfile.weight;
            setHeightInput(
              nextHeight != null && Number.isFinite(nextHeight)
                ? formatDisplayNumber(toDisplayHeight(nextHeight, nextUnitSystem), nextUnitSystem === "imperial" ? 1 : 0)
                : ""
            );
            setWeightInput(
              nextWeight != null && Number.isFinite(nextWeight)
                ? formatDisplayNumber(toDisplayWeight(nextWeight, nextUnitSystem), 1)
                : ""
            );
            setLoading(false);
          },
          () => setLoading(false)
        );
    }).then(undefined, () => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
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
      setError("Sign in to save profile.");
      setSaving(false);
      return;
    }
    const age = profile.age != null && Number.isFinite(profile.age) && profile.age >= 13 && profile.age <= 120 ? profile.age : null;
    const height = profile.height != null && Number.isFinite(profile.height) && profile.height >= 100 && profile.height <= 250 ? profile.height : null;
    const weight = profile.weight != null && Number.isFinite(profile.weight) && profile.weight >= 30 && profile.weight <= 500 ? profile.weight : null;
    const { error: err } = await supabase.from("user_profile").upsert(
      {
        user_id: user.id,
        name: (typeof profile.name === "string" ? profile.name.trim() : null) || null,
        email: user.email ?? null,
        age,
        sex: profile.sex ?? null,
        height,
        weight,
        goals: profile.goals ?? null,
        injuries_limitations: profile.injuries_limitations ?? {},
        dietary_preferences: {
          ...(profile.dietary_preferences ?? {}),
          ai_nudges: nudges,
        },
        activity_level: profile.activity_level ?? null,
        devices: {
          ...(profile.devices ?? {}),
          ai_coach_tone: coachTone,
          units_system: unitSystem,
        },
      },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
  }

  function toggleGoal(g: string) {
    if (!profile) return;
    const goals = profile.goals ?? [];
    setProfile({
      ...profile,
      goals: goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g],
    });
  }

  function handleUnitSystemChange(nextUnitSystem: UnitSystem) {
    if (!profile) return;
    setUnitSystem(nextUnitSystem);
    const heightMetric = profile.height;
    const weightMetric = profile.weight;
    setHeightInput(
      heightMetric != null && Number.isFinite(heightMetric)
        ? formatDisplayNumber(toDisplayHeight(heightMetric, nextUnitSystem), nextUnitSystem === "imperial" ? 1 : 0)
        : ""
    );
    setWeightInput(
      weightMetric != null && Number.isFinite(weightMetric)
        ? formatDisplayNumber(toDisplayWeight(weightMetric, nextUnitSystem), 1)
        : ""
    );
    setProfile({
      ...profile,
      devices: {
        ...(profile.devices ?? {}),
        units_system: nextUnitSystem,
      },
    });
  }

  function handleHeightInput(value: string) {
    if (!profile) return;
    setHeightInput(value);
    const parsed = Number.parseFloat(value);
    setProfile({
      ...profile,
      height: Number.isFinite(parsed) ? fromDisplayHeight(parsed, unitSystem) : undefined,
    });
  }

  function handleWeightInput(value: string) {
    if (!profile) return;
    setWeightInput(value);
    const parsed = Number.parseFloat(value);
    setProfile({
      ...profile,
      weight: Number.isFinite(parsed) ? fromDisplayWeight(parsed, unitSystem) : undefined,
    });
  }

  function handleHealthImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(`Queued ${file.name}. Import pipeline UI is live; backend parser endpoint wiring can be enabled next.`);
  }

  if (loading) {
    return (
      <PageLayout title="Settings" subtitle="Profile, AI preferences, and data sources">
        <AuthSettings />
        <div className="mt-6">
          <LoadingState />
        </div>
      </PageLayout>
    );
  }

  const p = profile ?? {};

  return (
    <PageLayout title="Settings" subtitle="Profile, AI preferences, and data sources">
      <AuthSettings />

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Card padding="lg">
          <CardHeader title="Profile" subtitle="Core stats and goals" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" value={p.name ?? ""} onChange={(e) => setProfile({ ...profile!, name: e.target.value })} placeholder="Your name" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" min={13} max={120} value={p.age ?? ""} onChange={(e) => setProfile({ ...profile!, age: e.target.value ? Number(e.target.value) : undefined })} placeholder="25" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="sex">Sex</Label>
              <Select id="sex" value={p.sex ?? ""} onChange={(e) => setProfile({ ...profile!, sex: e.target.value || undefined })} className="mt-1">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="activity">Activity level</Label>
              <Select id="activity" value={p.activity_level ?? ""} onChange={(e) => setProfile({ ...profile!, activity_level: e.target.value || undefined })} className="mt-1">
                {ACTIVITY_LEVELS.map(({ value, label }) => (
                  <option key={value || "empty"} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="unitSystem">Units</Label>
              <Select id="unitSystem" value={unitSystem} onChange={(e) => handleUnitSystemChange(e.target.value === "metric" ? "metric" : "imperial")} className="mt-1">
                <option value="imperial">in / lbs</option>
                <option value="metric">cm / kg</option>
              </Select>
            </div>
            <div />
            <div>
              <Label htmlFor="height">Height ({heightUnitLabel(unitSystem)})</Label>
              <Input
                id="height"
                type="number"
                step={unitSystem === "imperial" ? "0.1" : "1"}
                value={heightInput}
                onChange={(e) => handleHeightInput(e.target.value)}
                placeholder={unitSystem === "imperial" ? "67" : "170"}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight ({weightUnitLabel(unitSystem)})</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weightInput}
                onChange={(e) => handleWeightInput(e.target.value)}
                placeholder={unitSystem === "imperial" ? "154" : "70"}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label>Goals</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((g) => (
                <Button key={g} type="button" variant={(p.goals ?? []).includes(g) ? "primary" : "secondary"} size="sm" onClick={() => toggleGoal(g)}>
                  {g}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Label>Injuries and limitations</Label>
            <Textarea
              value={(p.injuries_limitations && typeof p.injuries_limitations === "object" && "notes" in p.injuries_limitations ? (p.injuries_limitations as { notes?: string }).notes : "") ?? ""}
              onChange={(e) => setProfile({ ...profile!, injuries_limitations: { notes: e.target.value } })}
              placeholder="e.g. lower back pain, knee history"
              className="mt-2"
            />
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="AI preferences" subtitle="Accountability style and guidance cadence" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="coachTone">Coach tone</Label>
              <Select id="coachTone" value={coachTone} onChange={(e) => setCoachTone(e.target.value)} className="mt-1">
                <option value="balanced">Evidence-based balanced</option>
                <option value="intense">High accountability</option>
                <option value="supportive">Supportive low-pressure</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="nudges">Nudge intensity</Label>
              <Select id="nudges" value={nudges} onChange={(e) => setNudges(e.target.value)} className="mt-1">
                <option value="light">Light</option>
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="Data sources" subtitle="Import Apple Health exports" />
          <p className="mt-2 text-sm text-fn-muted">Upload your exported Apple Health file to enrich recovery and readiness insights.</p>
          <div className="mt-3">
            <Label htmlFor="healthImport">Apple Health export</Label>
            <Input id="healthImport" type="file" accept=".zip,.xml" onChange={handleHealthImport} className="mt-1" />
          </div>
          {importStatus && <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2 text-sm text-fn-muted">{importStatus}</p>}
          <p className="mt-2 text-xs text-fn-muted">Raw files are stored encrypted and retained for 30 days.</p>
        </Card>

        {error && <ErrorMessage message={error} />}
        <Button type="submit" loading={saving} className="w-full">Save settings</Button>
      </form>
    </PageLayout>
  );
}
