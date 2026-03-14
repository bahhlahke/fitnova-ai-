# Web Surface Smoke Report

- Generated (UTC): 2026-03-14T02:04:02.038Z to 2026-03-14T02:07:59.867Z
- Base URL: http://localhost:3002
- Auth bootstrap: /api/v1/auth/mock-login?next=/
- Surfaces checked: 36
- Pass: 36
- Fail: 0

| Viewport | Surface | Route | Status | Pass |
|---|---|---|---|---|
| Desktop 1440 | Landing page | `/` | 200 | yes |
| Desktop 1440 | Assessment start | `/start` | 200 | yes |
| Desktop 1440 | Authentication | `/auth` | 200 | yes |
| Desktop 1440 | Onboarding | `/onboarding?resume=1` | 200 | yes |
| Desktop 1440 | Dashboard AI command center | `/?focus=ai` | 200 | yes |
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
| iPhone 15 | Landing page | `/` | 200 | yes |
| iPhone 15 | Assessment start | `/start` | 200 | yes |
| iPhone 15 | Authentication | `/auth` | 200 | yes |
| iPhone 15 | Onboarding | `/onboarding?resume=1` | 200 | yes |
| iPhone 15 | Dashboard AI command center | `/?focus=ai` | 200 | yes |
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
- Text length: 1147
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/landing.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER READINESS ⚡ 50% STREAK 🔥 0 DAYS VOLUME 📊 0 SZN TODAY 🧬 NO PROTOCOL ACTIVE SIGNAL FEED TARGET PROTOCOL Analyzing Schedule... “Generate today’s plan and complete one key action (workout or nutrition log).” AI SYNTHESIS System awaiting initialization. 🛡️ COACH'S DESK 🎵 WORKOUT MUSIC Connect Spotify once, then launch guided workouts with device-ready playback controls and fewer interruptions. CONNECT SPOTIFY OPEN GUIDED WORKOUT SENSOR SYNC ⌚ VITALS PIPELINE 📸 FRIDGE SCANNER COMMAND CENTER KODA AI Ask questions, log data, or adjust today's plan. Logged actions will update the relevant tab automatically. I JUST ATE 3 EGGS AND TOAST LOG A HEAVY LEG DAY WORKOUT UPDATE MY BODY WEIGHT TO 185LBS HOW AM I DOING THIS WEEK? READY FOR INPUT You can ask Koda to do anything — log your meals, track a workout, adapt a daily plan, or analyze your progress. Koda will automatically process your data or seamlessly navigate you to the relevant part of the app. Send

## Desktop 1440 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3002/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 706
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/assessment.png`
- Text preview: Skip to main content AI ASSESSMENT BUILD YOUR LEGEND STEP_IDENT_01 // TOTAL_07 WHAT IS YOUR PRIMARY GOAL RIGHT NOW? WEIGHT LOSS Protocol selection optimized for performance. MUSCLE GAIN Protocol selection optimized for performance. MOBILITY Protocol selection optimized for performance. GENERAL FITNESS Protocol selection optimized for performance. ABORT / BACK INITIALIZE NEXT STEP LEGEND_OS V2.4 // SECURE_INTEL_GATED LIVE BUILD SELECTIONS SHAPE YOUR NEURAL NET TARGET GOAL WEIGHT LOSS XP BASELINE BEGINNER FREQUENCY 3 DAYS ENVIRONMENT GYM METABOLIC FOCUS CALORIE CONTROL NEURAL RATIONALE Based on your beginner status, we are calibrating a weight loss protocol focused on gym execution 3 days.

## Desktop 1440 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3002/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 504
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/auth.png`
- Text preview: Skip to main content CONTINUE YOUR PERSONALIZED PLAN Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Continue with Google[DEV] Bypass Login Email Send magic link AI guidance is educational and does not replace medical care. What happens next 1. Verify your account securely. 2. Save your personalized setup and constraints. 3. Start your first guided training and nutrition day. Recommended next route: / Back to home

