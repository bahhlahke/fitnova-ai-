"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AddProgressPage() {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = weight.trim() ? parseFloat(weight) : undefined;
    if (!w && !notes.trim()) return;
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
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6">
        <Link href="/progress" className="text-fn-muted hover:text-white">← Progress</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Add progress</h1>
      </header>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-fn-muted">Weight (kg)</label>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="min-h-touch w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white"
          placeholder="70"
        />
        <label className="block text-sm font-medium text-fn-muted">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-touch w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white"
          placeholder="Optional"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={saving} className="min-h-touch w-full rounded-lg bg-fn-teal py-3 font-medium text-fn-black hover:bg-fn-teal-dim disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
