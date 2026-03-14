# Web Surface Smoke Report

- Generated (UTC): 2026-03-14T02:24:24.963Z to 2026-03-14T02:28:14.542Z
- Base URL: http://localhost:3003
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
- Final URL: http://localhost:3003/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 2662
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/landing.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER READINESS ⚡ 50% STREAK 🔥 0 DAYS VOLUME 📊 0 SZN TODAY 🧬 NO PROTOCOL START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. TODAY'S COACHING SUMMARY TODAY'S FOCUS Analyzing Schedule... Generate your daily plan to see the recommended workout focus. “Generate today’s plan and complete one key action (workout or nutrition log).” COACH SUMMARY Generate today's plan or log one action to unlock your daily coach summary. 🛡️ WHY THIS MATTERS Plain-English rule: if readiness looks low, choose an easier day or ask Coach to adapt the plan before you start. LATENT OVERREACHING ALERT Your HRV has shown a significant drop over the past week, despite consistent sleep quality. This suggests potential latent overreaching, indicating your CNS may be under stress from recent training loads. Consider reducing workout intensity for the next few days and integrating more active recovery sessions to mitigate this risk and allow for a regeneration phase. PROTEIN TRACKING INCONSISTENCY Your…

## Desktop 1440 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3003/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 706
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/assessment.png`
- Text preview: Skip to main content AI ASSESSMENT BUILD YOUR LEGEND STEP_IDENT_01 // TOTAL_07 WHAT IS YOUR PRIMARY GOAL RIGHT NOW? WEIGHT LOSS Protocol selection optimized for performance. MUSCLE GAIN Protocol selection optimized for performance. MOBILITY Protocol selection optimized for performance. GENERAL FITNESS Protocol selection optimized for performance. ABORT / BACK INITIALIZE NEXT STEP LEGEND_OS V2.4 // SECURE_INTEL_GATED LIVE BUILD SELECTIONS SHAPE YOUR NEURAL NET TARGET GOAL WEIGHT LOSS XP BASELINE BEGINNER FREQUENCY 3 DAYS ENVIRONMENT GYM METABOLIC FOCUS CALORIE CONTROL NEURAL RATIONALE Based on your beginner status, we are calibrating a weight loss protocol focused on gym execution 3 days.

## Desktop 1440 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3003/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 750
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/auth.png`
- Text preview: Skip to main content CONTINUE YOUR PERSONALIZED PLAN Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today's workout, or logging your first meal. Continue with Google[DEV] Bypass Login Email Send magic link AI guidance is educational and does not replace medical care. What happens next Here is the exact flow after you sign in so there are no surprises. 1. Verify your account securely. 2. Koda restores your setup and opens the right next screen. 3. Start your first workout, meal log, or coach-guided check-in. Recommended next route: / Back to home

