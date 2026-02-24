import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Allow only relative paths to prevent open redirect. */
function safeRedirectPath(next: string): string {
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
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } catch {
      return NextResponse.redirect(`${origin}/auth?error=Could+not+sign+in`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
