"use client";

import { useMemo } from "react";
import Link from "next/link";
import { LevelDisplay } from "./LevelDisplay";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { emitDataRefresh } from "@/lib/ui/data-sync";

export interface DashboardHeroProps {
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
  isPro,
}: DashboardHeroProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const [adaptInput, setAdaptInput] = useState("");
  const [adapting, setAdapting] = useState(false);
  const [adaptSuccess, setAdaptSuccess] = useState(false);

  async function handleAdapt(e: React.FormEvent) {
    e.preventDefault();
    if (!adaptInput.trim()) return;

    setAdapting(true);
    setAdaptSuccess(false);
    try {
      const res = await fetch("/api/v1/plan/adapt-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: adaptInput }),
      });

      if (res.ok) {
        setAdaptSuccess(true);
        setAdaptInput("");
        emitDataRefresh(["dashboard", "workout", "nutrition"]);
        setTimeout(() => setAdaptSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to adapt day", err);
    } finally {
      setAdapting(false);
    }
  }

  return (
    <header className="relative overflow-hidden rounded-xl3 border border-white/[0.08] bg-fn-surface p-6 shadow-fn-card sm:p-10">
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

        {/* AI Adapt Protocol Command Input */}
        <div className="mt-8 max-w-xl">
          <form onSubmit={handleAdapt} className="relative flex items-center group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-fn-accent font-mono font-bold">{">"}</span>
            </div>
            <input
              type="text"
              value={adaptInput}
              onChange={(e) => setAdaptInput(e.target.value)}
              placeholder="Adapt today's protocol... (e.g. 'I only have 20 mins')"
              className="w-full bg-black/40 border border-white/10 text-white placeholder:text-white/30 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-fn-accent focus:border-fn-accent rounded-lg py-3 pl-10 pr-24 transition-all"
              disabled={adapting}
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              <button
                type="submit"
                disabled={adapting || !adaptInput.trim()}
                className="bg-fn-accent/10 hover:bg-fn-accent/20 text-fn-accent border border-fn-accent/20 rounded px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {adapting ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : (adaptSuccess ? "Adapted" : "Override")}
              </button>
            </div>
          </form>
          {adaptSuccess && (
            <p className="mt-2 text-[10px] font-mono text-emerald-400 uppercase tracking-widest pl-4">
              Protocol successfully re-calculated.
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
