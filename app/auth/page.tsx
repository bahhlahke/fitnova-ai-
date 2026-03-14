"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, ErrorMessage, Input, Card } from "@/components/ui";
import { trackProductEvent } from "@/lib/telemetry/events";

function encodeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function describeNextRoute(next: string): { label: string; detail: string } {
  const pathname = next.split("?")[0];

  if (pathname === "/onboarding") {
    return {
      label: "Finish your setup",
      detail: "Add a few profile details so Koda can tailor workouts, food targets, and recovery guidance.",
    };
  }

  if (pathname === "/plan") {
    return {
      label: "Open your plan",
      detail: "See today’s workout focus and make any quick adjustments before you start.",
    };
  }

  if (pathname === "/log/workout") {
    return {
      label: "Open workout log",
      detail: "Start today’s session or save a workout you already completed.",
    };
  }

  return {
    label: "Open your dashboard",
    detail: "See your next best step, whether that is today’s workout, meal log, or check-in.",
  };
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
  const nextRoute = useMemo(() => describeNextRoute(next), [next]);

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
    trackProductEvent("funnel_auth_start", { method: "email", intent });
    const getOrigin = () => {
      if (typeof window !== "undefined") return window.location.origin;
      return process.env.NEXT_PUBLIC_SITE_URL || "";
    };

    const callback = `${getOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;

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
    trackProductEvent("funnel_auth_start", { method: "google", intent });
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
          <h1 className="mt-3 font-display text-4xl text-fn-ink sm:text-5xl">Create your Koda AI coaching account</h1>
          <p className="mt-3 max-w-xl text-base text-fn-muted">
            You are one step away from adaptive workouts, nutrition targets, and in-app accountability.
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-fn-muted">
            Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today&apos;s workout, or logging your first meal.
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

            {process.env.NODE_ENV === "development" && (
              <Button
                className="w-full mt-2"
                variant="secondary"
                onClick={() => {
                  // Auto setup local storage bypass tokens or mock session, 
                  // Or redirect to a test bypass endpoint if we build one
                  window.location.href = `/api/v1/auth/mock-login?next=${encodeURIComponent(next)}`;
                }}
              >
                [DEV] Bypass Login
              </Button>
            )}

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
          <p className="mt-3 text-sm leading-relaxed text-fn-muted">
            Here is the exact flow after you sign in so there are no surprises.
          </p>
          <div className="mt-4 space-y-3">
            {[
              {
                step: "1",
                title: "Verify your account",
                detail: "Use Google or your email link to sign in securely.",
              },
              {
                step: "2",
                title: nextRoute.label,
                detail: nextRoute.detail,
              },
              {
                step: "3",
                title: "Complete one first action",
                detail: "Start a workout, log a meal, or finish a quick check-in so Koda can coach you from real data.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-fn-border bg-fn-bg-alt p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-fn-accent">Step {item.step}</p>
                <p className="mt-2 text-sm font-semibold text-fn-ink">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-fn-muted">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-fn-border bg-fn-bg-alt p-4 text-sm text-fn-muted">
            You will land on <span className="font-semibold text-fn-ink">{nextRoute.label.toLowerCase()}</span> after sign-in.
            <p className="mt-1 text-xs text-fn-muted">Route: <span className="font-semibold text-fn-ink">{next}</span></p>
          </div>

          <Link href="/" className="mt-5 inline-block text-sm font-semibold text-fn-primary hover:text-fn-primary-dim">
            Back to home
          </Link>
        </Card>
      </div>
    </div>
  );
}