## Desktop 1440 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3002/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 518
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/onboarding.png`
- Text preview: Skip to main content ONBOARDING Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Stats Stats Name Phone number (optional) Age Sex Select Male Female Other Units in / lbs cm / kg Height (in) Weight (lb) Next WHAT YOU UNLOCK Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days EDUCATIONAL AI COACHING · NOT MEDICAL CARE

## Desktop 1440 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3002/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1147
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/dashboard.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER READINESS ⚡ 50% STREAK 🔥 0 DAYS VOLUME 📊 0 SZN TODAY 🧬 NO PROTOCOL ACTIVE SIGNAL FEED TARGET PROTOCOL Analyzing Schedule... “Generate today’s plan and complete one key action (workout or nutrition log).” AI SYNTHESIS System awaiting initialization. 🛡️ COACH'S DESK 🎵 WORKOUT MUSIC Connect Spotify once, then launch guided workouts with device-ready playback controls and fewer interruptions. CONNECT SPOTIFY OPEN GUIDED WORKOUT SENSOR SYNC ⌚ VITALS PIPELINE 📸 FRIDGE SCANNER COMMAND CENTER KODA AI Ask questions, log data, or adjust today's plan. Logged actions will update the relevant tab automatically. I JUST ATE 3 EGGS AND TOAST LOG A HEAVY LEG DAY WORKOUT UPDATE MY BODY WEIGHT TO 185LBS HOW AM I DOING THIS WEEK? READY FOR INPUT You can ask Koda to do anything — log your meals, track a workout, adapt a daily plan, or analyze your progress. Koda will automatically process your data or seamlessly navigate you to the relevant part of the app. Send

## Desktop 1440 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3002/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2437
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/plan.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER TRAINING PLAN Week of 2026-03-09 · Aligned to your schedule General fitness and consistency REGENERATE PLAN AI WEEKLY ANALYSIS It seems this week was a pause for both workouts and nutrition logging, which can happen from time to time. To help get back on track, I recommend setting a simple goal to reintroduce at least two short workouts, as well as tracking your meals, even if just for a couple of days. This will help reignite your motivation and keep you focused on your health journey. THIS WEEK MON 9 Full body strength (compound movements) HIGH · 50 min TUE 10 Conditioning cardio intervals MODERATE · 40 min WED 11 Lower body strength + core HIGH · 50 min THU 12 Recovery + mobility flow RECOVERY · 30 min FRI 13 Upper body strength (push + pull) TODAY MODERATE · 45 min SAT 14 Recovery and movement quality REST RECOVERY · 30 min SUN 15 Recovery and movement quality REST RECOVERY · 25 min FRIDAY — TODAY UPPER BODY STRENGTH (PUSH + PULL) 45M Intensity Moderate Duration 45 minutes Schedule alignment PREFERRED TRAINING DAY AI RATIONALE …

## Desktop 1440 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3002/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 971
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/log_workout.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER WORKOUT Capture sessions and keep progression visible COACHING PROTOCOL INITIATE COACHED SESSION PLAN-AWARE SEQUENCE FLOW WITH NEURAL GUIDANCE. BEGIN GUIDED EXPERIENCE INTELLIGENCE INSIGHT CONTEXTUAL COACHING SIGNALS OPTIMIZED PERFORMANCE METRICS SUGGEST MAINTAINING CORE VOLUME WITH HIGH-INTENSITY FINISHERS. MOTION LAB QUERY CONCIERGE SYSTEM SESSION LOG CAPTURE COMPLETIONS FOR ADAPTIVE RECALIBRATION Session type STRENGTH Progressive overload CARDIO Aerobic conditioning MOBILITY Movement quality OTHER Custom session Exercise Details (Optional) Duration (min) 15m 30m 45m 60m Intensity / RPE Select 1-10 LIGHT MAX Save workout RECENT SESSIONS LAST 20 ENTRIES No workouts yet. Start a guided session or quick log above. START GUIDED WORKOUT VIEW HISTORY ANALYZE MOVEMENT COACH KODA IS READY

## Desktop 1440 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3002/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 747
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/guided_workout.png`
- Console errors: Failed to load resource: the server responded with a status of 403 ()
- Resource issues: 404 fetch /api/v1/spotify/token | 403 media /video-files/4761793/4761793-uhd_2560_1440_25fps.mp4
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER Exit SESSION OVERVIEW UPPER BODY STRENGTH (PUSH + PULL) 7 MOVEMENTS ~56M DURATION SEQUENCE FLOW 1 BARBELL BENCH PRESS 4 Sets · 5–8 Reps 2 INCLINE DUMBBELL PRESS 3 Sets · 8–12 Reps 3 CABLE CHEST FLY (HIGH TO LOW) 3 Sets · 12–15 Reps 4 SMITH MACHINE SHOULDER PRESS 3 Sets · 10–12 Reps 5 DUMBBELL LATERAL RAISE 3 Sets · 15–20 Reps 6 HANGING LEG RAISE 3 Sets · 10–15 Reps 🏋️ 7 MEDICINE BALL SLAM 3 Sets · 10–15 Reps COACH NOTE Focus on the "Intent" cues for each move. This session is designed to optimize movement quality under fatigue. INITIATE EXPERIENCE COACH KODA IS READY

