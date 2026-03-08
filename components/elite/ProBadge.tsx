"use client";

import React from "react";

export type BadgeType = "shadow" | "iron_core" | "infinite" | "architect";

interface ProBadgeProps {
    type: BadgeType;
    label?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const BADGE_CONFIG: Record<BadgeType, { colors: string[]; iconPath: React.ReactNode; description: string }> = {
    shadow: {
        colors: ["#0a0a0a", "#0ad9c4"],
        description: "Stealth & Metabolic Mastery",
        iconPath: (
            <path
                d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L19.1 8 12 11.82 4.9 8 12 4.18zM4.9 15.82V9.82L11 13.2v6.18l-6.1-3.56zm14.2 0l-6.1 3.56v-6.18l6.1-3.38v6z"
                fill="currentColor"
            />
        ),
    },
    iron_core: {
        colors: ["#1a1a1a", "#ff6b00"],
        description: "Strength & Stability Mastery",
        iconPath: (
            <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
                fill="currentColor"
            />
        ),
    },
    infinite: {
        colors: ["#0f0f0f", "#a855f7"],
        description: "Endurance & HIIT Mastery",
        iconPath: (
            <path
                d="M18.8 8.4C18.1 7.2 16.9 6.5 15.5 6.5s-2.6.7-3.5 2c-.9-1.3-2.1-2-3.5-2s-2.6.7-3.5 2c-1.2 1.5-1.5 3.5-.9 5s2.1 3 3.5 3c1.4 0 2.6-.7 3.5-2 .9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2c1.2-1.5 1.5-3.5.9-5-1.1-1.3-1.6-2.1-1.6-2.1zM8.5 13.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm7 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"
                fill="currentColor"
            />
        ),
    },
    architect: {
        colors: ["#0a0a0a", "#eab308"],
        description: "Precision & Form Mastery",
        iconPath: (
            <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                fill="currentColor"
            />
        ),
    },
};

export function ProBadge({ type, label, size = "md", className = "" }: ProBadgeProps) {
    const config = BADGE_CONFIG[type];
    const sizeClasses = {
        sm: "h-12 w-12",
        md: "h-20 w-20",
        lg: "h-32 w-32",
    };

    return (
        <div className={`flex flex-col items-center gap-3 ${className}`}>
            <div
                className={`relative ${sizeClasses[size]} group cursor-pointer`}
                title={config.description}
            >
                {/* Glow Layer */}
                <div
                    className="absolute inset-0 rounded-full opacity-30 blur-[20px] transition-all duration-700 group-hover:opacity-60"
                    style={{ backgroundColor: config.colors[1] }}
                />

                {/* Border Layer */}
                <div className="absolute inset-x-[-2px] inset-y-[-2px] rounded-full bg-gradient-to-br from-white/20 via-white/5 to-white/20 p-[1px]">
                    <div className="h-full w-full rounded-full bg-fn-bg" />
                </div>

                {/* Base Layer */}
                <div
                    className="relative flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-gradient-to-br transition-transform duration-500 group-hover:scale-105"
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${config.colors[0]}, #000)`,
                        boxShadow: `inset 0 0 20px ${config.colors[1]}20`,
                    }}
                >
                    {/* Accent Ring */}
                    <div
                        className="absolute inset-1 rounded-full border-[0.5px] opacity-20"
                        style={{ borderColor: config.colors[1] }}
                    />

                    <div
                        className="h-[50%] w-[50%] transition-colors duration-500"
                        style={{ color: config.colors[1] }}
                    >
                        <svg viewBox="0 0 24 24" className="h-full w-full filter drop-shadow-[0_0_8px_currentColor]">
                            {config.iconPath}
                        </svg>
                    </div>
                </div>
            </div>

            {label && (
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white antialiased">
                        {label}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-fn-muted transition-colors group-hover:text-fn-accent">
                        {config.description}
                    </span>
                </div>
            )}
        </div>
    );
}
