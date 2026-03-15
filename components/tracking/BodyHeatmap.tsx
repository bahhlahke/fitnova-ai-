"use client";

import { useMemo } from "react";
import type { MuscleReadiness } from "@/lib/workout/recovery";
import type { MuscleGroup } from "@/lib/workout/muscle-groups";

interface BodyHeatmapProps {
    readiness: Partial<MuscleReadiness>;
    className?: string;
}

function getStatus(score: number): "optimal" | "good" | "moderate" | "fatigued" {
    if (score >= 80) return "optimal";
    if (score >= 60) return "good";
    if (score >= 35) return "moderate";
    return "fatigued";
}

function getColor(score: number): string {
    const status = getStatus(score);
    switch (status) {
        case "optimal": return "#0AD9C4"; // teal accent
        case "good": return "#22d3a0"; // soft green-teal
        case "moderate": return "#F59E0B"; // amber
        case "fatigued": return "#EF4444"; // danger red
    }
}

function getGlowOpacity(score: number): number {
    const status = getStatus(score);
    switch (status) {
        case "optimal": return 0.5;
        case "good": return 0.35;
        case "moderate": return 0.45;
        case "fatigued": return 0.6;
    }
}

const STATUS_LABEL: Record<ReturnType<typeof getStatus>, string> = {
    optimal: "Optimal",
    good: "Good",
    moderate: "Moderate",
    fatigued: "Fatigued",
};

// Refined anatomical paths for a more premium look
const MUSCLE_CONFIG: Array<{
    key: MuscleGroup;
    label: string;
    side: "front" | "back";
    path: string;
}> = [
    {
        key: "Chest",
        label: "Chest",
        side: "front",
        path: "M40,50 C30,50 22,55 22,65 L22,80 C22,85 30,90 50,90 C70,90 78,85 78,80 L78,65 C78,55 70,50 60,50 C55,50 50,52 50,52 C50,52 45,50 40,50 Z",
    },
    {
        key: "Core",
        label: "Core",
        side: "front",
        path: "M35,95 L65,95 L62,130 C60,140 55,145 50,145 C45,145 40,140 38,130 Z M42,100 L42,110 M58,100 L58,110 M42,120 L42,130 M58,120 L58,130",
    },
    {
        key: "Shoulders",
        label: "Shoulders",
        side: "front",
        path: "M15,45 C8,45 5,52 5,60 C5,68 12,75 20,75 L25,55 Z M85,45 C92,45 95,52 95,60 C95,68 88,75 80,75 L75,55 Z",
    },
    {
        key: "Biceps",
        label: "Biceps",
        side: "front",
        path: "M5,80 C3,80 1,85 1,95 L3,115 C5,122 12,125 18,120 L20,95 C20,85 12,80 5,80 Z M95,80 C97,80 99,85 99,95 L97,115 C95,122 88,125 82,120 L80,95 C80,85 88,80 95,80 Z",
    },
    {
        key: "Quads",
        label: "Quads",
        side: "front",
        path: "M25,150 L48,150 L48,210 L35,210 C28,210 25,200 25,185 Z M52,150 L75,150 L75,185 C75,200 72,210 65,210 L52,210 Z",
    },
    {
        key: "Back",
        label: "Back",
        side: "back",
        path: "M20,45 C20,35 35,30 50,30 C65,30 80,35 80,45 L78,95 C75,105 60,110 50,110 C40,110 25,105 22,95 Z",
    },
    {
        key: "Glutes",
        label: "Glutes",
        side: "back",
        path: "M25,135 C25,125 35,120 50,120 C65,120 75,125 75,135 L72,160 C68,170 55,175 50,175 C45,175 32,170 28,160 Z",
    },
    {
        key: "Hamstrings",
        label: "Hams",
        side: "back",
        path: "M28,175 L48,175 L48,225 C45,235 32,235 28,225 Z M52,175 L72,175 L72,225 C68,235 55,235 52,225 Z",
    },
    {
        key: "Triceps",
        label: "Triceps",
        side: "back",
        path: "M8,75 C5,75 2,80 2,90 L5,115 C8,122 15,125 20,118 L22,90 C22,80 15,75 8,75 Z M92,75 C95,75 98,80 98,90 L95,115 C92,122 85,125 80,118 L78,90 C78,80 85,75 92,75 Z",
    },
    {
        key: "Calves",
        label: "Calves",
        side: "back",
        path: "M30,230 L46,230 L46,260 C42,270 34,270 30,260 Z M54,230 L70,230 L70,260 C66,270 58,270 54,260 Z",
    },
];

interface MusclePanelProps {
    muscles: typeof MUSCLE_CONFIG;
    readiness: Partial<MuscleReadiness>;
    view: "front" | "back";
    title: string;
}

