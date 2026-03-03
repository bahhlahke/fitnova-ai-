import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError(401, "AUTH_REQUIRED", "Not signed in");

    const { data, error } = await supabase
        .from("user_connections")
        .select(`
      connection_id,
      status,
      created_at,
      friend:user_profile!user_connections_friend_id_fkey (user_id, name, xp),
      user:user_profile!user_connections_user_id_fkey (user_id, name, xp)
    `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) return jsonError(500, "INTERNAL_ERROR", error.message);

    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError(401, "AUTH_REQUIRED", "Not signed in");

    const { friendId, action } = await req.json();

    if (action === "request") {
        const { error } = await supabase.from("user_connections").insert({
            user_id: user.id,
            friend_id: friendId,
            status: "pending"
        });
        if (error) return jsonError(500, "INTERNAL_ERROR", error.message);
    }

    if (action === "accept") {
        const { error } = await supabase
            .from("user_connections")
            .update({ status: "accepted" })
            .eq("friend_id", user.id)
            .eq("user_id", friendId);
        if (error) return jsonError(500, "INTERNAL_ERROR", error.message);
    }

    if (action === "remove" || action === "decline") {
        const { error } = await supabase
            .from("user_connections")
            .delete()
            .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
        if (error) return jsonError(500, "INTERNAL_ERROR", error.message);
    }

    return NextResponse.json({ status: "success" });
}
