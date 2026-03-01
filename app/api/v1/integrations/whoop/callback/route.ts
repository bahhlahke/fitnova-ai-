import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { exchangeWhoopCode } from "@/lib/integrations/whoop-client";

export const dynamic = "force-dynamic";

function parseState(state: string | null): { userId: string; nonce: string } | null {
  if (!state) return null;
  const [userId, nonce] = state.split(":");
  if (!userId || !nonce) return null;
  return { userId, nonce };
}

function getAppBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const requestId = makeRequestId();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = parseState(url.searchParams.get("state"));
  const appBase = getAppBaseUrl(request);

  if (!code || !state) {
    return NextResponse.redirect(`${appBase}/settings?whoop=error`);
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tokens = await exchangeWhoopCode(code);
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const accountRes = await supabaseAdmin
      .from("connected_accounts")
      .select("metadata")
      .eq("user_id", state.userId)
      .eq("provider", "whoop")
      .maybeSingle();

    if (accountRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to validate WHOOP callback state.");
    }

    const existingMetadata = (accountRes.data as { metadata?: Record<string, unknown> } | null)?.metadata ?? {};
    const expectedState = typeof existingMetadata.oauth_state === "string" ? existingMetadata.oauth_state : "";
    if (expectedState && expectedState !== `${state.userId}:${state.nonce}`) {
      return NextResponse.redirect(`${appBase}/settings?whoop=error`);
    }

    const upsertRes = await supabaseAdmin.from("connected_accounts").upsert(
      {
        user_id: state.userId,
        provider: "whoop",
        status: "connected",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        metadata: {
          ...existingMetadata,
          oauth_state: null,
          connected_at: new Date().toISOString(),
        },
      },
      { onConflict: "user_id,provider" }
    );

    if (upsertRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to persist WHOOP credentials.");
    }

    return NextResponse.redirect(`${appBase}/settings?whoop=connected`);
  } catch (error) {
    console.error("whoop_callback_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(`${appBase}/settings?whoop=error`);
  }
}
