import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = await createClient();
    if (!supabase) {
        return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadataToken = typeof user.user_metadata?.spotify_provider_token === "string"
        ? user.user_metadata.spotify_provider_token
        : null;

    if (metadataToken) {
        return NextResponse.json({ access_token: metadataToken, token: metadataToken });
    }

    const { data: account, error } = await supabase
        .from("connected_accounts")
        .select("access_token")
        .eq("user_id", user.id)
        .eq("provider", "spotify")
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: "Failed to look up Spotify connection." }, { status: 500 });
    }

    const token = typeof account?.access_token === "string" ? account.access_token : null;

    if (!token) {
        return NextResponse.json({
            error: "No Spotify token found. User may need to reconnect Spotify."
        }, { status: 404 });
    }

    return NextResponse.json({ access_token: token, token });
}
