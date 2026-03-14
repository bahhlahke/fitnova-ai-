# Web Surface Smoke Report

- Generated (UTC): 2026-03-14T02:43:35.376Z to 2026-03-14T02:45:33.904Z
- Base URL: http://localhost:3003
- Auth bootstrap: /api/v1/auth/mock-login?next=/
- Surfaces checked: 36
- Pass: 32
- Fail: 4

| Viewport | Surface | Route | Status | Pass |
|---|---|---|---|---|
| Desktop 1440 | Landing page | `/` | text too short (48) | no |
| Desktop 1440 | Assessment start | `/start` | 200 | yes |
| Desktop 1440 | Authentication | `/auth` | 200 | yes |
| Desktop 1440 | Onboarding | `/onboarding?resume=1` | 200 | yes |
| Desktop 1440 | Dashboard AI command center | `/?focus=ai` | text too short (48) | no |
| Desktop 1440 | Weekly plan | `/plan` | 200 | yes |
| Desktop 1440 | Workout log | `/log/workout` | 200 | yes |
| Desktop 1440 | Guided workout | `/log/workout/guided` | 200 | yes |
| Desktop 1440 | Motion Lab | `/motion` | 200 | yes |
| Desktop 1440 | Nutrition log | `/log/nutrition` | 200 | yes |
| Desktop 1440 | Progress | `/progress` | 200 | yes |
| Desktop 1440 | Daily check-in | `/check-in` | 200 | yes |
| Desktop 1440 | History | `/history?tab=workouts` | 200 | yes |
| Desktop 1440 | Community | `/community` | 200 | yes |
| Desktop 1440 | Settings | `/settings` | 200 | yes |
| Desktop 1440 | Integrations | `/integrations` | 200 | yes |
| Desktop 1440 | Pricing | `/pricing` | 200 | yes |
| Desktop 1440 | Coach support | `/coach/escalate` | 200 | yes |
| iPhone 15 | Landing page | `/` | text too short (48) | no |
| iPhone 15 | Assessment start | `/start` | 200 | yes |
| iPhone 15 | Authentication | `/auth` | 200 | yes |
| iPhone 15 | Onboarding | `/onboarding?resume=1` | 200 | yes |
| iPhone 15 | Dashboard AI command center | `/?focus=ai` | text too short (48) | no |
| iPhone 15 | Weekly plan | `/plan` | 200 | yes |
| iPhone 15 | Workout log | `/log/workout` | 200 | yes |
| iPhone 15 | Guided workout | `/log/workout/guided` | 200 | yes |
| iPhone 15 | Motion Lab | `/motion` | 200 | yes |
| iPhone 15 | Nutrition log | `/log/nutrition` | 200 | yes |
| iPhone 15 | Progress | `/progress` | 200 | yes |
| iPhone 15 | Daily check-in | `/check-in` | 200 | yes |
| iPhone 15 | History | `/history?tab=workouts` | 200 | yes |
| iPhone 15 | Community | `/community` | 200 | yes |
| iPhone 15 | Settings | `/settings` | 200 | yes |
| iPhone 15 | Integrations | `/integrations` | 200 | yes |
| iPhone 15 | Pricing | `/pricing` | 200 | yes |
| iPhone 15 | Coach support | `/coach/escalate` | 200 | yes |

## Desktop 1440 — Landing page

