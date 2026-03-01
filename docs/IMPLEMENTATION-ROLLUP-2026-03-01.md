# P0/P1/P2 Implementation Rollup (March 1, 2026)

## Delivered in this pass

### P0

1. Workflow validation automation (expanded)
- Updated `scripts/ai-workflow-validator.mjs` coverage with weekly planning, swap exercise, retention risk, analytics, coach escalation, and reminder job endpoints.

2. Accountability reminder loop
- Added reminder dispatch job: `lib/jobs/reminder-dispatch.ts`.
- Added cron route: `POST /api/v1/jobs/reminders`.
- Added persistent nudge storage via new `coach_nudges` table.
- Dashboard now reads and renders same-day nudges.

3. AI trust layer (confidence/explainability)
- `analyze-meal`, `vision`, and `body-comp` now return reliability metadata:
  - `confidence_score`
  - `explanation`
  - `limitations`
- Nutrition, Motion, and Body Comp UI now surface confidence + limitation context.

### P1

1. Multi-week planning
- Added weekly plan composer: `lib/plan/compose-weekly-plan.ts`.
- Added API: `GET/POST /api/v1/plan/weekly`.
- Added `weekly_plans` persistence table.
- Daily plan generation now consumes weekly plan + schedule preferences.

2. In-workout adaptation
- Added API: `POST /api/v1/plan/swap-exercise`.
- Guided workout UI now supports live `Swap Exercise` and injury-triggered swaps.

3. Retention risk engine
- Added API: `POST /api/v1/ai/retention-risk`.
- Dashboard now fetches and shows risk level, reasons, and recommended action.
- Medium/high risk can seed coach nudges.

### P2

1. Hybrid coach escalation
- Added persistence table: `coach_escalations`.
- Added API: `GET/POST /api/v1/coach/escalate`.
- Added UI flow: `/coach/escalate` with request form + status list.

2. Schedule/calendar personalization
- Added settings UI for preferred training days + training window.
- Saved in `user_profile.devices.training_schedule`.
- Daily/weekly planning now uses schedule preferences.

3. Deeper analytics
- Added API: `GET /api/v1/analytics/performance`.
- Added dashboard analytics section + progress analytics card.

## Schema changes

Migration added:
- `supabase/migrations/20260301000006_priority_features.sql`

Tables:
- `weekly_plans`
- `coach_nudges`
- `coach_escalations`

## Tests added

- `app/api/v1/plan/weekly/route.test.ts`
- `app/api/v1/ai/retention-risk/route.test.ts`
- `app/api/v1/plan/swap-exercise/route.test.ts`
- `app/api/v1/coach/escalate/route.test.ts`
- `app/api/v1/jobs/reminders/route.test.ts`

## Operational additions

- NPM script: `npm run reminders:dispatch`
- Env additions documented: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, Twilio + Stripe server vars.
- API/runbook/smoke checklist updated for new routes and workflows.
