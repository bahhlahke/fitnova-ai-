"use client";

import { useMemo } from "react";
import type { MuscleReadiness } from "@/lib/workout/recovery";
import type { MuscleGroup } from "@/lib/workout/muscle-groups";

interface BodyHeatmapProps {
    readiness: Partial<MuscleReadiness>;
    className?: string;
}

export function BodyHeatmap({ readiness, className = "" }: BodyHeatmapProps) {
    const getColor = (muscle: MuscleGroup) => {
        const score = readiness[muscle] ?? 50; // Default to neutral 50
        // 100 = Green (Recovered), 0 = Red (Fatigued)
        // HSL: 0 (Red) to 120 (Green)
        const hue = Math.max(0, Math.min(120, score * 1.2));
        return `hsl(${hue}, 70%, 50%)`;
    };

    // Simplified SVG paths for a human body
    // In a real app, these would be precise muscle outlines.
    // For this demo, we'll use labeled circles/boxes for clarity.
    return (
        <div className={`relative aspect-[3/4] w-full max-w-[220px] mx-auto ${className}`}>
            <svg viewBox="0 0 200 300" className="h-full w-full drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                {/* Body Blueprint Base - Darker for pro look */}
                <circle cx="100" cy="30" r="20" fill="#0A0A0B" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <rect x="70" y="60" width="60" height="90" rx="10" fill="#0A0A0B" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />


                {/* Chest */}
                <rect x="75" y="70" width="25" height="30" rx="4" fill={getColor("Chest")} stroke="#fff" strokeWidth="1" />
                <rect x="100" y="70" width="25" height="30" rx="4" fill={getColor("Chest")} stroke="#fff" strokeWidth="1" />

                {/* Abs (Core) */}
                <rect x="80" y="105" width="40" height="40" rx="4" fill={getColor("Core")} stroke="#fff" strokeWidth="1" />

                {/* Shoulders */}
                <circle cx="65" cy="75" r="12" fill={getColor("Shoulders")} stroke="#fff" strokeWidth="1" />
                <circle cx="135" cy="75" r="12" fill={getColor("Shoulders")} stroke="#fff" strokeWidth="1" />

                {/* Arms */}
                <rect x="45" y="85" width="15" height="50" rx="7" fill={getColor("Biceps")} stroke="#fff" strokeWidth="1" />
                <rect x="140" y="85" width="15" height="50" rx="7" fill={getColor("Biceps")} stroke="#fff" strokeWidth="1" />

                {/* Legs */}
                <rect x="75" y="160" width="20" height="80" rx="10" fill={getColor("Quads")} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <rect x="105" y="160" width="20" height="80" rx="10" fill={getColor("Quads")} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

                {/* Calves */}
                <rect x="80" y="250" width="15" height="40" rx="7" fill={getColor("Calves")} stroke="#fff" strokeWidth="1" />
                <rect x="105" y="250" width="15" height="40" rx="7" fill={getColor("Calves")} stroke="#fff" strokeWidth="1" />

                {/* Labels for small parts (Back, Hamstrings, Glutes, Triceps) - these are usually on the rear view */}
                <text x="170" y="100" fontSize="8" fill="#888" textAnchor="middle">Triceps</text>
                <circle cx="170" cy="85" r="6" fill={getColor("Triceps")} />

                <text x="170" y="140" fontSize="8" fill="#888" textAnchor="middle">Back</text>
                <circle cx="170" cy="125" r="6" fill={getColor("Back")} />

                <text x="170" y="180" fontSize="8" fill="#888" textAnchor="middle">Glutes</text>
                <circle cx="170" cy="165" r="6" fill={getColor("Glutes")} />

                <text x="170" y="220" fontSize="8" fill="#888" textAnchor="middle">Hams</text>
                <circle cx="170" cy="205" r="6" fill={getColor("Hamstrings")} />
            </svg>
            {/* Legend */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 py-2.5 bg-black/40 border border-white/5 backdrop-blur-md rounded-2xl shadow-2xl">
                <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[hsl(120,70%,50%)] shadow-[0_0_8px_hsl(120,70%,50%)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-fn-muted">Recovered</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[hsl(0,70%,50%)] shadow-[0_0_8px_hsl(0,70%,50%)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-fn-muted">Fatigued</span>
                </div>
            </div>
        </div>
    );
}