## Desktop 1440 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3003/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 713
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/onboarding.png`
- Text preview: Skip to main content ONBOARDING Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Your body metrics Your body metrics These details help Koda size your workouts, nutrition targets, and recovery guidance correctly. You can update them later in Settings. Name Phone number (optional) Age Sex (for physiology guidance) Select Male Female Other Preferred units in / lbs cm / kg Height (in) Weight (lb) Next WHAT YOU UNLOCK Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days EDUCATIONAL AI COACHING · NOT MEDICAL CARE

## Desktop 1440 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3003/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2676
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/dashboard.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER READINESS ⚡ 50% STREAK 🔥 0 DAYS VOLUME 📊 0 SZN TODAY 🧬 NO PROTOCOL START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. TODAY'S COACHING SUMMARY TODAY'S FOCUS Analyzing Schedule... Generate your daily plan to see the recommended workout focus. “Generate today’s plan and complete one key action (workout or nutrition log).” COACH SUMMARY Generate today's plan or log one action to unlock your daily coach summary. 🛡️ WHY THIS MATTERS Plain-English rule: if readiness looks low, choose an easier day or ask Coach to adapt the plan before you start. CNS ALERT: POTENTIAL OVERREACH Your Heart Rate Variability (HRV) has shown a notable decrease over the past week despite maintaining good sleep metrics. This indicates potential latent overreaching, where your Central Nervous System (CNS) may not be coping well with the training load. Consider scaling back your intensity or volume for your next few sessions to allow for recovery and avoid burnout. PROTEIN INTAKE AND RECOVERY…

## Desktop 1440 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3003/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2584
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/plan.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER TRAINING PLAN Week of 2026-03-09 · Aligned to your schedule General fitness and consistency REGENERATE PLAN THIS WEEK'S COACH NOTE Plain-English summary: what to focus on this week, what to avoid, and what Koda wants you to do next. It looks like this week didn't include any workouts or nutrition logging, which makes it a great time to regroup and refocus on your fitness journey. To enhance your consistency, consider scheduling at least two short workouts and logging your meals next week for better accountability. Taking these steps can help you re-establish your routine and make progress towards your goals. THIS WEEK MON 9 Full body strength (compound movements) HIGH · 50 min TUE 10 Conditioning cardio intervals MODERATE · 40 min WED 11 Lower body strength + core HIGH · 50 min THU 12 Recovery + mobility flow RECOVERY · 30 min FRI 13 Upper body strength (push + pull) TODAY MODERATE · 45 min SAT 14 Recovery and movement quality REST RECOVERY · 30 min SUN 15 Recovery and movement quality REST RECOVERY · 25 min FRIDAY — TODAY UPPER BO…

## Desktop 1440 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3003/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1025
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/log_workout.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER WORKOUT Capture sessions and keep progression visible COACHING PROTOCOL INITIATE COACHED SESSION PLAN-AWARE SEQUENCE FLOW WITH NEURAL GUIDANCE. BEGIN GUIDED EXPERIENCE COACH'S TAKE PLAIN-ENGLISH GUIDANCE FOR TODAY'S SESSION KEEP THE MAIN LIFTS STEADY TODAY, THEN FINISH WITH ONE SHORTER HARD EFFORT IF YOUR ENERGY STILL FEELS GOOD. MOTION LAB QUERY CONCIERGE QUICK WORKOUT LOG SAVE THE SESSION SO YOUR DASHBOARD, PLAN, AND PROGRESS STAY CURRENT Session type STRENGTH Progressive overload CARDIO Aerobic conditioning MOBILITY Movement quality OTHER Custom session Exercise Details (Optional) Duration (min) 15m 30m 45m 60m How hard it felt (RPE 1-10) Select 1-10 LIGHT MAX Save workout RECENT SESSIONS LAST 20 ENTRIES No workouts yet. Start a guided session or quick log above. START GUIDED WORKOUT VIEW HISTORY ANALYZE MOVEMENT COACH KODA IS READY

## Desktop 1440 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3003/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 743
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/guided_workout.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER Exit SESSION OVERVIEW UPPER BODY STRENGTH (PUSH + PULL) 7 MOVEMENTS ~56M DURATION SEQUENCE FLOW 1 BARBELL BENCH PRESS 4 Sets · 5–8 Reps 2 INCLINE DUMBBELL PRESS 3 Sets · 8–12 Reps 3 CABLE CHEST FLY (HIGH TO LOW) 3 Sets · 12–15 Reps 4 SMITH MACHINE SHOULDER PRESS 3 Sets · 10–12 Reps 5 DUMBBELL LATERAL RAISE 3 Sets · 15–20 Reps 6 HANGING LEG RAISE 3 Sets · 10–15 Reps 7 MEDICINE BALL SLAM 3 Sets · 10–15 Reps COACH NOTE Focus on the "Intent" cues for each move. This session is designed to optimize movement quality under fatigue. INITIATE EXPERIENCE COACH KODA IS READY

## Desktop 1440 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3003/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 470
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/motion_lab.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← WORKOUT MOTION LAB Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. SELECT VIDEO NEURAL VERDICT BIOMECHANICAL INTEGRITY STATUS AWAITING DATA Upload a movement clip to activate the motion analysis system. COACH KODA IS READY

## Desktop 1440 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3003/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1194
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/nutrition.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER NUTRITION Log meals, track macros, and stay on target LOG A MEAL CHOOSE ONE: DESCRIBE IT, TAKE A PHOTO, OR SCAN A BARCODE Fastest option: type a short description. Best estimate: use a clear top-down photo. Packaged food: scan the barcode. DESCRIBE PHOTO BARCODE VISUAL CAPTURE SUPPORTS PRIMARY LENS INTAKE Choose photo Tip: a clear top-down photo with good lighting gives the best results. VIEW HISTORY MEAL PLANNER FRIDGE SCANNER ASK AI ON DASHBOARD TODAY'S TARGETS BASED ON LOGGED MEALS 0 KCAL PROTEIN 0G / 150G CARBS 0G / — FAT 0G / — To kickstart your day and maximize Muscle Protein Synthesis, aim for a balanced meal incorporating protein, healthy fats, and carbohydrates within the first hour of waking. Consider a high-protein breakfast, like scrambled eggs with avocado on whole-grain toast, to fuel both your energy levels and muscle recovery. SUGGEST NEXT MEAL HYDRATION SYSTEM DAILY TARGET: 2.5 L 0.0L INTAKE VOLUME +0.25L +0.5L No meals logged yet — use the form above to get started. COACH KODA IS READY

## Desktop 1440 — Progress

- Route: `/progress`
- Final URL: http://localhost:3003/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2798
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/progress.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER PROGRESS Body composition, trend tracking, and your next best step HOW TO UNLOCK MORE INSIGHT Add at least two check-ins to unlock clearer trends and AI summaries. Fastest path: save one manual entry today, then repeat after your next workout or weekly check-in. MANUAL ENTRY AI BODY SCAN COACH SUMMARY WHAT CHANGED RECENTLY AND WHAT KODA THINKS YOU SHOULD DO NEXT No trend available yet. Add at least two check-ins to unlock AI narrative insight. LATEST CHECK-IN Log your first weight to unlock your AI trend projection. Manual Entry AI Body Scan BIOLOGICAL WEIGHT TREND LOG ENTRIES TO SEE YOUR TREND Add at least 2 progress entries to see your biological weight trend. STRENGTH PROGRESSION VERIFIED PRS & ESTIMATED 1RM HISTORY No strength progression data available. Log heavy sets to establish a baseline. WHAT CHANGED SIGNALS FROM LATEST ENTRY Composition not logged No metrics captured No concierge observations RECENT ENTRIES LAST 10 No entries yet. ELITE PROTOCOLS YOUR UNLOCKED CLASSIFIED ACHIEVEMENTS AND PRESTIGE RANKS Achievements are w…

## Desktop 1440 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3003/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 412
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/check_in.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← COCKPIT DAILY PROTOCOL SCAN Sync your internal vitals with the machine. READINESS INITIALIZATION VITAL CHECK SYSTEM ENERGY Required 1 2 3 4 5 SLEEP DURATION 0 Hours 0H 7H 14H SORENESS & NOTES Run AI Body Comp Scan Commit to Analysis COACH KODA IS READY

## Desktop 1440 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3003/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1222
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/history.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← WORKOUT HISTORY Past workouts and nutrition EVOLUTIONARY PERFORMANCE SYNTHESIS "Your physiological adaptation is remarkable, as evidenced by your ability to maintain a consistent training volume with reduced signs of fatigue, suggesting enhanced recovery capabilities. Notably, your mechanical overload progression is on an upward trajectory; despite lower session frequencies, you're achieving new PRs, indicating improved neuromuscular efficiency and strategic intensity peaks. Furthermore, your metabolic efficiency is optimized, as your session durations are extending while caloric intake remains stable, reflecting a refined utilization of energy substrates and hydration strategies. Your peak mechanical output in the main lifts has stabilized despite a lower metabolic intake, underscoring a sophisticated adaptation to training stimuli." SESSION LOGS METABOLIC INTAKE WORKOUT HISTORY TAP A ROW FOR DETAILS FILTER BY TYPE ALL STRENGTH CARDIO MOBILITY OTHER No workouts match. Log a session from the Workout page. Back to Workout COACH KO…

## Desktop 1440 — Community

- Route: `/community`
- Final URL: http://localhost:3003/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1997
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/community.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER COMMUNITY Join challenges, find your group, and stay motivated with other members MANAGE FRIENDS LIVE CHALLENGES SIMPLE WAYS TO JOIN COMMUNITY GOALS AND STAY ACCOUNTABLE THIS WEEK MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! METRIC: WORKOUTS 0 JOINED Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! METRIC: WORKOUTS 0 JOINED Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE GROUPS PICK A GROUP THAT MATCHES YOUR STYLE AND KEEP YOUR PROGRESS VISIBLE 🔥 EARLY RISERS THE 5 AM CLUB. LOG YOUR MORNING SESSIONS HERE. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP 🏋️ POWERLIFTERS SQUAT, BENCH, DEADLIFT FOCUS. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP ❤️ HEALTHY RECIPES SHARE AND TRACK MEAL PLANS WITH THE COMMUNITY. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP ⚡ 10K STEP …

## Desktop 1440 — Settings

- Route: `/settings`
- Final URL: http://localhost:3003/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2830
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/settings.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER SETTINGS Profile, AI preferences, and data sources AUTHENTICATED PULSE Signed in as test-agent@fitnova.ai TERMINATE SESSION TROPHY ROOM EARNED ACHIEVEMENTS AND BADGES NO TROPHIES YET Log workouts and hit your macro targets to earn badges. NEURAL IDENTIFICATION CORE ACCOUNT PARAMETERS ACCOUNT VECTORS Name Phone number Used for SMS briefings and inbound coaching texts. BIOMETRIC CONSTANTS Age Sex Select Male Female Other Activity level Select Sedentary Light (1-2 days/week) Moderate (3-4 days/week) Active (5+ days/week) Units in / lbs cm / kg Height (in) Weight (lb) STRATEGIC OBJECTIVES Goals WEIGHT LOSS MUSCLE GAIN ENDURANCE GENERAL FITNESS MOBILITY Experience level Select Beginner Intermediate Advanced Motivational driver Select Performance Health Aesthetics Stress Injuries and limitations AI PREFERENCES ACCOUNTABILITY STYLE AND GUIDANCE CADENCE Coach tone Evidence-based balanced High accountability Supportive low-pressure Nudge intensity Light Standard High REMINDERS IN-APP NUDGES (NO PUSH OR EMAIL YET) Remind me to generate today…

## Desktop 1440 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3003/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1863
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/integrations.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER INTEGRATIONS & DEVICES Connect your wearables to supercharge your AI Coach with real biometric data SETUP INSTRUCTIONS LINK YOUR DEVICE TO START SYNCING IN UNDER 2 MINUTES 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. 50b2c7bf-6561-4919-be2e-788308bcd2a3 COPY 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → SUPPORTED DEVICES STATUS REFLECTS REAL DATA RECEIVED — …

## Desktop 1440 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3003/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 952
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/pricing.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER INVESTMENT IN EXCELLENCE CHOOSE YOUR PROTOCOL Scale your performance with precision-engineered coaching tiers. STANDARD 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync START FREE TRIAL MOST ADVANCED PRO $9.99 /mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed GO PRO (INCLUDES TRIAL) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” MARCUS V. HYROX ELITE ATHLETE COACH KODA IS READY

## Desktop 1440 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3003/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 583
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/desktop/coach_support.png`
- Text preview: Skip to main content KODA AI DASHBOARD VITALS TRAINING PLAN NUTRITION WORKOUT CHECK-IN PROGRESS COMMUNITY COACH SETTINGS T test-agent@fitnova.ai MEMBER ← DASHBOARD COACH ESCALATION Hybrid support for blockers, injury concerns, and plan complexity REQUEST COACH REVIEW ESCALATE WHEN AI GUIDANCE NEEDS HUMAN OVERSIGHT Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation RECENT REQUESTS TRACK STATUS OF YOUR ESCALATION QUEUE No escalation requests yet. Use this flow when you need human review. Return to Dashboard AI COACH KODA IS READY

