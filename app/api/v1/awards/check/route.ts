import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAndAwardBadges } from "@/lib/awards/engine";
import { jsonError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return jsonError(401, "AUTH_REQUIRED", "Not signed in");
    }

    try {
        await checkAndAwardBadges(user.id);
        return NextResponse.json({ status: "checked" });
    } catch (error: any) {
        console.error("Award check failed:", error);
        return jsonError(500, "INTERNAL_ERROR", error.message);
    }
}
