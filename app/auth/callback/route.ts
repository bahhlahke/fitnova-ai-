import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { insertProductEvent } from "@/lib/telemetry/events";

/** Allow only relative paths or known app schemes to prevent open redirect. */
function safeRedirectPath(next: string): string {
  if (next.startsWith("kodaai://")) return next;
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return path.length > 0 && path.length < 2048 ? path : "/";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next") ?? "/");

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;

      if (data.user) {
        await insertProductEvent(supabase, data.user.id, "funnel_auth_success", {
          next,
          auth_provider: data.session?.user.app_metadata.provider || "otp",
        }, data.session?.access_token);
      }

      // If next is a deep link, we need to pass the tokens back for the app to pick up
      if (next.startsWith("kodaai://") && data.session) {
        const { access_token, refresh_token } = data.session;
        return NextResponse.redirect(`${next}#access_token=${access_token}&refresh_token=${refresh_token}`);
      }
    } catch {
      return NextResponse.redirect(`${origin}/auth?error=Could+not+sign+in`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
