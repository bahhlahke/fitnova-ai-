# Koda AI — iOS App

Production-ready iOS client for Koda AI. Uses the same Supabase backend and Next.js API as the web app; auth is via **Bearer token** so the API accepts requests from native clients.

---

## Setup and run (summary)

### One-time setup

1. **Xcode 15+** and **iOS 16+** simulator or device.
2. **Open the project:** `ios/AskKodaAI/AskKodaAI.xcodeproj` (or create a new App project and name it **AskKodaAI**; the repo includes the full app source in `ios/AskKodaAI/AskKodaAI/`).
3. **Add Supabase:** **File → Add Package Dependencies…** → `https://github.com/supabase/supabase-swift.git` → add to target **AskKodaAI**.
4. **Configure secrets** (target → Info or Info.plist; do not commit real keys):
   - `SUPABASE_URL` — your Supabase project URL  
   - `SUPABASE_ANON_KEY` — Supabase anon key  
   - `API_BASE_URL` — your Next.js API base (e.g. `https://your-app.vercel.app` or `http://localhost:3000` for local dev)
5. **Add the test target** (for the test suite):
   - **File → New → Target** → **Unit Testing Bundle** → name **AskKodaAITests** (or **KodaAITests**).
   - Right‑click the new test target in the project navigator → **Add Files to "AskKodaAITests"…** → select the `ios/KodaAITests` folder (at repo root `ios/KodaAITests`), **Add to targets: AskKodaAITests**.
   - In the test target’s settings, set **AskKodaAI** as the target to test (so `@testable import AskKodaAI` works).
   - **Edit Scheme → Test:** Click the **AskKodaAI** scheme → **Edit Scheme…** → **Test** in the sidebar → **+** → add the **AskKodaAITests** (or KodaAITests) target. Otherwise `npm run test:ios` will report “Scheme is not currently configured for the test action”.

### Run the app

- In Xcode: choose a simulator (e.g. iPhone 16) or a device → **Product → Run** (⌘R).
- Sign in with magic link (or Sign in with Apple if configured); complete the link in Simulator’s browser or Mail.

### Run the test suite

- **In Xcode:** **Product → Test** (⌘U). Ensure **AskKodaAITests** is in the scheme’s Test action.
- **From repo root (terminal):** `npm run test:ios` (or `npm run test:ai-review:ios` / `npm run test:ios:ready` for AI review and production gate). The script uses a single simulator (iPhone 17); **run only one iOS test job at a time** on resource-limited machines.
- **If tests crash before running** (e.g. “Early unexpected exit” / “signal trap”): the test host is the app; it must launch successfully. Run `node scripts/generate-ios-env.mjs` from repo root so `ios/AskKodaAI/Config/Generated.xcconfig` exists with valid values from `.env.local`, then build and run the app once (⌘R) to confirm it launches, then run tests again.

---

## Requirements

- **Xcode 15+** (Swift 5.9+)
- **iOS 16+** deployment target
- Supabase project (same as web)
- Deployed Next.js API (e.g. Vercel) with `NEXT_PUBLIC_SITE_URL` set

## 1. Open or create the Xcode project

- **If the repo already has an AskKodaAI project:** Open `ios/AskKodaAI/AskKodaAI.xcodeproj`. The app source is in `ios/AskKodaAI/AskKodaAI/` (entry point: `AskKodaAIApp.swift` with `RootView`).
- **If creating from scratch:** **File → New → Project** → App (iOS) → **Product Name:** `AskKodaAI`, **Interface:** SwiftUI, **Language:** Swift. Save as `ios/AskKodaAI/AskKodaAI.xcodeproj`. Then copy the app source from `ios/KodaAI/` into the new project’s app folder (or add the `KodaAI` folder to the target) and use `AskKodaAIApp.swift` as the `@main` entry.

## 2. Add Supabase Swift SDK

1. **File → Add Package Dependencies…**
2. Enter: `https://github.com/supabase/supabase-swift.git`
3. **Add to target:** AskKodaAI. Use **Up to Next Major** with version **2.0.0** or later.

## 3. App source files

The **AskKodaAI** target should compile everything in `ios/AskKodaAI/AskKodaAI/`: Config, Core, Models, Services, Views, Components, `RootView.swift`, `MainTabView.swift`, and `AskKodaAIApp.swift` as the `@main` entry. If you created the project yourself, add these files/folders to the AskKodaAI target (or use the copied structure from the repo).

## 4. Configuration (secrets) — same as web (.env.local)

The iOS app uses the **same config source as the web app**: the repo's `.env.local`.