function MusclePanel({ muscles, readiness, view, title }: MusclePanelProps) {
    const panelMuscles = muscles.filter((m) => m.side === view);

    return (
        <div className="flex flex-col items-center gap-4 relative w-full h-full min-h-[400px]">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">{title}</p>
            <div className="relative w-full h-full max-w-[200px] group flex justify-center">
                {/* Holographic background grid */}
                <div className="absolute inset-0 z-0 opacity-10">
                    <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                </div>

                <svg
                    viewBox="0 0 100 280"
                    className="relative z-10 w-full h-full drop-shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all duration-700 group-hover:scale-[1.05]"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        {panelMuscles.map(({ key }) => {
                            const score = readiness[key] ?? 50;
                            const color = getColor(score);
                            const opacity = getGlowOpacity(score);
                            return (
                                <filter key={`glow-${key}-${view}`} id={`glow-${key}-${view}`} x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="6" result="blur" />
                                    <feComposite in="blur" in2="SourceGraphic" operator="out" result="glow" />
                                    <feFlood floodColor={color} floodOpacity={opacity} result="color" />
                                    <feComposite in="color" in2="glow" operator="in" result="softGlow" />
                                    <feMerge>
                                        <feMergeNode in="softGlow" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            );
                        })}
                        
                        {/* Global highlight filter */}
                        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                            <stop offset="50%" stopColor="rgba(255,255,255,0.02)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                        </linearGradient>
                    </defs>

                    {/* Body silhouette robust base */}
                    <g fill="url(#bodyGradient)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5">
                        {/* Head & Neck */}
                        <circle cx="50" cy="18" r="12" className="opacity-20" />
                        <rect x="46" y="28" width="8" height="6" rx="2" className="opacity-20" />
                        
                        {/* Torso & Arms Silhouettes */}
                        <path d="M25,40 C15,40 5,45 5,55 L3,120 C3,130 10,135 20,135 L20,150 L80,150 L80,135 C90,135 97,130 97,120 L95,55 C95,45 85,40 75,40 Z" className="opacity-10" />
                        
                        {/* Legs Silhouettes */}
                        <path d="M22,150 L20,270 C20,275 35,275 48,270 L48,150 Z M52,150 L52,270 C65,275 80,275 78,270 L75,150 Z" className="opacity-10" />
                    </g>

                    {/* Scanning Line (Inside SVG for accuracy) */}
                    <rect x="0" y="0" width="100" height="1" fill="#0AD9C4" className="animate-scanning opacity-0 group-hover:opacity-40" />

                    {/* Muscle overlays */}
                    {panelMuscles.map(({ key, path }) => {
                        const score = readiness[key] ?? 50;
                        const status = getStatus(score);
                        const color = getColor(score);
                        return (
                            <path
                                key={key}
                                d={path}
                                fill={color}
                                fillOpacity={0.7}
                                stroke={color}
                                strokeWidth="1"
                                strokeOpacity={0.9}
                                filter={`url(#glow-${key}-${view})`}
                                className={status === "fatigued" ? "animate-pulse" : "transition-all duration-300 hover:fill-opacity-90"}
                            />
                        );
                    })}
                </svg>
                
                {/* Side Scan Effects */}
                <div className="absolute inset-y-0 -left-4 w-px bg-gradient-to-b from-transparent via-fn-accent/20 to-transparent" />
                <div className="absolute inset-y-0 -right-4 w-px bg-gradient-to-b from-transparent via-fn-accent/20 to-transparent" />
            </div>
        </div>
    );
}

export function BodyHeatmap({ readiness, className = "" }: BodyHeatmapProps) {
    const muscleRows = useMemo(() => {
        return MUSCLE_CONFIG.map(({ key, label }) => {
            const score = readiness[key] ?? 50;
            const status = getStatus(score);
            const color = getColor(score);
            return { key, label, score, status, color };
        });
    }, [readiness]);

    return (
        <div className={`flex flex-col gap-12 ${className} animate-panel-rise`}>
            {/* Dual body views - No fixed height here, let flex/min-height handle it */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 sm:gap-24 relative py-8">
                <div className="w-full max-w-[280px]">
                    <MusclePanel muscles={MUSCLE_CONFIG} readiness={readiness} view="front" title="Anterior View" />
                </div>
                <div className="w-full max-w-[280px]">
                    <MusclePanel muscles={MUSCLE_CONFIG} readiness={readiness} view="back" title="Posterior View" />
                </div>
                
                {/* Center visual divider */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4/5 w-px bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
            </div>

            {/* Premium Info Grid - Ensures no overlap by being in a separate flow */}
            <div className="relative z-20 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {muscleRows.map(({ key, label, score, status, color }) => (
                        <div
                            key={key}
                            className="group relative flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1"
                        >
                            <div
                                className="h-2 w-2 rounded-full"
                                style={{
                                    backgroundColor: color,
                                    boxShadow: `0 0 15px ${color}`,
                                }}
                            />
                            <div className="text-center">
                                <span className="block text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">{label}</span>
                                <span className="block text-2xl font-black text-white tracking-tighter leading-none">{score}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                <span className="text-[8px] font-black uppercase tracking-widest text-fn-accent">
                                    {status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Gradient Legend */}
            <div className="premium-panel p-4 flex items-center gap-6">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#EF4444] opacity-80">Fatigued</span>
                <div className="relative h-[4px] flex-1">
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: "linear-gradient(to right, #EF4444, #F59E0B, #22d3a0, #0AD9C4)",
                        }}
                    />
                    <div className="absolute inset-0 bg-white/10 blur-[2px] rounded-full" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#0AD9C4] opacity-80">Optimal</span>
            </div>
        </div>
    );
}
