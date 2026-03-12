# Koda AI — iOS Parity Map

Concise feature and API map for building an iOS app with full parity to the web app.

---

## 1. Routes (app/**/page.tsx)

| Route | Description | API / Supabase |
|-------|-------------|----------------|
| `/` | Dashboard: today's plan, readiness, quick-log, AI coach, retention nudges, performance summary. | Supabase: `workout_logs`, `daily_plans`, `user_profile`, `check_ins`; API: plan/weekly, analytics/performance, plan/daily, readiness-insight, weekly-insight, projection, briefing, retention-risk. |
| `/auth` | Sign-in: email OTP and Google OAuth. | Supabase Auth. |
| `/onboarding` | Multi-step onboarding: stats, goals, injuries, diet, devices; writes profile + onboarding. | Supabase: `user_profile`, `onboarding`. |
| `/start` | Pre-auth assessment; saves draft. | Local/preauth draft only. |
| `/plan` | Weekly plan view: days, today's plan, adapt day/session, swap exercise, AI insight. | Supabase: `user_profile`; API: plan/weekly, adapt-day, weekly-insight. |
| `/log/workout` | List/edit workouts; post-workout insight. | Supabase: `workout_logs`; API: post-workout-insight, process-prs, awards/check. |
| `/log/workout/guided` | Guided session from plan: exercises, sets, rest, swap, coach audio, save workout. | Supabase: `daily_plans`, `workout_logs`; API: coach/audio, swap-exercise, post-workout-insight, workout-feedback, process-prs, awards/check. |
| `/log/nutrition` | Log meals (text/image), barcode, targets, AI analyze meal, nutrition insight, meal suggestions. | Supabase: `nutrition_logs`, `nutrition_targets`; API: nutrition/barcode, analyze-meal, nutrition-insight, meal-suggestions, awards/check. |
| `/progress` | Progress list, add entry, projection, AI progress insight. | Supabase: `progress_tracking`, `user_profile`, `workout_logs`; API: plan/weekly, analytics/performance, projection, progress-insight. |
| `/progress/add` | Manual progress entry (weight, body fat, measurements). | Supabase: `progress_tracking`, `user_profile`. |
| `/progress/scan` | Body composition scan (images) → body fat + analysis. | API: ai/body-comp; Supabase: `progress_tracking`. |
| `/check-in` | Daily check-in: energy, sleep, soreness, adherence. | Supabase: `check_ins`. |
| `/coach/escalate` | List requests, create request, view/send messages. | API: coach/escalate, coach/escalate/[id]/messages. |
| `/settings` | Profile, units, equipment, schedule, auth, badges, Apple Health import, export. | Supabase: `user_profile`, `user_badges`; API: stripe/checkout, export. |
| `/integrations` | List providers; show connected via `connected_signals`. | Supabase: `connected_signals`; Whoop connect/callback/sync. |
| `/community`, `/community/friends` | Groups, challenges, friends, accountability partner. | API: social/friends, social/accountability, community/challenges. |
| `/pricing` | Pricing; Stripe checkout for Pro. | API: stripe/checkout. |
| `/history` | Workout & nutrition history; filter workouts, expand details, edit workout. | Supabase: `workout_logs`, `nutrition_logs`. |
| `/vitals` | Readiness, biometrics, recovery suggestion, AI readiness insight. | API: ai/readiness-insight; Supabase: `workout_logs`, `check_ins`, `connected_signals`. |
| `/motion` | Motion Lab: realtime on-device pose tracking with live cues plus local-first photo pose analysis and automatic server fallback. | iOS local Vision pose runtime for live and photo analysis; fallback API: ai/vision (POST body: `images` array). |
| `/omni` | Universal search and command bar. | API: ai/respond. |
| `/terms`, `/privacy` | Legal documentation. | Static. |
| `/habits`, `/metrics` | Habit tracking and deep-dive performance metrics. | Supabase: `user_habits`, `workout_logs`. |

---

## 2. API Endpoints (app/api/v1/) — iOS-relevant

Plan: weekly (GET/POST), daily (POST), adapt-day (POST), adapt-session (POST), swap-exercise (POST).
AI: respond (POST), briefing (POST), readiness-insight (POST), weekly-insight (POST), progress-insight (POST), projection (GET), analyze-meal (POST), meal-suggestions (POST), nutrition-insight (POST), body-comp (POST), vision (POST), post-workout-insight (POST), workout-feedback (POST), retention-risk (POST), feedback (POST).
Coach: escalate (GET/POST), escalate/active (GET), escalate/[id]/messages (GET/POST), nudges/[id]/ack (POST), audio (POST).
Nutrition: targets (GET/POST), adherence/daily (POST), barcode (GET), fridge-scanner (POST).
Analytics: performance (GET), process-prs (POST).
Progression: next-targets (GET), recompute (POST).
Social: friends (GET/POST), accountability (GET/POST).
Community: challenges (GET/POST).
Billing: stripe/checkout (POST).
Other: export (GET), telemetry/event (POST), awards/check (POST).

