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
| `/motion` | Motion Lab: video → frames → AI form analysis (score, critique, correction). | API: ai/vision (POST body: `images` array). |

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

## 5. iOS implementation status — 100% feature parity

**Core:** Auth (magic link, deep link), Dashboard (briefing, plan, performance, **projection card**, **retention risk card**, nudges with **Dismiss/ack**), Plan (weekly, day detail, weekly insight), Coach (chat, escalate list/create/messages), Log workout (list, quick log, **swipe-to-delete**, **process-prs + awards after save**), Guided workout (**process-prs + awards after save**), Log nutrition (meals, targets, **hydration** +0.5 L / reset, **barcode lookup**, **analyze meal** + append, **edit/delete meal**, **nutrition insight**, **meal suggestions**, **awards after add**), Progress (list, add, body comp scan, **AI performance synthesis / progress insight**, **projection**), Check-in, History (workouts + nutrition tabs, expand, edit workout), Vitals (readiness insight), Motion Lab (Form check, 1–3 photos → vision API), Settings (profile, **Edit profile**, **Badges**, Vitals, Integrations, export, onboarding, Pricing, sign out), Integrations (Apple Health, Whoop, **Spotify**), Community/friends, Pricing/Stripe, Onboarding, telemetry.

**Parity details:**  
- **Dashboard:** Projection card (GET `ai/projection` → 12-week projection, confidence, 4-week); Retention Monitor card (POST `ai/retention-risk` with localDate → risk_level, risk_score, recommended_action).  
- **Workout:** Delete workout (swipe); after quick log or guided save → `analytics/process-prs` + `awards/check`.  
- **Nudges:** “Dismiss” calls `coach/nudges/:id/ack`.  
- **Nutrition:** Hydration card (goal 2.5 L, +0.5 L, Reset); barcode field + “Look up” → `nutrition/barcode` then “Add to log”; “Get insight” → `ai/nutrition-insight`; “Suggest meals” → `ai/meal-suggestions`; Edit/Delete per meal; awards/check after adding meal.  
- **Settings:** “Edit profile” (name, age, sex, height, weight, goals, activity level) → `user_profile` upsert; “Badges” → `user_badges` + `badge_definitions` read.

- **Progress:** "AI Performance Synthesis" (POST `ai/progress-insight`); Projection section (GET `ai/projection` → 12-week); list, add entry, body comp scan.
- **Spotify:** Integrations → Music → Spotify. Status via `GET /api/v1/spotify/token`; Connect uses Supabase auth linkIdentity(provider: .spotify). Fallback: open web `/integrations`.

**Web-only (no iOS equivalent):** `/start` (pre-auth assessment), `/omni` (redirects to ?focus=ai), `/vitals/cycle` (cycle tracking), `/admin`, `/coach/ops`, `/coach/queue` (internal/ops). Apple Health **file** import (web): iOS uses native HealthKit sync instead.
