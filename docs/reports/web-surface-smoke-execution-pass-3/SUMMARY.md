# Web Surface Smoke Report

- Generated (UTC): 2026-03-14T02:21:53.442Z to 2026-03-14T02:23:51.625Z
- Base URL: http://localhost:3002
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
- Final URL: http://localhost:3002/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 48
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/landing.png`
- Error: text too short (48)
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454918981 | 404 script /_next/static/chunks/main-app.js?v=1773454918981 | 404 script /_next/static/chunks/app/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Preparing your dashboard...

## Desktop 1440 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3002/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 698
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/assessment.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454922117 | 404 script /_next/static/chunks/app/start/page.js | 404 script /_next/static/chunks/main-app.js?v=1773454922117 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content AI assessment Build Your Legend STEP_IDENT_01 // TOTAL_07 What is your primary goal right now? Weight lossProtocol selection optimized for performance.Muscle gainProtocol selection optimized for performance.MobilityProtocol selection optimized for performance.General fitnessProtocol selection optimized for performance. Abort / BackInitialize Next Step LEGEND_OS v2.4 // SECURE_INTEL_GATED Live Build Selections shape your neural net Target Goal Weight loss XP Baseline Beginner Frequency 3 days Environment Gym Metabolic Focus Calorie control Neural Rationale Based on your beginner status, we are calibrating a weight loss protocol focused on gym execution 3 days.

## Desktop 1440 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3002/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 749
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/auth.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454924793 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/auth/page.js | 404 script /_next/static/chunks/main-app.js?v=1773454924793 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Continue your personalized plan Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today's workout, or logging your first meal. Continue with Google[DEV] Bypass Login EmailSend magic link AI guidance is educational and does not replace medical care. What happens next Here is the exact flow after you sign in so there are no surprises. 1. Verify your account securely. 2. Koda restores your setup and opens the right next screen. 3. Start your first workout, meal log, or coach-guided check-in. Recommended next route: / Back to home

## Desktop 1440 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3002/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 709
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/onboarding.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454927580 | 404 script /_next/static/chunks/main-app.js?v=1773454927580 | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app/onboarding/page.js | 404 script /_next/static/chunks/app-pages-internals.js
- Text preview: Skip to main content Onboarding Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Your body metrics Your body metrics These details help Koda size your workouts, nutrition targets, and recovery guidance correctly. You can update them later in Settings. NamePhone number (optional)AgeSex (for physiology guidance) Select Male Female Other Preferred units in / lbs cm / kg Height (in)Weight (lb) Next What you unlock Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days Educational AI coaching · Not medical care

## Desktop 1440 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3002/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 48
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/dashboard.png`
- Error: text too short (48)
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454930451 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773454930451 | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app/page.js
- Text preview: Skip to main content Preparing your dashboard...

## Desktop 1440 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3002/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 277
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/plan.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454934109 | 404 script /_next/static/chunks/main-app.js?v=1773454934109 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/plan/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining Plan NutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Training Plan Your personalized weekly schedule Composing your training plan... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3002/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 968
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/log_workout.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454937580 | 404 script /_next/static/chunks/main-app.js?v=1773454937580 | 404 script /_next/static/chunks/app/log/workout/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkout Check-InProgressCommunityCoachSettings U Member Workout Capture sessions and keep progression visible Coaching Protocol Initiate Coached Session Plan-aware sequence flow with neural guidance. Begin Guided Experience Coach's Take Plain-English guidance for today's session Keep the main lifts steady today, then finish with one shorter hard effort if your energy still feels good. Motion LabQuery Concierge Quick Workout Log Save the session so your dashboard, plan, and progress stay current Session type Strength Progressive overload Cardio Aerobic conditioning Mobility Movement quality Other Custom session Exercise Details (Optional) Duration (min) 15m30m45m60m How hard it felt (RPE 1-10)Select 1-10 LightMax Save workout Recent sessions Last 20 entries Loading... View historyAnalyze movement Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3002/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 251
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/guided_workout.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454940947 | 404 script /_next/static/chunks/main-app.js?v=1773454940947 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/log/workout/guided/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkout Check-InProgressCommunityCoachSettings U Member Neural Initialization Calibrating session sequence... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3002/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 490
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/motion_lab.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454944373 | 404 script /_next/static/chunks/app/motion/page.js | 404 script /_next/static/chunks/main-app.js?v=1773454944373 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member ← Workout Motion Lab Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. Select Video Neural Verdict Biomechanical integrity status Awaiting Data Upload a movement clip to activate the motion analysis system. Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3002/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 840
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/nutrition.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454947989 | 404 script /_next/static/chunks/app/log/nutrition/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773454947989 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutrition WorkoutCheck-InProgressCommunityCoachSettings U Member Nutrition Log meals, track macros, and stay on target Log a meal Choose one: describe it, take a photo, or scan a barcode Fastest option: type a short description. Best estimate: use a clear top-down photo. Packaged food: scan the barcode. DescribePhotoBarcode Visual Capture Supports primary lens intake Choose photo Tip: a clear top-down photo with good lighting gives the best results. View historyMeal PlannerFridge ScannerAsk AI on Dashboard Today's targets Based on logged meals 0 kcal Protein0g / 150g Carbs0g / — Fat0g / — Suggest next meal Hydration System Daily Target: 2.5 L 0.0L Intake Volume +0.25L+0.5L Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Progress

