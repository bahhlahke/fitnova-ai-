# Web Surface Smoke Report

- Generated (UTC): 2026-03-14T02:46:07.853Z to 2026-03-14T02:49:56.356Z
- Base URL: http://localhost:3004
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
- Final URL: http://localhost:3004/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 3251
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/landing.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ENERGY TODAY ⚡ 50% CURRENT STREAK 🔥 0 DAYS WORKOUTS THIS WEEK 📊 0 FOOD TARGET TODAY 🥗 BUILD PLAN START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. Energy Today combines your recent training, check-ins, and recovery signals so you know whether to push, maintain, or take it easier. 1. Review your energy today. 2. Generate today’s plan. 3. Come back after one action for coach feedback. TODAY'S COACHING SUMMARY TODAY'S FOCUS Building today’s plan... Step 1 is to generate your plan so Koda can show the recommended workout focus. “Generate today’s plan and complete one key action (workout or nutrition log).” COACH SUMMARY Step 1: generate today's plan. Step 2: complete one action. Step 3: return here for your coach summary. 🛡️ WHY THIS MATTERS Plain-English rule: if readiness looks low, choose an easier day or ask Coach to adapt the plan before you start. RECOVERY WARNING Your current heart-rate variability readings have dropped by 15% over the past week, despite m…

## Desktop 1440 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3004/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 680
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/assessment.png`
- Text preview: Skip to main content QUICK ASSESSMENT BUILD YOUR LEGEND Step 01 / 07 WHAT IS YOUR PRIMARY GOAL RIGHT NOW? WEIGHT LOSS This choice helps Koda shape your first plan. MUSCLE GAIN This choice helps Koda shape your first plan. MOBILITY This choice helps Koda shape your first plan. GENERAL FITNESS This choice helps Koda shape your first plan. BACK NEXT PERSONALIZED COACHING PREVIEW YOUR CHOICES SO FAR THESE ANSWERS SHAPE YOUR FIRST PLAN TARGET GOAL WEIGHT LOSS EXPERIENCE LEVEL BEGINNER FREQUENCY 3 DAYS ENVIRONMENT GYM NUTRITION FOCUS CALORIE CONTROL WHY THIS MAKES SENSE Based on your beginner experience level, we are shaping a weight loss plan for gym training 3 days.

## Desktop 1440 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3004/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 950
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/auth.png`
- Text preview: Skip to main content CONTINUE YOUR PERSONALIZED PLAN Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today's workout, or logging your first meal. Continue with Google[DEV] Bypass Login Email Send magic link AI guidance is educational and does not replace medical care. What happens next Here is the exact flow after you sign in so there are no surprises. STEP 1 Verify your account Use Google or your email link to sign in securely. STEP 2 Open your dashboard See your next best step, whether that is today’s workout, meal log, or check-in. STEP 3 Complete one first action Start a workout, log a meal, or finish a quick check-in so Koda can coach you from real data. You will land on open your dashboard after sign-in. Route: / Back to home