- Route: `/`
- Final URL: http://localhost:3003/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 48
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/landing.png`
- Error: text too short (48)
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456221898 | 404 script /_next/static/chunks/main-app.js?v=1773456221898 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Preparing your dashboard...

## Desktop 1440 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3003/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 672
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/assessment.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456224995 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456224995 | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app/start/page.js
- Text preview: Skip to main content Quick assessment Build Your Legend Step 01 / 07 What is your primary goal right now? Weight lossThis choice helps Koda shape your first plan.Muscle gainThis choice helps Koda shape your first plan.MobilityThis choice helps Koda shape your first plan.General fitnessThis choice helps Koda shape your first plan. BackNext Personalized coaching preview Your choices so far These answers shape your first plan Target Goal Weight loss Experience Level Beginner Frequency 3 days Environment Gym Nutrition Focus Calorie control Why this makes sense Based on your beginner experience level, we are shaping a weight loss plan for gym training 3 days.

## Desktop 1440 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3003/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 949
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/auth.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456227612 | 404 script /_next/static/chunks/app/auth/page.js | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456227612
- Text preview: Skip to main content Continue your personalized plan Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today's workout, or logging your first meal. Continue with Google[DEV] Bypass Login EmailSend magic link AI guidance is educational and does not replace medical care. What happens next Here is the exact flow after you sign in so there are no surprises. Step 1 Verify your account Use Google or your email link to sign in securely. Step 2 Open your dashboard See your next best step, whether that is today’s workout, meal log, or check-in. Step 3 Complete one first action Start a workout, log a meal, or finish a quick check-in so Koda can coach you from real data. You will land on open your dashboard after sign-in. Route: / Back to home

## Desktop 1440 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3003/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1244
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/onboarding.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456230470 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456230470 | 404 script /_next/static/chunks/app/onboarding/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Onboarding Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Your body metrics Your body metrics These details help Koda size your workouts, nutrition targets, and recovery guidance correctly. You can update them later in Settings. Age and sex Used to tune recovery guidance, safety ranges, and training adjustments. Height and weight Used to estimate calorie targets, strength ranges, and progress trends. Phone number Optional. Only add it if you want text reminders and account alerts. NamePhone number (optional)Age Age helps Koda scale recovery and training recommendations to your stage of life. Sex used for plan adjustments Select Male Female Other This helps Koda choose the right training and nutrition ranges for you. How you want to see height and weight in / lbs cm / kg Height (in)Weight (lb) Koda uses height and weight to set calorie targets and show progress clearly over time. Next What you unlock Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days Educational AI coa…

## Desktop 1440 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3003/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 48
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/dashboard.png`
- Error: text too short (48)
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456233348 | 404 script /_next/static/chunks/main-app.js?v=1773456233348 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Preparing your dashboard...

## Desktop 1440 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3003/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 308
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/plan.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456237029 | 404 script /_next/static/chunks/main-app.js?v=1773456237029 | 404 script /_next/static/chunks/app/plan/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining Plan NutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Training Plan Your weekly schedule, today’s focus, and how to adjust it safely Composing your training plan... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3003/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 968
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/log_workout.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456240660 | 404 script /_next/static/chunks/main-app.js?v=1773456240660 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app/log/workout/page.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkout Check-InProgressCommunityCoachSettings U Member Workout Capture sessions and keep progression visible Coaching Protocol Initiate Coached Session Plan-aware sequence flow with neural guidance. Begin Guided Experience Coach's Take Plain-English guidance for today's session Keep the main lifts steady today, then finish with one shorter hard effort if your energy still feels good. Motion LabQuery Concierge Quick Workout Log Save the session so your dashboard, plan, and progress stay current Session type Strength Progressive overload Cardio Aerobic conditioning Mobility Movement quality Other Custom session Exercise Details (Optional) Duration (min) 15m30m45m60m How hard it felt (RPE 1-10)Select 1-10 LightMax Save workout Recent sessions Last 20 entries Loading... View historyAnalyze movement Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3003/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 251
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/guided_workout.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456244015 | 404 script /_next/static/chunks/app/log/workout/guided/page.js | 404 script /_next/static/chunks/main-app.js?v=1773456244015 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkout Check-InProgressCommunityCoachSettings U Member Neural Initialization Calibrating session sequence... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3003/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 490
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/motion_lab.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456247358 | 404 script /_next/static/chunks/main-app.js?v=1773456247358 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app/motion/page.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member ← Workout Motion Lab Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. Select Video Neural Verdict Biomechanical integrity status Awaiting Data Upload a movement clip to activate the motion analysis system. Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3003/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1160
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/nutrition.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456250847 | 404 script /_next/static/chunks/app/log/nutrition/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456250847 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutrition WorkoutCheck-InProgressCommunityCoachSettings U Member Nutrition Log meals, track macros, and stay on target Log a meal Choose one: describe it, take a photo, or scan a barcode Fastest option: type a short description. Best estimate: use a clear top-down photo. Packaged food: scan the barcode. New here? Start with a short description like “Greek yogurt, berries, and granola”. You can adjust calories and macros before saving. 1. Choose the fastest method for this meal. 2. Review the AI estimate and edit anything that looks off. 3. Save the meal and Koda updates your daily targets right away. DescribePhotoBarcode Take a Photo Use a clear top-down shot for the best estimate Choose photo Tip: a clear top-down photo with good lighting gives the best results. View historyMeal PlannerFridge ScannerAsk AI on Dashboard Today's targets Based on logged meals 0 kcal Protein0g / 150g Carbs0g / — Fat0g / — Suggest next meal Hydration System Daily Target: 2.5 L 0.0L Intake Volume +0.25L+0.5L Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Progress

