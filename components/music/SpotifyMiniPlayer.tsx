"use client";

import React from "react";
import Link from "next/link";
import { useSpotify } from "@/lib/music/SpotifyProvider";
import { Button } from "@/components/ui";

export function SpotifyMiniPlayer() {
    const {
        currentTrack,
        isPlaying,
        isActive,
        isReady,
        togglePlay,
        next,
        previous,
        transferPlayback,
        error,
        connectionState,
        statusMessage,
        refreshConnection,
    } = useSpotify();

    if (connectionState === "loading") {
        return (
            <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-fn-accent">Spotify Controls</p>
                <p className="mt-2 text-[10px] leading-relaxed text-fn-muted">
                    {statusMessage || "Preparing Spotify controls for this guided workout..."}
                </p>
            </div>
        );
    }

    if (connectionState === "disconnected") {
        return (
            <div className="rounded-2xl border border-fn-accent/20 bg-fn-accent/5 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-fn-accent">Spotify Optional</p>
                <p className="mt-2 text-[10px] leading-relaxed text-fn-muted">
                    {statusMessage || "Connect Spotify to add device-ready playback controls to guided workouts."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/integrations">
                        <Button size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest">
                            Connect Spotify
                        </Button>
                    </Link>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 border border-white/10 text-[9px] font-black uppercase tracking-widest"
                        onClick={refreshConnection}
                    >
                        Refresh
                    </Button>
                </div>
            </div>
        );
    }

    if (connectionState === "error" || error) {
        return (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-red-300">Spotify Needs Attention</p>
                <p className="mt-2 text-[10px] leading-relaxed text-red-200/80">
                    {statusMessage || error || "Spotify hit a snag. You can keep training and reconnect later."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-[9px] font-black uppercase tracking-widest"
                        onClick={refreshConnection}
                    >
                        Retry
                    </Button>
                    <Link href="/integrations">
                        <Button size="sm" variant="ghost" className="h-8 border border-red-500/20 text-[9px] font-black uppercase tracking-widest">
                            Open Integrations
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!isReady) {
        return (
            <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-fn-accent">Spotify Controls</p>
                <p className="mt-2 text-[10px] leading-relaxed text-fn-muted">
                    {statusMessage || "Open Spotify on this device and we will finish wiring up playback."}
                </p>
            </div>
        );
    }

    if (!isActive) {
        return (
            <div className="rounded-2xl border border-white/5 bg-fn-surface/30 p-4">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-fn-accent">Spotify Ready</p>
                <p className="mb-3 text-[10px] leading-relaxed text-fn-muted">
                    Open Spotify on this device, then sync playback to let Koda control your workout music.
                </p>
                <Button
                    size="sm"
                    variant="secondary"
                    className="w-full text-[9px] h-8 font-black uppercase tracking-widest"
                    onClick={transferPlayback}
                >
                    Sync Playback
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-black/60 border border-white/10 p-4 shadow-2xl backdrop-blur-md group">
            <div className="flex items-center gap-3 mb-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    {currentTrack?.album.images[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={currentTrack.album.images[0].url}
                            alt={currentTrack.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/5">
                            <span className="text-lg">🎵</span>
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black uppercase italic text-white leading-tight">
                        {currentTrack?.name || "Unknown Track"}
                    </p>
                    <p className="truncate text-[9px] font-bold text-fn-accent uppercase tracking-tighter opacity-70">
                        {currentTrack?.artists.map(a => a.name).join(", ") || "Unknown Artist"}
                    </p>
                </div>
                <div className="flex h-6 w-6 items-center justify-center">
                    {isPlaying && (
                        <div className="flex items-baseline gap-0.5 h-3">
                            <div className="w-0.5 h-2 bg-fn-accent animate-[bounce_1s_infinite]" />
                            <div className="w-0.5 h-3 bg-fn-accent animate-[bounce_1.2s_infinite]" />
                            <div className="w-0.5 h-1.5 bg-fn-accent animate-[bounce_0.8s_infinite]" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between gap-2">
                <button
                    onClick={previous}
                    className="p-1.5 text-fn-muted hover:text-white transition-colors"
                >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6L19 18V6z" /></svg>
                </button>

                <button
                    onClick={togglePlay}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-fn-accent transition-colors shadow-lg"
                >
                    {isPlaying ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                        <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>

                <button
                    onClick={next}
                    className="p-1.5 text-fn-muted hover:text-white transition-colors"
                >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z" /></svg>
                </button>
            </div>
        </div>
    );
}