## Desktop 1440 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3002/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 470
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/motion_lab.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← WORKOUT MOTION LAB Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. SELECT VIDEO NEURAL VERDICT BIOMECHANICAL INTEGRITY STATUS AWAITING DATA Upload a movement clip to activate the motion analysis system. COACH KODA IS READY

## Desktop 1440 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3002/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1106
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/nutrition.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER METABOLIC INTAKE Meal timeline · macro tracking LOG A MEAL DESCRIBE IT OR SNAP A PHOTO — AI FILLS IN THE MACROS DESCRIBE PHOTO BARCODE VISUAL CAPTURE SUPPORTS PRIMARY LENS INTAKE Choose photo Tip: a clear top-down photo with good lighting gives the best results. VIEW HISTORY MEAL PLANNER FRIDGE SCANNER ASK AI ON DASHBOARD TODAY'S TARGETS BASED ON LOGGED MEALS 0 KCAL PROTEIN 0G / 150G CARBS 0G / — FAT 0G / — Starting the day with zero calories and protein may hinder your muscle recovery and performance, so aim to incorporate a protein-rich breakfast, such as Greek yogurt or eggs, within the first hour of waking to kickstart Muscle Protein Synthesis. Consider a balanced meal that includes protein, healthy fats, and complex carbs to fuel your day effectively. SUGGEST NEXT MEAL HYDRATION SYSTEM DAILY TARGET: 2.5 L 0.0L INTAKE VOLUME +0.25L +0.5L No meals logged yet — use the form above to get started. COACH KODA IS READY

## Desktop 1440 — Progress

- Route: `/progress`
- Final URL: http://localhost:3002/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2607
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/progress.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER PROGRESS Body composition tracking and AI-powered performance synthesis MANUAL ENTRY AI BODY SCAN EVOLUTIONARY NARRATIVE A 30-DAY CLINICAL SYNTHESIS OF YOUR ADAPTATION JOURNEY No trend available yet. Add at least two check-ins to unlock AI narrative insight. LATEST CHECK-IN Log your first weight to unlock your AI trend projection. Manual Entry AI Body Scan BIOLOGICAL WEIGHT TREND LOG ENTRIES TO SEE YOUR TREND Add at least 2 progress entries to see your biological weight trend. STRENGTH PROGRESSION VERIFIED PRS & ESTIMATED 1RM HISTORY No strength progression data available. Log heavy sets to establish a baseline. WHAT CHANGED SIGNALS FROM LATEST ENTRY Composition not logged No metrics captured No concierge observations RECENT ENTRIES LAST 10 No entries yet. ELITE PROTOCOLS YOUR UNLOCKED CLASSIFIED ACHIEVEMENTS AND PRESTIGE RANKS Achievements are warming up. Your progress data is still safe. No protocols unlocked yet. Keep grinding to earn elite status. WEEKLY MICROCYCLE GENERAL FITNESS AND CONSISTENCY Planned 4 training-focused sess…

## Desktop 1440 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3002/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 412
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/check_in.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← COCKPIT DAILY PROTOCOL SCAN Sync your internal vitals with the machine. READINESS INITIALIZATION VITAL CHECK SYSTEM ENERGY Required 1 2 3 4 5 SLEEP DURATION 0 Hours 0H 7H 14H SORENESS & NOTES Run AI Body Comp Scan Commit to Analysis COACH KODA IS READY

