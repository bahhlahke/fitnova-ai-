"use client";

import { useEffect, useState } from "react";
import { LoadingState, Button } from "@/components/ui";

export function FriendsList() {
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFriends = async () => {
        const res = await fetch("/api/v1/social/friends");
        if (res.ok) {
            const data = await res.json();
            setConnections(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchFriends();
    }, []);

    const handleAction = async (friendId: string, action: string) => {
        const res = await fetch("/api/v1/social/friends", {
            method: "POST",
            body: JSON.stringify({ friendId, action })
        });
        if (res.ok) fetchFriends();
    };

    if (loading) return <LoadingState />;

    const pending = connections.filter(c => c.status === "pending" && c.friend?.user_id !== undefined); // Simplified logic
    const friends = connections.filter(c => c.status === "accepted");

    return (
        <div className="space-y-6">
            {/* Pending Requests */}
            {pending.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-fn-accent">Pending Requests</h3>
                    {pending.map((conn) => (
                        <div key={conn.connection_id} className="flex items-center justify-between rounded-xl bg-fn-accent/5 border border-fn-accent/20 p-3">
                            <div>
                                <p className="text-sm font-bold text-white">{conn.user?.name || conn.friend?.name}</p>
                                <p className="text-[10px] text-fn-muted">Wants to follow your progress</p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => handleAction(conn.user?.user_id || conn.friend?.user_id, "accept")}>Accept</Button>
                                <Button size="sm" variant="ghost" onClick={() => handleAction(conn.user?.user_id || conn.friend?.user_id, "decline")}>Decline</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Friends List */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">Friends</h3>
                {friends.length > 0 ? (
                    friends.map((conn) => {
                        const friend = conn.user?.user_id === undefined ? conn.friend : conn.user;
                        return (
                            <div key={conn.connection_id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-fn-accent/20 flex items-center justify-center text-[10px] font-black text-fn-accent">
                                        {friend?.name?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{friend?.name}</p>
                                        <p className="text-[10px] text-fn-muted uppercase tracking-widest">{friend?.xp} XP</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="text-[10px] font-black uppercase tracking-tighter"
                                        onClick={async () => {
                                            await fetch("/api/v1/social/accountability", {
                                                method: "POST",
                                                body: JSON.stringify({ partnerId: friend?.user_id })
                                            });
                                            window.location.reload(); // Simple refresh to update partner card
                                        }}
                                    >
                                        Set Partner
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-fn-danger hover:bg-fn-danger-light" onClick={() => handleAction(friend?.user_id, "remove")}>Remove</Button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-xs text-fn-muted text-center py-8 bg-white/[0.02] rounded-2xl border border-dashed border-white/5">No friends added yet.</p>
                )}
            </div>
        </div>
    );
}
