# Koda AI — Runbook

For AI agents and new contributors: see [AGENTS.md](../AGENTS.md) for project layout, config, and build/test (web + iOS) in one place.

## Prerequisites

- Node.js 18+
- npm or yarn
- GitHub account (for CI and repo)
- Supabase project
- OpenRouter API key

## Environment variables

| Variable | Where | Required |
|----------|--------|----------|
| `NEXT_PUBLIC_SITE_URL` | Vercel + `.env.local` | Recommended (canonical metadata/share URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Yes (for auth and data) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + `.env.local` (server only) | Yes for cron jobs/webhooks/import pipelines |
| `OPENROUTER_API_KEY` | Vercel + `.env.local` (server only) | Yes (for AI coach) |
| `ALLOW_DEV_ANON_AI` | `.env.local` | No (dev only; defaults to false) |
| `CRON_SECRET` | Vercel + `.env.local` | Recommended (protect job endpoints) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Vercel + `.env.local` | Required for billing routes |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Vercel + `.env.local` | Required for SMS coaching/reminders |

- Never expose `OPENROUTER_API_KEY` to the client. It is used only in `app/api/v1/ai/respond/route.ts`.
- Keep `ALLOW_DEV_ANON_AI=false` for production/private launch.
- Copy `.env.local.example` to `.env.local` and fill values for local dev.

## Local development

1. `git clone <repo-url> && cd fitnessAI`
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and set all variables.
4. Apply Supabase schema: run `supabase/migrations/20250222000001_initial_schema.sql` in the Supabase SQL editor (or use `supabase db push` if using Supabase CLI).
5. `npm run dev` — open [http://localhost:3000](http://localhost:3000).

## Build and test

- `npm run build` — production build.
- `npm run lint` — ESLint.
- `npm test` — Vitest (unit/integration tests); run after changes to `lib/`, `app/api/`, or pages.
- `npm run validate` — lint + build + test (CI-style).
- `npm run sit:backtest` — trigger SIT timeline replay/backtesting summary job.
- `npm run integrations:reconcile` — process wearable replay queue and record reconciliation run summary.

### Automated tests with AI review

- **`npm run test:ai-review`** — Runs the full test suite, then sends the test file list and run output to an LLM (OpenRouter). The AI returns a structured review: verdict (healthy / needs_work / critical), coverage gaps with priority (P0/P1/P2), assertion/flakiness risks, and suggested test cases. Report is written to `docs/reports/ai-test-review-<timestamp>.md`. Requires `OPENROUTER_API_KEY` in the environment; if unset, the script still runs tests and writes a report without the AI section.
- **`npm run test:ai-review:coverage`** — Same as above but runs Vitest with `--coverage` and includes the coverage summary in the AI context for better gap analysis.
- Optional flags: `--no-ai` (skip LLM call), `--output path/report.md` (custom report path). Model can be overridden with `AI_TEST_REVIEW_MODEL` (default: `openai/gpt-4o-mini`).
- **Workflow validation:** `npm run workflow:validate:ai` runs HTTP workflow checks against a running app (default `http://localhost:3000`) and uses the same OpenRouter key to AI-judge each workflow (verdict, friction points, recommendations). Reports go to `docs/reports/ai-workflow-validation-<timestamp>.md`.
- **Web UI surface smoke:** `npm run test:web:surfaces` captures the core signed-out and signed-in web surfaces on desktop and mobile, writes screenshots plus `manifest.json` to `docs/reports/web-surface-smoke-<timestamp>/`, and fails when routes redirect unexpectedly, render too little content, or hit runtime errors. For signed-in screens, run against `npm run dev` with `SUPABASE_SERVICE_ROLE_KEY` available so `/api/v1/auth/mock-login` can bootstrap the test session.
- **Cross-platform AI UI validation:** `npm run validate:ui:ai` orchestrates `test:web:surfaces` and `test:ios:surfaces`, then asks a multimodal AI judge to review workflow screenshots as multiple user personas with different proficiency levels. The report lands at `docs/reports/ai-ui-surface-validation-<timestamp>/SUMMARY.md`. Use `--fail-if-not-ready` to turn it into a release gate.

### iOS tests and AI review

- **`npm run test:ios`** — Finds any `.xcodeproj` under `ios/` (e.g. `ios/AskKodaAI/AskKodaAI.xcodeproj`), runs `xcodebuild test` with that project and its scheme (e.g. **AskKodaAI**). If no project is found, exits 0. Requires Xcode and a **Unit Testing Bundle** target that includes the `ios/KodaAITests` sources (see `ios/README.md`).
- **`npm run test:ai-review:ios`** — Discovers iOS test files under `ios/`, runs `xcodebuild test` when a project exists, then sends the test file list and run output to OpenRouter for an AI review (verdict, coverage gaps, suggested tests, assertion risks, **production readiness**). Report: `docs/reports/ai-test-review-ios-<timestamp>.md`. Set `OPENROUTER_API_KEY` for the AI section; use `--no-ai` to skip the LLM. Model override: `AI_TEST_REVIEW_MODEL`.
- **`npm run test:ios:ready`** — **Production gate.** Runs `test:ios` then `test:ai-review:ios --fail-if-not-ready`. Exits with code 1 if tests failed or the AI reports not production ready (verdict critical or production_ready false). Use in CI or before release to block when the suite does not meet the production-readiness rubric.
- **`npm run test:ios:surfaces`** — Builds the app, captures deterministic simulator screenshots for the core iOS workflow matrix, and writes both a Markdown summary and `manifest.json` so the UI validator can inspect exact surfaces.

**When is the iOS app production ready?** The AI review uses a strict rubric: (1) tests ran and passed, (2) auth/session or equivalent covered, (3) API response decoding covered, (4) critical data models (workout, nutrition, progress, nudges) covered, (5) no P0 gaps, (6) no critical assertion risks. Only when all are satisfied does the report show **Production readiness: PASS**. Run `npm run test:ios:ready` (with `OPENROUTER_API_KEY` set) to gate releases.

## Deployment (Vercel)

1. Connect the repo to Vercel.
2. In Vercel project settings → Environment Variables, add:
   - `NEXT_PUBLIC_SITE_URL` (for example, `https://fitnova.ai`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENROUTER_API_KEY` (sensitive; server-only).
3. Deploy. MVP domain: `*.vercel.app`; later point `fitnova.ai` to Vercel.

## Health checks

- **App:** `GET /` — should return 200 and the dashboard.
- **AI route:** `POST /api/v1/ai/respond` requires session and body `{ "message": "Hi" }`; returns `{ "reply": "...", "actions": [...] }` on success. Temporary provider/network issues return `UPSTREAM_ERROR` (`502/503/504`) instead of generic internal errors.
- **Daily plan route:** `POST /api/v1/plan/daily` requires session; returns `{ "plan": { ... } }` and persists to `daily_plans`.
- **Weekly plan route:** `GET /api/v1/plan/weekly` requires session; returns `{ "plan": { ... } }` and persists to `weekly_plans`.
- **Nutrition targets:** `GET /api/v1/nutrition/targets` returns user calorie/macro goals.
- **Progression targets:** `GET /api/v1/progression/next-targets` returns suggested lift targets.
- **Reminder job route:** `POST /api/v1/jobs/reminders` with `x-cron-secret` if `CRON_SECRET` is configured.
- **SIT backtest job route:** `POST /api/v1/jobs/sit/backtest` with `x-cron-key` if `CRON_SECRET` is configured.
- **Integrations reconciliation job route:** `POST /api/v1/jobs/integrations/reconcile` with `x-cron-key` if `CRON_SECRET` is configured.

## Data retention (future)

- Configure retention for `workout_logs`, `nutrition_logs`, and `ai_conversations` (e.g. soft delete or scheduled purge). Document policy in this runbook when implemented.

## iOS app (production)

- **Config:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_BASE_URL` in Info.plist or xcconfig (see `ios/README.md`). For release builds use HTTPS for both API and Supabase.
- **Capabilities:** HealthKit is wired via `ios/AskKodaAI/Config/AskKodaAI.entitlements`. If signing/build settings are changed, confirm `CODE_SIGN_ENTITLEMENTS=Config/AskKodaAI.entitlements` remains set.
- **API auth:** Next.js API accepts `Authorization: Bearer <access_token>`; iOS sends Supabase `access_token` via `KodaAPIService`. No extra backend config.
- **Magic link:** Set `AUTH_REDIRECT_URL` (e.g. `kodaai://auth/callback`) and add to Supabase Redirect URLs; handle URL in app with `SupabaseService.setSessionFrom(url:)`.
- **App Store:** Sign in with Apple required if offering other social sign-in; Privacy Policy and usage descriptions for Health/camera/photos.

## Production pass (pre-deploy)

Before each production deploy:

1. **Secrets:** All required env vars set in Vercel (see table above). No secrets in repo or client bundle.
2. **Database:** All migrations in `supabase/migrations/` applied to production Supabase (order by filename).
3. **iOS:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_BASE_URL` set via xcconfig or CI; HTTPS in release. Privacy Policy and usage descriptions in Info.plist.
4. **Logging:** Server `console.log` in `lib/supabase/server.ts` is dev-only. API routes use `console.error` for failures; avoid logging PII.
5. **Validate:** `npm run validate` (lint, build, test). Optionally run `node scripts/ai-workflow-validator.mjs --base-url <production-url>` after deploy.
6. **Surface readiness:** Run `npm run validate:ui:ai --fail-if-not-ready` against local/staging before release to catch UI clarity, state, and layout regressions across both web and iOS.

## Troubleshooting

- **Auth not working:** Ensure Supabase URL and anon key are set and that the Supabase project has Auth enabled. For Google sign-in, enable Google provider in Supabase Auth settings. Redirect after login is validated (relative path only) in `app/auth/callback/route.ts`.
- **AI returns `SERVICE_UNAVAILABLE` (503):** Set `OPENROUTER_API_KEY` in Vercel (and locally in `.env.local`). Key is server-only and must not be exposed to the client.
- **AI returns `UPSTREAM_ERROR` (502/503/504):** Provider/network is degraded or timed out. Retry first, then confirm OpenRouter account health/limits and `OPENROUTER_MODEL`/`OPENROUTER_FALLBACK_MODELS` configuration.
- **AI returns 401:** User is not signed in. Authenticate first (magic link flow).
- **iOS shows “Build Missing HealthKit Capability”:** The app was signed without HealthKit entitlement. Re-enable HealthKit capability, confirm entitlements file binding, rebuild, reinstall.
- **Schema-cache errors mentioning `display_name`/`height_cm`/`weight_kg`:** Current canonical `user_profile` columns are `name`, `height`, `weight`. Refresh Supabase schema cache and ensure API queries/migrations target canonical keys (iOS model decoding remains backward-compatible).
- **RLS errors:** Ensure migrations have been run and policies use `auth.uid()`.
- **Stuck loading on dashboard/settings/progress/log:** Check browser console and network; Supabase or auth failures are caught and loading state is cleared. Verify env vars and that the schema matches `supabase/migrations/`.
