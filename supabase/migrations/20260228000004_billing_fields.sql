ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

UPDATE public.user_profile
SET subscription_status = COALESCE(subscription_status, 'free')
WHERE subscription_status IS NULL;

COMMENT ON COLUMN public.user_profile.subscription_status IS 'Billing state for the signed-in app shell.';
COMMENT ON COLUMN public.user_profile.stripe_customer_id IS 'Stripe customer identifier for subscription lifecycle events.';