## iPhone 15 — Landing page

- Route: `/`
- Final URL: http://localhost:3003/
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 764
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/landing.png`
- Text preview: Skip to main content READINESS ⚡ 50% STREAK 🔥 0 DAYS VOLUME 📊 0 SZN TODAY 🧬 NO PROTOCOL START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. COMMAND CENTER KODA AI Ask questions, log data, or adjust today's plan. Logged actions will update the relevant tab automatically. I JUST ATE 3 EGGS AND TOAST LOG A HEAVY LEG DAY WORKOUT UPDATE MY BODY WEIGHT TO 185LBS HOW AM I DOING THIS WEEK? READY FOR INPUT You can ask Koda to do anything — log your meals, track a workout, adapt a daily plan, or analyze your progress. Koda will automatically process your data or seamlessly navigate you to the relevant part of the app. Send HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH

## iPhone 15 — Assessment start

- Route: `/start`
- Final URL: http://localhost:3003/start
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 706
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/assessment.png`
- Text preview: Skip to main content AI ASSESSMENT BUILD YOUR LEGEND STEP_IDENT_01 // TOTAL_07 WHAT IS YOUR PRIMARY GOAL RIGHT NOW? WEIGHT LOSS Protocol selection optimized for performance. MUSCLE GAIN Protocol selection optimized for performance. MOBILITY Protocol selection optimized for performance. GENERAL FITNESS Protocol selection optimized for performance. ABORT / BACK INITIALIZE NEXT STEP LEGEND_OS V2.4 // SECURE_INTEL_GATED LIVE BUILD SELECTIONS SHAPE YOUR NEURAL NET TARGET GOAL WEIGHT LOSS XP BASELINE BEGINNER FREQUENCY 3 DAYS ENVIRONMENT GYM METABOLIC FOCUS CALORIE CONTROL NEURAL RATIONALE Based on your beginner status, we are calibrating a weight loss protocol focused on gym execution 3 days.

