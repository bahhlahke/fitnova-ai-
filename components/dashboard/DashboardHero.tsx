"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { LevelDisplay } from "./LevelDisplay";

export interface DashboardHeroProps {
  briefing: string | null;
  briefingLoading: boolean;
  isPro: boolean;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function DashboardHero({
  briefing,
  briefingLoading,
  isPro,
}: DashboardHeroProps) {
  const greeting = useMemo(() => getGreeting(), []);

  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-fn-surface p-7 shadow-2xl sm:p-10">
      <div className="absolute right-6 top-6 z-20">
        <LevelDisplay />
      </div>
      {/* Background image */}
      <div className="absolute inset-0 z-0 opacity-35 mix-blend-overlay">
        <Image
          src="/images/refined/hero.png"
          alt="Hero background"
          fill
          className="object-cover object-right-top"
          priority
        />
      </div>
      {/* Gradient overlays */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-fn-surface via-fn-surface/90 to-transparent" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-fn-surface via-transparent to-transparent" />

      {/* Accent icon */}
      <div className="absolute right-0 top-0 p-8 opacity-10">
        <svg className="h-28 w-28 text-fn-accent" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">
            Daily Command
          </p>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
            {isPro ? "Pro active" : "Free plan"}
          </span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-white sm:text-5xl">
          {greeting}
        </h1>
        <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-fn-muted">
          Your AI coaching surface — ready for today&apos;s training, nutrition, and recovery.
        </p>

        {/* AI Briefing */}
        {briefingLoading ? (
          <div className="mt-5 h-16 max-w-3xl rounded-2xl bg-white/[0.04] animate-pulse" />
        ) : briefing ? (
          <div className="mt-5 flex items-start gap-4 rounded-2xl border border-fn-accent/15 bg-fn-accent/5 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-fn-accent/30 bg-black/30">
              <span className="text-[10px] font-black uppercase tracking-tight text-fn-accent">AI</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">
                Coach Briefing
              </p>
              <p className="mt-1.5 text-sm font-medium italic leading-relaxed text-white/90">
                &quot;{briefing}&quot;
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
