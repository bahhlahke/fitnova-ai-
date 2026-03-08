import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

/**
 * Creates a Supabase client for the current request.
 * - If the request has "Authorization: Bearer <token>" (e.g. from iOS/mobile), uses that token.
 * - Otherwise uses cookie-based session (web).
 * This allows the same API routes to work for both web and native mobile clients.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const headerList = await headers();
  const authHeader = headerList.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (bearerToken) {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${bearerToken}` },
      },
    });
  }

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  if (process.env.NODE_ENV === "development") {
    console.log(`[supabase-server] creating client. cookies count: ${allCookies.length}`);
    const authCookie = allCookies.find(c => c.name.includes("auth-token"));
    if (!authCookie) {
      console.warn("[supabase-server] NO AUTH COOKIE FOUND in request");
    } else {
      console.log(`[supabase-server] auth cookie found: ${authCookie.name}`);
    }
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return allCookies;
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              maxAge: options.maxAge ?? 60 * 60 * 24 * 365, // 1 year default
            })
          );
        } catch {
          // Ignore in Server Components
        }
      },
    },
  });
}
