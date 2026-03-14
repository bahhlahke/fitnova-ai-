"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageLayout, Card, CardHeader, Button, ErrorMessage, LoadingState, EmptyState } from "@/components/ui";
import { toSentenceCase, toTitleCaseLabel } from "@/lib/ui/plain-language";

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
    const [groupError, setGroupError] = useState<string | null>(null);

    const fetchGroups = async () => {
        try {
            const supabase = createClient();
            if (!supabase) {
                setGroupError("Community groups are unavailable because Supabase is not configured.");
                setLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch groups and check membership
            const [groupsRes, membershipsRes] = await Promise.all([
                supabase.from("groups").select("*"),
                supabase.from("group_members").select("group_id").eq("user_id", user.id)
            ]);

            if (groupsRes.error) {
                setGroupError(groupsRes.error.message);
                setLoading(false);
                return;
            }

            if (groupsRes.data) {
                const memberGroupIds = new Set(membershipsRes.data?.map(m => m.group_id) || []);
                setGroups(groupsRes.data.map(g => ({
                    ...g,
                    is_member: memberGroupIds.has(g.group_id)
                })));
            }
        } catch (error) {
            setGroupError(error instanceof Error ? error.message : "Could not load community groups.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleJoin = async (groupId: string) => {
        setJoining(groupId);
        setGroupError(null);
        const supabase = createClient();
        if (!supabase) {
            setGroupError("Community groups are unavailable because Supabase is not configured.");
            setJoining(null);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setGroupError("Sign in to join a community group.");
            setJoining(null);
            return;
        }

        const { error } = await supabase.from("group_members").insert({
            group_id: groupId,
            user_id: user.id
        });

        if (!error) {
            setGroups(prev => prev.map(g => g.group_id === groupId ? { ...g, is_member: true } : g));
        } else if (error.code !== "23505") {
            setGroupError(error.message);
        }
        setJoining(null);
    };

    return (
        <PageLayout title="Community" subtitle="Join challenges, find your group, and stay motivated with other members">
            <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">How Community Works</p>
                <div className="mt-2 grid gap-2 text-sm leading-relaxed text-fn-muted md:grid-cols-3">
                    <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2">1. Join a challenge or group that matches your style.</div>
                    <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2">2. Keep logging workouts, meals, or steps as usual.</div>
                    <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2">3. Your standing updates as your activity is recorded.</div>
                </div>
                <div className="mt-3 rounded-xl border border-fn-accent/10 bg-fn-accent/5 px-4 py-3 text-sm leading-relaxed text-fn-muted">
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs">
                            <span className="font-semibold text-white">Challenge:</span> short event you can join today
                        </span>
                        <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs">
                            <span className="font-semibold text-white">Group:</span> ongoing crew with a shared training style
                        </span>
                    </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-relaxed text-fn-muted">
                    <span className="font-semibold text-white">Next step now:</span> join one challenge first. Your workouts and logs will automatically count toward the leaderboard.
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="#community-challenges"><Button size="sm">Join a challenge now</Button></Link>
                    <Link href="#community-groups"><Button size="sm" variant="secondary">Browse groups</Button></Link>
                </div>
            </div>

            <div className="mb-8 flex justify-end">
                <Link href="/community/friends">
                    <Button variant="secondary" size="sm" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}>
                        Manage Friends
                    </Button>
                </Link>
            </div>

            <div className="mb-12" id="community-challenges">
                <CardHeader title="Live Challenges" subtitle="Join one challenge, keep logging, and your progress counts automatically" />
                <div className="mt-8">
                    <CommunityChallenges />
                </div>
            </div>

            <div id="community-groups">
            <CardHeader title="Groups" subtitle="Pick a group that matches your style and stay accountable with people like you" />
            {groupError && <ErrorMessage message={groupError} className="mt-4" />}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                {loading ? (
                    <LoadingState className="col-span-full" />
                ) : groups.length > 0 ? (
                    groups.map(group => (
                        <Card key={group.group_id} padding="lg" className="border-white/[0.08] bg-black/40 backdrop-blur-md shadow-fn-soft hover:bg-black/60 transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fn-accent/10 border border-fn-accent/20 text-2xl mb-6 shadow-[0_0_20px_rgba(10,217,196,0.1)]">
                                {getIcon(group.icon_slug)}
                            </div>
                            <h3 className="text-xl font-black text-white leading-none mb-2">{toTitleCaseLabel(group.name)}</h3>
                            <p className="text-sm leading-relaxed text-fn-muted mb-6">{toSentenceCase(group.description)}</p>
                            <div className="mt-auto">
                                {group.is_member ? (
                                    <div className="space-y-6">
                                        <Button variant="secondary" className="w-full bg-fn-accent/10 text-fn-accent border-fn-accent/20 cursor-default" disabled>You&apos;re in</Button>
                                        <div className="border-t border-white/[0.08] pt-4">
                                            <GroupLeaderboard groupId={group.group_id} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-xs leading-relaxed text-fn-muted">
                                            Join this group to see the leaderboard, compare progress, and stay accountable.
                                        </p>
                                        <Button
                                            className="w-full h-touch-lg text-[10px] font-black uppercase tracking-[0.2em]"
                                            onClick={() => handleJoin(group.group_id)}
                                            loading={joining === group.group_id}
                                        >
                                            Join this group
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    <EmptyState
                        className="col-span-full"
                        message="No community groups are live yet. Add a starter group before launch so people have an easy first place to join."
                    />
                )}
            </div>
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