## iPhone 15 — Authentication

- Route: `/auth`
- Final URL: http://localhost:3003/auth
- HTTP status: 200
- Auth bootstrap: No auth bootstrap required.
- Text length: 750
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/auth.png`
- Text preview: Skip to main content CONTINUE YOUR PERSONALIZED PLAN Create your Koda AI coaching account You are one step away from adaptive workouts, nutrition targets, and in-app accountability. Sign in once and Koda will bring you back to the right next step, whether that is finishing setup, starting today's workout, or logging your first meal. Continue with Google[DEV] Bypass Login Email Send magic link AI guidance is educational and does not replace medical care. What happens next Here is the exact flow after you sign in so there are no surprises. 1. Verify your account securely. 2. Koda restores your setup and opens the right next screen. 3. Start your first workout, meal log, or coach-guided check-in. Recommended next route: / Back to home

## iPhone 15 — Onboarding

- Route: `/onboarding?resume=1`
- Final URL: http://localhost:3003/onboarding?resume=1
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 713
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/onboarding.png`
- Text preview: Skip to main content ONBOARDING Build your AI coaching profile This takes about two minutes and helps tailor workouts, nutrition, and safety adjustments. Step 1 of 7: Your body metrics Your body metrics These details help Koda size your workouts, nutrition targets, and recovery guidance correctly. You can update them later in Settings. Name Phone number (optional) Age Sex (for physiology guidance) Select Male Female Other Preferred units in / lbs cm / kg Height (in) Weight (lb) Next WHAT YOU UNLOCK Adaptive daily plan based on your goals and schedule Nutrition targets tuned to your progress trend Safety-aware alternatives for injuries and low-energy days EDUCATIONAL AI COACHING · NOT MEDICAL CARE

