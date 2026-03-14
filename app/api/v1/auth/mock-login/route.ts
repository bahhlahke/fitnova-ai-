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
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        return new NextResponse("Missing Supabase configuration in .env.local", { status: 500 });
    }

    const cookieStore = cookies();
    type CookieOptions = Parameters<typeof cookieStore.set>[2];
    const cookieAdapter = {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // Ignore in server components
                }
            },
        },
    };

    const adminClient = createServerClient(supabaseUrl, serviceRoleKey, cookieAdapter);
    const sessionClient = createServerClient(supabaseUrl, supabaseAnonKey, cookieAdapter);

    const testEmail = "test-agent@fitnova.ai";
    const testPassword = process.env.MOCK_LOGIN_TEST_PASSWORD || "TestAgentPass123!";
    const testMetadata = { full_name: "Test AI Agent" };

    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
        return new NextResponse(`Failed to list users: ${listError.message}`, { status: 500 });
    }
    const existingUser = users?.find(u => u.email === testEmail);

    if (!existingUser) {
        const { error: createError } = await adminClient.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true,
            user_metadata: testMetadata,
        });
        if (createError) {
            return new NextResponse(`Failed to create test user: ${createError.message}`, { status: 500 });
        }
    } else {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
            password: testPassword,
            email_confirm: true,
            user_metadata: {
                ...(existingUser.user_metadata || {}),
                ...testMetadata,
            },
        });
        if (updateError) {
            return new NextResponse(`Failed to update test user: ${updateError.message}`, { status: 500 });
        }
    }

    const { error: signInError } = await sessionClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
    });

    if (signInError) {
        return new NextResponse(`Failed to sign in test user: ${signInError.message}`, { status: 500 });
    }

    return NextResponse.redirect(new URL(next, origin));
}
