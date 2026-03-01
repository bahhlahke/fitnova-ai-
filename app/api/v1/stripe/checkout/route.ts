import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return jsonError(503, "SERVICE_UNAVAILABLE", "Billing is not configured.");
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10" as any,
    });
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { origin } = new URL(req.url);

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
            unit_amount: 2900,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/settings?upgraded=true#billing`,
      cancel_url: `${origin}/settings?canceled=true#billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe_checkout_unhandled", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to create checkout session.");
  }
}
