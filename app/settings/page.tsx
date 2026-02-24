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
  { value: "light", label: "Light (1–2 days/week)" },
  { value: "moderate", label: "Moderate (3–4 days/week)" },
  { value: "active", label: "Active (5+ days/week)" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          ({ data, error }) => {
            if (error) setProfile({});
            else setProfile((data as UserProfile) ?? {});
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
        dietary_preferences: profile.dietary_preferences ?? {},
        activity_level: profile.activity_level ?? null,
        devices: profile.devices ?? {},
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

  if (loading) {
    return (
      <PageLayout title="Settings" subtitle="Profile & preferences">
        <AuthSettings />
        <div className="mt-6">
          <LoadingState />
        </div>
      </PageLayout>
    );
  }

  const p = profile ?? {};

  return (
    <PageLayout title="Settings" subtitle="Profile & preferences">
      <AuthSettings />

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <Card padding="lg">
          <CardHeader title="Profile" subtitle="Basic info" />
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={p.name ?? ""}
                onChange={(e) => setProfile({ ...profile!, name: e.target.value })}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min={13}
                max={120}
                value={p.age ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile!, age: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="25"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sex">Sex</Label>
              <Select
                id="sex"
                value={p.sex ?? ""}
                onChange={(e) => setProfile({ ...profile!, sex: e.target.value || undefined })}
                className="mt-1"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={p.height ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile!,
                    height: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="170"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={p.weight ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile!,
                    weight: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="70"
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="Goals" subtitle="What you want to focus on" />
          <div className="mt-4 flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((g) => (
              <Button
                key={g}
                type="button"
                variant={(p.goals ?? []).includes(g) ? "primary" : "secondary"}
                size="sm"
                onClick={() => toggleGoal(g)}
              >
                {g}
              </Button>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="Activity level" />
          <Select
            value={p.activity_level ?? ""}
            onChange={(e) =>
              setProfile({ ...profile!, activity_level: e.target.value || undefined })
            }
            className="mt-2"
          >
            {ACTIVITY_LEVELS.map(({ value, label }) => (
              <option key={value || "empty"} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Card>

        <Card padding="lg">
          <CardHeader
            title="Injuries & limitations"
            subtitle="Optional — helps the coach tailor advice"
          />
          <Textarea
            value={
              (p.injuries_limitations && typeof p.injuries_limitations === "object" && "notes" in p.injuries_limitations
                ? (p.injuries_limitations as { notes?: string }).notes
                : "") ?? ""
            }
            onChange={(e) =>
              setProfile({
                ...profile!,
                injuries_limitations: { notes: e.target.value },
              })
            }
            placeholder="e.g. lower back pain, knee history"
            className="mt-2"
          />
        </Card>

        {error && <ErrorMessage message={error} />}
        <Button type="submit" loading={saving} className="w-full">
          Save profile
        </Button>
      </form>
    </PageLayout>
  );
}
