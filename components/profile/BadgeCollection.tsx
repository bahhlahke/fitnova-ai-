"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingState } from "@/components/ui/LoadingState";

interface Badge {
    id: string;
    name: string;
    description: string;
    icon_slug: string;
    earned_at: string;
}

export function BadgeCollection() {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data } = await supabase
                .from("user_badges")
                .select(`
          earned_at,
          badge:badge_definitions (
            badge_id, name, description, icon_url
          )
        `)
                .eq("user_id", user.id);

            if (data) {
                setBadges(data.map((item: any) => ({
                    id: item.badge.badge_id,
                    name: item.badge.name,
                    description: item.badge.description,
                    icon_slug: item.badge.icon_url,
                    earned_at: item.earned_at
                })));
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <LoadingState />;

    if (badges.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-fn-border bg-fn-bg-alt/50 p-8 text-center">
                <p className="text-sm text-fn-muted uppercase tracking-widest font-black">No trophies yet</p>
                <p className="mt-2 text-xs text-fn-muted/70">Log workouts and hit your macro targets to earn badges.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {badges.map((badge) => (
                <div
                    key={badge.id}
                    className="group relative flex flex-col items-center rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center transition-all hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(10,217,196,0.1)]"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fn-accent/10 text-2xl mb-3 shadow-[0_0_15px_rgba(10,217,196,0.2)]">
                        {getIcon(badge.icon_slug)}
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white">{badge.name}</h4>
                    <p className="mt-1 text-[9px] text-fn-muted leading-tight line-clamp-2">{badge.description}</p>

                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-fn-ink-rich px-2 py-1 text-[8px] text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap z-10">
                        Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </div>
                </div>
            ))}
        </div>
    );
}

function getIcon(slug: string) {
    switch (slug) {
        case "sun": return "☀️";
        case "fire": return "🔥";
        case "target": return "🎯";
        case "weight": return "🏋️";
        case "medal": return "🏅";
        default: return "🏆";
    }
}