## iPhone 15 — Dashboard AI command center

- Route: `/?focus=ai`
- Final URL: http://localhost:3003/?focus=ai
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 764
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/dashboard.png`
- Text preview: Skip to main content READINESS ⚡ 50% STREAK 🔥 0 DAYS VOLUME 📊 0 SZN TODAY 🧬 NO PROTOCOL START HERE TODAY Generate today's plan first, then complete one key action: a workout, a meal log, or a quick check-in. COMMAND CENTER KODA AI Ask questions, log data, or adjust today's plan. Logged actions will update the relevant tab automatically. I JUST ATE 3 EGGS AND TOAST LOG A HEAVY LEG DAY WORKOUT UPDATE MY BODY WEIGHT TO 185LBS HOW AM I DOING THIS WEEK? READY FOR INPUT You can ask Koda to do anything — log your meals, track a workout, adapt a daily plan, or analyze your progress. Koda will automatically process your data or seamlessly navigate you to the relevant part of the app. Send HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH

## iPhone 15 — Weekly plan

- Route: `/plan`
- Final URL: http://localhost:3003/plan
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2464
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/plan.png`
- Text preview: Skip to main content TRAINING PLAN Week of 2026-03-09 · Aligned to your schedule General fitness and consistency REGENERATE PLAN THIS WEEK'S COACH NOTE Plain-English summary: what to focus on this week, what to avoid, and what Koda wants you to do next. This week brought a pause in your workouts and nutrition logging, which can impact your overall progress. To get back on track, I recommend committing to at least three short workouts and logging your meals for the next week to help reignite your routine and establish a strong foundation. Remember, consistency is key for achieving your goals! THIS WEEK MON 9 Full body strength (compound movements) HIGH · 50 min TUE 10 Conditioning cardio intervals MODERATE · 40 min WED 11 Lower body strength + core HIGH · 50 min THU 12 Recovery + mobility flow RECOVERY · 30 min FRI 13 Upper body strength (push + pull) TODAY MODERATE · 45 min SAT 14 Recovery and movement quality REST RECOVERY · 30 min SUN 15 Recovery and movement quality REST RECOVERY · 25 min FRIDAY — TODAY UPPER BODY STRENGTH (PUSH + PULL) 45M Intensity Moderate Duration 45 minutes Fits your preferred schedule PREFERRED TRAINING DAY WHY THIS SESSION IS HERE Aligned with your prefe…

## iPhone 15 — Workout log

