"use client";

import { useState, useEffect } from "react";
import { PageLayout, Card, CardHeader, Select, Input, Button, ErrorMessage, LoadingState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type CycleLog = {
    log_id: string;
    start_date: string;
    cycle_phase: "menstrual" | "follicular" | "ovulatory" | "luteal";
    symptom_severity: number | null;
    notes: string | null;
};

export default function CycleTrackingPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [logs, setLogs] = useState<CycleLog[]>([]);

    const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
    const [formPhase, setFormPhase] = useState<"menstrual" | "follicular" | "ovulatory" | "luteal">("menstrual");
    const [formSeverity, setFormSeverity] = useState<string>("");

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        setLoading(true);
        try {
            const supabase = createClient();
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("user_cycle_logs")
                .select("*")
                .eq("user_id", user.id)
                .order("start_date", { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (err: any) {
            setError(err.message || "Failed to load cycle logs.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const supabase = createClient();
            if (!supabase) throw new Error("Client not found");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Must be logged in.");

            const { error: insertError } = await supabase
                .from("user_cycle_logs")
                .insert({
                    user_id: user.id,
                    start_date: formDate,
                    cycle_phase: formPhase,
                    symptom_severity: formSeverity ? parseInt(formSeverity) : null
                });

            if (insertError) throw insertError;

            setSuccess("Cycle phase logged successfully. AI Coaching algorithms updated.");
            await loadLogs();
        } catch (err: any) {
            setError(err.message || "Submission failed.");
        } finally {
            setSubmitting(false);
        }
    }

    const phaseDescriptions = {
        menstrual: "Low hormone phase. Focus on recovery, light movement, and maintaining mobility.",
        follicular: "Estrogen rising. High energy phase ideal for progressive overload and heavy lifting.",
        ovulatory: "Estrogen peaking. Maximum strength potential, but joints may be slightly looser. Push hard but maintain form.",
        luteal: "Progesterone dominant phase. Energy may dip; body temperature rises. Good time to deload or shift to endurance/maintenance."
    };

    return (
        <PageLayout title="Cycle Tracking" subtitle="Hormonal phase data for adaptive AI training" backHref="/vitals" backLabel="Vitals">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <Card padding="lg">
                    <CardHeader title="Log Phase" subtitle="Update your current hormonal baseline" />
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        <div>
                            <label className="text-sm font-semibold text-fn-ink">Date</label>
                            <Input
                                type="date"
                                className="mt-1"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-fn-ink">Current Phase</label>
                            <Select
                                className="mt-1"
                                value={formPhase}
                                onChange={e => setFormPhase(e.target.value as any)}
                            >
                                <option value="menstrual">Menstrual Phase (Days 1-5)</option>
                                <option value="follicular">Follicular Phase (Days 6-13)</option>
                                <option value="ovulatory">Ovulatory Phase (Day 14)</option>
                                <option value="luteal">Luteal Phase (Days 15-28)</option>
                            </Select>
                            <p className="mt-2 text-xs text-fn-muted bg-fn-bg-alt p-3 rounded-xl">
                                💡 {phaseDescriptions[formPhase]}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-fn-ink">Symptom Severity (Optional)</label>
                            <Input
                                type="number"
                                min="1" max="10"
                                placeholder="1 (Low) - 10 (High)"
                                className="mt-1"
                                value={formSeverity}
                                onChange={e => setFormSeverity(e.target.value)}
                            />
                        </div>

                        {error && <ErrorMessage message={error} />}
                        {success && <p className="rounded-xl border border-fn-accent/20 bg-fn-accent/10 px-3 py-2 text-sm text-fn-accent">{success}</p>}

                        <Button type="submit" loading={submitting} className="w-full">
                            Update AI Baseline
                        </Button>
                    </form>
                </Card>

                <Card padding="lg">
                    <CardHeader title="Cycle History" subtitle="Your recent phase logs" />
                    {loading ? (
                        <div className="mt-4"><LoadingState /></div>
                    ) : logs.length === 0 ? (
                        <p className="text-sm text-fn-muted mt-4">No cycle phases logged yet.</p>
                    ) : (
                        <ul className="mt-4 space-y-3">
                            {logs.map(log => (
                                <li key={log.log_id} className="rounded-xl border border-fn-border bg-fn-surface px-4 py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-fn-ink capitalize">{log.cycle_phase} Phase</p>
                                        <p className="text-xs text-fn-muted">{log.start_date}</p>
                                    </div>
                                    {log.symptom_severity && (
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase text-fn-muted">Severity</p>
                                            <p className="text-sm font-semibold text-fn-accent">{log.symptom_severity} / 10</p>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </PageLayout>
    );
}
