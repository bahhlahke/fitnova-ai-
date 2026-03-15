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
        console.log(`[SpotifyToken] Found token in user_metadata for user ${user.id}`);
        return NextResponse.json({ access_token: metadataToken, token: metadataToken });
    }

    const { data: account, error } = await supabase
        .from("connected_accounts")
        .select("access_token")
        .eq("user_id", user.id)
        .eq("provider", "spotify")
        .maybeSingle();

    if (error) {
        console.error(`[SpotifyToken] Error looking up connected_accounts for user ${user.id}:`, error);
        return NextResponse.json({ error: "Failed to look up Spotify connection." }, { status: 500 });
    }

    const token = typeof account?.access_token === "string" ? account.access_token : null;

    if (!token) {
        console.log(`[SpotifyToken] No Spotify connection found for user ${user.id}`);
        return NextResponse.json({
            connected: false,
            token: null,
            access_token: null,
            message: "No Spotify connection found. Connect Spotify in Integrations to unlock workout playback controls.",
        });
    }

    console.log(`[SpotifyToken] Found token in connected_accounts for user ${user.id}`);
    return NextResponse.json({ connected: true, access_token: token, token });
}
