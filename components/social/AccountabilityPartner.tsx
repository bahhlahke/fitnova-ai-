"use client";

import { useEffect, useState } from "react";
import { LoadingState, Button } from "@/components/ui";

export function AccountabilityPartner() {
    const [partner, setPartner] = useState<{ user_id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPartner = async () => {
        const res = await fetch("/api/v1/social/accountability");
        if (res.ok) {
            const data = await res.json();
            setPartner(data.partner);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPartner();
    }, []);

    const handleClear = async () => {
        await fetch("/api/v1/social/accountability", {
            method: "POST",
            body: JSON.stringify({ partnerId: null })
        });
        setPartner(null);
    };

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-4">
            {partner ? (
                <div className="flex items-center justify-between rounded-2xl border border-fn-accent/20 bg-fn-accent/5 p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-fn-accent/20 text-fn-accent font-black text-sm">
                            {partner.name[0]}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{partner.name}</p>
                            <p className="text-[10px] text-fn-muted uppercase tracking-widest">Active Partner</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-fn-danger hover:bg-fn-danger/10" onClick={handleClear}>Remove</Button>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-white/5 bg-white/[0.02] p-8 text-center">
                    <p className="text-xs text-fn-muted">No partner designated. Select a friend to keep you accountable.</p>
                    <p className="mt-2 text-[10px] text-fn-muted/50">Partners are notified if you miss your activity goals for more than 2 days.</p>
                </div>
            )}
        </div>
    );
}
