"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardHeader, EmptyState, ErrorMessage, LoadingState } from "@/components/ui";
import { describeCommunityMetric, toSentenceCase, toTitleCaseLabel } from "@/lib/ui/plain-language";

type Challenge = {
    challenge_id: string;
    name: string;
    description?: string | null;
    metric?: string | null;
    participant_count?: number | null;
    joined?: boolean;
};

type ChallengeResponse = {
    challenges?: Challenge[];
    degraded?: boolean;
    message?: string;
    error?: string;
};

export function CommunityChallenges() {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/v1/community/challenges");
            const data = (await res.json()) as ChallengeResponse;

            if (!res.ok) {
                throw new Error(data.error || "Could not load community challenges.");
            }

            setChallenges(Array.isArray(data.challenges) ? data.challenges : []);
            setStatusMessage(data.degraded ? data.message || "Community challenges are still syncing." : null);
        } catch (error) {
            setChallenges([]);
            setError(error instanceof Error ? error.message : "Could not load community challenges.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const handleJoin = async (challengeId: string) => {
        setJoining(challengeId);
        setError(null);

        try {
            const res = await fetch("/api/v1/community/challenges", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ challengeId }),
            });

            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                throw new Error(data.error || "Could not join challenge.");
            }

            setChallenges((current) =>
                current.map((challenge) =>
                    challenge.challenge_id === challengeId
                        ? {
                            ...challenge,
                            joined: true,
                            participant_count: (challenge.participant_count ?? 0) + 1,
                        }
                        : challenge
                )
            );
            setStatusMessage("Challenge joined. Your community dashboard will reflect it right away.");
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not join challenge.");
        } finally {
            setJoining(null);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-4">
            {statusMessage && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-fn-muted">
                    {statusMessage}
                </div>
            )}

            {error && (
                <div className="space-y-3">
                    <ErrorMessage message={error} />
                    <Button size="sm" variant="secondary" onClick={() => void load()}>
                        Retry challenges
                    </Button>
                </div>
            )}

            {!error && challenges.length === 0 ? (
                <EmptyState
                    message="No challenges are live yet. Join a squad below and check back for the next community push."
                />
            ) : (
                challenges.map((challenge) => (
                    <Card key={challenge.challenge_id} padding="lg" className="border-white/[0.08] bg-black/30">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                                <CardHeader
                                    title={toTitleCaseLabel(challenge.name)}
                                    subtitle={toSentenceCase(challenge.description) || "A community challenge designed to keep your consistency high."}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full border border-fn-accent/20 bg-fn-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-fn-accent">
                                        {describeCommunityMetric(challenge.metric)}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/60">
                                        {challenge.participant_count ?? 0} members
                                    </span>
                                </div>
                                <p className="text-xs leading-relaxed text-fn-muted">
                                    {challenge.joined
                                        ? "You are in. Keep logging and your progress will roll into the challenge."
                                        : "Join now to add this challenge to your routine and keep your momentum visible."}
                                </p>
                            </div>

                            <div className="md:pt-2">
                                <Button
                                    size="sm"
                                    onClick={() => void handleJoin(challenge.challenge_id)}
                                    loading={joining === challenge.challenge_id}
                                    disabled={challenge.joined}
                                >
                                    {challenge.joined ? "Joined" : "Join challenge"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))
            )}
        </div>
    );
}