## Desktop 1440 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3004/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1247
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/onboarding.png`
- Text preview: Skip to main content ONBOARDING Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Your body metrics Your body metrics These details help Koda size your workouts, nutrition targets, and recovery guidance correctly. You can update them later in Settings. AGE AND SEX Used to tune recovery guidance, safety ranges, and training adjustments. HEIGHT AND WEIGHT Used to estimate calorie targets, strength ranges, and progress trends. PHONE NUMBER Optional. Only add it if you want text reminders and account alerts. Name Phone number (optional) Age Age helps Koda scale recovery and training recommendations to your stage of life. Sex used for plan adjustments Select Male Female Other This helps Koda choose the right training and nutrition ranges for you. How you want to see height and weight in / lbs cm / kg Height (in) Weight (lb) Koda uses height and weight to set calorie targets and show progress clearly over time. Next WHAT YOU UNLOCK Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days EDUCATIONAL AI …

## Desktop 1440 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3004/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 3076
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/dashboard.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ENERGY TODAY ⚡ 50% CURRENT STREAK 🔥 0 DAYS WORKOUTS THIS WEEK 📊 0 FOOD TARGET TODAY 🥗 BUILD PLAN START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. Energy Today combines your recent training, check-ins, and recovery signals so you know whether to push, maintain, or take it easier. 1. Review your energy today. 2. Generate today’s plan. 3. Come back after one action for coach feedback. TODAY'S COACHING SUMMARY TODAY'S FOCUS Building today’s plan... Step 1 is to generate your plan so Koda can show the recommended workout focus. “Generate today’s plan and complete one key action (workout or nutrition log).” COACH SUMMARY Step 1: generate today's plan. Step 2: complete one action. Step 3: return here for your coach summary. 🛡️ WHY THIS MATTERS Plain-English rule: if readiness looks low, choose an easier day or ask Coach to adapt the plan before you start. FATIGUE WARNING Your recent training intensity has been high, with a noticeable dip in heart-rate variability o…

## Desktop 1440 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3004/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 3102
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/plan.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER TRAINING PLAN Week of 2026-03-09 · Aligned to your schedule General fitness and consistency REGENERATE PLAN THIS WEEK'S COACH NOTE Plain-English summary: what to focus on this week, what to avoid, and what Koda wants you to do next. It seems this week you struggled with consistency in both your workouts and nutrition, as there were no sessions or meals logged. To jumpstart your progress for the coming week, I recommend setting a goal to complete at least three short workouts and logging your meals to help create healthy eating habits. Remember, every small step counts towards reaching your fitness goals! HOW TO USE THIS PLAN A QUICK GUIDE FOR ADJUSTING THE WEEK WITHOUT LOSING MOMENTUM 1. Pick today’s card to see the full session and coaching cues. 2. If the title sounds unfamiliar, open the planned session below. Koda shows the exact exercises. 3. Use Tailor This Workout if you need lower impact, less time, or different equipment. THIS WEEK MON 9 Full body strength (compound movements) HIGH · 50 min TUE 10 Conditioning cardio inter…

## Desktop 1440 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3004/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1025
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/log_workout.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER WORKOUT Capture sessions and keep progression visible COACHING PROTOCOL INITIATE COACHED SESSION PLAN-AWARE SEQUENCE FLOW WITH NEURAL GUIDANCE. BEGIN GUIDED EXPERIENCE COACH'S TAKE PLAIN-ENGLISH GUIDANCE FOR TODAY'S SESSION KEEP THE MAIN LIFTS STEADY TODAY, THEN FINISH WITH ONE SHORTER HARD EFFORT IF YOUR ENERGY STILL FEELS GOOD. MOTION LAB QUERY CONCIERGE QUICK WORKOUT LOG SAVE THE SESSION SO YOUR DASHBOARD, PLAN, AND PROGRESS STAY CURRENT Session type STRENGTH Progressive overload CARDIO Aerobic conditioning MOBILITY Movement quality OTHER Custom session Exercise Details (Optional) Duration (min) 15m 30m 45m 60m How hard it felt (RPE 1-10) Select 1-10 LIGHT MAX Save workout RECENT SESSIONS LAST 20 ENTRIES No workouts yet. Start a guided session or quick log above. START GUIDED WORKOUT VIEW HISTORY ANALYZE MOVEMENT COACH KODA IS READY

## Desktop 1440 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3004/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 743
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/guided_workout.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER Exit SESSION OVERVIEW UPPER BODY STRENGTH (PUSH + PULL) 7 MOVEMENTS ~56M DURATION SEQUENCE FLOW 1 BARBELL BENCH PRESS 4 Sets · 5–8 Reps 2 INCLINE DUMBBELL PRESS 3 Sets · 8–12 Reps 3 CABLE CHEST FLY (HIGH TO LOW) 3 Sets · 12–15 Reps 4 SMITH MACHINE SHOULDER PRESS 3 Sets · 10–12 Reps 5 DUMBBELL LATERAL RAISE 3 Sets · 15–20 Reps 6 HANGING LEG RAISE 3 Sets · 10–15 Reps 7 MEDICINE BALL SLAM 3 Sets · 10–15 Reps COACH NOTE Focus on the "Intent" cues for each move. This session is designed to optimize movement quality under fatigue. INITIATE EXPERIENCE COACH KODA IS READY

## Desktop 1440 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3004/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 470
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/motion_lab.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← WORKOUT MOTION LAB Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. SELECT VIDEO NEURAL VERDICT BIOMECHANICAL INTEGRITY STATUS AWAITING DATA Upload a movement clip to activate the motion analysis system. COACH KODA IS READY

## Desktop 1440 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3004/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1517
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/nutrition.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER NUTRITION Log meals, track macros, and stay on target LOG A MEAL CHOOSE ONE: DESCRIBE IT, TAKE A PHOTO, OR SCAN A BARCODE Fastest option: type a short description. Best estimate: use a clear top-down photo. Packaged food: scan the barcode. New here? Start with a short description like “Greek yogurt, berries, and granola”. You can adjust calories and macros before saving. 1. Choose the fastest method for this meal. 2. Review the AI estimate and edit anything that looks off. 3. Save the meal and Koda updates your daily targets right away. DESCRIBE PHOTO BARCODE TAKE A PHOTO USE A CLEAR TOP-DOWN SHOT FOR THE BEST ESTIMATE Choose photo Tip: a clear top-down photo with good lighting gives the best results. VIEW HISTORY MEAL PLANNER FRIDGE SCANNER ASK AI ON DASHBOARD TODAY'S TARGETS BASED ON LOGGED MEALS 0 KCAL PROTEIN 0G / 150G CARBS 0G / — FAT 0G / — To kickstart muscle protein synthesis and optimize recovery today, aim to consume a protein-rich meal within 30-60 minutes after your next workout, which could include options like grilled…

## Desktop 1440 — Progress

- Route: `/progress`
- Final URL: http://localhost:3004/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2861
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/progress.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER PROGRESS Track check-ins, see trends, and know what to do next HOW THIS PAGE WORKS 1. Add a check-in with weight, body fat, or notes. 2. Add another check-in after your next workout or later this week. 3. Koda updates your trend and coach summary here automatically. ADD CHECK-IN AI BODY SCAN After you save a check-in, this page refreshes with your latest numbers, trend, and coach guidance. COACH SUMMARY WHAT CHANGED RECENTLY AND WHAT TO DO NEXT No clear trend yet. Add two check-ins to see your direction and coach summary. LATEST CHECK-IN Add your first check-in to see your weight trend and coach feedback. Manual Entry AI Body Scan WEIGHT TREND ADD ENTRIES TO SEE YOUR TREND Add at least 2 check-ins to see your weight trend. STRENGTH PROGRESSION VERIFIED PRS & ESTIMATED 1RM HISTORY No strength progression data available. Log heavy sets to establish a baseline. WHAT CHANGED SIGNALS FROM LATEST ENTRY Composition not logged No metrics captured No concierge observations RECENT ENTRIES LAST 10 No entries yet. ELITE PROTOCOLS YOUR UNLOCKED…

## Desktop 1440 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3004/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 412
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/check_in.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← COCKPIT DAILY PROTOCOL SCAN Sync your internal vitals with the machine. READINESS INITIALIZATION VITAL CHECK SYSTEM ENERGY Required 1 2 3 4 5 SLEEP DURATION 0 Hours 0H 7H 14H SORENESS & NOTES Run AI Body Comp Scan Commit to Analysis COACH KODA IS READY

## Desktop 1440 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3004/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1065
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/history.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← WORKOUT HISTORY Past workouts and nutrition EVOLUTIONARY PERFORMANCE SYNTHESIS "Your physiological adaptation is exemplified by the stabilization of your peak mechanical output in main lifts, despite a 15% reduction in caloric intake, indicating enhanced metabolic efficiency. Notably, your PRs have shown a 10% increase, which correlates with a 20% rise in session frequency, suggesting optimal mechanical overload without compromising recovery. The consistent hydration strategy is mirrored in the maintained session duration, reflecting an efficient energy system balance. Your evolutionary trajectory is commendable, positioning you on a progressive path in your athletic development." SESSION LOGS METABOLIC INTAKE WORKOUT HISTORY TAP A ROW FOR DETAILS FILTER BY TYPE ALL STRENGTH CARDIO MOBILITY OTHER No workouts match. Log a session from the Workout page. Back to Workout COACH KODA IS READY

## Desktop 1440 — Community

- Route: `/community`
- Final URL: http://localhost:3004/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2216
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/community.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER COMMUNITY Join challenges, find your group, and stay motivated with other members HOW COMMUNITY WORKS 1. Join a challenge or group that matches your style. 2. Keep logging workouts, meals, or steps as usual. 3. Your standing updates as your activity is recorded. MANAGE FRIENDS LIVE CHALLENGES JOIN ONE CHALLENGE, KEEP LOGGING, AND YOUR PROGRESS COUNTS AUTOMATICALLY MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! SCORED BY WORKOUTS LOGGED 0 MEMBERS Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! SCORED BY WORKOUTS LOGGED 0 MEMBERS Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE GROUPS PICK A GROUP THAT MATCHES YOUR STYLE AND STAY ACCOUNTABLE WITH PEOPLE LIKE YOU 🔥 Early Risers The 5 am club. Log your morning sessions here. Join this group to see the leaderboard, compare progress, and stay accountable. JOIN GROUP 🏋️ Powerlifters Squat, bench, deadlift focus. Join this group to see the leaderboard, c…

## Desktop 1440 — Settings

- Route: `/settings`
- Final URL: http://localhost:3004/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2830
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/settings.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER SETTINGS Profile, AI preferences, and data sources AUTHENTICATED PULSE Signed in as test-agent@fitnova.ai TERMINATE SESSION TROPHY ROOM EARNED ACHIEVEMENTS AND BADGES NO TROPHIES YET Log workouts and hit your macro targets to earn badges. NEURAL IDENTIFICATION CORE ACCOUNT PARAMETERS ACCOUNT VECTORS Name Phone number Used for SMS briefings and inbound coaching texts. BIOMETRIC CONSTANTS Age Sex Select Male Female Other Activity level Select Sedentary Light (1-2 days/week) Moderate (3-4 days/week) Active (5+ days/week) Units in / lbs cm / kg Height (in) Weight (lb) STRATEGIC OBJECTIVES Goals WEIGHT LOSS MUSCLE GAIN ENDURANCE GENERAL FITNESS MOBILITY Experience level Select Beginner Intermediate Advanced Motivational driver Select Performance Health Aesthetics Stress Injuries and limitations AI PREFERENCES ACCOUNTABILITY STYLE AND GUIDANCE CADENCE Coach tone Evidence-based balanced High accountability Supportive low-pressure Nudge intensity Light Standard High REMINDERS IN-APP NUDGES (NO PUSH OR EMAIL YET) Remind me to generate today…

## Desktop 1440 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3004/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1863
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/integrations.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER INTEGRATIONS & DEVICES Connect your wearables to supercharge your AI Coach with real biometric data SETUP INSTRUCTIONS LINK YOUR DEVICE TO START SYNCING IN UNDER 2 MINUTES 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. 50b2c7bf-6561-4919-be2e-788308bcd2a3 COPY 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → SUPPORTED DEVICES STATUS REFLECTS REAL DATA RECEIVED — …

## Desktop 1440 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3004/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 952
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/pricing.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER INVESTMENT IN EXCELLENCE CHOOSE YOUR PROTOCOL Scale your performance with precision-engineered coaching tiers. STANDARD 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync START FREE TRIAL MOST ADVANCED PRO $9.99 /mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed GO PRO (INCLUDES TRIAL) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” MARCUS V. HYROX ELITE ATHLETE COACH KODA IS READY

## Desktop 1440 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3004/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 583
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/desktop/coach_support.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← DASHBOARD COACH ESCALATION Hybrid support for blockers, injury concerns, and plan complexity REQUEST COACH REVIEW ESCALATE WHEN AI GUIDANCE NEEDS HUMAN OVERSIGHT Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation RECENT REQUESTS TRACK STATUS OF YOUR ESCALATION QUEUE No escalation requests yet. Use this flow when you need human review. Return to Dashboard AI COACH KODA IS READY

## iPhone 15 — Landing page

- Route: `/`
- Final URL: http://localhost:3004/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 1035
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/landing.png`
- Text preview: Skip to main content ENERGY TODAY ⚡ 50% CURRENT STREAK 🔥 0 DAYS WORKOUTS THIS WEEK 📊 0 FOOD TARGET TODAY 🥗 BUILD PLAN START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. Energy Today combines your recent training, check-ins, and recovery signals so you know whether to push, maintain, or take it easier. 1. Review your energy today. 2. Generate today’s plan. 3. Come back after one action for coach feedback. COMMAND CENTER KODA AI Ask questions, log data, or adjust today's plan. Logged actions will update the relevant tab automatically. I JUST ATE 3 EGGS AND TOAST LOG A HEAVY LEG DAY WORKOUT UPDATE MY BODY WEIGHT TO 185LBS HOW AM I DOING THIS WEEK? READY FOR INPUT You can ask Koda to do anything — log your meals, track a workout, adapt a daily plan, or analyze your progress. Koda will automatically process your data or seamlessly navigate you to the relevant part of the app. Send HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH

## iPhone 15 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3004/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 680
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/assessment.png`
- Text preview: Skip to main content QUICK ASSESSMENT BUILD YOUR LEGEND Step 01 / 07 WHAT IS YOUR PRIMARY GOAL RIGHT NOW? WEIGHT LOSS This choice helps Koda shape your first plan. MUSCLE GAIN This choice helps Koda shape your first plan. MOBILITY This choice helps Koda shape your first plan. GENERAL FITNESS This choice helps Koda shape your first plan. BACK NEXT PERSONALIZED COACHING PREVIEW YOUR CHOICES SO FAR THESE ANSWERS SHAPE YOUR FIRST PLAN TARGET GOAL WEIGHT LOSS EXPERIENCE LEVEL BEGINNER FREQUENCY 3 DAYS ENVIRONMENT GYM NUTRITION FOCUS CALORIE CONTROL WHY THIS MAKES SENSE Based on your beginner experience level, we are shaping a weight loss plan for gym training 3 days.

## iPhone 15 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3004/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 950
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/auth.png`
- Text preview: Skip to main content CONTINUE YOUR PERSONALIZED PLAN Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today's workout, or logging your first meal. Continue with Google[DEV] Bypass Login Email Send magic link AI guidance is educational and does not replace medical care. What happens next Here is the exact flow after you sign in so there are no surprises. STEP 1 Verify your account Use Google or your email link to sign in securely. STEP 2 Open your dashboard See your next best step, whether that is today’s workout, meal log, or check-in. STEP 3 Complete one first action Start a workout, log a meal, or finish a quick check-in so Koda can coach you from real data. You will land on open your dashboard after sign-in. Route: / Back to home

