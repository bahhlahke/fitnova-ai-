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
        path: "M30,58 C30,52 38,48 50,48 C62,48 70,52 70,58 L68,82 C68,86 62,88 50,88 C38,88 32,86 30,82 Z",
    },
    {
        key: "Core",
        label: "Core",
        side: "front",
        path: "M36,92 L64,92 L62,130 C62,134 56,136 50,136 C44,136 38,134 38,130 Z",
    },
    {
        key: "Shoulders",
        label: "Shoulders",
        side: "front",
        path: "M20,50 C14,50 10,56 10,64 C10,72 16,78 22,78 L28,60 Z M72,50 L80,60 L78,78 C84,78 90,72 90,64 C90,56 86,50 80,50 Z",
    },
    {
        key: "Biceps",
        label: "Biceps",
        side: "front",
        path: "M10,82 C8,82 6,84 6,90 L8,110 C10,116 16,118 20,114 L22,96 C22,88 16,82 10,82 Z M78,82 C84,82 90,88 90,96 L88,114 C92,118 90,116 82,110 L80,90 C80,84 84,82 90,82 Z",
    },
    {
        key: "Quads",
        label: "Quads",
        side: "front",
        path: "M34,140 L48,140 L50,200 L38,200 C34,196 32,190 34,184 Z M52,140 L66,140 L66,184 C68,190 66,196 62,200 L50,200 Z",
    },
    {
        key: "Back",
        label: "Back",
        side: "back",
        path: "M28,54 C28,48 38,44 50,44 C62,44 72,48 72,54 L70,88 C66,94 58,96 50,96 C42,96 34,94 30,88 Z",
    },
    {
        key: "Glutes",
        label: "Glutes",
        side: "back",
        path: "M30,130 C28,124 32,118 50,118 C68,118 72,124 70,130 L66,148 C62,154 56,156 50,156 C44,156 38,154 34,148 Z",
    },
    {
        key: "Hamstrings",
        label: "Hams",
        side: "back",
        path: "M34,158 L48,158 L48,202 C44,208 38,208 34,202 Z M52,158 L66,158 L66,202 C62,208 56,208 52,202 Z",
    },
    {
        key: "Triceps",
        label: "Triceps",
        side: "back",
        path: "M14,78 C12,78 8,82 8,90 L10,112 C12,118 18,120 22,116 L24,96 C24,86 18,78 14,78 Z M86,78 C82,78 76,86 76,96 L78,116 C82,120 88,118 90,112 L92,90 C92,82 88,78 86,78 Z",
    },
    {
        key: "Calves",
        label: "Calves",
        side: "back",
        path: "M36,206 L46,206 L46,230 C44,236 40,238 36,232 Z M54,206 L64,206 L64,232 C60,238 56,236 54,230 Z",
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
        <div className="flex flex-col items-center gap-2 relative">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 mb-1">{title}</p>
            <div className="relative group">
                {/* Holographic scanning effect */}
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-full h-1 bg-fn-accent/30 shadow-[0_0_15px_rgba(10,217,196,0.8)] animate-scanning absolute top-0" />
                </div>
                
                <svg
                    viewBox="0 0 100 250"
                    className="w-full h-full drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-[1.02]"
                >
                    <defs>
                        {panelMuscles.map(({ key }) => {
                            const score = readiness[key] ?? 50;
                            const color = getColor(score);
                            const opacity = getGlowOpacity(score);
                            return (
                                <filter key={`glow-${key}-${view}`} id={`glow-${key}-${view}`} x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
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
                    </defs>

                    {/* Body silhouette base */}
                    <g fill="#0a0a0c" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8">
                        {/* Head */}
                        <ellipse cx="50" cy="18" rx="14" ry="16" className="fill-white/[0.02]" />
                        {/* Neck */}
                        <rect x="44" y="32" width="12" height="10" rx="3" className="fill-white/[0.02]" />
                        {/* Torso */}
                        <path d="M22,42 C20,42 14,48 12,56 L10,74 C10,80 14,86 20,88 L20,136 C20,142 24,146 30,146 L70,146 C76,146 80,142 80,136 L80,88 C86,86 90,80 90,74 L88,56 C86,48 80,42 78,42 Z" className="fill-white/[0.02]" />
                        {/* Upper arms */}
                        <path d="M10,88 L6,90 L4,116 C4,124 8,130 14,130 L20,130 L20,88 Z M80,88 L80,130 L86,130 C92,130 96,124 96,116 L94,90 L90,88 Z" className="fill-white/[0.02]" />
                        {/* Forearms */}
                        <path d="M6,118 L4,140 C4,148 8,154 14,154 L18,154 L20,130 Z M80,130 L82,154 L86,154 C92,154 96,148 96,140 L94,118 Z" className="fill-white/[0.02]" />
                        {/* Hips */}
                        <path d="M30,146 L36,152 L36,160 L64,160 L64,152 L70,146 Z" className="fill-white/[0.02]" />
                        {/* Upper legs */}
                        <path d="M34,160 L32,212 C32,216 36,220 40,220 L52,220 L52,160 Z M52,160 L52,220 L60,220 C64,220 68,216 68,212 L66,160 Z" className="fill-white/[0.02]" />
                        {/* Lower legs */}
                        <path d="M36,220 L34,244 C34,250 40,254 46,252 L52,250 L52,220 Z M52,220 L52,250 L54,252 C60,254 66,250 66,244 L64,220 Z" className="fill-white/[0.02]" />
                    </g>

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
                                fillOpacity={0.85}
                                stroke={color}
                                strokeWidth="0.5"
                                strokeOpacity={1}
                                filter={`url(#glow-${key}-${view})`}
                                className={status === "fatigued" ? "animate-pulse-soft" : ""}
                            />
                        );
                    })}
                </svg>
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
        <div className={`flex flex-col gap-8 ${className} animate-panel-rise`}>
            {/* Dual body views */}
            <div className="grid grid-cols-2 gap-8 h-[320px]">
                <MusclePanel muscles={MUSCLE_CONFIG} readiness={readiness} view="front" title="Anterior" />
                <MusclePanel muscles={MUSCLE_CONFIG} readiness={readiness} view="back" title="Posterior" />
            </div>

            {/* Per-muscle score grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {muscleRows.map(({ key, label, score, status, color }) => (
                    <div
                        key={key}
                        className="group relative flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-4 transition-all hover:bg-white/[0.05] hover:border-white/10"
                    >
                        <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                                backgroundColor: color,
                                boxShadow: `0 0 10px ${color}`,
                            }}
                        />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 text-center">{label}</span>
                        <span className="text-sm font-black text-white tracking-tighter">{score}</span>
                        
                        {/* Hover hint */}
                        <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded bg-white text-black leading-none">
                                {STATUS_LABEL[status]}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Gradient Legend */}
            <div className="flex items-center gap-4 px-2">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#EF4444]">Fatigued</span>
                <div
                    className="h-[2px] flex-1 rounded-full relative"
                    style={{
                        background: "linear-gradient(to right, #EF4444, #F59E0B, #22d3a0, #0AD9C4)",
                    }}
                >
                    <div className="absolute inset-0 bg-white/20 blur-[1px] rounded-full" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#0AD9C4]">Optimal</span>
            </div>
        </div>
    );
}
