"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, LoadingState, EmptyState } from "@/components/ui";

interface Trophy {
    id: string;
    name: string;
    description: string;
    ai_rationale: string;
    date_earned: string;
    icon_slug: string;
    rarity: "common" | "rare" | "epic" | "legendary";
}

// Temporary hardcoded achievements for visual demo of the Elite Gamification Protocol
const MOCK_TROPHIES: Trophy[] = [
    {
        id: "t1",
        name: "Titanium CNS",
        description: "Logged 10 consecutive workouts without missing a session.",
        ai_rationale: "Neural analysis detects high neuromuscular efficiency. Your recovery-to-strain ratio remained above 85% despite increasing volume, indicating superior central nervous system resilience.",
        date_earned: new Date().toISOString(),
        icon_slug: "zap",
        rarity: "epic",
    },
    {
        id: "t2",
        name: "Volume Legend",
        description: "Moved over 10,000 lbs of total volume in a single session.",
        ai_rationale: "Synthesis of session 03-05 shows a 12% increase in tonnage. Historic PR data suggests this is your highest mechanical tension threshold achieved to date.",
        date_earned: new Date(Date.now() - 86400000 * 2).toISOString(),
        icon_slug: "weight",
        rarity: "legendary",
    },
    {
        id: "t3",
        name: "First Blood",
        description: "Completed your first Koda AI protocol.",
        ai_rationale: "Initial baseline established. Biometric sync confirms physiological response to the prescribed movement patterns matches predicted metabolic expenditure.",
        date_earned: new Date(Date.now() - 86400000 * 14).toISOString(),
        icon_slug: "fire",
        rarity: "common",
    }
];

export function TrophyRoom() {
    const [trophies, setTrophies] = useState<Trophy[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrophies = async () => {
            try {
                const res = await fetch("/api/v1/user/trophies");
                const data = await res.json();
                if (data.trophies) {
                    setTrophies(data.trophies.map((t: any) => ({
                        id: t.id,
                        name: t.name,
                        description: t.description,
                        ai_rationale: t.ai_rationale,
                        date_earned: t.earned_at,
                        icon_slug: t.icon_slug,
                        rarity: t.rarity
                    })));
                }
            } catch (e) {
                console.error("Failed to fetch trophies:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchTrophies();
    }, []);

    if (loading) return <LoadingState />;

    return (
        <Card padding="lg" className="border-fn-accent/20 bg-black/60 backdrop-blur-md shadow-2xl relative overflow-hidden">
            {/* Background ambient light */}
            <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fn-accent/10 via-transparent to-transparent opacity-50 pointer-events-none" />

            <CardHeader
                title="Elite Protocols"
                subtitle="Your unlocked classified achievements and prestige ranks"
            />

            {trophies.length > 0 ? (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    {trophies.map((trophy) => (
                        <TrophyCard key={trophy.id} trophy={trophy} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    className="mt-8 relative z-10"
                    message="No protocols unlocked yet. Keep grinding to earn elite status."
                />
            )}
        </Card>
    );
}

function TrophyCard({ trophy }: { trophy: Trophy }) {
    const getColors = (rarity: string) => {
        switch (rarity) {
            case "legendary": return "from-amber-400 via-yellow-500 to-amber-600 shadow-[0_0_30px_rgba(251,191,36,0.5)] border-amber-500/50 text-amber-500";
            case "epic": return "from-purple-400 via-fuchsia-500 to-purple-600 shadow-[0_0_30px_rgba(192,38,211,0.5)] border-fuchsia-500/50 text-fuchsia-400";
            case "rare": return "from-blue-400 via-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.5)] border-cyan-500/50 text-cyan-400";
            default: return "from-gray-300 via-gray-400 to-gray-500 shadow-[0_0_20px_rgba(156,163,175,0.3)] border-gray-400/30 text-gray-300";
        }
    };

    const getIcon = (slug: string) => {
        switch (slug) {
            case "zap": return <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
            case "weight": return <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;
            case "fire": return <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 7.121 9.879m.062 1.942A4 4 0 1014 14.121m-6.817 2.476A8 8 0 1117.657 7.343a8 8 0 011.414 7.07" /></svg>;
            default: return <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3v18H3V3h2zm14 0v18h-2V3h2zm-7 18V3h2v18h-2z" /></svg>;
        }
    };

    const colors = getColors(trophy.rarity);

    return (
        <div className="group relative rounded-[2rem] border border-white/5 bg-black/40 p-6 flex flex-col items-center text-center transition-all duration-500 hover:scale-[1.05] hover:bg-black/60 hover:border-white/20">

            {/* Hexagon/Badge Shape */}
            <div className={`relative flex items-center justify-center w-24 h-24 mb-6 rounded-3xl border bg-gradient-to-br transition-all duration-700 ${colors} group-hover:rotate-6`}>
                {/* Inner dark cutout */}
                <div className="absolute inset-1 bg-black/80 rounded-[1.3rem] flex items-center justify-center">
                    <div className={`drop-shadow-[0_0_15px_currentColor]`}>
                        {getIcon(trophy.icon_slug)}
                    </div>
                </div>
            </div>

            <h4 className="text-xl font-black italic uppercase text-white tracking-widest leading-none mb-3">
                {trophy.name}
            </h4>
            <p className="text-[10px] font-bold uppercase tracking-widest text-fn-muted mb-4 px-2">
                {trophy.description}
            </p>

            <div className="w-full mt-2 mb-6 rounded-xl bg-fn-accent/5 border border-fn-accent/10 p-3 text-left">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-fn-accent animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-fn-accent">Neural Rationale</span>
                </div>
                <p className="text-[10px] font-medium text-white/70 italic leading-relaxed">
                    &quot;{trophy.ai_rationale}&quot;
                </p>
            </div>

            <div className="mt-auto flex flex-col items-center gap-1 w-full border-t border-white/10 pt-4">
                <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${colors.split(' ').pop()}`}>
                    {trophy.rarity}
                </span>
                <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">
                    {new Date(trophy.date_earned).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
}