- Route: `/log/workout`
- Final URL: http://localhost:3003/log/workout
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 943
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/log_workout.png`
- Text preview: Skip to main content WORKOUT Capture sessions and keep progression visible COACHING PROTOCOL INITIATE COACHED SESSION PLAN-AWARE SEQUENCE FLOW WITH NEURAL GUIDANCE. BEGIN GUIDED EXPERIENCE COACH'S TAKE PLAIN-ENGLISH GUIDANCE FOR TODAY'S SESSION KEEP THE MAIN LIFTS STEADY TODAY, THEN FINISH WITH ONE SHORTER HARD EFFORT IF YOUR ENERGY STILL FEELS GOOD. MOTION LAB QUERY CONCIERGE QUICK WORKOUT LOG SAVE THE SESSION SO YOUR DASHBOARD, PLAN, AND PROGRESS STAY CURRENT Session type STRENGTH Progressive overload CARDIO Aerobic conditioning MOBILITY Movement quality OTHER Custom session Exercise Details (Optional) Duration (min) 15m 30m 45m 60m How hard it felt (RPE 1-10) Select 1-10 LIGHT MAX Save workout RECENT SESSIONS LAST 20 ENTRIES No workouts yet. Start a guided session or quick log above. START GUIDED WORKOUT VIEW HISTORY ANALYZE MOVEMENT HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Guided workout

- Route: `/log/workout/guided`
- Final URL: http://localhost:3003/log/workout/guided
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 661
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/guided_workout.png`
- Text preview: Skip to main content Exit SESSION OVERVIEW UPPER BODY STRENGTH (PUSH + PULL) 7 MOVEMENTS ~56M DURATION SEQUENCE FLOW 1 BARBELL BENCH PRESS 4 Sets · 5–8 Reps 2 INCLINE DUMBBELL PRESS 3 Sets · 8–12 Reps 3 CABLE CHEST FLY (HIGH TO LOW) 3 Sets · 12–15 Reps 4 SMITH MACHINE SHOULDER PRESS 3 Sets · 10–12 Reps 5 DUMBBELL LATERAL RAISE 3 Sets · 15–20 Reps 6 HANGING LEG RAISE 3 Sets · 10–15 Reps 7 MEDICINE BALL SLAM 3 Sets · 10–15 Reps COACH NOTE Focus on the "Intent" cues for each move. This session is designed to optimize movement quality under fatigue. INITIATE EXPERIENCE HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Motion Lab

- Route: `/motion`
- Final URL: http://localhost:3003/motion
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 388
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/motion_lab.png`
- Text preview: Skip to main content ← WORKOUT MOTION LAB Upload side-profile footage for biomechanical critique. Upload Footage MP4 or MOV. Keep it under 30 seconds for the cleanest scan. SELECT VIDEO NEURAL VERDICT BIOMECHANICAL INTEGRITY STATUS AWAITING DATA Upload a movement clip to activate the motion analysis system. HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Nutrition log

- Route: `/log/nutrition`
- Final URL: http://localhost:3003/log/nutrition
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1124
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/nutrition.png`
- Text preview: Skip to main content NUTRITION Log meals, track macros, and stay on target LOG A MEAL CHOOSE ONE: DESCRIBE IT, TAKE A PHOTO, OR SCAN A BARCODE Fastest option: type a short description. Best estimate: use a clear top-down photo. Packaged food: scan the barcode. DESCRIBE PHOTO BARCODE VISUAL CAPTURE SUPPORTS PRIMARY LENS INTAKE Choose photo Tip: a clear top-down photo with good lighting gives the best results. VIEW HISTORY MEAL PLANNER FRIDGE SCANNER ASK AI ON DASHBOARD TODAY'S TARGETS BASED ON LOGGED MEALS 0 KCAL PROTEIN 0G / 150G CARBS 0G / — FAT 0G / — To effectively kickstart your day and enhance Muscle Protein Synthesis, aim to consume a protein-rich breakfast within an hour of waking, ideally including sources like eggs or Greek yogurt. Prioritize getting at least 20-30 grams of protein early on to set a solid foundation for muscle recovery and growth throughout the day. SUGGEST NEXT MEAL HYDRATION SYSTEM DAILY TARGET: 2.5 L 0.0L INTAKE VOLUME +0.25L +0.5L No meals logged yet — use the form above to get started. HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Progress