## Desktop 1440 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3002/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1173
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/history.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← WORKOUT HISTORY Past workouts and nutrition EVOLUTIONARY PERFORMANCE SYNTHESIS "Your physiological adaptation is commendable, as evidenced by consistent training volume maintenance despite a 10% decrement in weekly downtime, indicating robust recovery mechanisms. Mechanical overload is effectively managed; your PRs in compound lifts have progressed by an average of 2.5% correlating with a 15% increase in session frequency, affirming the strategic overload principle. Metabolic efficiency is optimal; a 7% reduction in caloric intake has not detracted from session duration, underscoring superior energy utilization and hydration strategies. Your peak mechanical output has impressively stabilized, even with a conservative metabolic approach, showcasing elite-level resilience and adaptation." SESSION LOGS METABOLIC INTAKE WORKOUT HISTORY TAP A ROW FOR DETAILS FILTER BY TYPE ALL STRENGTH CARDIO MOBILITY OTHER No workouts match. Log a session from the Workout page. Back to Workout COACH KODA IS READY

## Desktop 1440 — Community

- Route: `/community`
- Final URL: http://localhost:3002/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1931
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/community.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER COMMUNITY Join groups and compete with others MANAGE FRIENDS GLOBAL PROTOCOLS COMPETE WITH THE HIGH-PERFORMANCE KODA AI COMMUNITY MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! METRIC: WORKOUTS 0 JOINED Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! METRIC: WORKOUTS 0 JOINED Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE ELITE SQUADS FIND YOUR COHORT AND ACHIEVE PEAK PERFORMANCE 🔥 EARLY RISERS THE 5 AM CLUB. LOG YOUR MORNING SESSIONS HERE. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP 🏋️ POWERLIFTERS SQUAT, BENCH, DEADLIFT FOCUS. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP ❤️ HEALTHY RECIPES SHARE AND TRACK MEAL PLANS WITH THE COMMUNITY. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP ⚡ 10K STEP CHALLENGE DAILY WALKING TARGETS AND STEP GOALS. Join this group to…

## Desktop 1440 — Settings

- Route: `/settings`
- Final URL: http://localhost:3002/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2830
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/settings.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER SETTINGS Profile, AI preferences, and data sources AUTHENTICATED PULSE Signed in as test-agent@fitnova.ai TERMINATE SESSION TROPHY ROOM EARNED ACHIEVEMENTS AND BADGES NO TROPHIES YET Log workouts and hit your macro targets to earn badges. NEURAL IDENTIFICATION CORE ACCOUNT PARAMETERS ACCOUNT VECTORS Name Phone number Used for SMS briefings and inbound coaching texts. BIOMETRIC CONSTANTS Age Sex Select Male Female Other Activity level Select Sedentary Light (1-2 days/week) Moderate (3-4 days/week) Active (5+ days/week) Units in / lbs cm / kg Height (in) Weight (lb) STRATEGIC OBJECTIVES Goals WEIGHT LOSS MUSCLE GAIN ENDURANCE GENERAL FITNESS MOBILITY Experience level Select Beginner Intermediate Advanced Motivational driver Select Performance Health Aesthetics Stress Injuries and limitations AI PREFERENCES ACCOUNTABILITY STYLE AND GUIDANCE CADENCE Coach tone Evidence-based balanced High accountability Supportive low-pressure Nudge intensity Light Standard High REMINDERS IN-APP NUDGES (NO PUSH OR EMAIL YET) Remind me to generate today…

## Desktop 1440 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3002/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1863
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/integrations.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER INTEGRATIONS & DEVICES Connect your wearables to supercharge your AI Coach with real biometric data SETUP INSTRUCTIONS LINK YOUR DEVICE TO START SYNCING IN UNDER 2 MINUTES 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. 50b2c7bf-6561-4919-be2e-788308bcd2a3 COPY 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → SUPPORTED DEVICES STATUS REFLECTS REAL DATA RECEIVED — …

## Desktop 1440 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3002/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 952
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/pricing.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER INVESTMENT IN EXCELLENCE CHOOSE YOUR PROTOCOL Scale your performance with precision-engineered coaching tiers. STANDARD 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync START FREE TRIAL MOST ADVANCED PRO $9.99 /mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed GO PRO (INCLUDES TRIAL) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” MARCUS V. HYROX ELITE ATHLETE COACH KODA IS READY