## iPhone 15 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3004/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1247
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/onboarding.png`
- Text preview: Skip to main content ONBOARDING Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Your body metrics Your body metrics These details help Koda size your workouts, nutrition targets, and recovery guidance correctly. You can update them later in Settings. AGE AND SEX Used to tune recovery guidance, safety ranges, and training adjustments. HEIGHT AND WEIGHT Used to estimate calorie targets, strength ranges, and progress trends. PHONE NUMBER Optional. Only add it if you want text reminders and account alerts. Name Phone number (optional) Age Age helps Koda scale recovery and training recommendations to your stage of life. Sex used for plan adjustments Select Male Female Other This helps Koda choose the right training and nutrition ranges for you. How you want to see height and weight in / lbs cm / kg Height (in) Weight (lb) Koda uses height and weight to set calorie targets and show progress clearly over time. Next WHAT YOU UNLOCK Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days EDUCATIONAL AI …

## iPhone 15 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3004/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1035
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/dashboard.png`
- Text preview: Skip to main content ENERGY TODAY ⚡ 50% CURRENT STREAK 🔥 0 DAYS WORKOUTS THIS WEEK 📊 0 FOOD TARGET TODAY 🥗 BUILD PLAN START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. Energy Today combines your recent training, check-ins, and recovery signals so you know whether to push, maintain, or take it easier. 1. Review your energy today. 2. Generate today’s plan. 3. Come back after one action for coach feedback. COMMAND CENTER KODA AI Ask questions, log data, or adjust today's plan. Logged actions will update the relevant tab automatically. I JUST ATE 3 EGGS AND TOAST LOG A HEAVY LEG DAY WORKOUT UPDATE MY BODY WEIGHT TO 185LBS HOW AM I DOING THIS WEEK? READY FOR INPUT You can ask Koda to do anything — log your meals, track a workout, adapt a daily plan, or analyze your progress. Koda will automatically process your data or seamlessly navigate you to the relevant part of the app. Send HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH

