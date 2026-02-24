"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthSettings() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div className="rounded-2xl border border-fn-border bg-white p-4 text-fn-muted">Loading...</div>;

  return (
    <div className="rounded-2xl border border-fn-border bg-white p-4">
      {user ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fn-muted">Signed in as <span className="font-semibold text-fn-ink">{user.email}</span></p>
          <button
            type="button"
            onClick={() => signOut()}
            className="min-h-touch rounded-xl border border-fn-border px-4 py-2 text-sm font-semibold text-fn-ink hover:bg-fn-surface-hover"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/auth" className="inline-flex min-h-touch items-center justify-center rounded-xl bg-fn-primary px-4 py-2 text-sm font-semibold text-white">
            Sign in
          </Link>
          <Link href="/start" className="text-sm font-semibold text-fn-primary hover:text-fn-primary-dim">
            Start assessment
          </Link>
        </div>
      )}
    </div>
  );
}