## Desktop 1440 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3002/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 583
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/desktop/coach_support.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← DASHBOARD COACH ESCALATION Hybrid support for blockers, injury concerns, and plan complexity REQUEST COACH REVIEW ESCALATE WHEN AI GUIDANCE NEEDS HUMAN OVERSIGHT Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation RECENT REQUESTS TRACK STATUS OF YOUR ESCALATION QUEUE No escalation requests yet. Use this flow when you need human review. Return to Dashboard AI COACH KODA IS READY

## iPhone 15 — Landing page

- Route: `/`
- Final URL: http://localhost:3002/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 642
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/landing.png`
- Text preview: Skip to main content READINESS ⚡ 50% STREAK 🔥 0 DAYS VOLUME 📊 0 SZN TODAY 🧬 NO PROTOCOL COMMAND CENTER KODA AI Ask questions, log data, or adjust today's plan. Logged actions will update the relevant tab automatically. I JUST ATE 3 EGGS AND TOAST LOG A HEAVY LEG DAY WORKOUT UPDATE MY BODY WEIGHT TO 185LBS HOW AM I DOING THIS WEEK? READY FOR INPUT You can ask Koda to do anything — log your meals, track a workout, adapt a daily plan, or analyze your progress. Koda will automatically process your data or seamlessly navigate you to the relevant part of the app. Send HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH

## iPhone 15 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3002/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 706
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/assessment.png`
- Text preview: Skip to main content AI ASSESSMENT BUILD YOUR LEGEND STEP_IDENT_01 // TOTAL_07 WHAT IS YOUR PRIMARY GOAL RIGHT NOW? WEIGHT LOSS Protocol selection optimized for performance. MUSCLE GAIN Protocol selection optimized for performance. MOBILITY Protocol selection optimized for performance. GENERAL FITNESS Protocol selection optimized for performance. ABORT / BACK INITIALIZE NEXT STEP LEGEND_OS V2.4 // SECURE_INTEL_GATED LIVE BUILD SELECTIONS SHAPE YOUR NEURAL NET TARGET GOAL WEIGHT LOSS XP BASELINE BEGINNER FREQUENCY 3 DAYS ENVIRONMENT GYM METABOLIC FOCUS CALORIE CONTROL NEURAL RATIONALE Based on your beginner status, we are calibrating a weight loss protocol focused on gym execution 3 days.

## iPhone 15 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3002/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 504
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/auth.png`
- Text preview: Skip to main content CONTINUE YOUR PERSONALIZED PLAN Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Continue with Google[DEV] Bypass Login Email Send magic link AI guidance is educational and does not replace medical care. What happens next 1. Verify your account securely. 2. Save your personalized setup and constraints. 3. Start your first guided training and nutrition day. Recommended next route: / Back to home

## iPhone 15 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3002/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 518
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/onboarding.png`
- Text preview: Skip to main content ONBOARDING Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Stats Stats Name Phone number (optional) Age Sex Select Male Female Other Units in / lbs cm / kg Height (in) Weight (lb) Next WHAT YOU UNLOCK Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days EDUCATIONAL AI COACHING · NOT MEDICAL CARE

