"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthSettings() {
  const { user, loading, signOut } = useAuth();

  if (loading) return (
    <div className="rounded-2xl border border-white/[0.08] bg-fn-surface/40 p-6 backdrop-blur-md animate-pulse">
      <div className="h-4 w-32 rounded bg-white/10" />
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-fn-surface/40 p-6 backdrop-blur-md shadow-fn-card">
      {user ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent mb-1">Authenticated Pulse</p>
            <p className="text-sm font-medium text-white/80">
              Signed in as <span className="font-bold text-white italic">{user.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="h-touch rounded-xl border border-white/10 bg-white/5 px-6 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
          >
            Terminate Session
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/auth">
            <button className="h-touch rounded-xl bg-fn-accent px-8 text-[11px] font-black uppercase tracking-widest text-fn-bg transition-all hover:scale-105 active:scale-95 shadow-fn-soft">
              Initialize Access
            </button>
          </Link>
          <Link href="/start" className="text-[11px] font-black uppercase tracking-widest text-fn-accent hover:underline">
            Start Assessment →
          </Link>
        </div>
      )}
    </div>
  );
}