- Route: `/progress`
- Final URL: http://localhost:3003/progress
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2716
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/progress.png`
- Text preview: Skip to main content PROGRESS Body composition, trend tracking, and your next best step HOW TO UNLOCK MORE INSIGHT Add at least two check-ins to unlock clearer trends and AI summaries. Fastest path: save one manual entry today, then repeat after your next workout or weekly check-in. MANUAL ENTRY AI BODY SCAN COACH SUMMARY WHAT CHANGED RECENTLY AND WHAT KODA THINKS YOU SHOULD DO NEXT No trend available yet. Add at least two check-ins to unlock AI narrative insight. LATEST CHECK-IN Log your first weight to unlock your AI trend projection. Manual Entry AI Body Scan BIOLOGICAL WEIGHT TREND LOG ENTRIES TO SEE YOUR TREND Add at least 2 progress entries to see your biological weight trend. STRENGTH PROGRESSION VERIFIED PRS & ESTIMATED 1RM HISTORY No strength progression data available. Log heavy sets to establish a baseline. WHAT CHANGED SIGNALS FROM LATEST ENTRY Composition not logged No metrics captured No concierge observations RECENT ENTRIES LAST 10 No entries yet. ELITE PROTOCOLS YOUR UNLOCKED CLASSIFIED ACHIEVEMENTS AND PRESTIGE RANKS Achievements are warming up. Your progress data is still safe. No protocols unlocked yet. Keep grinding to earn elite status. WEEKLY MICROCYCLE GENER…

## iPhone 15 — Daily check-in

- Route: `/check-in`
- Final URL: http://localhost:3003/check-in
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 330
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/check_in.png`
- Text preview: Skip to main content ← COCKPIT DAILY PROTOCOL SCAN Sync your internal vitals with the machine. READINESS INITIALIZATION VITAL CHECK SYSTEM ENERGY Required 1 2 3 4 5 SLEEP DURATION 0 Hours 0H 7H 14H SORENESS & NOTES Run AI Body Comp Scan Commit to Analysis HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — History

- Route: `/history?tab=workouts`
- Final URL: http://localhost:3003/history?tab=workouts
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1152
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/history.png`
- Text preview: Skip to main content ← WORKOUT HISTORY Past workouts and nutrition EVOLUTIONARY PERFORMANCE SYNTHESIS "Your physiological adaptation is commendably robust, as evidenced by an 18% increase in training volume with minimal signs of systemic fatigue, suggesting superior recovery and adaptation processes. Notably, your peak mechanical output in compound lifts has stabilized at your historic PR level, despite a 30% reduction in caloric intake, indicating that mechanical overload is not yet optimized for further strength gains. Moreover, your metabolic efficiency is becoming more acute; the data shows a 25% decrease in hydration intake while maintaining session duration, underlining enhanced energy substrate utilization and fluid balance. Overall, your current trajectory reflects a sophisticated synergy between reduced nutritional inputs and sustained mechanical performance." SESSION LOGS METABOLIC INTAKE WORKOUT HISTORY TAP A ROW FOR DETAILS FILTER BY TYPE ALL STRENGTH CARDIO MOBILITY OTHER No workouts match. Log a session from the Workout page. Back to Workout HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Community

- Route: `/community`
- Final URL: http://localhost:3003/community
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1915
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/community.png`
- Text preview: Skip to main content COMMUNITY Join challenges, find your group, and stay motivated with other members MANAGE FRIENDS LIVE CHALLENGES SIMPLE WAYS TO JOIN COMMUNITY GOALS AND STAY ACCOUNTABLE THIS WEEK MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! METRIC: WORKOUTS 0 JOINED Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE MARCH MADNESS LOG THE MOST WORKOUTS IN MARCH! METRIC: WORKOUTS 0 JOINED Join now to add this challenge to your routine and keep your momentum visible. JOIN CHALLENGE GROUPS PICK A GROUP THAT MATCHES YOUR STYLE AND KEEP YOUR PROGRESS VISIBLE 🔥 EARLY RISERS THE 5 AM CLUB. LOG YOUR MORNING SESSIONS HERE. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP 🏋️ POWERLIFTERS SQUAT, BENCH, DEADLIFT FOCUS. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP ❤️ HEALTHY RECIPES SHARE AND TRACK MEAL PLANS WITH THE COMMUNITY. Join this group to unlock the leaderboard and keep your accountability visible. JOIN GROUP ⚡ 10K STEP CHALLENGE DAILY WALKING TARGETS AND STEP GOALS. Join this group to unlock the leaderboard and keep your accountability visible. JOI…

## iPhone 15 — Settings

