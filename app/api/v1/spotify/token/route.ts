import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    if (!supabase) {
        return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Supabase session contains provider_token if signed in with OAuth
    const token = session.provider_token;

    if (!token) {
        return NextResponse.json({
            error: "No Spotify token found in session. User may need to re-authenticate with Spotify."
        }, { status: 404 });
    }

    return NextResponse.json({ token });
}
