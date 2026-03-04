"use client";

import { useMemo } from "react";
import Link from "next/link";
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
    <header className="relative overflow-hidden rounded-xl3 border border-white/[0.08] bg-fn-surface p-8 shadow-fn-card sm:p-12">
      <div className="absolute right-8 top-8 z-20">
        <LevelDisplay />
      </div>
      {/* Background image/video gradient */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/refined/athletic_female_close_up.png"
          alt="Hero background"
          className="h-full w-full object-cover object-center opacity-30 mix-blend-luminosity brightness-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-fn-bg via-fn-bg/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-fn-bg via-transparent to-fn-bg/20" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-fn-accent/90">
            Command Center
          </p>
          <span className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/60 backdrop-blur-md">
            {isPro ? "Protocol Active" : "Trial Active"}
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-black uppercase italic tracking-tighter text-white sm:text-6xl lg:text-7xl">
          {greeting}
        </h1>
        <p className="mt-4 max-w-xl text-lg font-medium leading-relaxed text-fn-muted/90">
          Your daily adaptive protocol is ready. Sync your biometric data, log your intake, and execute today&apos;s training.
        </p>

        {/* AI Briefing */}
        {briefingLoading ? (
          <div className="mt-8 h-20 max-w-3xl rounded-2xl bg-white/[0.03] animate-pulse" />
        ) : briefing ? (
          <div className="mt-8 flex items-start gap-5 rounded-2xl border border-fn-accent/20 bg-fn-accent/5 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-fn-accent/30 bg-black/40">
              <span className="text-[11px] font-black text-fn-accent">AI</span>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent/80">
                Performance Briefing
              </p>
              <p className="mt-2 text-base font-medium italic leading-relaxed text-white/95">
                &quot;{briefing}&quot;
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
