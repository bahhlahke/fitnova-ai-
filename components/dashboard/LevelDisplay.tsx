"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LevelDisplay() {
    const [xp, setXp] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("user_profile")
                .select("xp")
                .eq("user_id", user.id)
                .maybeSingle();

            if (data) setXp(data.xp || 0);
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="h-10 w-32 animate-pulse rounded bg-white/5" />;

    // Level Logic: Level = floor(sqrt(xp/100)) + 1
    // e.g. 100 XP = Lvl 2, 400 XP = Lvl 3, 900 XP = Lvl 4
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const currentLevelXp = Math.pow(level - 1, 2) * 100;
    const nextLevelXp = Math.pow(level, 2) * 100;
    const progressInLevel = xp - currentLevelXp;
    const xpNeededForNext = nextLevelXp - currentLevelXp;
    const progressPct = Math.min(100, Math.max(0, (progressInLevel / xpNeededForNext) * 100));

    return (
        <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted">Level</span>
                <span className="font-display text-xl font-black italic text-fn-accent">{level}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <div
                        className="h-full bg-fn-accent shadow-[0_0_10px_rgba(10,217,196,0.5)] transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <span className="text-[9px] font-bold text-fn-muted">{xp} XP</span>
            </div>
        </div>
    );
}
