"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageLayout, Card, CardHeader, Button, LoadingState, EmptyState } from "@/components/ui";

import { GroupLeaderboard } from "@/components/community/GroupLeaderboard";

import { CommunityChallenges } from "@/components/community/CommunityChallenges";

interface Group {
    group_id: string;
    name: string;
    description: string;
    icon_slug: string;
    member_count?: number;
    is_member?: boolean;
}

export default function CommunityPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState<string | null>(null);

    const fetchGroups = async () => {
        const supabase = createClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch groups and check membership
        const [groupsRes, membershipsRes] = await Promise.all([
            supabase.from("groups").select("*"),
            supabase.from("group_members").select("group_id").eq("user_id", user.id)
        ]);

        if (groupsRes.data) {
            const memberGroupIds = new Set(membershipsRes.data?.map(m => m.group_id) || []);
            setGroups(groupsRes.data.map(g => ({
                ...g,
                is_member: memberGroupIds.has(g.group_id)
            })));
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleJoin = async (groupId: string) => {
        setJoining(groupId);
        const supabase = createClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("group_members").insert({
            group_id: groupId,
            user_id: user.id
        });

        if (!error) {
            setGroups(prev => prev.map(g => g.group_id === groupId ? { ...g, is_member: true } : g));
        }
        setJoining(null);
    };

    return (
        <PageLayout title="Community" subtitle="Join groups and compete with others">
            <div className="mb-8 flex justify-end">
                <Link href="/community/friends">
                    <Button variant="secondary" size="sm" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}>
                        Manage Friends
                    </Button>
                </Link>
            </div>

            <div className="mb-12">
                <CardHeader title="Global Challenges" subtitle="Compete with the entire FitNova community" />
                <div className="mt-6">
                    <CommunityChallenges />
                </div>
            </div>

            <CardHeader title="Groups & Circles" subtitle="Find your niche and train together" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                {loading ? (
                    <LoadingState className="col-span-full" />
                ) : groups.length > 0 ? (
                    groups.map(group => (
                        <Card key={group.group_id} padding="lg">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fn-accent/10 text-2xl mb-4">
                                {getIcon(group.icon_slug)}
                            </div>
                            <CardHeader title={group.name} subtitle={group.description} />
                            <div className="mt-6">
                                {group.is_member ? (
                                    <div className="space-y-6">
                                        <Button variant="secondary" className="w-full" disabled>Member</Button>
                                        <div className="border-t border-white/5 pt-4">
                                            <GroupLeaderboard groupId={group.group_id} />
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={() => handleJoin(group.group_id)}
                                        loading={joining === group.group_id}
                                    >
                                        Join Group
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    <EmptyState
                        className="col-span-full"
                        message="No community groups found. Create one to get started!"
                    />
                )}
            </div>
        </PageLayout>
    );
}

function getIcon(slug: string) {
    switch (slug) {
        case "fire": return "🔥";
        case "weight": return "🏋️";
        case "heart": return "❤️";
        case "zap": return "⚡";
        default: return "👥";
    }
}
