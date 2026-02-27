import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: "2024-04-10" as any,
    });
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { origin } = new URL(req.url);

        // Create a Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            customer_email: user.email,
            client_reference_id: user.id,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "FitNova Pro Experience",
                            description: "Full access to elite-tier adaptive training and metabolic intelligence.",
                        },
                        unit_amount: 2900, // $29.00/month
                        recurring: { interval: "month" },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${origin}/coach?session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
            cancel_url: `${origin}/auth?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
}
