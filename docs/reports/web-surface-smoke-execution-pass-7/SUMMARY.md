# Web Surface Smoke Report

- Generated (UTC): 2026-03-14T02:57:13.240Z to 2026-03-14T03:16:58.949Z
- Base URL: http://localhost:3005
- Auth bootstrap: /api/v1/auth/mock-login?next=/
- Surfaces checked: 36
- Pass: 1
- Fail: 35

| Viewport | Surface | Route | Status | Pass |
|---|---|---|---|---|
| Desktop 1440 | Landing page | `/` | 200 | yes |
| Desktop 1440 | Assessment start | `/start` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/start", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Authentication | `/auth` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/auth", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Onboarding | `/onboarding?resume=1` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/onboarding?resume=1", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Dashboard AI command center | `/?focus=ai` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/?focus=ai", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Weekly plan | `/plan` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/plan", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Workout log | `/log/workout` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/log/workout", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Guided workout | `/log/workout/guided` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/log/workout/guided", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Motion Lab | `/motion` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/motion", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Nutrition log | `/log/nutrition` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/log/nutrition", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Progress | `/progress` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/progress", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Daily check-in | `/check-in` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/check-in", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | History | `/history?tab=workouts` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/history?tab=workouts", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Community | `/community` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/community", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Settings | `/settings` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/settings", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Integrations | `/integrations` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/integrations", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Pricing | `/pricing` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/pricing", waiting until "domcontentloaded"[22m
 | no |
| Desktop 1440 | Coach support | `/coach/escalate` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/coach/escalate", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Landing page | `/` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Assessment start | `/start` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/start", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Authentication | `/auth` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/auth", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Onboarding | `/onboarding?resume=1` | page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/onboarding?resume=1", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Dashboard AI command center | `/?focus=ai` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/?focus=ai
Call log:
[2m  - navigating to "http://localhost:3005/?focus=ai", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Weekly plan | `/plan` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/plan
Call log:
[2m  - navigating to "http://localhost:3005/plan", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Workout log | `/log/workout` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/log/workout
Call log:
[2m  - navigating to "http://localhost:3005/log/workout", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Guided workout | `/log/workout/guided` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/log/workout/guided
Call log:
[2m  - navigating to "http://localhost:3005/log/workout/guided", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Motion Lab | `/motion` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/motion
Call log:
[2m  - navigating to "http://localhost:3005/motion", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Nutrition log | `/log/nutrition` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/log/nutrition
Call log:
[2m  - navigating to "http://localhost:3005/log/nutrition", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Progress | `/progress` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/progress
Call log:
[2m  - navigating to "http://localhost:3005/progress", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Daily check-in | `/check-in` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/check-in
Call log:
[2m  - navigating to "http://localhost:3005/check-in", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | History | `/history?tab=workouts` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/history?tab=workouts
Call log:
[2m  - navigating to "http://localhost:3005/history?tab=workouts", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Community | `/community` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/community
Call log:
[2m  - navigating to "http://localhost:3005/community", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Settings | `/settings` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/settings
Call log:
[2m  - navigating to "http://localhost:3005/settings", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Integrations | `/integrations` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/integrations
Call log:
[2m  - navigating to "http://localhost:3005/integrations", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Pricing | `/pricing` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/pricing
Call log:
[2m  - navigating to "http://localhost:3005/pricing", waiting until "domcontentloaded"[22m
 | no |
| iPhone 15 | Coach support | `/coach/escalate` | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/coach/escalate
Call log:
[2m  - navigating to "http://localhost:3005/coach/escalate", waiting until "domcontentloaded"[22m
 | no |

## Desktop 1440 — Landing page

- Route: `/`
- Final URL: http://localhost:3005/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 3475
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/landing.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER READY FOR TODAY ⚡ 50% CURRENT STREAK 🔥 0 DAYS WORKOUTS THIS WEEK 📊 0 FOOD TARGET TODAY 🥗 BUILD PLAN START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. Ready For Today combines your recent training, check-ins, and recovery signals so you know whether to push, maintain, or take it easier. 1. Review your energy today. 2. Generate today’s plan. 3. Come back after one action for coach feedback. GENERATE TODAY'S PLAN QUICK CHECK-IN FIRST TODAY'S COACHING SUMMARY TODAY'S FOCUS Building today’s plan... Step 1 is to generate your plan so Koda can show the recommended workout focus. “Generate today’s plan and complete one key action (workout or nutrition log).” COACH SUMMARY Step 1: generate today's plan. Step 2: complete one action. Step 3: return here for your coach summary. 🛡️ WHY THIS MATTERS Plain-English rule: if readiness looks low, choose an easier day or ask Coach to adapt the plan before you start. FATIGUE WARNING Your current heart-rate variability has shown …

## Desktop 1440 — Assessment start

- Route: `/start`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: No auth bootstrap required.
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/assessment.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/start", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Authentication

- Route: `/auth`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: No auth bootstrap required.
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/auth.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/auth", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/onboarding.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/onboarding?resume=1", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/dashboard.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/?focus=ai", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Weekly plan

- Route: `/plan`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/plan.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/plan", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Workout log

- Route: `/log/workout`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/log_workout.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/log/workout", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Guided workout

- Route: `/log/workout/guided`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/guided_workout.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/log/workout/guided", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Motion Lab

- Route: `/motion`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/motion_lab.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/motion", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Nutrition log

- Route: `/log/nutrition`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/nutrition.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/log/nutrition", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Progress

- Route: `/progress`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/progress.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/progress", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Daily check-in

- Route: `/check-in`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/check_in.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/check-in", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — History

- Route: `/history?tab=workouts`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/history.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/history?tab=workouts", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Community

- Route: `/community`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/community.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/community", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Settings

- Route: `/settings`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/settings.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/settings", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Integrations

- Route: `/integrations`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/integrations.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/integrations", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Pricing

- Route: `/pricing`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/pricing.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/pricing", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## Desktop 1440 — Coach support

- Route: `/coach/escalate`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/desktop/coach_support.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/coach/escalate", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Landing page

- Route: `/`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: No auth bootstrap required.
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/landing.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Assessment start

- Route: `/start`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: No auth bootstrap required.
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/assessment.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/start", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Authentication

- Route: `/auth`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: No auth bootstrap required.
- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/auth.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/auth", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/onboarding.png`
- Error: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/onboarding?resume=1", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/dashboard.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/?focus=ai
Call log:
[2m  - navigating to "http://localhost:3005/?focus=ai", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Weekly plan

- Route: `/plan`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/plan.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/plan
Call log:
[2m  - navigating to "http://localhost:3005/plan", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Workout log

- Route: `/log/workout`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/log_workout.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/log/workout
Call log:
[2m  - navigating to "http://localhost:3005/log/workout", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Guided workout

- Route: `/log/workout/guided`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/guided_workout.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/log/workout/guided
Call log:
[2m  - navigating to "http://localhost:3005/log/workout/guided", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Motion Lab

- Route: `/motion`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/motion_lab.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/motion
Call log:
[2m  - navigating to "http://localhost:3005/motion", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Nutrition log

- Route: `/log/nutrition`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/nutrition.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/log/nutrition
Call log:
[2m  - navigating to "http://localhost:3005/log/nutrition", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Progress

- Route: `/progress`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/progress.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/progress
Call log:
[2m  - navigating to "http://localhost:3005/progress", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Daily check-in

- Route: `/check-in`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/check_in.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/check-in
Call log:
[2m  - navigating to "http://localhost:3005/check-in", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — History

- Route: `/history?tab=workouts`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/history.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/history?tab=workouts
Call log:
[2m  - navigating to "http://localhost:3005/history?tab=workouts", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Community

- Route: `/community`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/community.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/community
Call log:
[2m  - navigating to "http://localhost:3005/community", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Settings

- Route: `/settings`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/settings.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/settings
Call log:
[2m  - navigating to "http://localhost:3005/settings", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Integrations

- Route: `/integrations`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/integrations.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/integrations
Call log:
[2m  - navigating to "http://localhost:3005/integrations", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Pricing

- Route: `/pricing`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/pricing.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/pricing
Call log:
[2m  - navigating to "http://localhost:3005/pricing", waiting until "domcontentloaded"[22m

- Text preview: (empty)

## iPhone 15 — Coach support

- Route: `/coach/escalate`
- Final URL: not reached
- HTTP status: n/a
- Auth bootstrap: page.goto: Timeout 25000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:3005/api/v1/auth/mock-login?next=/", waiting until "domcontentloaded"[22m

- Text length: 0
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-7/mobile/coach_support.png`
- Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/coach/escalate
Call log:
[2m  - navigating to "http://localhost:3005/coach/escalate", waiting until "domcontentloaded"[22m

- Text preview: (empty)

