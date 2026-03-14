import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

type ChallengeRow = {
    challenge_id: string;
    title: string;
    description: string | null;
    metric: string;
    start_date: string;
    end_date: string;
    icon_slug: string | null;
};

export async function GET() {
    const requestId = makeRequestId();

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { data: challengeRows, error: challengeError } = await supabase
            .from("challenges")
            .select("challenge_id, title, description, metric, start_date, end_date, icon_slug")
            .order("end_date", { ascending: true });

        if (challengeError) {
            console.error("community_challenges_fetch_failed", { requestId, error: challengeError });
            return NextResponse.json({
                challenges: [],
                degraded: true,
                message: "Community challenges are warming up. You can still join a squad below.",
            });
        }

        const challenges = (challengeRows ?? []) as ChallengeRow[];
        const challengeIds = challenges.map((challenge) => challenge.challenge_id);

        let joinedIds = new Set<string>();
        if (user && challengeIds.length > 0) {
            const { data: joinedRows, error: joinedError } = await supabase
                .from("challenge_participation")
                .select("challenge_id")
                .eq("user_id", user.id)
                .in("challenge_id", challengeIds);

            if (joinedError) {
                console.error("community_challenges_joined_fetch_failed", { requestId, error: joinedError });
            } else {
                joinedIds = new Set((joinedRows ?? []).map((row) => row.challenge_id));
            }
        }

        const participantCounts = new Map<string, number>();
        if (challengeIds.length > 0) {
            const { data: participationRows, error: participationError } = await supabase
                .from("challenge_participation")
                .select("challenge_id")
                .in("challenge_id", challengeIds);

            if (participationError) {
                console.error("community_challenges_participation_fetch_failed", { requestId, error: participationError });
            } else {
                for (const row of participationRows ?? []) {
                    participantCounts.set(row.challenge_id, (participantCounts.get(row.challenge_id) ?? 0) + 1);
                }
            }
        }

        return NextResponse.json({
            challenges: challenges.map((challenge) => ({
                challenge_id: challenge.challenge_id,
                name: challenge.title,
                description: challenge.description,
                metric: challenge.metric,
                start_date: challenge.start_date,
                end_date: challenge.end_date,
                icon_slug: challenge.icon_slug,
                participant_count: participantCounts.get(challenge.challenge_id) ?? 0,
                joined: joinedIds.has(challenge.challenge_id),
            })),
        });
    } catch (error) {
        console.error("community_challenges_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return NextResponse.json({
            challenges: [],
            degraded: true,
            message: "Community challenges are temporarily unavailable. You can still explore squads and accountability flows.",
        });
    }
}

export async function POST(req: Request) {
    const requestId = makeRequestId();

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Not signed in");
        }

        const body = (await req.json().catch(() => ({}))) as { challengeId?: string };
        if (!body.challengeId) {
            return jsonError(400, "VALIDATION_ERROR", "Challenge id is required.");
        }

        const { error } = await supabase.from("challenge_participation").insert({
            challenge_id: body.challengeId,
            user_id: user.id,
        });

        if (error && error.code !== "23505") {
            console.error("community_challenge_join_failed", { requestId, error, challengeId: body.challengeId });
            return jsonError(500, "INTERNAL_ERROR", "Could not join challenge.");
        }

        return NextResponse.json({ status: "joined", challengeId: body.challengeId });
    } catch (error) {
        console.error("community_challenge_join_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Could not join challenge.");
    }
}
