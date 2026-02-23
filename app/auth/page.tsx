"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold text-white">Sign in</h1>
      <p className="mt-1 text-fn-muted">We’ll send you a magic link to log in.</p>
      {sent ? (
        <div className="mt-6 rounded-xl border border-fn-teal bg-fn-surface p-4 text-white">
          Check your inbox for the link. You can close this and open the link from your email.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label htmlFor="email" className="block text-sm font-medium text-fn-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="min-h-touch w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white placeholder-fn-muted focus:border-fn-teal focus:outline-none focus:ring-1 focus:ring-fn-teal"
            placeholder="you@example.com"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="min-h-touch min-w-touch w-full rounded-lg bg-fn-teal py-3 font-medium text-fn-black hover:bg-fn-teal-dim disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}
      <p className="mt-6">
        <Link href="/" className="text-fn-teal hover:underline">← Back to dashboard</Link>
      </p>
    </div>
  );
}