## iPhone 15 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3004/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 3046
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/plan.png`
- Text preview: Skip to main content TRAINING PLAN Week of 2026-03-09 · Aligned to your schedule General fitness and consistency REGENERATE PLAN THIS WEEK'S COACH NOTE Plain-English summary: what to focus on this week, what to avoid, and what Koda wants you to do next. This week, there were no workouts or nutrition logged, which indicates a gap in consistency that may affect your progress towards your goals. To kickstart your routine, I recommend setting a specific workout schedule for the week ahead and logging your meals to boost accountability and monitor your nutrition. Remember, every small step counts, so aim for just a few short workouts to get back on track! HOW TO USE THIS PLAN A QUICK GUIDE FOR ADJUSTING THE WEEK WITHOUT LOSING MOMENTUM 1. Pick today’s card to see the full session and coaching cues. 2. If the title sounds unfamiliar, open the planned session below. Koda shows the exact exercises. 3. Use Tailor This Workout if you need lower impact, less time, or different equipment. THIS WEEK MON 9 Full body strength (compound movements) HIGH · 50 min TUE 10 Conditioning cardio intervals MODERATE · 40 min WED 11 Lower body strength + core HIGH · 50 min THU 12 Recovery + mobility flow RE…

## iPhone 15 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3004/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 943
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/log_workout.png`
- Text preview: Skip to main content WORKOUT Capture sessions and keep progression visible COACHING PROTOCOL INITIATE COACHED SESSION PLAN-AWARE SEQUENCE FLOW WITH NEURAL GUIDANCE. BEGIN GUIDED EXPERIENCE COACH'S TAKE PLAIN-ENGLISH GUIDANCE FOR TODAY'S SESSION KEEP THE MAIN LIFTS STEADY TODAY, THEN FINISH WITH ONE SHORTER HARD EFFORT IF YOUR ENERGY STILL FEELS GOOD. MOTION LAB QUERY CONCIERGE QUICK WORKOUT LOG SAVE THE SESSION SO YOUR DASHBOARD, PLAN, AND PROGRESS STAY CURRENT Session type STRENGTH Progressive overload CARDIO Aerobic conditioning MOBILITY Movement quality OTHER Custom session Exercise Details (Optional) Duration (min) 15m 30m 45m 60m How hard it felt (RPE 1-10) Select 1-10 LIGHT MAX Save workout RECENT SESSIONS LAST 20 ENTRIES No workouts yet. Start a guided session or quick log above. START GUIDED WORKOUT VIEW HISTORY ANALYZE MOVEMENT HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3004/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 661
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/guided_workout.png`
- Text preview: Skip to main content Exit SESSION OVERVIEW UPPER BODY STRENGTH (PUSH + PULL) 7 MOVEMENTS ~56M DURATION SEQUENCE FLOW 1 BARBELL BENCH PRESS 4 Sets · 5–8 Reps 2 INCLINE DUMBBELL PRESS 3 Sets · 8–12 Reps 3 CABLE CHEST FLY (HIGH TO LOW) 3 Sets · 12–15 Reps 4 SMITH MACHINE SHOULDER PRESS 3 Sets · 10–12 Reps 5 DUMBBELL LATERAL RAISE 3 Sets · 15–20 Reps 6 HANGING LEG RAISE 3 Sets · 10–15 Reps 7 MEDICINE BALL SLAM 3 Sets · 10–15 Reps COACH NOTE Focus on the "Intent" cues for each move. This session is designed to optimize movement quality under fatigue. INITIATE EXPERIENCE HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3004/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 388
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/motion_lab.png`
- Text preview: Skip to main content ← WORKOUT MOTION LAB Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. SELECT VIDEO NEURAL VERDICT BIOMECHANICAL INTEGRITY STATUS AWAITING DATA Upload a movement clip to activate the motion analysis system. HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3004/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1411
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/nutrition.png`
- Text preview: Skip to main content NUTRITION Log meals, track macros, and stay on target LOG A MEAL CHOOSE ONE: DESCRIBE IT, TAKE A PHOTO, OR SCAN A BARCODE Fastest option: type a short description. Best estimate: use a clear top-down photo. Packaged food: scan the barcode. New here? Start with a short description like “Greek yogurt, berries, and granola”. You can adjust calories and macros before saving. 1. Choose the fastest method for this meal. 2. Review the AI estimate and edit anything that looks off. 3. Save the meal and Koda updates your daily targets right away. DESCRIBE PHOTO BARCODE TAKE A PHOTO USE A CLEAR TOP-DOWN SHOT FOR THE BEST ESTIMATE Choose photo Tip: a clear top-down photo with good lighting gives the best results. VIEW HISTORY MEAL PLANNER FRIDGE SCANNER ASK AI ON DASHBOARD TODAY'S TARGETS BASED ON LOGGED MEALS 0 KCAL PROTEIN 0G / 150G CARBS 0G / — FAT 0G / — Starting your day without any meals or protein can inhibit your Muscle Protein Synthesis, which is essential for building and repairing muscle. Aim to consume a high-protein breakfast, such as scrambled eggs or Greek yogurt, to kickstart your metabolism and support your recovery from workouts. SUGGEST NEXT MEAL HYDRAT…

## iPhone 15 — Progress

- Route: `/progress`
- Final URL: http://localhost:3004/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2779
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/progress.png`
- Text preview: Skip to main content PROGRESS Track check-ins, see trends, and know what to do next HOW THIS PAGE WORKS 1. Add a check-in with weight, body fat, or notes. 2. Add another check-in after your next workout or later this week. 3. Koda updates your trend and coach summary here automatically. ADD CHECK-IN AI BODY SCAN After you save a check-in, this page refreshes with your latest numbers, trend, and coach guidance. COACH SUMMARY WHAT CHANGED RECENTLY AND WHAT TO DO NEXT No clear trend yet. Add two check-ins to see your direction and coach summary. LATEST CHECK-IN Add your first check-in to see your weight trend and coach feedback. Manual Entry AI Body Scan WEIGHT TREND ADD ENTRIES TO SEE YOUR TREND Add at least 2 check-ins to see your weight trend. STRENGTH PROGRESSION VERIFIED PRS & ESTIMATED 1RM HISTORY No strength progression data available. Log heavy sets to establish a baseline. WHAT CHANGED SIGNALS FROM LATEST ENTRY Composition not logged No metrics captured No concierge observations RECENT ENTRIES LAST 10 No entries yet. ELITE PROTOCOLS YOUR UNLOCKED CLASSIFIED ACHIEVEMENTS AND PRESTIGE RANKS Achievements are warming up. Your progress data is still safe. No protocols unlocked ye…

