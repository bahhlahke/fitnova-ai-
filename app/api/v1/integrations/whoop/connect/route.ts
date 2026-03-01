import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { buildWhoopAuthorizeUrl } from "@/lib/integrations/whoop-client";

export const dynamic = "force-dynamic";

function makeState(userId: string): string {
  const nonce = Math.random().toString(36).slice(2, 12);
  return `${userId}:${nonce}`;
}

export async function GET() {
  const requestId = makeRequestId();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const state = makeState(user.id);
    const authorizeUrl = buildWhoopAuthorizeUrl(state);

    await supabase.from("connected_accounts").upsert(
      {
        user_id: user.id,
        provider: "whoop",
        status: "disconnected",
        metadata: { oauth_state: state },
      },
      { onConflict: "user_id,provider" }
    );

    return NextResponse.json({
      connect_url: authorizeUrl,
      provider: "whoop",
      state,
    });
  } catch (error) {
    console.error("whoop_connect_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to initialize WHOOP connection.");
  }
}
