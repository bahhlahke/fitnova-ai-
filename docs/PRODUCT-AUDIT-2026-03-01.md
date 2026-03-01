# FitNova Product Audit (March 1, 2026)

## Scope

This audit covers:
- User-facing workflows across all current routes/APIs in this repository.
- AI features (chat actions, insights, planning, vision/body-comp, SMS).
- UX, product, and technical risks that block better outcomes.

Code areas reviewed:
- `app/` routes and API handlers
- `components/` dashboard + AI surfaces
- `lib/plan`, `lib/ai`, `lib/jobs`
- Supabase migrations and typed domain models
- Existing smoke checklist and tests

## Current Product Capabilities

### 1) Acquisition and activation

Implemented:
- Signed-out landing with assessment CTA (`/` -> `/start` -> `/auth` -> `/onboarding`).
- Assessment draft persistence before auth (`lib/funnel/preauth`).
- Magic link and Google auth, safe callback redirect.

Strengths:
- Fast qualification funnel.
- Resume-from-assessment flow is implemented and test-backed.

Gaps:
- No dynamic paywall/offer testing by segment.
- No social proof, outcomes proof, or personalization before signup.
- No explicit “time to first value” instrumentation.

### 2) Daily coaching command center

Implemented:
- Dashboard aggregates plan, readiness, weekly recap, projection, quick actions.
- Embedded AI panel can execute logging actions (`log_meal`, `log_workout`, `log_biometrics`) and refresh UI scopes.
- “Generate protocol” button creates daily plan.

Strengths:
- Strong command-surface pattern (single AI + action chips + scoped refresh).
- Good foundation for habit-forming daily loop.

Gaps:
- Plan generation is currently heuristic-only (`lib/plan/compose-daily-plan.ts`), not model-adaptive.
- No explanation layer for *why* plan changed day-over-day (trust/coach transparency).
- No hard accountability loop (missed-day recovery flows, commitment contracts, coach checkbacks).

### 3) Workout and execution

Implemented:
- Quick-log workouts.
- Guided workout mode with set/rest state machine and completion persistence.
- Motion Lab video frame extraction + AI critique endpoint.
- Post-workout AI insight.

Strengths:
- Guided experience is substantially better than simple logging apps.
- Clear path from plan -> execution -> reflection.

Gaps:
- No progression engine (exercise-level overload history, volume landmarks, PR intelligence).
- No in-session adaptation (swap alternatives without leaving guided flow).
- Motion analysis is single-pass; no “drill prescription + re-test loop”.

### 4) Nutrition

Implemented:
- Text/photo meal estimation.
- Manual add fallback.
- Macro/target progress UI + hydration.
- Meal suggestions and nutrition insight endpoints.
- Pre-fill from plan meal structure.

Strengths:
- Good speed-to-log and fallback behavior.
- Strong practical blend of manual and AI-assisted entry.

Gaps:
- No pantry/grocery/meal prep continuity.
- No compliance scoring by meal timing adherence vs planned structure.
- No confidence calibration feedback loop to improve estimation accuracy per user.

### 5) Progress, readiness, and body composition

Implemented:
- Manual check-ins (weight/body fat/measurements/notes).
- AI progress narrative + projection endpoint.
- Body comp scanner route and endpoint with persistence.
- Daily readiness check-in route.

Strengths:
- Multi-signal progress framework exists (workouts + nutrition + progress + check-ins).
- Good surface area for AI longitudinal coaching.

Gaps:
- Projection logic depends on adherence score, but check-in UI does not expose adherence input.
- No confidence intervals or uncertainty communication in projections/body-comp output.
- No “plateau protocol” automation when trends stall.

### 6) Settings, channels, data portability, monetization

Implemented:
- Profile + AI preferences + reminder preferences.
- Apple Health import from XML/ZIP.
- SMS coaching (Twilio inbound + scheduled daily briefing job).
- Stripe checkout/webhook + subscription status fields.
- JSON/CSV data export.

Strengths:
- Broad platform readiness (billing, SMS, import/export).
- Good user control over core profile/AI tone.

Gaps:
- Reminder preferences are stored but not connected to a complete outbound reminder system.
- Pro entitlements are not strongly feature-gated in product surface.
- No lifecycle retention tooling (churn-risk flags, win-back journeys, adaptive reactivation campaigns).

## AI-Specific Findings

### What is working

- AI action execution in chat is meaningful and tied to data model.
- Context assembly includes profile + recent activity + prior messages.
- Specialized insight endpoints create digestible, role-specific coaching outputs.
- Vision/body-comp + motion features differentiate from basic trackers.

### Highest-value AI improvements

1. Replace single-day heuristic planner with hybrid planning:
- deterministic safety constraints + model-generated plan variants + scorer.

2. Add coach explainability contract:
- every adaptive change should cite trigger signals (sleep, soreness, trend, adherence).

3. Introduce confidence + fallback UX for all AI outputs:
- especially body comp, motion critique, and nutrition estimation.

4. Build closed-loop adaptation:
- user feedback (“too hard”, “painful”, “unrealistic”) should rewrite next plan automatically.

5. Build proactive AI coaching:
- daily “next best action” nudges based on detected risk (missed logs, low recovery, under-protein days).

## Workflow Risk Register (User Impact First)

### P0 (immediate)

- Missing end-to-end workflow validation automation across all routes/APIs.
- No production-grade accountability loop (stored reminders without complete delivery loop).
- Inconsistent trust layer around AI confidence and uncertainty for high-impact outputs.

### P1 (next)

- No multi-week periodized planning or progression intelligence.
- No frictionless in-workout adaptation (exercise substitutions inside guided flow).
- Limited behavioral retention tooling (streak rescue, recovery-day alternatives, reactivation flows).

### P2 (later)

- No social/community or coach-layer hybrid mode.
- Limited personalization around schedule/calendar constraints.
- No deeper performance analytics (volume balance, movement quality trendline, readiness trend diagnostics).

## Recommended Roadmap

### Phase 1 (2-3 weeks)

- Ship AI workflow validation harness (added in this pass) and run it in CI/nightly.
- Add confidence metadata and uncertainty copy for vision/body-comp/nutrition outputs.
- Implement reminder dispatch loop tied to current reminder preferences.

### Phase 2 (3-5 weeks)

- Upgrade planner to hybrid AI + rules model with explanation payload.
- Add adaptation feedback controls on dashboard/guided workout (“too hard”, “too easy”, “pain”).
- Add recovery fallback protocols automatically when readiness is low.

### Phase 3 (5-8 weeks)

- Add progression/periodization engine (weekly microcycle, deload logic, overload recommendations).
- Add retention intelligence (drop-off scoring + auto-interventions).
- Expand premium differentiation (priority AI coaching pathways + advanced analytics package).

## Metrics to Track

Primary:
- Activation rate: assessment start -> completed onboarding.
- Day-7 retention and Day-30 retention.
- Weekly active logging days per user.
- AI action completion rate (actions suggested vs accepted/completed).
- Time-to-first-value (first successful logged workout + nutrition entry + plan generation).

Secondary:
- Guided workout completion rate.
- Meal estimation correction rate.
- Motion/body-comp repeat usage.
- Pro conversion and 30-day pro retention.

## Validation Coverage Status (Before New Harness)

Existing tests strongly cover:
- Core API contract behavior.
- Redirect integrity.
- Key funnel and settings edges.

Existing tests weakly cover:
- Cross-route workflow continuity under realistic user behavior.
- AI-assisted UX friction/regression detection.
- Persona-based acceptance criteria at workflow level.

This gap is addressed by the newly added `scripts/ai-workflow-validator.mjs` workflow harness.
