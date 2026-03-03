"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, Button, LoadingState } from "@/components/ui";

export function CommunityChallenges() {
    const [challenges, setChallenges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const res = await fetch("/api/v1/community/challenges");
        if (res.ok) setChallenges(await res.json());
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const handleJoin = async (challengeId: string) => {
        const res = await fetch("/api/v1/community/challenges", {
            method: "POST",
            body: JSON.stringify({ challengeId })
        });
        if (res.ok) load();
    };

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            {challenges.map((c) => (
                <Card key={c.challenge_id} padding="lg">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-white">{c.title}</h3>
                            <p className="text-xs text-fn-muted mt-1">{c.description}</p>
                        </div>
                        <Button size="sm" onClick={() => handleJoin(c.challenge_id)}>Join Challenge</Button>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-3">Leaderboard ({c.metric})</h4>
                        {c.participants?.sort((a: any, b: any) => b.current_value - a.current_value).slice(0, 5).map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-2 text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-black italic text-fn-muted">#{idx + 1}</span>
                                    <span className="font-medium text-white">{p.user?.name}</span>
                                </div>
                                <span className="font-bold text-fn-accent">{p.current_value}</span>
                            </div>
                        ))}
                        {(!c.participants || c.participants.length === 0) && (
                            <p className="text-xs text-fn-muted py-4 text-center border border-dashed border-white/5 rounded-xl">No participants yet. Be the first!</p>
                        )}
                    </div>
                </Card>
            ))}
        </div>
    );
}