- Route: `/settings`
- Final URL: http://localhost:3003/settings
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 2748
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/settings.png`
- Text preview: Skip to main content SETTINGS Profile, AI preferences, and data sources AUTHENTICATED PULSE Signed in as test-agent@fitnova.ai TERMINATE SESSION TROPHY ROOM EARNED ACHIEVEMENTS AND BADGES NO TROPHIES YET Log workouts and hit your macro targets to earn badges. NEURAL IDENTIFICATION CORE ACCOUNT PARAMETERS ACCOUNT VECTORS Name Phone number Used for SMS briefings and inbound coaching texts. BIOMETRIC CONSTANTS Age Sex Select Male Female Other Activity level Select Sedentary Light (1-2 days/week) Moderate (3-4 days/week) Active (5+ days/week) Units in / lbs cm / kg Height (in) Weight (lb) STRATEGIC OBJECTIVES Goals WEIGHT LOSS MUSCLE GAIN ENDURANCE GENERAL FITNESS MOBILITY Experience level Select Beginner Intermediate Advanced Motivational driver Select Performance Health Aesthetics Stress Injuries and limitations AI PREFERENCES ACCOUNTABILITY STYLE AND GUIDANCE CADENCE Coach tone Evidence-based balanced High accountability Supportive low-pressure Nudge intensity Light Standard High REMINDERS IN-APP NUDGES (NO PUSH OR EMAIL YET) Remind me to generate today's plan Remind me to log my workout Weigh-in reminder Weekly Off TRAINING SCHEDULE USED TO PERSONALIZE WEEKLY AND DAILY PLANNING Pr…

## iPhone 15 — Integrations

- Route: `/integrations`
- Final URL: http://localhost:3003/integrations
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 1781
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/integrations.png`
- Text preview: Skip to main content INTEGRATIONS & DEVICES Connect your wearables to supercharge your AI Coach with real biometric data SETUP INSTRUCTIONS LINK YOUR DEVICE TO START SYNCING IN UNDER 2 MINUTES 1 Copy your Koda ID This is your unique identifier, required to pair your wearable data. 50b2c7bf-6561-4919-be2e-788308bcd2a3 COPY 2 Open the Open Wearables Dashboard Sign in and paste your Koda ID into the "User ID" field when linking a device. OAuth authentication happens there — this is the genuine step that authorizes your wearable account. Launch Dashboard 3 Data syncs automatically Once connected, your device sends sleep, HRV, and activity data to Koda AI in real-time. The "Active Sync" badge below will appear only after real data is received. ⚠️ Apple Health / Apple Watch requires a manual export. Apple does not support direct cloud OAuth like Garmin or Oura. To sync Apple Health data, you must export it from the Health app and import it manually, or use a third-party bridge app. Learn how to export → SUPPORTED DEVICES STATUS REFLECTS REAL DATA RECEIVED — NOT JUST DASHBOARD LINKS ⌚ Garmin Connect Activity, Sleep, HRV, SpO2 CONNECT VIA DASHBOARD 💍 Oura Ring Deep Sleep, HRV, Readiness …

## iPhone 15 — Pricing

- Route: `/pricing`
- Final URL: http://localhost:3003/pricing
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 871
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/pricing.png`
- Text preview: Skip to main content INVESTMENT IN EXCELLENCE CHOOSE YOUR PROTOCOL Scale your performance with precision-engineered coaching tiers. STANDARD 7-Day Trial Experience the full power of Koda AI for one week. Full Natural Language Logging Adaptive Daily Protocols Core Performance Analytics Single Device Sync START FREE TRIAL MOST ADVANCED PRO $9.99 /mo The gold standard for elite performance intelligence. Everything in Trial Predictive Progression Engine (1RM, PRs) Wearable Biometric Sync (SpO2, HRV, Sleep) Hormonal Cycle AI Coaching AI Motion Analysis Lab Metabolic Autopilot & Scanning Priority AI Inference Speed GO PRO (INCLUDES TRIAL) “Koda AI isn't just an app; it's the silent partner in my pursuit of elite performance. The precision is unmatched.” MARCUS V. HYROX ELITE ATHLETE HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

## iPhone 15 — Coach support

- Route: `/coach/escalate`
- Final URL: http://localhost:3003/coach/escalate
- HTTP status: 200
- Auth bootstrap: Authenticated via /api/v1/auth/mock-login?next=/
- Text length: 501
- Screenshot: `docs/reports/web-surface-smoke-execution-pass-4/mobile/coach_support.png`
- Text preview: Skip to main content ← DASHBOARD COACH ESCALATION Hybrid support for blockers, injury concerns, and plan complexity REQUEST COACH REVIEW ESCALATE WHEN AI GUIDANCE NEEDS HUMAN OVERSIGHT Topic Urgency Low Normal High Preferred channel In-app SMS Email Details Submit escalation RECENT REQUESTS TRACK STATUS OF YOUR ESCALATION QUEUE No escalation requests yet. Use this flow when you need human review. Return to Dashboard AI HOME PLAN NUTRITION WORKOUT PROGRESS SETTINGS COACH COACH KODA IS READY

