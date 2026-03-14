# Koda AI

AI-first fitness and nutrition coaching with a premium assessment funnel, adaptive daily planning, and guided execution.

## Features

- **Adaptive Home** — Signed-out users see a premium conversion funnel; signed-in users see a coaching cockpit.
- **Assessment Funnel** — `/start` quiz-first flow saves a draft before auth and resumes onboarding.
- **AI Coach (PhD Level)** — An elite performance scientist with a PhD in Exercise Physiology. Context includes biometrics (HRV, sleep), historic PRs, workout logs, and nutrition. Supports multi-intent requests and site navigation.
- **Live Wearable Coaching Loop** — Coach and guided sessions consume live Apple Health signals (heart rate, steps, HRV/baseline delta) for recovery-aware pacing, rest control, and coaching cues.
- **Daily Plan Engine** — Generate a personalized day plan (training + calories/macros + safety notes) informed by recovery signals.
- **Evolutionary Performance Synthesis** — Longitudinal analysis of training, biometrics, and nutrition trends injected into History and Progress surfaces.
- **Elite Protocols & Trophy Room** — Native achievement system with "Neural Rationale" justifying honors based on specific user data strands.
- **Community Hub & Synapse Pulses** — Real-time social engagement and elite squad cohort tracking.
- **AI Workout Adaptation** — On-the-fly workout modifications (`/api/v1/plan/adapt-day` and `adapt-session`) based on user constraints.
- **Resilient Coach Reliability** — `/api/v1/ai/respond` uses retries + model fallback + explicit upstream error mapping; iOS coach degrades gracefully with trainer-style fallback messaging and workout-plan rescue when AI is unavailable.

## Stack

- **Next.js 14** (App Router), **Tailwind CSS**, **Supabase** (auth + Postgres + RLS), **OpenRouter** (AI).
- **Branding:** Concept 1 — electric teal, magenta, charcoal/black; mobile-first, 44px touch targets, high-contrast.

## Quick start

### Prerequisites

