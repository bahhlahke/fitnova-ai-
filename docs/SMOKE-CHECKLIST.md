# FitNova AI Smoke Checklist

Run this checklist before releasing changes or after schema/API updates.

1. Signed-out flow:
Open `/` signed out and confirm the landing CTA routes to `/start`.
2. Assessment + auth:
Complete `/start`, confirm redirect to `/auth`, then sign in and land on `/onboarding` (or `/onboarding?resume=1`).
3. Onboarding:
Complete all onboarding steps and verify completion routes to `/`.
4. App shell:
Confirm signed-in primary nav shows exactly `Dashboard`, `Nutrition`, `Workout`, `Settings` on desktop and mobile.
5. Legacy redirects:
Verify `/coach`, `/omni`, `/log`, and `/coach/motion-lab` redirect correctly.
6. Dashboard AI:
Open `/?focus=ai`, confirm AI input autofocuses and quick actions work.
7. AI meal logging:
Send `I just ate 3 eggs and toast` in Dashboard AI and confirm:
   - assistant reply appears
   - action chip links to `/log/nutrition`
   - meal appears in Nutrition for today.
8. AI workout logging:
Send `Log a 45 minute strength workout` and confirm Workout recents update.
9. AI biometric logging:
Send `Update my body weight to 185 lb` and confirm Progress latest check-in reflects converted metric storage and correct local date.
10. Nutrition:
On `/log/nutrition`, verify both `Estimate with AI` and `Add without estimate` persist meals and update timeline totals.
11. Workout:
On `/log/workout`, quick-log a session and run one guided flow on `/log/workout/guided`; confirm completion saves to recents.
12. Motion + body scan:
Run `/motion` video analysis and `/progress/scan` body-comp scan; confirm results persist and refresh Dashboard/Progress.
13. Settings:
Save profile changes (including phone), run Apple Health import (xml/zip), and verify import summary updates.
14. History deep-links:
Open `/history?tab=workouts` and `/history?tab=nutrition` and confirm each tab initializes correctly.
15. Weekly planning + schedule personalization:
In Settings, change preferred training days/window, save, then refresh `/` and confirm weekly microcycle card updates.
16. Guided workout adaptation:
In `/log/workout/guided`, trigger `Swap Exercise` and confirm current move updates with substitution feedback.
17. Retention + nudge surface:
On `/`, verify retention risk card renders and coach nudges appear when risk/reminders are present.
18. Hybrid coach escalation:
Open `/coach/escalate`, submit a request, and confirm it appears in recent requests.
19. Reminder dispatch endpoint:
Call `POST /api/v1/jobs/reminders` (with `x-cron-secret` when configured) and confirm response includes processed/nudges counts.
