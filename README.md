# FitNova AI

AI-backed fitness coaching and tracking — professional trainer–style guided workouts, nutrition, and progress at a glance.

## Features

- **Dashboard** — This week’s workout count, 7-day bar chart, quick actions (workout, coach, progress, onboarding when needed).
- **AI Coach** — Chat with an AI coach; context includes profile, recent workouts, nutrition, and conversation history.
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
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENROUTER_API_KEY`. See [docs/RUNBOOK.md](docs/RUNBOOK.md#environment-variables).

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
   - Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`.
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

## Project structure

| Path | Description |
|------|-------------|
| `app/` | App Router routes: `/` (dashboard), `/log`, `/log/workout`, `/log/nutrition`, `/log/workout/guided`, `/coach`, `/progress`, `/progress/add`, `/settings`, `/onboarding`, `/auth`. |
| `app/api/v1/ai/respond/` | POST API for AI coach; see [docs/API.md](docs/API.md). |
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
| [docs/SAAS-EXTENSION.md](docs/SAAS-EXTENSION.md) | Outline for multi-tenant SaaS (M5+). |

## Milestones

- **M1** — Branding + basis (design system, layout, bottom nav, README). ✅
- **M2** — Auth, onboarding forms, chat skeleton + AI stub, workout/nutrition UIs, guided workout shell. ✅
- **M3** — AI context assembly, Supabase schema + RLS, guided workout E2E, progress visuals. ✅
- **M4** — Polish, runbook, README deploy, SaaS outline. ✅
- **M5** — SaaS scaffolding doc (tenant, admin, billing) — see [docs/SAAS-EXTENSION.md](docs/SAAS-EXTENSION.md).
