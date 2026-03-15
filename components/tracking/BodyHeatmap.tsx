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

// High-fidelity anatomical paths for a pro-level aesthetic
const MUSCLE_CONFIG: Array<{
    key: MuscleGroup;
    label: string;
    side: "front" | "back";
    path: string;
}> = [
    {
        key: "Chest",
        label: "Pectorals",
        side: "front",
        path: "M50,55 C45,55 35,58 30,65 C28,70 30,85 50,85 C70,85 72,70 70,65 C65,58 55,55 50,55 Z M50,55 C52,55 58,56 62,59 C65,62 66,70 65,75 M50,55 C48,55 42,56 38,59 C35,62 34,70 35,75",
    },
    {
        key: "Core",
        label: "Abdominals",
        side: "front",
        path: "M38,90 L62,90 L60,110 L40,110 Z M40,115 L60,115 L58,135 C55,142 45,142 42,135 Z",
    },
    {
        key: "Shoulders",
        label: "Deltoids",
        side: "front",
        path: "M25,50 C20,50 15,55 12,65 C10,75 15,82 22,80 L28,60 Z M75,50 C80,50 85,55 88,65 C90,75 85,82 78,80 L72,60 Z",
    },
    {
        key: "Biceps",
        label: "Biceps",
        side: "front",
        path: "M10,85 C8,85 5,90 5,100 L7,120 C9,128 15,128 20,122 L22,100 C22,90 15,85 10,85 Z M90,85 C92,85 95,90 95,100 L93,120 C91,128 85,128 80,122 L78,100 C78,90 85,85 90,85 Z",
    },
    {
        key: "Quads",
        label: "Quadriceps",
        side: "front",
        path: "M28,150 L48,150 L48,220 L38,220 C32,220 28,210 28,190 Z M52,150 L72,150 L72,190 C72,210 68,220 62,220 L52,220 Z",
    },
    {
        key: "Back",
        label: "Latissimus",
        side: "back",
        path: "M50,40 C40,40 25,45 22,60 L20,90 C25,105 40,110 50,110 C60,110 75,105 78,90 L80,60 C75,45 60,40 50,40 Z M50,45 L50,105",
    },
    {
        key: "Glutes",
        label: "Gluteals",
        side: "back",
        path: "M28,125 C28,115 40,110 50,110 C60,110 72,115 72,125 L70,165 C65,175 55,180 50,180 C45,180 35,175 30,165 Z",
    },
    {
        key: "Hamstrings",
        label: "Hamstrings",
        side: "back",
        path: "M28,185 L48,185 L48,235 C45,245 32,245 28,235 Z M52,185 L72,185 L72,235 C68,245 55,245 52,235 Z",
    },
    {
        key: "Triceps",
        label: "Triceps",
        side: "back",
        path: "M15,65 C12,65 8,70 8,80 L10,120 C12,128 18,128 22,122 L24,90 C24,80 20,65 15,65 Z M85,65 C88,65 92,70 92,80 L90,120 C88,128 82,128 78,122 L76,90 C76,80 80,65 85,65 Z",
    },
    {
        key: "Calves",
        label: "Gastroc",
        side: "back",
        path: "M32,240 L46,240 L46,275 C42,285 34,285 32,275 Z M54,240 L68,240 L68,275 C64,285 56,285 54,275 Z",
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
        <div className="flex flex-col items-center gap-6 relative w-full h-full min-h-[450px]">
            <p className="text-[11px] font-black uppercase italic tracking-[0.6em] text-white/30 mb-2">{title}</p>
            <div className="relative w-full h-full max-w-[220px] group flex justify-center">
                {/* Holographic context grid - Purely visual premium layer */}
                <div className="absolute inset-0 z-0 opacity-[0.03]">
                    <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                </div>

                <svg
                    viewBox="0 0 100 300"
                    className="relative z-10 w-full h-full drop-shadow-[0_0_50px_rgba(0,0,0,0.9)] transition-all duration-1000 ease-out group-hover:scale-[1.08] group-hover:-translate-y-2"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        {panelMuscles.map(({ key }) => {
                            const score = readiness[key] ?? 50;
                            const color = getColor(score);
                            const opacity = getGlowOpacity(score);
                            return (
                                <filter key={`glow-${key}-${view}`} id={`glow-${key}-${view}`} x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="8" result="blur" />
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
                        
                        <linearGradient id="premiumBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                            <stop offset="50%" stopColor="rgba(255,255,255,0.03)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
                        </linearGradient>

                        <filter id="innerDepth">
                            <feOffset dx="0" dy="2" />
                            <feGaussianBlur stdDeviation="1.5" result="offsetBlur" />
                            <feComposite operator="out" in="SourceGraphic" in2="offsetBlur" result="inverse" />
                            <feFlood floodColor="black" floodOpacity="0.4" result="color" />
                            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                        </filter>
                    </defs>

                    {/* Highly stylized skeletal/body base */}
                    <g fill="url(#premiumBodyGradient)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" filter="url(#innerDepth)">
                        {/* Head */}
                        <path d="M50,5 C42,5 38,10 38,20 C38,30 42,35 50,35 C58,35 62,30 62,20 C62,10 58,5 50,5 Z" className="opacity-15" />
                        
                        {/* Core Chassis */}
                        <path d="M22,45 C12,45 8,50 8,65 L6,140 C6,155 12,160 25,160 L75,160 C88,160 94,155 94,140 L92,65 C92,50 88,45 78,45 Z" className="opacity-[0.08]" />
                        
                        {/* Structural Limbs */}
                        <path d="M18,160 L14,285 C14,295 48,295 48,285 L48,160 Z M52,160 L52,285 C52,295 86,295 82,285 L78,160 Z" className="opacity-[0.08]" />
                    </g>

                    {/* Dynamic Scanning Interface */}
                    <g className="animate-scanning opacity-0 group-hover:opacity-60 transition-opacity">
                        <line x1="0" y1="0" x2="100" y2="0" stroke="#0AD9C4" strokeWidth="0.5" strokeDasharray="2,2" />
                        <circle cx="50" cy="0" r="1.5" fill="#0AD9C4" />
                    </g>

                    {/* Enhanced Muscle overlays */}
                    {panelMuscles.map(({ key, path }) => {
                        const score = readiness[key] ?? 50;
                        const status = getStatus(score);
                        const color = getColor(score);
                        return (
                            <path
                                key={key}
                                d={path}
                                fill={color}
                                fillOpacity={0.75}
                                stroke={color}
                                strokeWidth="0.8"
                                strokeOpacity={0.9}
                                filter={`url(#glow-${key}-${view})`}
                                className={status === "fatigued" ? "animate-pulse" : "transition-all duration-500 hover:fill-opacity-100"}
                            />
                        );
                    })}
                </svg>
                
                {/* Visual Anchors (Corner Elements) */}
                <div className="absolute top-10 left-0 w-2 h-2 border-l border-t border-white/20" />
                <div className="absolute top-10 right-0 w-2 h-2 border-r border-t border-white/20" />
                <div className="absolute bottom-10 left-0 w-2 h-2 border-l border-b border-white/20" />
                <div className="absolute bottom-10 right-0 w-2 h-2 border-r border-b border-white/20" />
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
        <div className={`flex flex-col gap-16 ${className} animate-panel-rise`}>
            {/* High-Impact Visual Section */}
            <div className="flex flex-col lg:flex-row items-stretch justify-center gap-16 xl:gap-32 relative py-12 px-6 bg-white/[0.01] rounded-[40px] border border-white/[0.03]">
                <div className="flex-1 flex justify-center">
                    <MusclePanel muscles={MUSCLE_CONFIG} readiness={readiness} view="front" title="Anterior Architecture" />
                </div>

                {/* Cybernetic Separator */}
                <div className="hidden lg:flex flex-col items-center justify-center gap-6 opacity-20">
                    <div className="h-24 w-px bg-gradient-to-t from-white/10 to-transparent" />
                    <div className="p-2 border border-white/20 rounded-full">
                        <div className="h-1 w-1 bg-white rounded-full" />
                    </div>
                    <div className="h-24 w-px bg-gradient-to-b from-white/10 to-transparent" />
                </div>

                <div className="flex-1 flex justify-center">
                    <MusclePanel muscles={MUSCLE_CONFIG} readiness={readiness} view="back" title="Posterior Structure" />
                </div>
            </div>

            {/* Metrics HUD - Ensures isolation from anatomical view to prevent overlap */}
            <div className="relative z-30">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
                    {muscleRows.map(({ key, label, score, status, color }) => (
                        <div
                            key={key}
                            className="group relative flex flex-col items-stretch gap-4 rounded-3xl border border-white/5 bg-black/40 p-6 backdrop-blur-2xl transition-all duration-500 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                        backgroundColor: color,
                                        boxShadow: `0 0 20px ${color}`,
                                    }}
                                />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 truncate">{label}</span>
                            </div>
                            
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-black text-white tracking-tighter leading-none">{score}</span>
                                <span className={`text-[9px] font-black uppercase italic tracking-widest ${status === 'fatigued' ? 'text-fn-danger' : 'text-fn-accent'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    {status}
                                </span>
                            </div>

                            {/* Inner progress pill */}
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ 
                                        width: `${score}%`,
                                        backgroundColor: color,
                                        boxShadow: `0 0 10px ${color}`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Premium Legend Interface */}
            <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-[#EF4444]/80">Critical Fatigue</span>
                </div>
                
                <div className="relative h-[2px] flex-1 w-full min-w-[120px]">
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: "linear-gradient(to right, #EF4444, #F59E0B, #22d3a0, #0AD9C4)",
                        }}
                    />
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-white/20 blur-[3px] rounded-full translate-y-[1px]" />
                </div>
                
                <div className="flex items-center gap-4">
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-[#0AD9C4]/80">Optimal State</span>
                    <div className="h-2 w-2 rounded-full bg-[#0AD9C4] shadow-[0_0_10px_#0AD9C4]" />
                </div>
            </div>
        </div>
    );
}
