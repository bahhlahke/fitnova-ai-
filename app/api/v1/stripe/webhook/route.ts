import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: "2024-04-10" as any,
    });

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await req.text();
    const signature = req.headers.get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET as string
        );
    } catch (error: any) {
        return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.client_reference_id;

            if (userId) {
                // Find existing profile and mark as pro
                const { error } = await supabaseAdmin
                    .from("user_profile")
                    .update({
                        subscription_status: "pro",
                        stripe_customer_id: session.customer as string
                    })
                    .eq("user_id", userId);

                if (error) {
                    console.error("Failed to upgrade user:", error);
                }
            }
            break;
        }
    }

    return NextResponse.json({ received: true });
}