- Route: `/progress`
- Final URL: http://localhost:3003/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 603
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/progress.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456254479 | 404 script /_next/static/chunks/main-app.js?v=1773456254479 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/progress/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgress CommunityCoachSettings U Member Progress Track check-ins, see trends, and know what to do next How This Page Works 1. Add a check-in with weight, body fat, or notes. 2. Add another check-in after your next workout or later this week. 3. Koda updates your trend and coach summary here automatically. Add check-inAI body scan After you save a check-in, this page refreshes with your latest numbers, trend, and coach guidance. Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3003/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 241
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/check_in.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456257855 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456257855 | 404 script /_next/static/chunks/app/check-in/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-In ProgressCommunityCoachSettings U Member ← Back System Scan Initializing Bio-Sync... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3003/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 453
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/history.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456260798 | 404 script /_next/static/chunks/main-app.js?v=1773456260798 | 404 script /_next/static/chunks/app/history/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member ← Workout History Past workouts and nutrition Evolutionary Performance Synthesis "Synthesizing longitudinal data strands... Complete at least 5 sessions to establish a stable evolutionary baseline." Session LogsMetabolic Intake Loading... Back to Workout Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Community

- Route: `/community`
- Final URL: http://localhost:3003/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 677
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/community.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456263462 | 404 script /_next/static/chunks/main-app.js?v=1773456263462 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/community/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunity CoachSettings U Member Community Join challenges, find your group, and stay motivated with other members How Community Works 1. Join a challenge or group that matches your style. 2. Keep logging workouts, meals, or steps as usual. 3. Your standing updates as your activity is recorded. Manage Friends Live Challenges Join one challenge, keep logging, and your progress counts automatically Loading... Groups Pick a group that matches your style and stay accountable with people like you Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Settings

- Route: `/settings`
- Final URL: http://localhost:3003/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 258
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/settings.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456266295 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/settings/page.js | 404 script /_next/static/chunks/main-app.js?v=1773456266295 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Settings Profile, AI preferences, and data sources Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3003/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1426
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/integrations.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456269364 | 404 script /_next/static/chunks/main-app.js?v=1773456269364 | 404 script /_next/static/chunks/app/integrations/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Integrations & Devices Connect your wearables to supercharge your AI Coach with real biometric data Setup Instructions Link your device to start syncing in under 2 minutes 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. Loading...Copy 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → Supported Devices Status reflects real data received — not just dashboard links Loading... Biometric data is proc…

## Desktop 1440 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3003/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 971
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/pricing.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456272227 | 404 script /_next/static/chunks/main-app.js?v=1773456272227 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/pricing/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Investment in Excellence Choose your protocol Scale your performance with precision-engineered coaching tiers. Standard 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync Start Free Trial Most Advanced Pro $9.99/mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed Go Pro (Includes Trial) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” Marcus V. Hyrox Elite Athlete Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3003/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 544
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/desktop/coach_support.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456274896 | 404 script /_next/static/chunks/main-app.js?v=1773456274896 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app/coach/escalate/page.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoach Settings U Member ← Dashboard Coach Escalation Hybrid support for blockers, injury concerns, and plan complexity Request Coach Review Escalate when AI guidance needs human oversight Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation Recent Requests Track status of your escalation queue Loading... Return to Dashboard AI Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Landing page