## iPhone 15 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3004/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 330
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/check_in.png`
- Text preview: Skip to main content ← COCKPIT DAILY PROTOCOL SCAN Sync your internal vitals with the machine. READINESS INITIALIZATION VITAL CHECK SYSTEM ENERGY Required 1 2 3 4 5 SLEEP DURATION 0 Hours 0H 7H 14H SORENESS & NOTES Run AI Body Comp Scan Commit to Analysis HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3004/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1066
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/history.png`
- Text preview: Skip to main content ← WORKOUT HISTORY Past workouts and nutrition EVOLUTIONARY PERFORMANCE SYNTHESIS "Your physiological adaptation to increased training volume is evident, as you have maintained a consistent performance without signs of fatigue or regression, signifying robust recovery mechanisms. Notably, your personal records (PRs) have plateaued despite an uptick in session frequency, suggesting a need to recalibrate for optimal mechanical overload. Metabolically, even with a 15% reduction in caloric intake, your session durations have remained stable, indicating enhanced metabolic efficiency and superior utilization of energy reserves. This trajectory highlights your advanced capacity for adaptation, warranting a strategic overhaul to break through current performance ceilings." SESSION LOGS METABOLIC INTAKE WORKOUT HISTORY TAP A ROW FOR DETAILS FILTER BY TYPE ALL STRENGTH CARDIO MOBILITY OTHER No workouts match. Log a session from the Workout page. Back to Workout HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Community