- Node.js 18+
- npm or yarn
- [Supabase](https://supabase.com) project (auth + database)
- [OpenRouter](https://openrouter.ai) API key (for AI coach)

### Local development

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd fitnessAI
   npm install
   ```

2. **Environment**
   - Copy `.env.local.example` to `.env.local`.
   - Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENROUTER_API_KEY` (`ALLOW_DEV_ANON_AI=false` for launch). See [docs/RUNBOOK.md](docs/RUNBOOK.md#environment-variables).
   - For iOS development, run `node scripts/generate-ios-env.mjs` to sync environment variables to the Xcode project.

3. **Database**
   - Run `supabase/migrations/20250222000001_initial_schema.sql` in the Supabase SQL editor (or `supabase db push` if using Supabase CLI).

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

5. **Build and test**
   ```bash
   npm run build
   npm test
   ```

### Deployment

1. **Vercel**
   - Connect the GitHub repo to Vercel.
   - Add environment variables: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`.
   - Deploy. Use the default `*.vercel.app` URL for MVP.
2. **Supabase**
   - Run the SQL in `supabase/migrations/20250222000001_initial_schema.sql` in your project’s SQL editor (or `supabase db push` if using Supabase CLI).
3. **Custom domain**
   - When ready, add `fitnova.ai` in Vercel and point DNS to Vercel.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (default port 3000). |
| `npm run build` | Production build. |
| `npm run start` | Run production server (after `build`). |
| `npm run lint` | Run ESLint. |
| `npm test` | Run Vitest once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run validate` | Lint, build, and test. |
| `npm run workflow:validate:ai` | Run AI-assisted workflow validator and write report to `docs/reports/`. |
| `npm run test:web:surfaces` | Capture desktop + mobile web workflow surfaces and write a smoke report plus manifest to `docs/reports/`. |
| `npm run test:ios:surfaces` | Capture deterministic iOS simulator workflow surfaces and write a smoke report plus manifest to `docs/reports/`. |
| `npm run validate:ui:ai` | Run the cross-platform AI UI validator across web and iOS surfaces with persona-based readiness analysis. |
| `npm run reminders:dispatch` | Trigger reminder/nudge dispatch job (uses service role + optional Twilio creds). |
| `npm run sit:backtest` | Trigger SIT backtesting job endpoint and print summary JSON. |
| `npm run integrations:reconcile` | Trigger integrations reconciliation/replay processing job endpoint. |

## Project structure

| Path | Description |
|------|-------------|
| `app/` | App Router routes: `/` (adaptive home), `/start`, `/auth`, `/onboarding`, `/log`, `/log/workout`, `/log/nutrition`, `/log/workout/guided`, `/log/nutrition/fridge`, `/log/nutrition/meal-plan`, `/coach`, `/coach/escalate`, `/progress`, `/progress/add`, `/progress/scan`, `/check-in`, `/settings`, `/vitals`, `/vitals/cycle`, `/history`, `/motion`, `/pricing`, `/integrations`, `/community`, `/community/friends`, `/omni`, `/admin`, `/terms`, `/privacy`, `/habits`, `/metrics`. |
| `app/api/v1/ai/respond/` | POST API for AI coach; see [docs/API.md](docs/API.md). |
| `app/api/v1/plan/daily/` | POST API for personalized daily plan generation and persistence. |
| `app/api/v1/plan/adapt-day/` | POST API for AI-driven workout adaptation based on constraints. |
| `app/api/v1/plan/swap-exercise/` | POST API for intelligent exercise substitutions. |
| `app/api/v1/analytics/performance/` | GET analytics API for performance/risk metrics. |
| `app/api/v1/coach/escalate/` | GET/POST hybrid coach escalation API. |
| `app/api/v1/spotify/token/` | GET API for fetching Spotify session tokens. |
| `app/api/v1/jobs/reminders/` | POST cron-style reminder dispatch endpoint. |
| `components/ui/` | Design primitives: Button, Card, Input, Label, Select, Textarea, EmptyState, LoadingState, ErrorMessage, PageLayout. |
| `components/music/` | Spotify player components. |
| `components/layout/` | BottomNav. |
| `components/auth/` | AuthProvider, AuthGuard, AuthSettings. |
| `lib/` | Supabase client (server + browser), AI assemble-context, auth helpers, music/Spotify utilities. |
| `types/` | Shared TypeScript types aligned with Supabase schema. |
| `supabase/migrations/` | Initial schema and RLS. |

## Documentation

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](AGENTS.md) | Guide for AI agents and contributors: layout, config, build/test (web + iOS), docs index. |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Environment, deploy, health checks, production pass, troubleshooting. |
| [docs/PROD-READY-CHECKLIST.md](docs/PROD-READY-CHECKLIST.md) | Production readiness: Vercel secrets, migrations, iOS config, verification. |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system, UI components, accessibility. |
| [docs/API.md](docs/API.md) | API contract (auth, AI, plan, coach, jobs). |
| [docs/SMOKE-CHECKLIST.md](docs/SMOKE-CHECKLIST.md) | Pre-launch smoke run for daily planning and logging flow. |
| [docs/IOS-PARITY-MAP.md](docs/IOS-PARITY-MAP.md) | Web routes vs iOS screens and API coverage. |
| [docs/SAAS-EXTENSION.md](docs/SAAS-EXTENSION.md) | Outline for multi-tenant SaaS (M5+). |
| [docs/PRODUCT-AUDIT-2026-03-01.md](docs/PRODUCT-AUDIT-2026-03-01.md) | Comprehensive feature and AI improvement audit. |
| [docs/COMPETITOR-BENCHMARK-2026-03-01.md](docs/COMPETITOR-BENCHMARK-2026-03-01.md) | Competitor comparison and feature gap matrix. |
| [docs/COMPETITOR-PARITY-PASS-2026-03-01.md](docs/COMPETITOR-PARITY-PASS-2026-03-01.md) | Implementation-level quality parity assessment vs Future and peers. |
| [docs/IMPLEMENTATION-ROLLUP-2026-03-01.md](docs/IMPLEMENTATION-ROLLUP-2026-03-01.md) | Delivered P0/P1/P2 implementation summary. |
| [docs/AI-WORKFLOW-VALIDATION.md](docs/AI-WORKFLOW-VALIDATION.md) | AI workflow validator usage and workflow coverage. |
| [docs/AI-UI-SURFACE-VALIDATION.md](docs/AI-UI-SURFACE-VALIDATION.md) | Cross-platform UI surface smoke capture and persona-based AI readiness review. |

## iOS app

A production-ready **native iOS app** (SwiftUI) lives in `ios/`. It uses the same Supabase backend and Next.js API; the API accepts **cookie** (web) or **Authorization: Bearer &lt;access_token&gt;** (mobile). See [ios/README.md](ios/README.md) for Xcode setup, configuration, and App Store notes.

HealthKit support is configured in-project via `ios/AskKodaAI/Config/AskKodaAI.entitlements` (`com.apple.developer.healthkit`), so device builds can request Apple Health reads for weight, sleep, steps, heart rate, and HRV.

## Milestones

- **M1** — Branding + basis (design system, layout, bottom nav, README). ✅
- **M2** — Auth, onboarding forms, chat skeleton + AI stub, workout/nutrition UIs, guided workout shell. ✅
- **M3** — AI context assembly, Supabase schema + RLS, guided workout E2E, progress visuals. ✅
- **M4** — Polish, runbook, README deploy, SaaS outline. ✅
- **M5** — SaaS scaffolding doc (tenant, admin, billing) — see [docs/SAAS-EXTENSION.md](docs/SAAS-EXTENSION.md).
