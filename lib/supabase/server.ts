import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

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
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore in Server Components
        }
      },
    },
  });
}