## iPhone 15 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3002/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 642
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/dashboard.png`
- Text preview: Skip to main content READINESS ⚡ 50% STREAK 🔥 0 DAYS VOLUME 📊 0 SZN TODAY 🧬 NO PROTOCOL COMMAND CENTER KODA AI Ask questions, log data, or adjust today's plan. Logged actions will update the relevant tab automatically. I JUST ATE 3 EGGS AND TOAST LOG A HEAVY LEG DAY WORKOUT UPDATE MY BODY WEIGHT TO 185LBS HOW AM I DOING THIS WEEK? READY FOR INPUT You can ask Koda to do anything — log your meals, track a workout, adapt a daily plan, or analyze your progress. Koda will automatically process your data or seamlessly navigate you to the relevant part of the app. Send HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH

## iPhone 15 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3002/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2362
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/plan.png`
- Text preview: Skip to main content TRAINING PLAN Week of 2026-03-09 · Aligned to your schedule General fitness and consistency REGENERATE PLAN AI WEEKLY ANALYSIS It looks like this week was a complete break from both workouts and nutrition logging, which can make it challenging to reach your fitness goals. I recommend prioritizing at least two light workouts next week and starting to track your meals, even if it's just a few entries. Small steps like these will help you build momentum towards a more active and balanced routine. THIS WEEK MON 9 Full body strength (compound movements) HIGH · 50 min TUE 10 Conditioning cardio intervals MODERATE · 40 min WED 11 Lower body strength + core HIGH · 50 min THU 12 Recovery + mobility flow RECOVERY · 30 min FRI 13 Upper body strength (push + pull) TODAY MODERATE · 45 min SAT 14 Recovery and movement quality REST RECOVERY · 30 min SUN 15 Recovery and movement quality REST RECOVERY · 25 min FRIDAY — TODAY UPPER BODY STRENGTH (PUSH + PULL) 45M Intensity Moderate Duration 45 minutes Schedule alignment PREFERRED TRAINING DAY AI RATIONALE Aligned with your preferred training schedule. Sleep trend supports the planned workload. Recovery signals nominal. Equipmen…

## iPhone 15 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3002/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 889
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/log_workout.png`
- Text preview: Skip to main content WORKOUT Capture sessions and keep progression visible COACHING PROTOCOL INITIATE COACHED SESSION PLAN-AWARE SEQUENCE FLOW WITH NEURAL GUIDANCE. BEGIN GUIDED EXPERIENCE INTELLIGENCE INSIGHT CONTEXTUAL COACHING SIGNALS OPTIMIZED PERFORMANCE METRICS SUGGEST MAINTAINING CORE VOLUME WITH HIGH-INTENSITY FINISHERS. MOTION LAB QUERY CONCIERGE SYSTEM SESSION LOG CAPTURE COMPLETIONS FOR ADAPTIVE RECALIBRATION Session type STRENGTH Progressive overload CARDIO Aerobic conditioning MOBILITY Movement quality OTHER Custom session Exercise Details (Optional) Duration (min) 15m 30m 45m 60m Intensity / RPE Select 1-10 LIGHT MAX Save workout RECENT SESSIONS LAST 20 ENTRIES No workouts yet. Start a guided session or quick log above. START GUIDED WORKOUT VIEW HISTORY ANALYZE MOVEMENT HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3002/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 665
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/guided_workout.png`
- Console errors: Failed to load resource: the server responded with a status of 403 ()
- Resource issues: 404 fetch /api/v1/spotify/token | 403 media /video-files/4761793/4761793-uhd_2560_1440_25fps.mp4
- Text preview: Skip to main content Exit SESSION OVERVIEW UPPER BODY STRENGTH (PUSH + PULL) 7 MOVEMENTS ~56M DURATION SEQUENCE FLOW 1 BARBELL BENCH PRESS 4 Sets · 5–8 Reps 2 INCLINE DUMBBELL PRESS 3 Sets · 8–12 Reps 3 CABLE CHEST FLY (HIGH TO LOW) 3 Sets · 12–15 Reps 4 SMITH MACHINE SHOULDER PRESS 3 Sets · 10–12 Reps 5 DUMBBELL LATERAL RAISE 3 Sets · 15–20 Reps 6 HANGING LEG RAISE 3 Sets · 10–15 Reps 🏋️ 7 MEDICINE BALL SLAM 3 Sets · 10–15 Reps COACH NOTE Focus on the "Intent" cues for each move. This session is designed to optimize movement quality under fatigue. INITIATE EXPERIENCE HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3002/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 388
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/motion_lab.png`
- Text preview: Skip to main content ← WORKOUT MOTION LAB Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. SELECT VIDEO NEURAL VERDICT BIOMECHANICAL INTEGRITY STATUS AWAITING DATA Upload a movement clip to activate the motion analysis system. HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3002/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1036
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/nutrition.png`
- Text preview: Skip to main content METABOLIC INTAKE Meal timeline · macro tracking LOG A MEAL DESCRIBE IT OR SNAP A PHOTO — AI FILLS IN THE MACROS DESCRIBE PHOTO BARCODE VISUAL CAPTURE SUPPORTS PRIMARY LENS INTAKE Choose photo Tip: a clear top-down photo with good lighting gives the best results. VIEW HISTORY MEAL PLANNER FRIDGE SCANNER ASK AI ON DASHBOARD TODAY'S TARGETS BASED ON LOGGED MEALS 0 KCAL PROTEIN 0G / 150G CARBS 0G / — FAT 0G / — To maximize Muscle Protein Synthesis, aim to consume a meal with at least 20-30 grams of protein within two hours post-workout; consider nutrient timing by planning a protein-rich breakfast like eggs or a protein shake to kickstart your day and support recovery. Prioritize balanced meals throughout the day to meet your caloric and macronutrient targets effectively. SUGGEST NEXT MEAL HYDRATION SYSTEM DAILY TARGET: 2.5 L 0.0L INTAKE VOLUME +0.25L +0.5L No meals logged yet — use the form above to get started. HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Progress

