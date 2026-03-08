import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
        }

        const { data: conversation, error } = await supabase
            .from("ai_conversations")
            .select("user_message_history")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return jsonError(500, "INTERNAL_ERROR", "Failed to load conversation history.");
        }

        const history = (conversation?.user_message_history as any[]) || [];

        return NextResponse.json({ history });
    } catch (error) {
        return jsonError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
    }
}
