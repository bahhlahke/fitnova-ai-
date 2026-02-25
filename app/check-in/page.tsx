"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  PageLayout,
  Card,
  CardHeader,
  Button,
  Input,
  Label,
  Textarea,
  ErrorMessage,
  LoadingState,
} from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

const ENERGY_LABELS = ["1 – Low", "2", "3", "4", "5 – High"];
const ADHERENCE_LABELS = ["1 – Low", "2", "3", "4", "5 – High"];

export default function CheckInPage() {
  const router = useRouter();
  const [energyScore, setEnergyScore] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState("");
  const [sorenessNotes, setSorenessNotes] = useState("");
  const [adherenceScore, setAdherenceScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [existingCheckInId, setExistingCheckInId] = useState<string | null>(null);
  const today = toLocalDateString();

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
        .from("check_ins")
        .select("check_in_id, energy_score, sleep_hours, soreness_notes, adherence_score")
        .eq("user_id", user.id)
        .eq("date_local", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const row = data as {
              check_in_id: string;
              energy_score?: number | null;
              sleep_hours?: number | null;
              soreness_notes?: string | null;
              adherence_score?: number | null;
            };
            setExistingCheckInId(row.check_in_id);
            if (row.energy_score != null) setEnergyScore(row.energy_score);
            if (row.sleep_hours != null) setSleepHours(String(row.sleep_hours));
            if (row.soreness_notes) setSorenessNotes(row.soreness_notes);
            if (row.adherence_score != null) setAdherenceScore(row.adherence_score);
          }
          setLoading(false);
        })
        .then(undefined, () => setLoading(false));
    }).then(undefined, () => setLoading(false));
  }, [today]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in to save your check-in.");
      setSaving(false);
      return;
    }
    const sleepNum = sleepHours.trim() ? parseFloat(sleepHours) : null;
    const payload = {
      user_id: user.id,
      date_local: today,
      energy_score: energyScore ?? null,
      sleep_hours: sleepNum != null && Number.isFinite(sleepNum) && sleepNum >= 0 && sleepNum <= 24 ? sleepNum : null,
      soreness_notes: sorenessNotes.trim() || null,
      adherence_score: adherenceScore ?? null,
    };

    if (existingCheckInId) {
      const { error: updateErr } = await supabase
        .from("check_ins")
        .update({
          energy_score: payload.energy_score,
          sleep_hours: payload.sleep_hours,
          soreness_notes: payload.soreness_notes,
          adherence_score: payload.adherence_score,
        })
        .eq("check_in_id", existingCheckInId);
      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertErr } = await supabase.from("check_ins").insert(payload);
      if (insertErr) {
        setError(insertErr.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setSaved(true);
  }

  if (loading) {
    return (
      <PageLayout title="Check-in" subtitle="How you're feeling today" backHref="/" backLabel="Home">
        <LoadingState />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Check-in" subtitle="How you're feeling today" backHref="/" backLabel="Home">
      <Card>
        <CardHeader
          title="Today's check-in"
          subtitle="Consistent entries improve plan adaptation and AI insight quality."
        />
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div>
            <Label>Energy (1–5)</Label>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergyScore(n)}
                  className={`min-h-touch min-w-touch flex-1 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-fn-primary/30 ${
                    energyScore === n
                      ? "border-fn-primary bg-fn-primary text-white"
                      : "border-fn-border bg-fn-surface-hover text-fn-ink hover:border-fn-primary/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-fn-muted">{ENERGY_LABELS[energyScore ?? 0] ?? "Select one"}</p>
          </div>

          <div>
            <Label htmlFor="sleep">Sleep (hours)</Label>
            <Input
              id="sleep"
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g. 7"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="soreness">Soreness or notes</Label>
            <Textarea
              id="soreness"
              value={sorenessNotes}
              onChange={(e) => setSorenessNotes(e.target.value)}
              placeholder="e.g. Lower back tight, or leave blank"
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label>Plan to adhere today (1–5, optional)</Label>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAdherenceScore(n)}
                  className={`min-h-touch min-w-touch flex-1 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-fn-primary/30 ${
                    adherenceScore === n
                      ? "border-fn-primary bg-fn-primary text-white"
                      : "border-fn-border bg-fn-surface-hover text-fn-ink hover:border-fn-primary/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-fn-muted">{adherenceScore != null ? ADHERENCE_LABELS[adherenceScore - 1] : "Optional"}</p>
          </div>

          {error && <ErrorMessage message={error} />}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saving} disabled={saving}>
              {saved ? "Saved" : "Save check-in"}
            </Button>
            {saved && (
              <Button type="button" variant="secondary" onClick={() => router.push("/")}>
                Back to home
              </Button>
            )}
          </div>
        </form>
      </Card>
    </PageLayout>
  );
}