- Route: `/community`
- Final URL: http://localhost:3004/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2134
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/community.png`
- Text preview: Skip to main content COMMUNITY Join challenges, find your group, and stay motivated with other members HOW COMMUNITY WORKS 1. Join a challenge or group that matches your style. 2. Keep logging workouts, meals, or steps as usual. 3. Your standing updates as your activity is recorded. MANAGE FRIENDS LIVE CHALLENGES JOIN ONE CHALLENGE, KEEP LOGGING, AND YOUR PROGRESS COUNTS AUTOMATICALLY MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! SCORED BY WORKOUTS LOGGED 0 MEMBERS Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! SCORED BY WORKOUTS LOGGED 0 MEMBERS Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE GROUPS PICK A GROUP THAT MATCHES YOUR STYLE AND STAY ACCOUNTABLE WITH PEOPLE LIKE YOU 🔥 Early Risers The 5 am club. Log your morning sessions here. Join this group to see the leaderboard, compare progress, and stay accountable. JOIN GROUP 🏋️ Powerlifters Squat, bench, deadlift focus. Join this group to see the leaderboard, compare progress, and stay accountable. JOIN GROUP ❤️ Healthy Recipes Share and track meal plans with the community. Join this group…

## iPhone 15 — Settings

- Route: `/settings`
- Final URL: http://localhost:3004/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2748
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/settings.png`
- Text preview: Skip to main content SETTINGS Profile, AI preferences, and data sources AUTHENTICATED PULSE Signed in as test-agent@fitnova.ai TERMINATE SESSION TROPHY ROOM EARNED ACHIEVEMENTS AND BADGES NO TROPHIES YET Log workouts and hit your macro targets to earn badges. NEURAL IDENTIFICATION CORE ACCOUNT PARAMETERS ACCOUNT VECTORS Name Phone number Used for SMS briefings and inbound coaching texts. BIOMETRIC CONSTANTS Age Sex Select Male Female Other Activity level Select Sedentary Light (1-2 days/week) Moderate (3-4 days/week) Active (5+ days/week) Units in / lbs cm / kg Height (in) Weight (lb) STRATEGIC OBJECTIVES Goals WEIGHT LOSS MUSCLE GAIN ENDURANCE GENERAL FITNESS MOBILITY Experience level Select Beginner Intermediate Advanced Motivational driver Select Performance Health Aesthetics Stress Injuries and limitations AI PREFERENCES ACCOUNTABILITY STYLE AND GUIDANCE CADENCE Coach tone Evidence-based balanced High accountability Supportive low-pressure Nudge intensity Light Standard High REMINDERS IN-APP NUDGES (NO PUSH OR EMAIL YET) Remind me to generate today's plan Remind me to log my workout Weigh-in reminder Weekly Off TRAINING SCHEDULE USED TO PERSONALIZE WEEKLY AND DAILY PLANNING Pr…

