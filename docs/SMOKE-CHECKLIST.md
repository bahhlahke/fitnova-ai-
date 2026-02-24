# FitNova AI Smoke Checklist (Private Launch)

Run this checklist before using the app each day in production mode.

1. Sign in via `/auth` magic link.
2. Complete onboarding and confirm no error appears.
3. Open `/coach` and click `Generate today's plan`.
4. Verify plan card includes:
   - training focus
   - exercise list
   - calorie + protein target
5. Send a coach message and confirm assistant reply returns.
6. Click `Log planned workout complete` and verify success message.
7. Open `/log/workout` and confirm planned workout entry exists for today.
8. Open `/log/nutrition`, add meal, verify it appears immediately.
9. Open `/progress/add`, save weight entry, verify it appears on `/progress`.
10. Refresh each page on mobile viewport width and ensure no blocking UI errors.