- **Recommended:** From repo root, ensure `.env.local` exists with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` (or `API_BASE_URL`). On each build, a Run Script runs `node scripts/generate-ios-env.mjs`, which writes `ios/AskKodaAI/Config/Generated.xcconfig`. The app target uses that file so `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `API_BASE_URL` match the web app. The generated file is in `.gitignore`; do not commit it.
- **First time or after adding .env.local:** From repo root run `node scripts/generate-ios-env.mjs` once so `Generated.xcconfig` exists before opening Xcode (otherwise the first build may use placeholders). If the script reports it couldn't write (e.g. file locked), run it again with write access; the build phase continues using the existing file.
- **Fallback — Info.plist / xcconfig:** You can instead set these keys in the target's Info or via a custom xcconfig; the generate script is optional if you provide them elsewhere.

**Legacy options (if not using .env.local):**

- **Option A — Info.plist (dev):** Add keys to the target’s **Info** tab (or `Info.plist`):
  - `SUPABASE_URL` — string, e.g. `https://xxxx.supabase.co`
  - `SUPABASE_ANON_KEY` — string, your anon key
  - `API_BASE_URL` — string, e.g. `https://askkodaai.com` or `https://your-app.vercel.app`
- **Option B — xcconfig:** Create e.g. `Config.xcconfig` with:
  ```
  SUPABASE_URL = https://xxxx.supabase.co
  SUPABASE_ANON_KEY = your-anon-key
  API_BASE_URL = https://your-api.vercel.app
  ```
  Add these to **Info.plist** via `$(SUPABASE_URL)` etc., and do not commit `Config.xcconfig` (add to `.gitignore`).

## 5. Magic link (email sign-in)

1. In **Signing & Capabilities**, add **Associated Domains** and add your web domain, e.g. `applinks:askkodaai.com`, so the magic link opens the app.
2. In the Supabase dashboard, set the **Site URL** and **Redirect URLs** to include your app’s URL scheme (e.g. `kodaai://auth/callback`) or the universal link path you use.
3. In the app, handle the open URL: in `KodaAIApp.swift` you can use `.onOpenURL` to pass the URL to `SupabaseService.shared.setSessionFrom(url:)` (implement that if your Supabase Swift SDK version exposes a session-from-URL API).

