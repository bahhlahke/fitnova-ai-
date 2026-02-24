# FitNova AI Smoke Checklist (Private Launch)

Run this checklist before using the app each day in production mode.

1. Open `/` signed out and confirm the premium landing + `Start 1-minute assessment` CTA.
2. Complete `/start` assessment and confirm redirect to `/auth`.
3. Sign in via `/auth` (Google or magic link) and confirm redirect to `/onboarding?resume=1`.
4. Complete onboarding and confirm no error appears.
5. Open `/coach` and click `Generate today's plan`.
6. Verify plan card includes:
   - training focus
   - exercise list
   - calorie + protein target
7. Send a coach message and confirm assistant reply returns.
8. Click `Log planned workout complete` and verify success message.
9. Open `/log/workout` and confirm planned workout entry exists for today.
10. Open `/log/nutrition`, add meal, verify it appears immediately.
11. Open `/progress/add`, save weight entry, verify it appears on `/progress`.
12. Refresh each page on mobile viewport width and ensure no blocking UI errors.