- Route: `/progress`
- Final URL: http://localhost:3002/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 498
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/progress.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454951478 | 404 script /_next/static/chunks/main-app.js?v=1773454951478 | 404 script /_next/static/chunks/app/progress/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgress CommunityCoachSettings U Member Progress Body composition, trend tracking, and your next best step How To Unlock More Insight Add at least two check-ins to unlock clearer trends and AI summaries. Fastest path: save one manual entry today, then repeat after your next workout or weekly check-in. Manual EntryAI Body Scan Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3002/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 241
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/check_in.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454954881 | 404 script /_next/static/chunks/main-app.js?v=1773454954881 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/check-in/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-In ProgressCommunityCoachSettings U Member ← Back System Scan Initializing Bio-Sync... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3002/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 453
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/history.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454957889 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/history/page.js | 404 script /_next/static/chunks/main-app.js?v=1773454957889 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member ← Workout History Past workouts and nutrition Evolutionary Performance Synthesis "Synthesizing longitudinal data strands... Complete at least 5 sessions to establish a stable evolutionary baseline." Session LogsMetabolic Intake Loading... Back to Workout Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Community

- Route: `/community`
- Final URL: http://localhost:3002/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 478
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/community.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454960641 | 404 script /_next/static/chunks/main-app.js?v=1773454960641 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/community/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunity CoachSettings U Member Community Join challenges, find your group, and stay motivated with other members Manage Friends Live Challenges Simple ways to join community goals and stay accountable this week Loading... Groups Pick a group that matches your style and keep your progress visible Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Settings

- Route: `/settings`
- Final URL: http://localhost:3002/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 258
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/settings.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454963539 | 404 script /_next/static/chunks/main-app.js?v=1773454963539 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/settings/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Settings Profile, AI preferences, and data sources Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3002/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1426
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/integrations.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454966654 | 404 script /_next/static/chunks/main-app.js?v=1773454966654 | 404 script /_next/static/chunks/app/integrations/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Integrations & Devices Connect your wearables to supercharge your AI Coach with real biometric data Setup Instructions Link your device to start syncing in under 2 minutes 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. Loading...Copy 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → Supported Devices Status reflects real data received — not just dashboard links Loading... Biometric data is proc…

## Desktop 1440 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3002/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 971
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/pricing.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454969583 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773454969583 | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app/pricing/page.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Investment in Excellence Choose your protocol Scale your performance with precision-engineered coaching tiers. Standard 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync Start Free Trial Most Advanced Pro $9.99/mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed Go Pro (Includes Trial) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” Marcus V. Hyrox Elite Athlete Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## Desktop 1440 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3002/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 544
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/desktop/coach_support.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454972262 | 404 script /_next/static/chunks/app/coach/escalate/page.js | 404 script /_next/static/chunks/main-app.js?v=1773454972262 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoach Settings U Member ← Dashboard Coach Escalation Hybrid support for blockers, injury concerns, and plan complexity Request Coach Review Escalate when AI guidance needs human oversight Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation Recent Requests Track status of your escalation queue Loading... Return to Dashboard AI Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Landing page

