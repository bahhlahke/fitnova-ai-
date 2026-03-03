"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LeaderboardEntry {
    user_id: string;
    name: string;
    xp: number;
    rank: number;
}

export function GroupLeaderboard({ groupId }: { groupId: string }) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            if (!supabase) return;

            const { data } = await supabase
                .from("group_members")
                .select(`
          user_id,
          profile:user_profile (
            name, xp
          )
        `)
                .eq("group_id", groupId)
                .order("profile(xp)", { ascending: false })
                .limit(10);

            if (data) {
                setEntries(data.map((item: any, index: number) => ({
                    user_id: item.user_id,
                    name: item.profile?.name || "Anonymous",
                    xp: item.profile?.xp || 0,
                    rank: index + 1
                })));
            }
            setLoading(false);
        }
        load();
    }, [groupId]);

    if (loading) return <div className="space-y-2 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl" />)}</div>;

    return (
        <div className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-3">Top Performers</h3>
            {entries.map((entry) => (
                <div key={entry.user_id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 text-sm">
                    <div className="flex items-center gap-3">
                        <span className={`font-black italic ${entry.rank === 1 ? "text-fn-accent" : "text-fn-muted"}`}>#{entry.rank}</span>
                        <span className="font-medium text-white">{entry.name}</span>
                    </div>
                    <span className="font-bold text-fn-accent">{entry.xp} XP</span>
                </div>
            ))}
            {entries.length === 0 && <p className="text-xs text-fn-muted">No members yet.</p>}
        </div>
    );
}
