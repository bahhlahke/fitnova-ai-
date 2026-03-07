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

## 5. iOS implementation status

**Implemented:** Auth (magic link, deep link), Dashboard (briefing, plan, performance, nudges), Plan (weekly, day detail, weekly insight), Coach (chat, escalate list/create/messages), Log workout (list, quick log), Log nutrition (meals, targets, analyze meal + append to log), Progress (list, add entry), Check-in, Settings (profile, export, sign out). Robust networking (timeout, URL handling), full API client, Supabase data layer, loading/error/empty components.

**All implemented:** Guided workout, body comp scan (photo picker), fridge scanner, meal plan/recipe gen, Integrations (Apple Health via HealthKit, Whoop link), community/friends, pricing/Stripe, onboarding gate, telemetry.

**Parity with web:**  
- **History** — Log → “Workouts & nutrition”: tabs Workouts / Nutrition, list by date, expand details, edit workout (type, duration, notes).  
- **Vitals** — Settings → “Vitals”: today’s readiness via `ai/readiness-insight` (server uses workouts, check-ins, connected_signals).  
- **Motion Lab** — Log → “Form check (Motion Lab)”: pick 1–3 photos → `ai/vision` (images array); score, critique, correction.

**Web-only (no iOS equivalent):** `/start` (pre-auth assessment), `/omni` (redirects to ?focus=ai), `/vitals/cycle` (cycle tracking), `/admin`, `/coach/ops`, `/coach/queue` (internal/ops).