- Route: `/`
- Final URL: http://localhost:3003/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 48
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/landing.png`
- Error: text too short (48)
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456281487 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456281487 | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app/page.js
- Text preview: Skip to main content Preparing your dashboard...

## iPhone 15 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3003/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 672
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/assessment.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456284154 | 404 script /_next/static/chunks/main-app.js?v=1773456284154 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/start/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Quick assessment Build Your Legend Step 01 / 07 What is your primary goal right now? Weight lossThis choice helps Koda shape your first plan.Muscle gainThis choice helps Koda shape your first plan.MobilityThis choice helps Koda shape your first plan.General fitnessThis choice helps Koda shape your first plan. BackNext Personalized coaching preview Your choices so far These answers shape your first plan Target Goal Weight loss Experience Level Beginner Frequency 3 days Environment Gym Nutrition Focus Calorie control Why this makes sense Based on your beginner experience level, we are shaping a weight loss plan for gym training 3 days.

## iPhone 15 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3003/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 949
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/auth.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456286798 | 404 script /_next/static/chunks/main-app.js?v=1773456286798 | 404 script /_next/static/chunks/app/auth/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Continue your personalized plan Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today's workout, or logging your first meal. Continue with Google[DEV] Bypass Login EmailSend magic link AI guidance is educational and does not replace medical care. What happens next Here is the exact flow after you sign in so there are no surprises. Step 1 Verify your account Use Google or your email link to sign in securely. Step 2 Open your dashboard See your next best step, whether that is today’s workout, meal log, or check-in. Step 3 Complete one first action Start a workout, log a meal, or finish a quick check-in so Koda can coach you from real data. You will land on open your dashboard after sign-in. Route: / Back to home

## iPhone 15 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3003/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1244
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/onboarding.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456289293 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456289293 | 404 script /_next/static/chunks/app/onboarding/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Onboarding Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Your body metrics Your body metrics These details help Koda size your workouts, nutrition targets, and recovery guidance correctly. You can update them later in Settings. Age and sex Used to tune recovery guidance, safety ranges, and training adjustments. Height and weight Used to estimate calorie targets, strength ranges, and progress trends. Phone number Optional. Only add it if you want text reminders and account alerts. NamePhone number (optional)Age Age helps Koda scale recovery and training recommendations to your stage of life. Sex used for plan adjustments Select Male Female Other This helps Koda choose the right training and nutrition ranges for you. How you want to see height and weight in / lbs cm / kg Height (in)Weight (lb) Koda uses height and weight to set calorie targets and show progress clearly over time. Next What you unlock Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days Educational AI coa…

## iPhone 15 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3003/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 48
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/dashboard.png`
- Error: text too short (48)
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456292192 | 404 script /_next/static/chunks/main-app.js?v=1773456292192 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Preparing your dashboard...

## iPhone 15 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3003/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 308
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/plan.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456295661 | 404 script /_next/static/chunks/app/plan/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456295661 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining Plan NutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Training Plan Your weekly schedule, today’s focus, and how to adjust it safely Composing your training plan... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3003/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 968
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/log_workout.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456298951 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/main-app.js?v=1773456298951 | 404 script /_next/static/chunks/app/log/workout/page.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkout Check-InProgressCommunityCoachSettings U Member Workout Capture sessions and keep progression visible Coaching Protocol Initiate Coached Session Plan-aware sequence flow with neural guidance. Begin Guided Experience Coach's Take Plain-English guidance for today's session Keep the main lifts steady today, then finish with one shorter hard effort if your energy still feels good. Motion LabQuery Concierge Quick Workout Log Save the session so your dashboard, plan, and progress stay current Session type Strength Progressive overload Cardio Aerobic conditioning Mobility Movement quality Other Custom session Exercise Details (Optional) Duration (min) 15m30m45m60m How hard it felt (RPE 1-10)Select 1-10 LightMax Save workout Recent sessions Last 20 entries Loading... View historyAnalyze movement Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3003/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 251
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/guided_workout.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456302075 | 404 script /_next/static/chunks/main-app.js?v=1773456302075 | 404 script /_next/static/chunks/app/log/workout/guided/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkout Check-InProgressCommunityCoachSettings U Member Neural Initialization Calibrating session sequence... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3003/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 490
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/motion_lab.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456305154 | 404 script /_next/static/chunks/main-app.js?v=1773456305154 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/motion/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member ← Workout Motion Lab Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. Select Video Neural Verdict Biomechanical integrity status Awaiting Data Upload a movement clip to activate the motion analysis system. Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3003/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1160
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/nutrition.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456308225 | 404 script /_next/static/chunks/main-app.js?v=1773456308225 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/log/nutrition/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutrition WorkoutCheck-InProgressCommunityCoachSettings U Member Nutrition Log meals, track macros, and stay on target Log a meal Choose one: describe it, take a photo, or scan a barcode Fastest option: type a short description. Best estimate: use a clear top-down photo. Packaged food: scan the barcode. New here? Start with a short description like “Greek yogurt, berries, and granola”. You can adjust calories and macros before saving. 1. Choose the fastest method for this meal. 2. Review the AI estimate and edit anything that looks off. 3. Save the meal and Koda updates your daily targets right away. DescribePhotoBarcode Take a Photo Use a clear top-down shot for the best estimate Choose photo Tip: a clear top-down photo with good lighting gives the best results. View historyMeal PlannerFridge ScannerAsk AI on Dashboard Today's targets Based on logged meals 0 kcal Protein0g / 150g Carbs0g / — Fat0g / — Suggest next meal Hydration System Daily Target: 2.5 L 0.0L Intake Volume +0.25L+0.5L Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Progress

