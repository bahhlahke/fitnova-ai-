import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonError(503, "SERVICE_UNAVAILABLE", "Billing webhook is not configured.");
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return jsonError(400, "VALIDATION_ERROR", "Missing Stripe signature.");
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-04-10" as any,
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("stripe_webhook_signature_invalid", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(400, "VALIDATION_ERROR", "Webhook signature verification failed.");
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (!userId) {
        console.warn("stripe_webhook_missing_user_id", { eventId: event.id });
        break;
      }

      const { error } = await supabaseAdmin
        .from("user_profile")
        .update({
          subscription_status: "pro",
          stripe_customer_id: session.customer as string,
        })
        .eq("user_id", userId);

      if (error) {
        console.error("stripe_webhook_user_upgrade_failed", {
          userId,
          error: error.message,
        });
        return jsonError(500, "INTERNAL_ERROR", "Failed to process webhook.");
      }

      break;
    }
  }

  return NextResponse.json({ received: true });
}
