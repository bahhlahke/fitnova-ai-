"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="text-fn-muted">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-white">Sign in to continue</h2>
        <p className="mt-2 text-fn-muted">Use your email to get a magic link.</p>
        <Link
          href="/auth"
          className="mt-6 inline-flex min-h-touch items-center justify-center rounded-lg bg-fn-teal px-6 py-3 font-medium text-fn-black hover:bg-fn-teal-dim"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