- Route: `/`
- Final URL: http://localhost:3002/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 48
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/landing.png`
- Error: text too short (48)
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454978448 | 404 script /_next/static/chunks/main-app.js?v=1773454978448 | 404 script /_next/static/chunks/app/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Preparing your dashboard...

## iPhone 15 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3002/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 698
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/assessment.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454981388 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773454981388 | 404 script /_next/static/chunks/app/start/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content AI assessment Build Your Legend STEP_IDENT_01 // TOTAL_07 What is your primary goal right now? Weight lossProtocol selection optimized for performance.Muscle gainProtocol selection optimized for performance.MobilityProtocol selection optimized for performance.General fitnessProtocol selection optimized for performance. Abort / BackInitialize Next Step LEGEND_OS v2.4 // SECURE_INTEL_GATED Live Build Selections shape your neural net Target Goal Weight loss XP Baseline Beginner Frequency 3 days Environment Gym Metabolic Focus Calorie control Neural Rationale Based on your beginner status, we are calibrating a weight loss protocol focused on gym execution 3 days.

## iPhone 15 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3002/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 749
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/auth.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454983968 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773454983968 | 404 script /_next/static/chunks/app/auth/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Continue your personalized plan Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today's workout, or logging your first meal. Continue with Google[DEV] Bypass Login EmailSend magic link AI guidance is educational and does not replace medical care. What happens next Here is the exact flow after you sign in so there are no surprises. 1. Verify your account securely. 2. Koda restores your setup and opens the right next screen. 3. Start your first workout, meal log, or coach-guided check-in. Recommended next route: / Back to home

## iPhone 15 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3002/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 709
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/onboarding.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454986537 | 404 script /_next/static/chunks/main-app.js?v=1773454986537 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/onboarding/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Onboarding Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Your body metrics Your body metrics These details help Koda size your workouts, nutrition targets, and recovery guidance correctly. You can update them later in Settings. NamePhone number (optional)AgeSex (for physiology guidance) Select Male Female Other Preferred units in / lbs cm / kg Height (in)Weight (lb) Next What you unlock Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days Educational AI coaching · Not medical care

## iPhone 15 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3002/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 48
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/dashboard.png`
- Error: text too short (48)
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454989424 | 404 script /_next/static/chunks/app/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773454989424 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Preparing your dashboard...

## iPhone 15 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3002/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 277
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/plan.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454992906 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773454992906 | 404 script /_next/static/chunks/app/plan/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining Plan NutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Training Plan Your personalized weekly schedule Composing your training plan... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3002/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 968
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/log_workout.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454996258 | 404 script /_next/static/chunks/main-app.js?v=1773454996258 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/log/workout/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkout Check-InProgressCommunityCoachSettings U Member Workout Capture sessions and keep progression visible Coaching Protocol Initiate Coached Session Plan-aware sequence flow with neural guidance. Begin Guided Experience Coach's Take Plain-English guidance for today's session Keep the main lifts steady today, then finish with one shorter hard effort if your energy still feels good. Motion LabQuery Concierge Quick Workout Log Save the session so your dashboard, plan, and progress stay current Session type Strength Progressive overload Cardio Aerobic conditioning Mobility Movement quality Other Custom session Exercise Details (Optional) Duration (min) 15m30m45m60m How hard it felt (RPE 1-10)Select 1-10 LightMax Save workout Recent sessions Last 20 entries Loading... View historyAnalyze movement Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3002/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 251
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/guided_workout.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773454999365 | 404 script /_next/static/chunks/main-app.js?v=1773454999365 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/log/workout/guided/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkout Check-InProgressCommunityCoachSettings U Member Neural Initialization Calibrating session sequence... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3002/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 490
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/motion_lab.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455002458 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773455002458 | 404 script /_next/static/chunks/app/motion/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member ← Workout Motion Lab Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. Select Video Neural Verdict Biomechanical integrity status Awaiting Data Upload a movement clip to activate the motion analysis system. Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3002/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 840
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/nutrition.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455005568 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/log/nutrition/page.js | 404 script /_next/static/chunks/main-app.js?v=1773455005568 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutrition WorkoutCheck-InProgressCommunityCoachSettings U Member Nutrition Log meals, track macros, and stay on target Log a meal Choose one: describe it, take a photo, or scan a barcode Fastest option: type a short description. Best estimate: use a clear top-down photo. Packaged food: scan the barcode. DescribePhotoBarcode Visual Capture Supports primary lens intake Choose photo Tip: a clear top-down photo with good lighting gives the best results. View historyMeal PlannerFridge ScannerAsk AI on Dashboard Today's targets Based on logged meals 0 kcal Protein0g / 150g Carbs0g / — Fat0g / — Suggest next meal Hydration System Daily Target: 2.5 L 0.0L Intake Volume +0.25L+0.5L Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Progress

