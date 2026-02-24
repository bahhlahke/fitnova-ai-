"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, ErrorMessage, Input, Card } from "@/components/ui";

function encodeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default function AuthPage() {
  const [nextRaw, setNextRaw] = useState("/");
  const [intent, setIntent] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setNextRaw(params.get("next") ?? "/");
    setIntent(params.get("intent"));
    setUrlError(params.get("error"));
  }, []);

  const next = useMemo(() => encodeNext(nextRaw), [nextRaw]);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    if (urlError) setError(urlError);
  }, [urlError]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local");
      return;
    }

    setLoadingEmail(true);
    const callback =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : undefined;

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback },
    });

    setLoadingEmail(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured for OAuth yet.");
      return;
    }

    setLoadingGoogle(true);
    const callback =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : undefined;

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback,
      },
    });

    if (err) {
      setLoadingGoogle(false);
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card padding="lg" className="hero-reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Continue your personalized plan</p>
          <h1 className="mt-3 font-display text-4xl text-fn-ink sm:text-5xl">Create your FitNova coaching account</h1>
          <p className="mt-3 max-w-xl text-base text-fn-muted">
            You are one step away from adaptive workouts, nutrition targets, and in-app accountability.
          </p>

          {intent === "assessment" && (
            <div className="mt-5 rounded-2xl border border-fn-border bg-fn-bg-alt p-4">
              <p className="text-sm font-semibold text-fn-ink">Assessment complete</p>
              <p className="mt-1 text-sm text-fn-muted">Sign in to save your answers and unlock your day-one plan.</p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Button className="w-full" loading={loadingGoogle} onClick={handleGoogle}>
              Continue with Google
            </Button>

            {sent ? (
              <div className="rounded-2xl border border-fn-border bg-fn-surface-hover p-4 text-sm text-fn-ink">
                Magic link sent. Open your email and continue from the secure link.
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <label htmlFor="email" className="block text-sm font-semibold text-fn-ink-soft">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
                <Button type="submit" variant="secondary" className="w-full" loading={loadingEmail}>
                  Send magic link
                </Button>
              </form>
            )}

            {error && <ErrorMessage message={error} />}
          </div>

          <p className="mt-4 text-xs text-fn-muted">AI guidance is educational and does not replace medical care.</p>
        </Card>

        <Card padding="lg" className="rise-reveal rise-reveal-delay-1 lg:sticky lg:top-8 lg:h-fit">
          <h2 className="font-display text-2xl text-fn-ink">What happens next</h2>
          <ol className="mt-4 space-y-3 text-sm text-fn-muted">
            <li><span className="font-semibold text-fn-ink">1.</span> Verify your account securely.</li>
            <li><span className="font-semibold text-fn-ink">2.</span> Save your personalized setup and constraints.</li>
            <li><span className="font-semibold text-fn-ink">3.</span> Start your first guided training and nutrition day.</li>
          </ol>

          <div className="mt-5 rounded-2xl border border-fn-border bg-fn-bg-alt p-4 text-sm text-fn-muted">
            Recommended next route: <span className="font-semibold text-fn-ink">{next}</span>
          </div>

          <Link href="/" className="mt-5 inline-block text-sm font-semibold text-fn-primary hover:text-fn-primary-dim">
            Back to home
          </Link>
        </Card>
      </div>
    </div>
  );
}
