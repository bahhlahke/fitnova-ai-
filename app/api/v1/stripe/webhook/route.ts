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
    console.error("stripe_webhook_config_error", {
      hasSecret: !!stripeSecretKey,
      hasWebhook: !!webhookSecret,
      hasUrl: !!supabaseUrl,
      hasRole: !!serviceRoleKey,
    });
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

  console.log(`stripe_webhook_received: ${event.type}`, { eventId: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;

        if (!userId) {
          console.warn("stripe_webhook_missing_user_id", { eventId: event.id, session: session.id });
          break;
        }

        const { error } = await supabaseAdmin
          .from("user_profile")
          .upsert({
            user_id: userId,
            subscription_status: "pro",
            stripe_customer_id: session.customer as string,
          }, { onConflict: "user_id" });

        if (error) {
          throw new Error(`supabase_upgrade_error: ${error.message}`);
        }

        console.log("stripe_webhook_pro_upgrade_success", { userId, customerId: session.customer });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (!customerId) {
          console.warn("stripe_webhook_missing_customer_id", { eventId: event.id });
          break;
        }

        // Fallback for sub renewal or missed session completed
        const { error } = await supabaseAdmin
          .from("user_profile")
          .update({ subscription_status: "pro" })
          .eq("stripe_customer_id", customerId);

        if (error) {
          throw new Error(`supabase_renewal_update_error: ${error.message}`);
        }

        console.log("stripe_webhook_renewal_pro_active", { customerId });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { error } = await supabaseAdmin
          .from("user_profile")
          .update({ subscription_status: "free" })
          .eq("stripe_customer_id", customerId);

        if (error) {
          throw new Error(`supabase_downgrade_error: ${error.message}`);
        }

        console.log("stripe_webhook_subscription_downgraded", { customerId });
        break;
      }
    }
  } catch (err: any) {
    console.error("stripe_webhook_processing_error", {
      eventId: event.id,
      error: err.message,
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to process webhook event.");
  }

  return NextResponse.json({ received: true });
}
