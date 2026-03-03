"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input, Button, LoadingState } from "@/components/ui";

export function UserSearch({ onAdd }: { onAdd: () => void }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        const supabase = createClient();
        if (!supabase) return;

        const { data } = await supabase
            .from("user_profile")
            .select("user_id, name, xp")
            .ilike("name", `%${query}%`)
            .limit(5);

        setResults(data || []);
        setLoading(false);
    };

    const handleAdd = async (friendId: string) => {
        const res = await fetch("/api/v1/social/friends", {
            method: "POST",
            body: JSON.stringify({ friendId, action: "request" })
        });
        if (res.ok) {
            onAdd();
            setResults(prev => prev.filter(r => r.user_id !== friendId));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="Search by name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} loading={loading}>Search</Button>
            </div>

            <div className="space-y-2">
                {results.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                        <div>
                            <p className="text-sm font-bold text-white">{user.name}</p>
                            <p className="text-[10px] text-fn-muted uppercase tracking-widest">{user.xp} XP</p>
                        </div>
                        <Button size="sm" onClick={() => handleAdd(user.user_id)}>Add Friend</Button>
                    </div>
                ))}
                {!loading && results.length === 0 && query && <p className="text-xs text-fn-muted text-center py-4">No users found.</p>}
            </div>
        </div>
    );
}
