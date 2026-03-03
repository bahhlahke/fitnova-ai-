import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError(401, "AUTH_REQUIRED", "Not signed in");

    const { postId, action, content } = await req.json();

    if (action === "like") {
        const { error } = await supabase.from("post_likes").insert({
            post_id: postId,
            user_id: user.id
        });
        if (error && error.code !== "23505") { // Ignore duplicate likes
            return jsonError(500, "INTERNAL_ERROR", error.message);
        }
    }

    if (action === "unlike") {
        const { error } = await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);
        if (error) return jsonError(500, "INTERNAL_ERROR", error.message);
    }

    if (action === "comment") {
        const { error } = await supabase.from("post_comments").insert({
            post_id: postId,
            user_id: user.id,
            content
        });
        if (error) return jsonError(500, "INTERNAL_ERROR", error.message);
    }

    return NextResponse.json({ status: "success" });
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    if (!postId) return jsonError(400, "VALIDATION_ERROR", "Missing postId");

    const supabase = await createClient();

    const [likesRes, commentsRes] = await Promise.all([
        supabase.from("post_likes").select("user_id").eq("post_id", postId),
        supabase.from("post_comments").select(`
      comment_id, content, created_at,
      user:user_profile (name)
    `).eq("post_id", postId).order("created_at", { ascending: true })
    ]);

    return NextResponse.json({
        likes: likesRes.data?.map(l => l.user_id) || [],
        comments: commentsRes.data || []
    });
}
