# FitNova AI

AI-first fitness and nutrition coaching with a premium assessment funnel, adaptive daily planning, and guided execution.

## Features

- **Adaptive Home** — Signed-out users see a premium conversion funnel; signed-in users see a coaching cockpit.
- **Assessment Funnel** — `/start` quiz-first flow saves a draft before auth and resumes onboarding.
- **AI Coach** — Chat with an AI coach; context includes profile, recent workouts, nutrition, and conversation history.
- **Daily Plan Engine** — Generate a personalized day plan (training + calories/macros + safety notes), save it, and use it in guided workouts.
- **Log** — Workout (guided step-by-step or quick log) and nutrition (meals + calories per day); data persisted in Supabase.
- **Progress** — Weight, body fat %, measurements (waist/chest/hip), trend chart, and add-entry form.
- **Settings** — Profile edit (name, age, sex, height, weight, goals, activity level, injuries, dietary preferences).
- **Onboarding** — Multi-step wizard; saves to `user_profile` and `onboarding` when signed in.
- **Auth** — Magic link (Supabase); redirect after sign-in is validated to prevent open redirects.

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
| `npm run reminders:dispatch` | Trigger reminder/nudge dispatch job (uses service role + optional Twilio creds). |

## Project structure

| Path | Description |
|------|-------------|
| `app/` | App Router routes: `/` (adaptive home), `/start`, `/auth`, `/onboarding`, `/log`, `/log/workout`, `/log/nutrition`, `/log/workout/guided`, `/coach`, `/coach/escalate`, `/progress`, `/progress/add`, `/settings`. |
| `app/api/v1/ai/respond/` | POST API for AI coach; see [docs/API.md](docs/API.md). |
| `app/api/v1/plan/daily/` | POST API for personalized daily plan generation and persistence. |
| `app/api/v1/plan/weekly/` | GET/POST API for weekly microcycle generation and storage. |
| `app/api/v1/analytics/performance/` | GET analytics API for performance/risk metrics. |
| `app/api/v1/coach/escalate/` | GET/POST hybrid coach escalation API. |
| `app/api/v1/jobs/reminders/` | POST cron-style reminder dispatch endpoint. |
| `components/ui/` | Design primitives: Button, Card, Input, Label, Select, Textarea, EmptyState, LoadingState, ErrorMessage, PageLayout. |
| `components/layout/` | BottomNav. |
| `components/auth/` | AuthProvider, AuthGuard, AuthSettings. |
| `lib/` | Supabase client (server + browser), AI assemble-context, auth helpers. |
| `types/` | Shared TypeScript types aligned with Supabase schema. |
| `supabase/migrations/` | Initial schema and RLS. |

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Environment, deploy, health checks, troubleshooting. |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system (Concept 1), UI components, accessibility. |
| [docs/API.md](docs/API.md) | AI respond API contract. |
| [docs/SMOKE-CHECKLIST.md](docs/SMOKE-CHECKLIST.md) | Pre-launch smoke run for daily planning and logging flow. |
| [docs/SAAS-EXTENSION.md](docs/SAAS-EXTENSION.md) | Outline for multi-tenant SaaS (M5+). |
| [docs/PRODUCT-AUDIT-2026-03-01.md](docs/PRODUCT-AUDIT-2026-03-01.md) | Comprehensive feature and AI improvement audit. |
| [docs/COMPETITOR-BENCHMARK-2026-03-01.md](docs/COMPETITOR-BENCHMARK-2026-03-01.md) | Competitor comparison and feature gap matrix. |
| [docs/COMPETITOR-PARITY-PASS-2026-03-01.md](docs/COMPETITOR-PARITY-PASS-2026-03-01.md) | Implementation-level quality parity assessment vs Future and peers. |
| [docs/IMPLEMENTATION-ROLLUP-2026-03-01.md](docs/IMPLEMENTATION-ROLLUP-2026-03-01.md) | Delivered P0/P1/P2 implementation summary. |
| [docs/AI-WORKFLOW-VALIDATION.md](docs/AI-WORKFLOW-VALIDATION.md) | AI workflow validator usage and workflow coverage. |

## Milestones

- **M1** — Branding + basis (design system, layout, bottom nav, README). ✅
- **M2** — Auth, onboarding forms, chat skeleton + AI stub, workout/nutrition UIs, guided workout shell. ✅
- **M3** — AI context assembly, Supabase schema + RLS, guided workout E2E, progress visuals. ✅
- **M4** — Polish, runbook, README deploy, SaaS outline. ✅
- **M5** — SaaS scaffolding doc (tenant, admin, billing) — see [docs/SAAS-EXTENSION.md](docs/SAAS-EXTENSION.md).