- Route: `/progress`
- Final URL: http://localhost:3002/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2525
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/progress.png`
- Text preview: Skip to main content PROGRESS Body composition tracking and AI-powered performance synthesis MANUAL ENTRY AI BODY SCAN EVOLUTIONARY NARRATIVE A 30-DAY CLINICAL SYNTHESIS OF YOUR ADAPTATION JOURNEY No trend available yet. Add at least two check-ins to unlock AI narrative insight. LATEST CHECK-IN Log your first weight to unlock your AI trend projection. Manual Entry AI Body Scan BIOLOGICAL WEIGHT TREND LOG ENTRIES TO SEE YOUR TREND Add at least 2 progress entries to see your biological weight trend. STRENGTH PROGRESSION VERIFIED PRS & ESTIMATED 1RM HISTORY No strength progression data available. Log heavy sets to establish a baseline. WHAT CHANGED SIGNALS FROM LATEST ENTRY Composition not logged No metrics captured No concierge observations RECENT ENTRIES LAST 10 No entries yet. ELITE PROTOCOLS YOUR UNLOCKED CLASSIFIED ACHIEVEMENTS AND PRESTIGE RANKS Achievements are warming up. Your progress data is still safe. No protocols unlocked yet. Keep grinding to earn elite status. WEEKLY MICROCYCLE GENERAL FITNESS AND CONSISTENCY Planned 4 training-focused sessions this week. Equipment: full gym. Recent completed sessions this week: 0. Sleep, soreness, and energy signals are used to downsh…

## iPhone 15 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3002/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 330
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/check_in.png`
- Text preview: Skip to main content ← COCKPIT DAILY PROTOCOL SCAN Sync your internal vitals with the machine. READINESS INITIALIZATION VITAL CHECK SYSTEM ENERGY Required 1 2 3 4 5 SLEEP DURATION 0 Hours 0H 7H 14H SORENESS & NOTES Run AI Body Comp Scan Commit to Analysis HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3002/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1020
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/history.png`
- Text preview: Skip to main content ← WORKOUT HISTORY Past workouts and nutrition EVOLUTIONARY PERFORMANCE SYNTHESIS "Your physiological adaptation is exemplary, with your training volume efficiency improving by 15% over the last 20 sessions, as evidenced by reduced recovery times and increased session intensity. Notably, your mechanical overload capacity has reached a new zenith, with personal records (PRs) achieved in 30% of sessions correlating with an increased frequency of workouts, indicating robust neuromuscular adaptation. Metabolically, your efficiency is optimized; despite a 10% decrease in caloric intake, your session duration has sustained a 5% increase, attributed to superior hydration strategies enhancing overall endurance and performance." SESSION LOGS METABOLIC INTAKE WORKOUT HISTORY TAP A ROW FOR DETAILS FILTER BY TYPE ALL STRENGTH CARDIO MOBILITY OTHER No workouts match. Log a session from the Workout page. Back to Workout HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Community

- Route: `/community`
- Final URL: http://localhost:3002/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1849
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/community.png`
- Text preview: Skip to main content COMMUNITY Join groups and compete with others MANAGE FRIENDS GLOBAL PROTOCOLS COMPETE WITH THE HIGH-PERFORMANCE KODA AI COMMUNITY MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! METRIC: WORKOUTS 0 JOINED Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! METRIC: WORKOUTS 0 JOINED Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE ELITE SQUADS FIND YOUR COHORT AND ACHIEVE PEAK PERFORMANCE 🔥 EARLY RISERS THE 5 AM CLUB. LOG YOUR MORNING SESSIONS HERE. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP 🏋️ POWERLIFTERS SQUAT, BENCH, DEADLIFT FOCUS. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP ❤️ HEALTHY RECIPES SHARE AND TRACK MEAL PLANS WITH THE COMMUNITY. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP ⚡ 10K STEP CHALLENGE DAILY WALKING TARGETS AND STEP GOALS. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP 🔥 EARLY RISERS THE 5 AM CLUB. LOG YOUR MORNING SESSIONS H…