- Route: `/progress`
- Final URL: http://localhost:3003/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 603
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/progress.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456311336 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773456311336 | 404 script /_next/static/chunks/app/progress/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgress CommunityCoachSettings U Member Progress Track check-ins, see trends, and know what to do next How This Page Works 1. Add a check-in with weight, body fat, or notes. 2. Add another check-in after your next workout or later this week. 3. Koda updates your trend and coach summary here automatically. Add check-inAI body scan After you save a check-in, this page refreshes with your latest numbers, trend, and coach guidance. Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3003/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 241
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/check_in.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456314428 | 404 script /_next/static/chunks/main-app.js?v=1773456314428 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/check-in/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-In ProgressCommunityCoachSettings U Member ← Back System Scan Initializing Bio-Sync... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3003/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 453
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/history.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456317101 | 404 script /_next/static/chunks/app/history/page.js | 404 script /_next/static/chunks/main-app.js?v=1773456317101 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member ← Workout History Past workouts and nutrition Evolutionary Performance Synthesis "Synthesizing longitudinal data strands... Complete at least 5 sessions to establish a stable evolutionary baseline." Session LogsMetabolic Intake Loading... Back to Workout Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Community

- Route: `/community`
- Final URL: http://localhost:3003/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 677
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/community.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456319745 | 404 script /_next/static/chunks/main-app.js?v=1773456319745 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/community/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunity CoachSettings U Member Community Join challenges, find your group, and stay motivated with other members How Community Works 1. Join a challenge or group that matches your style. 2. Keep logging workouts, meals, or steps as usual. 3. Your standing updates as your activity is recorded. Manage Friends Live Challenges Join one challenge, keep logging, and your progress counts automatically Loading... Groups Pick a group that matches your style and stay accountable with people like you Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Settings

- Route: `/settings`
- Final URL: http://localhost:3003/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 258
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/settings.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456322619 | 404 script /_next/static/chunks/main-app.js?v=1773456322619 | 404 script /_next/static/chunks/app/settings/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Settings Profile, AI preferences, and data sources Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3003/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1426
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/integrations.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456325700 | 404 script /_next/static/chunks/app/integrations/page.js | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/main-app.js?v=1773456325700 | 404 script /_next/static/chunks/app-pages-internals.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Integrations & Devices Connect your wearables to supercharge your AI Coach with real biometric data Setup Instructions Link your device to start syncing in under 2 minutes 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. Loading...Copy 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → Supported Devices Status reflects real data received — not just dashboard links Loading... Biometric data is proc…

## iPhone 15 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3003/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 971
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/pricing.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456328602 | 404 script /_next/static/chunks/main-app.js?v=1773456328602 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/pricing/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Investment in Excellence Choose your protocol Scale your performance with precision-engineered coaching tiers. Standard 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync Start Free Trial Most Advanced Pro $9.99/mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed Go Pro (Includes Trial) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” Marcus V. Hyrox Elite Athlete Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3003/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 544
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-5/mobile/coach_support.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773456331236 | 404 script /_next/static/chunks/main-app.js?v=1773456331236 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/coach/escalate/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoach Settings U Member ← Dashboard Coach Escalation Hybrid support for blockers, injury concerns, and plan complexity Request Coach Review Escalate when AI guidance needs human oversight Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation Recent Requests Track status of your escalation queue Loading... Return to Dashboard AI Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

