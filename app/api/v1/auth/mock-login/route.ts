import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    if (process.env.NODE_ENV !== "development") {
        return new NextResponse("Not Found", { status: 404 });
    }

    const { searchParams, origin } = new URL(request.url);
    const next = searchParams.get("next") || "/";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return new NextResponse("Missing Supabase configuration in .env.local", { status: 500 });
    }

    // Create an admin client to generate a link or sign in
    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // Ignore in server components
                }
            },
        },
    });

    // Use a fixed test email for the AI agent
    const testEmail = "test-agent@fitnova.ai";

    // Generate a magic link for this user. 
    // If the user doesn't exist, this might fail, so we ensure they exist first.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email === testEmail);

    if (!existingUser) {
        const { error: createError } = await supabase.auth.admin.createUser({
            email: testEmail,
            email_confirm: true,
            user_metadata: { full_name: "Test AI Agent" }
        });
        if (createError) {
            return new NextResponse(`Failed to create test user: ${createError.message}`, { status: 500 });
        }
    }

    // Generate a magic link for this user and redirect to it
    const { data: { properties }, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: testEmail,
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });

    if (linkError || !properties?.action_link) {
        return new NextResponse(`Failed to generate magic link: ${linkError?.message || "No link"}`, { status: 500 });
    }

    // Redirect the browser to the magic link to establish the session
    return NextResponse.redirect(properties.action_link);
}
