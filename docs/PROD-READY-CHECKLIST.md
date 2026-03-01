# Production Readiness Checklist

To ensure all features are fully functional on the live site (`https://fitnova-ai.vercel.app`), please complete the following manual steps in your Vercel and Supabase dashboards.

## 1. Environment Secrets (Vercel)
The following secrets are required for API functionality. Currently, the site is returning `503` (Billing) or `500` (Jobs) because these are missing or misconfigured in the Production environment.

| Secret Name | Purpose | Status |
|-------------|---------|--------|
| `STRIPE_SECRET_KEY` | Stripe Checkout & Webhooks | **Required** (Fixes 503) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access for Cron Jobs & Background Tasks | **Required** (Fixes 500) |
| `TWILIO_ACCOUNT_SID` | SMS Notifications | Optional |
| `TWILIO_AUTH_TOKEN` | SMS Notifications | Optional |
| `TWILIO_PHONE_NUMBER` | SMS Notifications | Optional |
| `CRON_SECRET` | Secures the `/api/v1/jobs/reminders` endpoint | Optional |
| `OPENROUTER_API_KEY` | AI Model Access | **Required** for Dashboard AI |

## 2. Database Migrations (Supabase)
I have pushed several new migrations to the repository. Please ensure these are applied to your production Supabase database:
- `20260301000006_priority_features.sql` through `20260303000014_rls_policies_fix.sql`.
- These define:
  - `weekly_plans` table
  - `coach_nudges` table
  - `coach_escalations` table
  - `retention_interventions` table
  - `progression_snapshots` table
  - RLS Security Fixes (required for meal logging)

## 3. Verification
Once the secrets are added and migrations applied:
1. Re-deploy the latest commit in Vercel to pick up the new environment variables.
2. Run the validator one last time:
   ```bash
   node scripts/ai-workflow-validator.mjs --base-url https://fitnova-ai.vercel.app
   ```
