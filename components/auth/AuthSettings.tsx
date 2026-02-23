"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthSettings() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div className="rounded-xl border border-fn-border bg-fn-surface p-4 text-fn-muted">Loading…</div>;

  return (
    <div className="rounded-xl border border-fn-border bg-fn-surface p-4">
      {user ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fn-muted">{user.email}</p>
          <button
            type="button"
            onClick={() => signOut()}
            className="min-h-touch min-w-touch rounded-lg border border-fn-border px-4 py-2 text-sm font-medium text-white hover:bg-fn-surface-hover"
          >
            Sign out
          </button>
        </div>
      ) : (
        <Link
          href="/auth"
          className="inline-flex min-h-touch items-center justify-center rounded-lg bg-fn-teal px-4 py-2 text-sm font-medium text-fn-black hover:bg-fn-teal-dim"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