## iPhone 15 — Settings

- Route: `/settings`
- Final URL: http://localhost:3002/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2748
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/settings.png`
- Text preview: Skip to main content SETTINGS Profile, AI preferences, and data sources AUTHENTICATED PULSE Signed in as test-agent@fitnova.ai TERMINATE SESSION TROPHY ROOM EARNED ACHIEVEMENTS AND BADGES NO TROPHIES YET Log workouts and hit your macro targets to earn badges. NEURAL IDENTIFICATION CORE ACCOUNT PARAMETERS ACCOUNT VECTORS Name Phone number Used for SMS briefings and inbound coaching texts. BIOMETRIC CONSTANTS Age Sex Select Male Female Other Activity level Select Sedentary Light (1-2 days/week) Moderate (3-4 days/week) Active (5+ days/week) Units in / lbs cm / kg Height (in) Weight (lb) STRATEGIC OBJECTIVES Goals WEIGHT LOSS MUSCLE GAIN ENDURANCE GENERAL FITNESS MOBILITY Experience level Select Beginner Intermediate Advanced Motivational driver Select Performance Health Aesthetics Stress Injuries and limitations AI PREFERENCES ACCOUNTABILITY STYLE AND GUIDANCE CADENCE Coach tone Evidence-based balanced High accountability Supportive low-pressure Nudge intensity Light Standard High REMINDERS IN-APP NUDGES (NO PUSH OR EMAIL YET) Remind me to generate today's plan Remind me to log my workout Weigh-in reminder Weekly Off TRAINING SCHEDULE USED TO PERSONALIZE WEEKLY AND DAILY PLANNING Pr…

## iPhone 15 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3002/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1781
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/integrations.png`
- Text preview: Skip to main content INTEGRATIONS & DEVICES Connect your wearables to supercharge your AI Coach with real biometric data SETUP INSTRUCTIONS LINK YOUR DEVICE TO START SYNCING IN UNDER 2 MINUTES 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. 50b2c7bf-6561-4919-be2e-788308bcd2a3 COPY 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → SUPPORTED DEVICES STATUS REFLECTS REAL DATA RECEIVED — NOT JUST DASHBOARD LINKS ⌚ Garmin Connect Activity, Sleep, HRV, SpO2 CONNECT VIA DASHBOARD 💍 Oura Ring Deep Sleep, HRV, Readiness …

## iPhone 15 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3002/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 871
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/pricing.png`
- Text preview: Skip to main content INVESTMENT IN EXCELLENCE CHOOSE YOUR PROTOCOL Scale your performance with precision-engineered coaching tiers. STANDARD 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync START FREE TRIAL MOST ADVANCED PRO $9.99 /mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed GO PRO (INCLUDES TRIAL) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” MARCUS V. HYROX ELITE ATHLETE HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3002/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 501
- Screenshot: `docs/reports/web-surface-smoke-execution-pass/mobile/coach_support.png`
- Text preview: Skip to main content ← DASHBOARD COACH ESCALATION Hybrid support for blockers, injury concerns, and plan complexity REQUEST COACH REVIEW ESCALATE WHEN AI GUIDANCE NEEDS HUMAN OVERSIGHT Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation RECENT REQUESTS TRACK STATUS OF YOUR ESCALATION QUEUE No escalation requests yet. Use this flow when you need human review. Return to Dashboard AI HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

