"use client";

import { useMemo } from "react";
import type { MuscleFatigue } from "@/lib/workout/recovery";
import type { MuscleGroup } from "@/lib/workout/muscle-groups";

interface BodyHeatmapProps {
    fatigue: Partial<MuscleFatigue>;
    className?: string;
}

export function BodyHeatmap({ fatigue, className = "" }: BodyHeatmapProps) {
    const getColor = (muscle: MuscleGroup) => {
        const score = fatigue[muscle] || 0;
        // 0 = Green (80, 200, 120), 100 = Red (255, 69, 58)
        // For simplicity, just use HSL: 120 (Green) to 0 (Red)
        const hue = Math.max(0, 120 - (score * 1.2));
        return `hsl(${hue}, 70%, 50%)`;
    };

    // Simplified SVG paths for a human body
    // In a real app, these would be precise muscle outlines.
    // For this demo, we'll use labeled circles/boxes for clarity.
    return (
        <div className={`relative aspect-[3/4] w-full max-w-[280px] mx-auto ${className}`}>
            <svg viewBox="0 0 200 300" className="h-full w-full drop-shadow-fn-soft">
                {/* Head */}
                <circle cx="100" cy="30" r="20" fill="#f5f5f5" stroke="#ddd" />

                {/* Torso */}
                <rect x="70" y="60" width="60" height="90" rx="10" fill="#f5f5f5" stroke="#ddd" />

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
                <rect x="75" y="160" width="20" height="80" rx="10" fill={getColor("Quads")} stroke="#fff" strokeWidth="1" />
                <rect x="105" y="160" width="20" height="80" rx="10" fill={getColor("Quads")} stroke="#fff" strokeWidth="1" />

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
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 py-2 bg-white/40 backdrop-blur-sm rounded-xl">
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-[hsl(120,70%,50%)]" />
                    <span className="text-[10px] text-fn-muted">Recovered</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-[hsl(0,70%,50%)]" />
                    <span className="text-[10px] text-fn-muted">Fatigued</span>
                </div>
            </div>
        </div>
    );
}