## iPhone 15 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3004/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1781
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/integrations.png`
- Text preview: Skip to main content INTEGRATIONS & DEVICES Connect your wearables to supercharge your AI Coach with real biometric data SETUP INSTRUCTIONS LINK YOUR DEVICE TO START SYNCING IN UNDER 2 MINUTES 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. 50b2c7bf-6561-4919-be2e-788308bcd2a3 COPY 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → SUPPORTED DEVICES STATUS REFLECTS REAL DATA RECEIVED — NOT JUST DASHBOARD LINKS ⌚ Garmin Connect Activity, Sleep, HRV, SpO2 CONNECT VIA DASHBOARD 💍 Oura Ring Deep Sleep, HRV, Readiness …

## iPhone 15 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3004/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 871
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/pricing.png`
- Text preview: Skip to main content INVESTMENT IN EXCELLENCE CHOOSE YOUR PROTOCOL Scale your performance with precision-engineered coaching tiers. STANDARD 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync START FREE TRIAL MOST ADVANCED PRO $9.99 /mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed GO PRO (INCLUDES TRIAL) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” MARCUS V. HYROX ELITE ATHLETE HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3004/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 501
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-6/mobile/coach_support.png`
- Text preview: Skip to main content ← DASHBOARD COACH ESCALATION Hybrid support for blockers, injury concerns, and plan complexity REQUEST COACH REVIEW ESCALATE WHEN AI GUIDANCE NEEDS HUMAN OVERSIGHT Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation RECENT REQUESTS TRACK STATUS OF YOUR ESCALATION QUEUE No escalation requests yet. Use this flow when you need human review. Return to Dashboard AI HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