If your Supabase Swift SDK uses a different method name (e.g. `signInWithOtp` instead of `signInWithMagicLink`), update `SupabaseService` to match the [Supabase Swift Auth reference](https://supabase.com/docs/reference/swift/auth-signinwithotp).

## 6. API auth (Bearer token)

The Next.js API accepts **cookie** (web) or **Authorization: Bearer &lt;access_token&gt;** (mobile). The iOS app sends the Supabase `access_token` on every request via `KodaAPIService`. No backend changes are required beyond what’s already in `lib/supabase/server.ts`.

## 7. Apple Health (HealthKit)

- In Xcode, add the **HealthKit** capability (Signing & Capabilities → + Capability → HealthKit). Enable **Clinical Health Records** only if needed.
- Add `NSHealthShareUsageDescription` to Info.plist (see Info.plist.example). Request read access for weight, sleep, and step count. The app syncs the last 90 days to progress_tracking and check_ins.
- HealthKit is only available on physical iPhone (not Simulator for some APIs).

## 8. Production / App Store

- **Sign in with Apple:** If you offer email magic link, Apple requires also offering Sign in with Apple. Add a “Sign in with Apple” button and call `SupabaseService.signInWithApple(idToken:nonce:)` (implement using `AuthenticationServices` to get `idToken` and `nonce`).
- **Privacy:** Add a **Privacy Policy** URL and, if needed, **App Privacy** details in App Store Connect.
- **Capabilities:** Enable **Push Notifications** if you use them; **Background Modes** only if needed.
- **App Transport Security:** Use HTTPS for `API_BASE_URL` and `SUPABASE_URL` in production. For local dev with `http://localhost:3000`, add an ATS exception in the target’s Info if the simulator blocks the request.

## Production readiness checklist

Before release or CI “production ready” gate:

1. **Config:** `.env.local` (or equivalent) provides `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL`; `node scripts/generate-ios-env.mjs` has been run so the app builds with real values (no placeholders in release).
2. **Build:** `xcodebuild -scheme AskKodaAI -destination 'platform=iOS Simulator,name=iPhone 17' build` succeeds.
3. **Run:** App launches in simulator or device; auth screen or main UI appears (no white screen); magic link or Sign in with Apple works.
4. **Tests:** Unit tests (DateHelpers, APIModels, DataModels, ProductionReadiness) pass. If the test host crashes, ensure `Generated.xcconfig` exists and the app launches when run directly.
5. **Secrets:** No real keys committed; `ios/AskKodaAI/Config/Generated.xcconfig` is in `.gitignore`.
6. **HTTPS:** Production builds use HTTPS for API and Supabase URLs.
7. **Feature parity:** See “Feature parity with web” and `docs/IOS-PARITY-MAP.md` for coverage.

## Feature parity with web

The iOS app matches the web app for core flows:

- **Dashboard (Home):** Briefing, today's plan, 14-day performance, coach nudges, generate plan.
- **Plan:** Weekly plan, day selector, adapt day, weekly AI insight.
- **Coach:** AI chat; Support (escalate) with list/create/messages.
- **Log:** Workouts (list, quick log, **guided workout**, **Form check (Motion Lab)**); Nutrition (meals, targets, analyze meal, fridge scanner, meal plan/recipe gen); **History** (workouts & nutrition tabs, expand, edit workout).
- **Progress:** List entries, add entry, **body comp scan** (3 photos → API → save).
- **Check-in:** Daily energy, sleep, soreness, adherence.
- **Community:** Friends, requests, accountability partner, challenges (join).
- **Settings:** Profile, **Vitals** (readiness insight), **Integrations** (Apple Health sync, Whoop link), export, onboarding link, pricing/Stripe, sign out.
- **Onboarding:** Multi-step gate (name, age, sex, height, weight, goals, injuries, diet) → profile + onboarding.
- **Integrations:** **Apple Health** (HealthKit): read weight/sleep/steps, sync last 90 days to progress and check-ins; Whoop (open web connect).
- **Telemetry:** `Telemetry.track(_:props:)` for product events.

Robustness: retry-friendly API client, loading/error/empty states, Supabase direct access, HealthKit sync.

## Unit tests and AI review

- **Test target:** Add a **Unit Testing Bundle** target (e.g. `AskKodaAITests`) in Xcode: **File → New → Target → Unit Testing Bundle**. Add the `ios/KodaAITests` folder to that target and set **AskKodaAI** as the target to test (so `@testable import AskKodaAI` works). Ensure the **AskKodaAI** scheme’s Test action runs this test target.
- **Run from terminal:** From repo root, `npm run test:ios` finds any `.xcodeproj` under `ios/` (e.g. `ios/AskKodaAI/AskKodaAI.xcodeproj`) and runs `xcodebuild test` with the matching scheme (e.g. **AskKodaAI**).
- **AI review:** `npm run test:ai-review:ios` discovers iOS test files, runs tests if a project exists, then sends the output to an LLM (OpenRouter) for gap analysis, suggested tests, and **production readiness**. Report: `docs/reports/ai-test-review-ios-<timestamp>.md`. Set `OPENROUTER_API_KEY` for the AI step. Use `--fail-if-not-ready` to exit 1 when the app is not deemed production ready.
- **Production gate:** `npm run test:ios:ready` runs tests then AI review with `--fail-if-not-ready`. If tests pass and the AI reports production ready (all checklist items satisfied), exit 0; otherwise exit 1. Use before release or in CI. **When the gate passes, the app is considered production ready** (critical decoding, data models, and flows are tested; no P0 gaps; no critical assertion risks).

## Project layout

```
ios/
├── README.md
├── AskKodaAI/                    # Xcode project (name: AskKodaAI)
│   ├── AskKodaAI.xcodeproj
│   └── AskKodaAI/                # App source (synced to target)
│       ├── AskKodaAIApp.swift
│       ├── RootView.swift
│       ├── MainTabView.swift
│       ├── Config/, Core/, Models/, Services/, Views/, Components/
│       └── Assets.xcassets
├── KodaAITests/                  # XCTest sources (add to test target in Xcode)
│   ├── DateHelpersTests.swift
│   ├── APIModelsTests.swift
│   ├── DataModelsTests.swift
│   └── ProductionReadinessTests.swift
└── KodaAI/                       # Reference app source (mirrored into AskKodaAI/AskKodaAI/)
    ├── Config/, Core/, Models/, Services/, Views/, Components/
    ├── RootView.swift, MainTabView.swift
    └── (same structure as AskKodaAI/AskKodaAI/ app source)
```

## Running

1. Select a simulator or device.
2. Build and run (⌘R).
3. Enter your email on the auth screen and tap **Send magic link**; complete sign-in via the link (in Simulator you can use the browser or Mail app).
4. Use **Home** to generate a daily plan and **Coach** to chat with the AI.
