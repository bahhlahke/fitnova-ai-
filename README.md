# FitNova AI

AI-backed fitness coaching and tracking — professional trainer–style guided workouts, nutrition, and progress at a glance.

## Branding (Concept 1: Futuristic Precision)

- **Colors:** Electric teal (`#00e5cc`), magenta (`#e91e8c`), on charcoal/black (`#1a1a1d`, `#0d0d0f`).
- **UI:** Mobile-first; minimum 44px touch targets; high-contrast, accessible.
- **Stack:** Next.js 14 (App Router), Tailwind CSS, Supabase (auth + data), OpenRouter (AI).

## Quick start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project (for auth and data)
- OpenRouter API key (for AI coach)

### Local development

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd fitnessAI
   npm install
   ```

2. **Environment**
   - Copy `.env.local.example` to `.env.local`.
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENROUTER_API_KEY` (see M2 for AI route).

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Build**
   ```bash
   npm run build
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

See [docs/RUNBOOK.md](docs/RUNBOOK.md) for env details, health checks, and troubleshooting. SaaS extension outline: [docs/SAAS-EXTENSION.md](docs/SAAS-EXTENSION.md).

## Project structure

- `app/` — App Router routes (dashboard, log, coach, settings, onboarding).
- `components/` — UI and feature components (layout, onboarding wizard, chat, workout, progress).
- `lib/` — Supabase client, auth helpers, AI service, API route logic.
- `styles/` — Global CSS and Tailwind.
- `types/` — Shared TypeScript types (profile, workout_log, nutrition_log, etc.).

## Milestones

- **M1** — Branding + basis (design system, layout, bottom nav, README). ✅
- **M2** — Auth, onboarding forms, chat skeleton + AI stub, workout/nutrition UIs, guided workout shell. ✅
- **M3** — AI context assembly, Supabase schema + RLS, guided workout E2E, progress visuals. ✅
- **M4** — Polish, runbook, README deploy, SaaS outline. ✅
- **M5** — SaaS scaffolding doc (tenant, admin, billing) — see [docs/SAAS-EXTENSION.md](docs/SAAS-EXTENSION.md).
