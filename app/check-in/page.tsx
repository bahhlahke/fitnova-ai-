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
import { emitDataRefresh } from "@/lib/ui/data-sync";
import { 
  Zap, 
  Moon, 
  Activity, 
  CheckCircle2, 
  Calendar, 
  ArrowRight, 
  ArrowLeft,
  Edit3,
  Thermometer,
  ShieldCheck
} from "lucide-react";

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
  const [pivotLoading, setPivotLoading] = useState(false);
  const [pivotMessage, setPivotMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<any | null>(null);
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
          setLastCheckIn(row);
          setIsEditing(false);
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
    emitDataRefresh(["dashboard"]);
  }

  async function handlePivot() {
    setPivotLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/plan/adapt-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Low energy recovery pivot. Adjust for high fatigue.",
          date_local: today
        }),
      });
      if (!res.ok) throw new Error("Adaptation failed");
      setPivotMessage("Protocol adapted. Recovery focus initialized.");
      emitDataRefresh(["dashboard", "workout"]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPivotLoading(false);
    }
  }

  if (loading) {
    return (
      <PageLayout title="Daily Check-In" subtitle="Syncing with Koda analysis..." backHref="/">
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="h-16 w-16 animate-spin rounded-full border-t-2 border-r-2 border-fn-accent border-l-transparent border-b-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-fn-accent animate-pulse">Initializing Biometric Uplink</p>
        </div>
      </PageLayout>
    );
  }

  // Summary View if already checked in and not editing
  if (existingCheckInId && !isEditing && !saved) {
    const readiness = lastCheckIn?.energy_score ? (lastCheckIn.energy_score / 5) * 100 : 0;
    
    return (
      <PageLayout
        title="Daily Mastery"
        subtitle="Today's readiness and recovery overview."
        backHref="/"
        backLabel="Cockpit"
      >
        <div className="mx-auto max-w-2xl space-y-8 py-8 animate-panel-rise">
          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-fn-accent/20 via-black to-black p-10 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-3xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fn-accent/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="relative h-48 w-48 mb-6">
                <svg className="h-full w-full -rotate-90 overflow-visible" viewBox="0 0 100 100">
                  <circle
                    className="stroke-white/5"
                    strokeWidth="8"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="stroke-fn-accent transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={`${readiness * 2.51} 251`}
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-display font-black italic tracking-tighter text-white">{Math.round(readiness)}%</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent">Readiness</span>
                </div>
              </div>

              <h1 className="premium-headline text-4xl mb-4 uppercase">You&apos;re Locked In</h1>
              <p className="text-sm text-white/60 max-w-md leading-relaxed">
                Your check-in is complete. Koda has calibrated today&apos;s training load and recovery targets based on your data.
              </p>

              <div className="mt-8 flex gap-3 w-full max-w-sm">
                <Button 
                  onClick={() => setIsEditing(true)} 
                  variant="secondary" 
                  className="flex-1 h-14 text-xs font-black uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10"
                >
                  <Edit3 size={16} className="mr-2" /> Update Check-In
                </Button>
                <Button 
                  onClick={() => router.push("/")} 
                  className="flex-1 h-14 text-xs font-black uppercase tracking-widest"
                >
                  Return to Cockpit
                </Button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
             <div className="premium-panel p-6 flex flex-col items-center text-center gap-2">
                <Zap className="text-amber-400 mb-2" size={24} />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Energy Level</p>
                <p className="text-2xl font-display font-black italic text-white">{lastCheckIn?.energy_score}/5</p>
             </div>
             <div className="premium-panel p-6 flex flex-col items-center text-center gap-2">
                <Moon className="text-blue-400 mb-2" size={24} />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Sleep Quality</p>
                <p className="text-2xl font-display font-black italic text-white">{lastCheckIn?.sleep_hours}h</p>
             </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Elite Check-In"
      subtitle="Calibrate your performance profile for today."
      backHref="/"
      backLabel="Cockpit"
    >
      <div className="mx-auto max-w-2xl space-y-8 py-8 min-h-[600px] flex flex-col">
        {/* Progress Header */}
        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 w-12 rounded-full transition-all duration-500 ${s <= currentStep ? 'bg-fn-accent shadow-[0_0_10px_rgba(10,217,196,0.5)]' : 'bg-white/10'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Step {currentStep} of 3</span>
        </div>

        <div className="flex-1 relative">
          {/* Step 1: Energy */}
          {currentStep === 1 && (
            <div className="animate-panel-rise space-y-10">
              <div className="space-y-4">
                <div className="inline-flex rounded-2xl bg-amber-400/10 border border-amber-400/20 p-3 text-amber-400">
                  <Zap size={28} />
                </div>
                <h1 className="text-4xl font-display font-black italic tracking-tighter text-white uppercase leading-[0.9]">How is your CNS<br />energy today?</h1>
                <p className="text-white/50 text-sm max-w-sm">This adjusts your prescribed volume and training intensity for the current session.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setEnergyScore(n);
                      setTimeout(() => setCurrentStep(2), 300);
                    }}
                    className={`group relative flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300 ${energyScore === n
                      ? "bg-fn-accent border-fn-accent text-black shadow-[0_0_30px_rgba(10,217,196,0.2)]"
                      : "bg-white/[0.03] border-white/5 text-white/60 hover:bg-white/[0.06] hover:border-white/20"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-display font-black italic">{n}</span>
                      <span className="text-sm font-black uppercase tracking-widest">{ENERGY_LABELS[n-1]}</span>
                    </div>
                    <ArrowRight className={`transition-all duration-300 ${energyScore === n ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Sleep */}
          {currentStep === 2 && (
            <div className="animate-panel-rise space-y-10">
              <div className="space-y-4">
                <div className="inline-flex rounded-2xl bg-blue-400/10 border border-blue-400/20 p-3 text-blue-400">
                  <Moon size={28} />
                </div>
                <h1 className="text-4xl font-display font-black italic tracking-tighter text-white uppercase leading-[0.9]">Duration of last<br />sleep cycle?</h1>
                <p className="text-white/50 text-sm max-w-sm">Sleep duration directly correlates with hormonal recovery and muscle protein synthesis.</p>
              </div>

              <div className="premium-panel p-10 flex flex-col items-center">
                <div className="text-7xl font-display font-black italic text-white mb-8">
                  {sleepHours || "0"}<span className="text-2xl text-fn-accent ml-2">HOURS</span>
                </div>
                <div className="w-full relative py-6">
                  <input
                    type="range"
                    min="0"
                    max="14"
                    step="0.5"
                    value={sleepHours || "0"}
                    onChange={(e) => setSleepHours(e.target.value)}
                    className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-fn-accent"
                  />
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 w-4 h-4 bg-fn-accent rounded-full blur-[10px] opacity-50 pointer-events-none" style={{ left: `${(parseFloat(sleepHours) / 14) * 100}%` }} />
                </div>
                <div className="mt-12 flex gap-4 w-full">
                   <Button 
                    variant="secondary" 
                    onClick={() => setCurrentStep(1)}
                    className="h-14 px-6 border-white/10 bg-white/5"
                  >
                    <ArrowLeft size={18} />
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 h-14 text-xs font-black uppercase tracking-widest"
                  >
                    Confirm Duration
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Soreness & Finish */}
          {currentStep === 3 && (
            <div className="animate-panel-rise space-y-10">
              <div className="space-y-4">
                <div className="inline-flex rounded-2xl bg-red-400/10 border border-red-400/20 p-3 text-red-400">
                  <Thermometer size={28} />
                </div>
                <h1 className="text-4xl font-display font-black italic tracking-tighter text-white uppercase leading-[0.9]">Any localized<br />pain or strain?</h1>
                <p className="text-white/50 text-sm max-w-sm">Identifying constraints allows Koda to suggest alternative movement patterns or recovery work.</p>
              </div>

              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-fn-accent/5 rounded-2xl blur-xl group-focus-within:bg-fn-accent/10 transition-all" />
                  <Textarea
                    value={sorenessNotes}
                    onChange={(e) => setSorenessNotes(e.target.value)}
                    placeholder="E.g., Left shoulder impingement, lower back tightness..."
                    className="relative bg-black/40 border-white/10 text-white placeholder-white/20 rounded-2xl p-8 min-h-[160px] focus:ring-fn-accent/20 focus:border-fn-accent/50 text-lg"
                  />
                </div>

                {error && <ErrorMessage message={error} />}

                <div className="flex gap-4 pt-4">
                   <Button 
                    variant="secondary" 
                    onClick={() => setCurrentStep(2)}
                    className="h-16 px-6 border-white/10 bg-white/5"
                  >
                    <ArrowLeft size={20} />
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    loading={saving}
                    disabled={saving || !energyScore}
                    className="flex-1 h-16 text-lg font-black uppercase tracking-[0.2em]"
                  >
                    <ShieldCheck size={20} className="mr-2" /> Complete Protocol
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success / Final Pivot State */}
        {saved && (
          <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in zoom-in duration-500">
             <div className="max-w-md w-full text-center space-y-8 animate-panel-rise">
                <div className="relative inline-flex mb-4">
                  <div className="absolute inset-0 bg-fn-accent rounded-full blur-[40px] opacity-40 animate-pulse" />
                  <div className="relative h-24 w-24 rounded-full bg-fn-accent flex items-center justify-center text-black">
                    <CheckCircle2 size={48} />
                  </div>
                </div>
                
                <h1 className="text-5xl font-display font-black italic tracking-tighter text-white uppercase leading-[0.9]">Biometrics<br />Synchronized</h1>
                <p className="text-white/50 leading-relaxed">
                  Your readiness data has been ingested. Today&apos;s session is now fully adaptive.
                </p>

                {energyScore && energyScore <= 2 && !pivotMessage && (
                  <div className="rounded-2xl border border-fn-accent/30 bg-fn-accent/5 p-8 space-y-6">
                    <div className="flex items-center gap-3 justify-center mb-2">
                       <Zap className="text-fn-accent animate-pulse" size={20} />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">Tactical Pivot Suggested</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Bio-markers indicate high systemic fatigue. Koda suggests a recovery-focused intensity pivot.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={handlePivot}
                      loading={pivotLoading}
                      className="w-full h-14 border-fn-accent/50 text-fn-accent hover:bg-fn-accent/10"
                    >
                      Initialize Recovery Pivot
                    </Button>
                  </div>
                )}

                {pivotMessage && (
                  <div className="rounded-2xl border border-fn-accent bg-fn-accent/20 p-6">
                    <p className="text-sm font-black text-fn-accent uppercase tracking-widest">{pivotMessage}</p>
                  </div>
                )}

                <div className="pt-8">
                  <Button
                    variant="secondary"
                    onClick={() => router.push("/")}
                    className="w-full h-16 text-sm font-black uppercase tracking-widest bg-white/5 border-white/10"
                  >
                    Enter Cockpit
                  </Button>
                </div>
             </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