---

## 3. Data (Supabase tables)

Core: `user_profile`, `workout_logs`, `nutrition_logs`, `progress_tracking`, `daily_plans`, `weekly_plans`, `check_ins`, `onboarding`, `nutrition_targets`, `nutrition_adherence_daily`, `meal_plans`.
Coach: `coach_nudges`, `coach_escalations`, `coach_escalation_messages`.
Integrations: `connected_accounts`, `connected_signals`.
Social: `user_connections`, `groups`, `group_members`, challenges.
Other: `user_cycle_logs`, `user_badges`, `product_events`.

---

## 4. User Flows

Auth → Onboarding → Dashboard (plan, briefing, quick actions) → Plan (weekly, adapt, swap) → Log workout (list, quick, guided) → Log nutrition (meals, targets, AI) → Progress (list, add, scan) → Check-in → Settings (profile, export) → Coach (chat, escalate) → Integrations → Community/Friends → Pricing.

## 5. iOS implementation status

Current implementation covers the major user flows and API surfaces, but "production ready" still depends on passing XCTest reliably and validating device-bound integrations on hardware.

**Core:** Auth (magic link, deep link), Dashboard (briefing, plan, performance, **projection card**, **retention risk card**, nudges with **Dismiss/ack**), Plan (weekly, day detail, weekly insight), Coach (chat, escalate list/create/messages), Log workout (list, quick log, **swipe-to-delete**, **process-prs + awards after save**), Guided workout (**process-prs + awards after save** plus realtime form check sheet), Log nutrition (meals, targets, **hydration** +0.5 L / reset, **barcode lookup**, **analyze meal** + append, **edit/delete meal**, **nutrition insight**, **meal suggestions**, **awards after add**), Progress (list, add, body comp scan, **AI performance synthesis / progress insight**, **projection**), Check-in, History (workouts + nutrition tabs, expand, edit workout), Vitals (readiness insight), Motion Lab (Realtime multi-lift form check with skeleton overlay, rep counting, live cues, camera-derived velocity summaries, local benchmark artifacts, and photo fallback), Settings (profile, **Edit profile**, **Badges**, Vitals, Integrations, export, onboarding, Pricing, sign out), Integrations (Apple Health, Whoop, **Spotify playback controls**), Community/friends, Pricing/Stripe, Onboarding, telemetry.

**Parity details:**  
- **Dashboard:** Projection card; Retention Monitor card; **AI Briefing Terminal** (interactive shell with causal rationale).
- **Workout:** Delete workout (swipe); after save → `analytics/process-prs` + `awards/check`.  
- **Nudges:** “Dismiss” calls `coach/nudges/:id/ack`.  
- **Nutrition:** Hydration card; barcode lookup; “Analyze meal” via AI; “Get insight” → `ai/nutrition-insight`.
- **Settings:** “Edit profile”; **Elite Protocols / Badges** system with **Neural Rationale** justificaitons.
- **Onboarding:** Multi-step with **Elite Squad selection** parity.

- **Progress:** "AI Performance Synthesis" (POST `ai/progress-insight`); **Evolutionary Summary** (POST `ai/history-summary`).
- **Spotify:** Native playback state and transport controls using the Supabase linked provider token, with Spotify scopes requested during account linking.
- **Motion Lab:** Realtime Vision pose analysis now supports squat, hinge, press, and pull rule packs with skeleton overlay, rep segmentation, live cueing, camera-derived velocity/dropoff summaries, and local benchmark JSON artifacts. Photo-based analysis still runs locally first and records source/latency/confidence metadata.
- **Benchmark artifacts:** Realtime sessions save JSON reports under the app documents directory (`MotionLabReports/<pattern>/...json`) and expose the saved path in the Motion Lab and Guided Workout result cards for operator collection.

**Validated on simulator:** Home, Plan, Coach, Log, Log Workout, Log Nutrition, Guided Workout, Motion Lab, Progress, Body Scan, History, Check-in, Community, Settings, Integrations, Vitals, Pricing, Badges, Coach Support, Meal Plan, Fridge Scanner, Onboarding. `npm run test:ios:surfaces` now launches these screens in deterministic demo mode, captures primary plus state variants where relevant, and adds a tighter layout sanity pass on `iPhone 16e`.

**Still requires manual device/account validation:** Apple Health read permissions and live sample sync on physical iPhone; Spotify playback control against an active Spotify device; realtime Motion Lab performance on supported hardware; stable end-to-end XCTest execution in the host app when CoreSimulator is healthy.

**Web-only (no iOS equivalent):** `/admin`, `/coach/ops`. Apple Health **file** import (web).
