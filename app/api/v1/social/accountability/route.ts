import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError(401, "AUTH_REQUIRED", "Not signed in");

    const { partnerId } = await req.json();

    const { error } = await supabase
        .from("user_profile")
        .update({ accountability_partner_id: partnerId || null })
        .eq("user_id", user.id);

    if (error) return jsonError(500, "INTERNAL_ERROR", error.message);

    return NextResponse.json({ status: "success" });
}

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError(401, "AUTH_REQUIRED", "Not signed in");

    const { data, error } = await supabase
        .from("user_profile")
        .select("accountability_partner_id, partner:user_profile!user_profile_accountability_partner_id_fkey(user_id, name)")
        .eq("user_id", user.id)
        .single();

    if (error) return jsonError(500, "INTERNAL_ERROR", error.message);

    return NextResponse.json(data);
}
