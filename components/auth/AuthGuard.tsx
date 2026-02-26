"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="text-fn-muted">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h2 className="font-display text-4xl text-fn-ink">Sign in to continue</h2>
        <p className="mt-2 text-fn-muted">Use assessment + sign-in flow to unlock personalized coaching.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/start" className="inline-flex min-h-touch items-center justify-center rounded-xl bg-fn-primary px-6 py-3 font-semibold text-white">
            Start assessment
          </Link>
          <Link href="/auth" className="inline-flex min-h-touch items-center justify-center rounded-xl border border-fn-border bg-white px-6 py-3 font-semibold text-black">
            I have an account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
