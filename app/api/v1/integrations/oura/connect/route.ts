import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { buildOuraAuthorizeUrl } from "@/lib/integrations/oura-client";

export const dynamic = "force-dynamic";

function makeState(userId: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
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
    const authorizeUrl = buildOuraAuthorizeUrl(state);

    const upsertRes = await supabase.from("connected_accounts").upsert(
      {
        user_id: user.id,
        provider: "oura",
        status: "disconnected",
        metadata: { oauth_state: state },
      },
      { onConflict: "user_id,provider" }
    );

    if (upsertRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to persist Oura OAuth state.");
    }

    return NextResponse.json({
      connect_url: authorizeUrl,
      provider: "oura",
      state,
    });
  } catch (error) {
    console.error("oura_connect_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to initialize Oura connection.");
  }
}
