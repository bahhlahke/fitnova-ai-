# FitNova AI — Runbook

## Prerequisites

- Node.js 18+
- npm or yarn
- GitHub account (for CI and repo)
- Supabase project
- OpenRouter API key

## Environment variables

| Variable | Where | Required |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Yes (for auth and data) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Yes |
| `OPENROUTER_API_KEY` | Vercel + `.env.local` (server only) | Yes (for AI coach) |
| `ALLOW_DEV_ANON_AI` | `.env.local` | No (dev only; defaults to false) |

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

## Deployment (Vercel)

1. Connect the repo to Vercel.
2. In Vercel project settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENROUTER_API_KEY` (sensitive; server-only).
3. Deploy. MVP domain: `*.vercel.app`; later point `fitnova.ai` to Vercel.

## Health checks

- **App:** `GET /` — should return 200 and the dashboard.
- **AI route:** `POST /api/v1/ai/respond` requires session and body `{ "message": "Hi" }`; returns `{ "reply": "..." }` on success.
- **Daily plan route:** `POST /api/v1/plan/daily` requires session; returns `{ "plan": { ... } }` and persists to `daily_plans`.

## Data retention (future)

- Configure retention for `workout_logs`, `nutrition_logs`, and `ai_conversations` (e.g. soft delete or scheduled purge). Document policy in this runbook when implemented.

## Troubleshooting

- **Auth not working:** Ensure Supabase URL and anon key are set and that the Supabase project has Auth enabled. For Google sign-in, enable Google provider in Supabase Auth settings. Redirect after login is validated (relative path only) in `app/auth/callback/route.ts`.
- **AI returns 503:** Set `OPENROUTER_API_KEY` in Vercel (and locally in `.env.local`). Key is server-only and must not be exposed to the client.
- **AI returns 401:** User is not signed in. Authenticate first (magic link flow).
- **RLS errors:** Ensure migrations have been run and policies use `auth.uid()`.
- **Stuck loading on dashboard/settings/progress/log:** Check browser console and network; Supabase or auth failures are caught and loading state is cleared. Verify env vars and that the schema matches `supabase/migrations/`.
