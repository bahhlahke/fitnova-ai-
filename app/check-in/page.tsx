"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  PageLayout,
  Button,
  Label,
  Textarea,
  ErrorMessage,
} from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

const ENERGY_LABELS = ["1 – Low", "2", "3", "4", "5 – High"];

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
    let cancelled = false;
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from("check_ins")
          .select("check_in_id, energy_score, sleep_hours, soreness_notes, adherence_score")
          .eq("user_id", user.id)
          .eq("date_local", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
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
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
      <PageLayout title="System Scan" subtitle="Initializing Bio-Sync..." backHref="/">
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-fn-accent border-t-transparent" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Daily Protocol Scan"
      subtitle="Sync your internal vitals with the machine."
      backHref="/"
      backLabel="Cockpit"
    >
      <div className="mx-auto max-w-2xl space-y-12 py-10">
        <header className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-4">Readiness Initialization</p>
          <h1 className="font-display text-5xl font-black text-white italic tracking-tighter uppercase sm:text-7xl">Vital Check</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-black uppercase tracking-widest text-fn-muted">System Energy</Label>
              <span className="text-xs font-bold text-fn-accent">{energyScore ? ENERGY_LABELS[energyScore - 1] : "Required"}</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergyScore(n)}
                  className={`relative flex flex-col items-center justify-center py-6 rounded-xl border-2 transition-all duration-300 ${energyScore === n
                    ? "bg-fn-accent border-fn-accent text-black scale-105 shadow-[0_0_20px_rgba(10,217,196,0.3)]"
                    : "bg-white/5 border-white/5 text-fn-muted hover:border-white/20"
                    }`}
                >
                  <span className="text-2xl font-black">{n}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-black uppercase tracking-widest text-fn-muted">Sleep Duration</Label>
              <span className="text-xs font-bold text-fn-accent">{sleepHours || 0} Hours</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="14"
                step="0.5"
                value={sleepHours || "0"}
                onChange={(e) => setSleepHours(e.target.value)}
                className="w-full accent-fn-accent bg-white/10 rounded-lg appearance-none cursor-pointer h-2"
              />
              <div className="flex justify-between mt-2 text-[10px] font-bold text-fn-muted uppercase tracking-widest">
                <span>0h</span>
                <span>7h</span>
                <span>14h</span>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <Label className="text-sm font-black uppercase tracking-widest text-fn-muted">Soreness & Notes</Label>
            <div className="relative">
              <Textarea
                value={sorenessNotes}
                onChange={(e) => setSorenessNotes(e.target.value)}
                placeholder="Inquire specific muscular tension or constraints..."
                className="bg-white/[0.02] border-white/5 text-white placeholder-white/20 rounded-xl p-6 focus:ring-fn-accent/20 focus:border-fn-accent/50"
                rows={4}
              />
            </div>
          </section>

          {error && <ErrorMessage message={error} />}

          <div className="flex flex-col gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/progress/scan")}
              className="w-full py-6 text-lg border-fn-accent/50 text-fn-accent hover:bg-fn-accent/10"
            >
              <span className="flex items-center gap-2 justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Run AI Body Comp Scan
              </span>
            </Button>

            <Button
              type="submit"
              loading={saving}
              disabled={saving || !energyScore}
              className="w-full py-6 text-lg mt-4"
            >
              {saved ? "Protocol Synced" : "Commit to Analysis"}
            </Button>

            {saved && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/")}
                className="w-full py-6"
              >
                Back to Cockpit
              </Button>
            )}
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
