# Production Readiness Checklist

To ensure all features are fully functional on the live site and iOS app, complete the following.

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
2. Run the validator against your production URL:
   ```bash
   npm run validate
   node scripts/ai-workflow-validator.mjs --base-url <YOUR_PRODUCTION_URL>
   ```
   Example: `--base-url https://your-app.vercel.app`

## 4. iOS app (production)

- **Config:** Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_BASE_URL` in Info.plist or xcconfig (never commit real keys). Use HTTPS for production API and Supabase URLs.
- **Magic link:** Add `AUTH_REDIRECT_URL` (e.g. `kodaai://auth/callback`) and the same URL in Supabase Redirect URLs and, if needed, Associated Domains.
- **Sign in with Apple:** Required if offering other third-party sign-in; implement button and `SupabaseService.signInWithApple(idToken:nonce:)`.
- **Privacy:** Add Privacy Policy URL; set `NSHealthShareUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` in Info.plist to match actual use.
- **HealthKit:** Enable HealthKit capability; request only the keys (weight, sleep, steps) the app uses.
- **Errors:** API errors surface user-friendly messages (no stack traces or internal codes). Network and auth errors are handled with retries where appropriate.
- **No dev-only behavior:** No `fatalError` except for missing required config at launch; no force unwraps on URL construction; server `console.log` is guarded with `NODE_ENV === "development"`.