- Route: `/progress`
- Final URL: http://localhost:3002/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 498
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/progress.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455008703 | 404 script /_next/static/chunks/main-app.js?v=1773455008703 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/progress/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgress CommunityCoachSettings U Member Progress Body composition, trend tracking, and your next best step How To Unlock More Insight Add at least two check-ins to unlock clearer trends and AI summaries. Fastest path: save one manual entry today, then repeat after your next workout or weekly check-in. Manual EntryAI Body Scan Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3002/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 241
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/check_in.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455011822 | 404 script /_next/static/chunks/main-app.js?v=1773455011822 | 404 script /_next/static/chunks/app/check-in/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-In ProgressCommunityCoachSettings U Member ← Back System Scan Initializing Bio-Sync... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3002/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 453
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/history.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455014540 | 404 script /_next/static/chunks/app/history/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773455014540 | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member ← Workout History Past workouts and nutrition Evolutionary Performance Synthesis "Synthesizing longitudinal data strands... Complete at least 5 sessions to establish a stable evolutionary baseline." Session LogsMetabolic Intake Loading... Back to Workout Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Community

- Route: `/community`
- Final URL: http://localhost:3002/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 478
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/community.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455017213 | 404 script /_next/static/chunks/main-app.js?v=1773455017213 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/community/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunity CoachSettings U Member Community Join challenges, find your group, and stay motivated with other members Manage Friends Live Challenges Simple ways to join community goals and stay accountable this week Loading... Groups Pick a group that matches your style and keep your progress visible Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Settings

- Route: `/settings`
- Final URL: http://localhost:3002/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 258
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/settings.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455020100 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773455020100 | 404 script /_next/static/chunks/app/settings/page.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Settings Profile, AI preferences, and data sources Loading... Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3002/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1426
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/integrations.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455023210 | 404 script /_next/static/chunks/app/layout.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/main-app.js?v=1773455023210 | 404 script /_next/static/chunks/app/integrations/page.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Integrations & Devices Connect your wearables to supercharge your AI Coach with real biometric data Setup Instructions Link your device to start syncing in under 2 minutes 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. Loading...Copy 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → Supported Devices Status reflects real data received — not just dashboard links Loading... Biometric data is proc…

## iPhone 15 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3002/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 971
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/pricing.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455026114 | 404 script /_next/static/chunks/main-app.js?v=1773455026114 | 404 script /_next/static/chunks/app/pricing/page.js | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoachSettings U Member Investment in Excellence Choose your protocol Scale your performance with precision-engineered coaching tiers. Standard 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync Start Free Trial Most Advanced Pro $9.99/mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed Go Pro (Includes Trial) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” Marcus V. Hyrox Elite Athlete Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

## iPhone 15 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3002/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 544
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-3/mobile/coach_support.png`
- Resource issues: 404 stylesheet /_next/static/css/app/layout.css?v=1773455028890 | 404 script /_next/static/chunks/app/coach/escalate/page.js | 404 script /_next/static/chunks/main-app.js?v=1773455028890 | 404 script /_next/static/chunks/app-pages-internals.js | 404 script /_next/static/chunks/app/layout.js
- Text preview: Skip to main content Koda AI DashboardVitalsTraining PlanNutritionWorkoutCheck-InProgressCommunityCoach Settings U Member ← Dashboard Coach Escalation Hybrid support for blockers, injury concerns, and plan complexity Request Coach Review Escalate when AI guidance needs human oversight Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation Recent Requests Track status of your escalation queue Loading... Return to Dashboard AI Home Plan Nutrition Workout Progress Settings Coach Coach Koda is ready

