"use client";

import { useState, useEffect } from "react";
import JSZip from "jszip";
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
import { normalizePhoneNumber } from "@/lib/phone";
import { parseAppleHealthExport } from "@/lib/apple-health/import";
import { emitDataRefresh } from "@/lib/ui/data-sync";

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

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const TRAINING_WINDOWS = [
  { value: "morning", label: "Morning" },
  { value: "midday", label: "Midday" },
  { value: "evening", label: "Evening" },
  { value: "flexible", label: "Flexible" },
];

async function extractAppleHealthXml(file: File): Promise<{
  xml: string;
  fileType: "xml" | "zip";
}> {
  if (file.name.toLowerCase().endsWith(".xml")) {
    return { xml: await file.text(), fileType: "xml" };
  }

  if (file.name.toLowerCase().endsWith(".zip")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const exportFile = zip.file(/(^|\/)export\.xml$/i)[0];

    if (!exportFile) {
      throw new Error("Zip file does not contain export.xml.");
    }

    return {
      xml: await exportFile.async("string"),
      fileType: "zip",
    };
  }

  throw new Error("Use an Apple Health export .zip or raw export.xml file.");
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [importingHealth, setImportingHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachTone, setCoachTone] = useState("balanced");
  const [nudges, setNudges] = useState("standard");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [reminders, setReminders] = useState<{ daily_plan?: boolean; workout_log?: boolean; weigh_in?: "weekly" | "off" }>({
    daily_plan: true,
    workout_log: true,
    weigh_in: "weekly",
  });
  const [trainingSchedule, setTrainingSchedule] = useState<{
    preferred_training_days: number[];
    preferred_training_window: string;
  }>({
    preferred_training_days: [1, 2, 3, 4, 5],
    preferred_training_window: "morning",
  });

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
            const dev = (nextProfile.devices ?? {}) as Record<string, unknown>;
            const dietary = (nextProfile.dietary_preferences ?? {}) as Record<string, unknown>;
            const rem = (dev.reminders ?? {}) as { daily_plan?: boolean; workout_log?: boolean; weigh_in?: "weekly" | "off" };
            const schedule = (dev.training_schedule ?? {}) as {
              preferred_training_days?: number[];
              preferred_training_window?: string;
            };
            setReminders({
              daily_plan: rem.daily_plan ?? true,
              workout_log: rem.workout_log ?? true,
              weigh_in: rem.weigh_in ?? "weekly",
            });
            setTrainingSchedule({
              preferred_training_days: Array.isArray(schedule.preferred_training_days)
                ? schedule.preferred_training_days
                    .map((entry) => Number(entry))
                    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6)
                : [1, 2, 3, 4, 5],
              preferred_training_window:
                typeof schedule.preferred_training_window === "string"
                  ? schedule.preferred_training_window
                  : "morning",
            });
            setCoachTone(typeof dev.ai_coach_tone === "string" ? dev.ai_coach_tone : "balanced");
            setNudges(typeof dietary.ai_nudges === "string" ? dietary.ai_nudges : "standard");
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
    const phoneInput = typeof profile.phone_number === "string" ? profile.phone_number.trim() : "";
    const phoneNumber = phoneInput ? normalizePhoneNumber(phoneInput) : null;
    if (phoneInput && !phoneNumber) {
      setError("Phone number must include 10-15 digits.");
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
        phone_number: phoneNumber,
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
          reminders,
          training_schedule: trainingSchedule,
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

  function toggleTrainingDay(day: number) {
    setTrainingSchedule((current) => {
      const hasDay = current.preferred_training_days.includes(day);
      const nextDays = hasDay
        ? current.preferred_training_days.filter((entry) => entry !== day)
        : [...current.preferred_training_days, day].sort((a, b) => a - b);

      return {
        ...current,
        preferred_training_days: nextDays.length > 0 ? nextDays : [1, 3, 5],
      };
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

  async function handleHealthImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingHealth(true);
    setImportStatus(null);
    setError(null);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Supabase not configured.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Sign in to import Apple Health data.");
      }

      const { xml, fileType } = await extractAppleHealthXml(file);
      const imported = parseAppleHealthExport(xml, fileType);

      const rangeStart = imported.summary.range_start;
      const rangeEnd = imported.summary.range_end;

      const [existingProgressRes, existingCheckInsRes] = await Promise.all([
        imported.progressEntries.length > 0 && rangeStart && rangeEnd
          ? supabase
              .from("progress_tracking")
              .select("track_id, date")
              .eq("user_id", user.id)
              .gte("date", rangeStart)
              .lte("date", rangeEnd)
          : Promise.resolve({ data: [] as Array<{ track_id: string; date: string }> }),
        imported.checkInEntries.length > 0 && rangeStart && rangeEnd
          ? supabase
              .from("check_ins")
              .select("check_in_id, date_local")
              .eq("user_id", user.id)
              .gte("date_local", rangeStart)
              .lte("date_local", rangeEnd)
          : Promise.resolve({ data: [] as Array<{ check_in_id: string; date_local: string }> }),
      ]);

      const progressByDate = new Map(
        ((existingProgressRes.data ?? []) as Array<{ track_id: string; date: string }>).map(
          (row) => [row.date, row.track_id]
        )
      );
      const checkInsByDate = new Map(
        ((existingCheckInsRes.data ?? []) as Array<{ check_in_id: string; date_local: string }>).map(
          (row) => [row.date_local, row.check_in_id]
        )
      );

      for (const entry of imported.progressEntries) {
        const existingId = progressByDate.get(entry.date);
        if (existingId) {
          const { error: progressErr } = await supabase
            .from("progress_tracking")
            .update({
              weight: entry.weightKg,
              notes: "Imported from Apple Health",
            })
            .eq("track_id", existingId);
          if (progressErr) {
            throw new Error(progressErr.message);
          }
        } else {
          const { error: progressErr } = await supabase.from("progress_tracking").insert({
            user_id: user.id,
            date: entry.date,
            weight: entry.weightKg,
            measurements: {},
            notes: "Imported from Apple Health",
          });
          if (progressErr) {
            throw new Error(progressErr.message);
          }
        }
      }

      for (const entry of imported.checkInEntries) {
        const existingId = checkInsByDate.get(entry.date_local);
        if (existingId) {
          const { error: checkInErr } = await supabase
            .from("check_ins")
            .update({
              sleep_hours: entry.sleepHours,
            })
            .eq("check_in_id", existingId);
          if (checkInErr) {
            throw new Error(checkInErr.message);
          }
        } else {
          const { error: checkInErr } = await supabase.from("check_ins").insert({
            user_id: user.id,
            date_local: entry.date_local,
            sleep_hours: entry.sleepHours,
          });
          if (checkInErr) {
            throw new Error(checkInErr.message);
          }
        }
      }

      const latestWeight = imported.summary.latest_weight_kg;
      const nextDevices = {
        ...(profile?.devices ?? {}),
        apple_health_import: imported.summary,
      };

      const { error: profileErr } = await supabase.from("user_profile").upsert(
        {
          user_id: user.id,
          email: user.email ?? null,
          weight:
            latestWeight != null
              ? latestWeight
              : profile?.weight != null
                ? profile.weight
                : null,
          devices: nextDevices,
        },
        { onConflict: "user_id" }
      );

      if (profileErr) {
        throw new Error(profileErr.message);
      }

      if (latestWeight != null) {
        setWeightInput(
          formatDisplayNumber(toDisplayWeight(latestWeight, unitSystem), 1)
        );
      }

      setProfile((current) => ({
        ...(current ?? {}),
        user_id: current?.user_id ?? user.id,
        email: current?.email ?? user.email ?? undefined,
        weight: latestWeight ?? current?.weight,
        devices: nextDevices,
      }));

      setImportStatus(
        `Imported ${imported.summary.weight_entry_count} weight entr${imported.summary.weight_entry_count === 1 ? "y" : "ies"} and ${imported.summary.sleep_entry_count} sleep day${imported.summary.sleep_entry_count === 1 ? "" : "s"} from Apple Health.`
      );
      emitDataRefresh(["dashboard", "progress"]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple Health import failed.");
    } finally {
      setImportingHealth(false);
      e.target.value = "";
    }
  }

  async function handleUpgrade() {
    setCheckoutLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/stripe/checkout", {
        method: "POST",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout failed");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setCheckoutLoading(false);
    }
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
  const isPro = p.subscription_status === "pro";
  const appleHealthImport = (((p.devices as Record<string, unknown> | undefined)?.apple_health_import ??
    null) as {
    imported_at?: string;
    weight_entry_count?: number;
    sleep_entry_count?: number;
    avg_sleep_hours_7d?: number | null;
    avg_daily_steps_7d?: number | null;
  } | null);

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
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={p.phone_number ?? ""}
                onChange={(e) => setProfile({ ...profile!, phone_number: e.target.value })}
                placeholder="+15551234567"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-fn-muted">
                Used for SMS briefings and inbound text coaching.
              </p>
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
          <CardHeader title="Reminders" subtitle="In-app nudges (no push or email yet)" />
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={reminders.daily_plan ?? true}
                onChange={(e) => setReminders((r) => ({ ...r, daily_plan: e.target.checked }))}
                className="h-4 w-4 rounded border-fn-border"
              />
              <span className="text-sm text-fn-ink">Remind me to generate today&apos;s plan</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={reminders.workout_log ?? true}
                onChange={(e) => setReminders((r) => ({ ...r, workout_log: e.target.checked }))}
                className="h-4 w-4 rounded border-fn-border"
              />
              <span className="text-sm text-fn-ink">Remind me to log my workout</span>
            </label>
            <div>
              <Label className="text-sm">Weigh-in reminder</Label>
              <Select
                value={reminders.weigh_in ?? "weekly"}
                onChange={(e) => setReminders((r) => ({ ...r, weigh_in: e.target.value as "weekly" | "off" }))}
                className="mt-1 max-w-[180px]"
              >
                <option value="weekly">Weekly</option>
                <option value="off">Off</option>
              </Select>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="Training schedule" subtitle="Used to personalize weekly and daily planning" />
          <div className="mt-4">
            <Label>Preferred training days</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map(({ value, label }) => (
                <Button
                  key={label}
                  type="button"
                  variant={trainingSchedule.preferred_training_days.includes(value) ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => toggleTrainingDay(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-4 max-w-[220px]">
            <Label htmlFor="trainingWindow">Preferred training window</Label>
            <Select
              id="trainingWindow"
              value={trainingSchedule.preferred_training_window}
              onChange={(e) =>
                setTrainingSchedule((current) => ({
                  ...current,
                  preferred_training_window: e.target.value,
                }))
              }
              className="mt-1"
            >
              {TRAINING_WINDOWS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card padding="lg" className="scroll-mt-24" id="billing">
          <CardHeader title="Billing" subtitle="Manage FitNova Pro access" />
          <div className="mt-3 rounded-2xl border border-fn-border bg-fn-bg-alt p-4">
            <p className="text-sm font-semibold text-fn-ink">
              {isPro ? "FitNova Pro is active." : "You are currently on the free plan."}
            </p>
            <p className="mt-1 text-sm text-fn-muted">
              {isPro
                ? "Your dashboard AI and advanced coaching features are unlocked."
                : "Upgrade here to unlock the full coaching experience. Billing has been moved out of the dashboard to keep the main command surface focused."}
            </p>
          </div>
          {!isPro && (
            <div className="mt-4">
              <Button type="button" loading={checkoutLoading} onClick={handleUpgrade}>
                Upgrade to Pro
              </Button>
            </div>
          )}
        </Card>

        <Card padding="lg">
          <CardHeader title="Export data" subtitle="Download your data" />
          <p className="mt-2 text-sm text-fn-muted">Download workouts, nutrition logs, and progress as JSON or CSV.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href="/api/v1/export?format=json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button type="button" variant="secondary" size="sm">Download JSON</Button>
            </a>
            <a
              href="/api/v1/export?format=csv"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button type="button" variant="secondary" size="sm">Download CSV</Button>
            </a>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="Data sources" subtitle="Import Apple Health exports" />
          <p className="mt-2 text-sm text-fn-muted">Upload your exported Apple Health file to enrich recovery and readiness insights.</p>
          <div className="mt-3">
            <Label htmlFor="healthImport">Apple Health export</Label>
            <Input id="healthImport" type="file" accept=".zip,.xml" onChange={handleHealthImport} className="mt-1" disabled={importingHealth} />
          </div>
          {importStatus && <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2 text-sm text-fn-muted">{importStatus}</p>}
          {appleHealthImport && (
            <div className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-3 text-sm text-fn-muted">
              <p className="font-semibold text-fn-ink">Last import</p>
              <p className="mt-1">
                {appleHealthImport.weight_entry_count ?? 0} weight entries, {appleHealthImport.sleep_entry_count ?? 0} sleep days
              </p>
              <p className="mt-1">
                7-day averages: {appleHealthImport.avg_sleep_hours_7d ?? "n/a"}h sleep, {appleHealthImport.avg_daily_steps_7d ?? "n/a"} steps
              </p>
              {appleHealthImport.imported_at && (
                <p className="mt-1 text-xs">Imported {new Date(appleHealthImport.imported_at).toLocaleString()}</p>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-fn-muted">Supports standard Apple Health export `.zip` bundles and raw `export.xml` files.</p>
        </Card>

        {error && <ErrorMessage message={error} />}
        <Button type="submit" loading={saving} className="w-full">Save settings</Button>
      </form>
    </PageLayout>
  );
}
