import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function GET() {
    const supabase = await createClient();

    const { data: challenges, error } = await supabase
        .from("challenges")
        .select(`
      *,
      participants:challenge_participation(
        current_value,
        user:user_profile(name, xp)
      )
    `)
        .order("end_date", { ascending: true });

    if (error) return jsonError(500, "INTERNAL_ERROR", error.message);

    return NextResponse.json(challenges);
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError(401, "AUTH_REQUIRED", "Not signed in");

    const { challengeId } = await req.json();

    const { error } = await supabase.from("challenge_participation").insert({
        challenge_id: challengeId,
        user_id: user.id
    });

    if (error && error.code !== "23505") return jsonError(500, "INTERNAL_ERROR", error.message);

    return NextResponse.json({ status: "joined" });
}
